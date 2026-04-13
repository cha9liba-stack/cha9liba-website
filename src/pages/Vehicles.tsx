import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import { safeGetItem, safeSetItem } from "../lib/localStorageUtils";
import { Car, ChevronRight, AlertTriangle, Search, X } from "lucide-react";
import { config, FLEET_CARS } from "../lib/config";
import type { CarProfile } from "../types";

const DB = config.firebase.databaseUrl;

// ─── localStorage for profiles ────────────────────────────────────────────────
const PROFILES_KEY = "palma_car_profiles";

function loadProfiles(): Record<string, CarProfile> {
  return safeGetItem<Record<string, CarProfile>>(PROFILES_KEY, {});
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - new Date(today()).getTime()) / 86400000);
}
function norm(s: string) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }
function daysBetween(a: string, b: string) {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

// ─── Default fleet ────────────────────────────────────────────────────────────
const DEFAULT_FLEET = FLEET_CARS.map(car => ({
  registration: car.registration,
  brand: car.brand,
  model: car.model,
}));

// ─── Main page: list of all cars ─────────────────────────────────────────────
export default function Vehicles() {
  const contracts = useContractStore(s => s.contracts);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Record<string, CarProfile>>(loadProfiles);

  // Load profiles from Firebase to get latest documents
  useEffect(() => {
    fetch(`${DB}/${config.firebase.paths.carProfiles}.json`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setProfiles(data);
          safeSetItem("palma_car_profiles", data);
        }
      }).catch(() => {});
  }, []);
  const [overrideHistory, setOverrideHistory] = useState<Record<string, any[]>>(() => {
    return safeGetItem<Record<string, any[]>>("palma_state_overrides", {});
  });
  const [customStates, setCustomStates] = useState<any[]>(() => {
    return safeGetItem<any[]>("palma_custom_states", []);
  });

  // Sync overrides and custom states from Firebase
  useEffect(() => {
    fetch(`${DB}/${config.firebase.paths.overrides}.json`).then(r => r.json()).then(data => {
      if (data && typeof data === "object") {
        safeSetItem("palma_state_overrides", data);
        setOverrideHistory(data);
      }
    }).catch(() => {});
    fetch(`${DB}/${config.firebase.paths.customStates}.json`).then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        safeSetItem("palma_custom_states", data);
        setCustomStates(data);
      }
    }).catch(() => {});
  }, []);

  // Load profiles from bundled car-data.json on mount
  useEffect(() => {
    fetch("/car-data.json")
      .then(r => r.json())
      .then((carData: Record<string, any>) => {
        const current = loadProfiles();
        const merged: Record<string, CarProfile> = { ...current };
        for (const [key, data] of Object.entries(carData)) {
          const normKey = key.toUpperCase();
          merged[normKey] = {
            registration: normKey,
            documents: current[normKey]?.documents || [],
            expenses: current[normKey]?.expenses || [],
            ...data,
            photo: current[normKey]?.photo || data.photo,
          };
        }
        setProfiles(merged);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(merged));
      }).catch(() => {});
  }, []);

  const fleetCars = useMemo(() => {
    try {
      const saved = localStorage.getItem("palma_fleet_cars");
      if (saved) { const p = JSON.parse(saved); if (p.length > 0) return p; }
    } catch {}
    return DEFAULT_FLEET;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return fleetCars.filter((c: { registration: string; brand: string; model: string }) =>
      !q || c.registration.toLowerCase().includes(q) ||
      c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q)
    );
  }, [fleetCars, search]);

  // Per-car stats
  function getCarStats(registration: string) {
    const carContracts = contracts.filter(c =>
      norm(c.registration) === norm(registration) && !c._deleted
    );
    const totalRevenue = carContracts.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);
    const totalDays = carContracts.reduce((s, c) =>
      s + (c.departureDate && c.returnDate ? daysBetween(c.departureDate, c.returnDate) : 0), 0
    );
    const profile = profiles[norm(registration)];
    const totalExpenses = (profile?.expenses || []).reduce((s, e) => s + e.amount, 0);
    const docs: any[] = profile?.documents || [];

    // Same logic as Dashboard: skip expired if newer valid exists, skip old vidanges
    const urgentDocs = docs.filter(d => {
      if (d.type === "vidange") {
        if (!d.nextVidangeKm) return false;
        // Only last vidange, and only if urgent (≤ 200 km remaining)
        const maxNextKm = Math.max(...docs.filter((x: any) => x.type === "vidange" && x.nextVidangeKm).map((x: any) => x.nextVidangeKm || 0));
        if (d.nextVidangeKm !== maxNextKm) return false;
        // Need current km - use profile.kilometrage as fallback
        const curKm = profile?.kilometrage || 0;
        const remaining = d.nextVidangeKm - curKm;
        return remaining <= 200; // only alert if ≤ 200 km
      }
      const days = daysUntil(d.expiryDate);
      if (days < 0) {
        return !docs.some((x: any) => x.id !== d.id && x.type === d.type && daysUntil(x.expiryDate) >= 0);
      }
      return days <= 30;
    });
    const expiredDocs = urgentDocs.filter(d => {
      if (d.type === "vidange") return false;
      return daysUntil(d.expiryDate) < 0;
    });
    return { totalRevenue, totalDays, totalExpenses, urgentDocs, expiredDocs, contractCount: carContracts.length };
  }

  // Current status - reads overrides history like Fleet does
  function getCarStatus(registration: string): "rented" | "late" | "available" | "maintenance" | "custom" {
    const t = today();
    const key = norm(registration);

    // Check active or late contract first (contract takes priority over any override)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const nowDT = `${t} ${hh}:${mm}`;

    const activeContract = contracts
      .filter(c => norm(c.registration) === key && c.departureDate <= t && !c._deleted)
      .sort((a, b) => b.departureDate.localeCompare(a.departureDate))[0];

    if (activeContract) {
      if (activeContract.returnDate > t) return "rented";
      if (activeContract.returnDate === t) {
        // Late only if return time has passed
        const returnDT = activeContract.returnDate + " " + (activeContract.returnTime || "23:59");
        if (returnDT <= nowDT) {
          // will check override below before returning late
        } else {
          return "rented"; // not yet late
        }
      }
      // returnDate < t → definitely late (will check override below)
    }

    // Check overrides history
    try {
      const entries: any[] = overrideHistory[key] || [];
      const allContracts = contracts.filter(c => norm(c.registration) === key && !c._deleted);
      const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to === undefined || e.to >= t));
      if (entry) {
        const overrideFrom = entry.from;
        const newerContract = allContracts.some(c => c.departureDate >= overrideFrom && c.departureDate <= t);
        if (!newerContract) {
          if (entry.state === "available") return "available";
          if (entry.state === "maintenance") return "maintenance";
          return "custom";
        }
      }
    } catch {}

    // If there's a late contract and no override → late only if return date is today
    if (activeContract && activeContract.returnDate === t) return "late";

    // Check maintenance list
    const maint = (() => { try { return JSON.parse(localStorage.getItem("palma_maint") || "[]"); } catch { return []; } })();
    if (maint.some((m: any) =>
      norm(m.registration) === key && m.entryDate <= t && (!m.exitDate || m.exitDate >= t)
    )) return "maintenance";

    return "available";
  }

  function getCarStatusLabel(registration: string): string {
    const status = getCarStatus(registration);
    if (status === "custom") {
      try {
        const key = norm(registration);
        const t = today();
        const entries: any[] = overrideHistory[key] || [];
        const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to === undefined || e.to >= t));
        if (entry) {
          const cs = customStates.find((s: any) => s.id === entry.state);
          if (cs) return cs.label;
        }
      } catch {}
      return "Custom";
    }
    return status;
  }

  function getStatusBadge(registration: string) {
    const status = getCarStatus(registration);
    if (status === "rented")      return <span className="px-2 py-0.5 bg-slate-800 text-white rounded-full text-[10px] font-medium">Louée</span>;
    if (status === "late")        return <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-medium">⚠ Retard</span>;
    if (status === "maintenance") return <span className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-[10px] font-medium">En panne</span>;
    if (status === "custom") {
      const label = getCarStatusLabel(registration);
      try {
        const key = norm(registration);
        const t = today();
        const entries: any[] = overrideHistory[key] || [];
        const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to === undefined || e.to >= t));
        const cs = customStates.find((s: any) => s.id === entry?.state);
        if (cs) return <span className="px-2 py-0.5 text-white rounded-full text-[10px] font-medium" style={{ backgroundColor: cs.color }}>{cs.label}</span>;
      } catch {}
      return <span className="px-2 py-0.5 bg-slate-500 text-white rounded-full text-[10px] font-medium">{label}</span>;
    }
    return <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-medium">Disponible</span>;
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Véhicules</h1>
          <p className="text-xs text-slate-400 mt-0.5">{fleetCars.length} véhicules · Cliquez pour voir les détails</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-8 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-52"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((car: { registration: string; brand: string; model: string }) => {
          const stats = getCarStats(car.registration);
          const profile = profiles[norm(car.registration)];
          const hasAlerts = stats.urgentDocs.length > 0 || stats.expiredDocs.length > 0;

          return (
            <button
              key={car.registration}
              onClick={() => navigate(`/app/vehicles/${encodeURIComponent(car.registration)}`)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left group overflow-hidden"
            >
              {/* Car photo or placeholder */}
              <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
                {profile?.photo
                  ? <img src={profile.photo} alt={car.brand} className="w-full h-full object-cover" />
                  : <Car size={40} className="text-slate-300" />
                }
                <div className="absolute top-2 right-2">{getStatusBadge(car.registration)}</div>
                {hasAlerts && (
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-medium">
                      <AlertTriangle size={10} />
                      {stats.expiredDocs.length + stats.urgentDocs.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{car.brand} {car.model}</p>
                  <p className="text-xs font-mono text-slate-500">{car.registration}</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-slate-50 rounded-lg py-1.5">
                    <p className="text-xs font-bold text-slate-700">{stats.contractCount}</p>
                    <p className="text-[10px] text-slate-400">Contrats</p>
                  </div>
                  <div className="bg-green-50 rounded-lg py-1.5">
                    <p className="text-xs font-bold text-green-700">{stats.totalRevenue.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400">Revenus</p>
                  </div>
                  <div className="bg-red-50 rounded-lg py-1.5">
                    <p className="text-xs font-bold text-red-600">{stats.totalExpenses.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400">Dépenses</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{stats.totalDays} jours loués</span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
