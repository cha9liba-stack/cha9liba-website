import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import { Car, ChevronRight, AlertTriangle, Search, X, Download, RefreshCw } from "lucide-react";
import type { CarProfile } from "../types";

const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
const OLD_API = "https://palmarentcar.tn/api/cars";

// ─── Firebase + localStorage hybrid for profiles ──────────────────────────────
const PROFILES_KEY = "palma_car_profiles";

async function fbGetProfiles(): Promise<Record<string, CarProfile>> {
  try {
    const res = await fetch(`${DB_URL}/car_profiles.json`);
    if (res.ok) { const d = await res.json(); return d || {}; }
  } catch {}
  return {};
}

async function fbSaveProfile(key: string, profile: CarProfile) {
  try {
    await fetch(`${DB_URL}/car_profiles/${key}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch {}
  // Also save locally
  const all = loadProfiles();
  all[key] = profile;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
}

function loadProfiles(): Record<string, CarProfile> {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}"); } catch { return {}; }
}

function matchMatricule(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const ca = clean(a); const cb = clean(b);
  if (ca === cb) return true;
  const parse = (s: string) => { const m = s.match(/^(\d+)(tu)(\d+)$/i); return m ? { l: m[1], r: m[3] } : null; };
  const pa = parse(ca); const pb = parse(cb);
  if (!pa || !pb) return false;
  return (pa.l === pb.l && pa.r === pb.r) || (pa.l === pb.r && pa.r === pb.l);
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
const DEFAULT_FLEET = [
  { registration: "7468TU245", brand: "Kia",        model: "Stonic D" },
  { registration: "9192TU234", brand: "Renault",     model: "Clio Bleu" },
  { registration: "5605TU236", brand: "Hyundai",     model: "I20 Noir" },
  { registration: "5606TU236", brand: "Hyundai",     model: "I20 Blanc" },
  { registration: "8305TU238", brand: "Kia",         model: "Rio" },
  { registration: "4485TU240", brand: "Volkswagen",  model: "Virtus Blanc" },
  { registration: "4486TU240", brand: "Volkswagen",  model: "Virtus Blanc" },
  { registration: "2526TU242", brand: "MG",          model: "ZS B" },
  { registration: "2532TU242", brand: "MG",          model: "ZS G" },
  { registration: "1389TU244", brand: "Seat",        model: "Ibiza" },
  { registration: "1162TU245", brand: "Renault",     model: "Clio Blanc" },
  { registration: "2504TU246", brand: "Hyundai",     model: "I20 G" },
  { registration: "2508TU246", brand: "Hyundai",     model: "I20 B" },
  { registration: "4912TU246", brand: "Kia",         model: "Stonic B" },
  { registration: "203TU248",  brand: "Seat",        model: "Ibiza N" },
  { registration: "201TU248",  brand: "Seat",        model: "Ibiza B" },
  { registration: "1958TU248", brand: "Mahindra",    model: "XUV R" },
  { registration: "1959TU248", brand: "Mahindra",    model: "KUV300 B" },
  { registration: "1945TU251", brand: "Suzuki",      model: "Swift R" },
  { registration: "5941TU251", brand: "Renault",     model: "Clio Noir" },
  { registration: "5943TU251", brand: "Renault",     model: "Clio Gris C" },
  { registration: "7138TU251", brand: "Seat",        model: "Ibiza N" },
  { registration: "7057TU252", brand: "Kia",         model: "Picanto" },
  { registration: "9601TU252", brand: "Skoda",       model: "Kushaq B" },
  { registration: "9603TU252", brand: "Skoda",       model: "Kushaq Bleu" },
  { registration: "3541TU253", brand: "Volkswagen",  model: "Virtus Gris" },
  { registration: "7378TU254", brand: "Volkswagen",  model: "T-Cross" },
  { registration: "7379TU254", brand: "Volkswagen",  model: "T-Cross" },
  { registration: "7360TU255", brand: "Citroen",     model: "Berlingo" },
  { registration: "6155TU259", brand: "Seat",        model: "Ibiza N" },
];

// ─── Main page: list of all cars ─────────────────────────────────────────────
export default function Vehicles() {
  const contracts = useContractStore(s => s.contracts);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Record<string, CarProfile>>(loadProfiles);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Load profiles from Firebase on mount
  useEffect(() => {
    fbGetProfiles().then(data => {
      if (Object.keys(data).length > 0) {
        const merged = { ...loadProfiles(), ...data };
        setProfiles(merged);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(merged));
      }
    });
  }, []);

  async function importAllFromOldSystem() {
    setImporting(true);
    setImportMsg("");
    try {
      const res = await fetch(OLD_API);
      const cars: any[] = await res.json();
      let count = 0;
      for (const car of cars) {
        if (!car.matricule) continue;
        const key = car.matricule.replace(/\s+/g, "").toUpperCase();
        const existing = profiles[key] || { registration: key, documents: [], expenses: [] };
        const updated: CarProfile = {
          ...existing,
          priceAchat: car.price_achat,
          priceVent: car.price_vent,
          avance: car.avance,
          priceTrait: car.price_trait,
          nombreMoisFix: car.nombre_de_mois_fix,
          dateFirstCirculation: car.date_first_circulation?.slice(0, 10),
          dateFirstTrait: car.date_first_trait?.slice(0, 10),
          kilometrage: car.kilometrage,
          color: car.color,
          year: car.year,
          category: car.category,
        };
        // Import photo if missing
        if (!existing.photo && car.images?.length > 0) {
          try {
            const imgRes = await fetch(`https://palmarentcar.tn${car.images[0]}`);
            const blob = await imgRes.blob();
            const canvas = document.createElement("canvas");
            const img = new Image();
            const objUrl = URL.createObjectURL(blob);
            await new Promise<void>(resolve => {
              img.onload = () => {
                const scale = Math.min(1, 800 / img.width);
                canvas.width = img.width * scale; canvas.height = img.height * scale;
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                updated.photo = canvas.toDataURL("image/jpeg", 0.7);
                URL.revokeObjectURL(objUrl); resolve();
              };
              img.src = objUrl;
            });
          } catch {}
        }
        await fbSaveProfile(key, updated);
        count++;
      }
      setProfiles(loadProfiles());
      setImportMsg(`✓ ${count} véhicules importés`);
    } catch {
      setImportMsg("Erreur de connexion");
    } finally {
      setImporting(false);
    }
  }

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
    const urgentDocs = (profile?.documents || []).filter(d => {
      const days = daysUntil(d.expiryDate);
      return days >= 0 && days <= 30;
    });
    const expiredDocs = (profile?.documents || []).filter(d => daysUntil(d.expiryDate) < 0);
    return { totalRevenue, totalDays, totalExpenses, urgentDocs, expiredDocs, contractCount: carContracts.length };
  }

  // Current status — reads overrides history like Fleet does
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
      const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
      const entries: any[] = history[key] || [];
      const allContracts = contracts.filter(c => norm(c.registration) === key && !c._deleted);
      const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to >= t));
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
        const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
        const entries: any[] = history[key] || [];
        const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to >= t));
        if (entry) {
          const customStates = JSON.parse(localStorage.getItem("palma_custom_states") || "[]");
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
        const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
        const entries: any[] = history[key] || [];
        const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to >= t));
        const customStates = JSON.parse(localStorage.getItem("palma_custom_states") || "[]");
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
        <div className="flex items-center gap-2">
          <button onClick={importAllFromOldSystem} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-xl font-medium transition-colors">
            {importing ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
            {importing ? "Import..." : "Sync données"}
          </button>
          {importMsg && <span className="text-xs text-green-600 font-medium">{importMsg}</span>}
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
              onClick={() => navigate(`/vehicles/${encodeURIComponent(car.registration)}`)}
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
