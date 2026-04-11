﻿import { useMemo, useState, useEffect } from "react";import { useNavigate } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSousTraitantCars } from "../hooks/useSousTraitantCars";
import { useVisibility } from "../hooks/useVisibility";
import { subscribeToContracts, isRealContract } from "../services/contractService";
import type { Contract } from "../types";
import {
  FileText, TrendingUp, Clock, AlertTriangle,
  CheckCircle, ArrowUpRight, DollarSign, Building2
} from "lucide-react";

function today() { return new Date().toISOString().split("T")[0]; }
function nowDateTime() {
  const n = new Date();
  const hh = String(n.getHours()).padStart(2, "0");
  const mm = String(n.getMinutes()).padStart(2, "0");
  return `${today()} ${hh}:${mm}`;
}
function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - new Date(today()).getTime()) / 86400000);
}
function daysBetween(a: string, b: string) {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
function fmtDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

// â”€â”€ Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DetailModal({ title, contracts, color, onClose, showPrices = true }: {
  title: string;
  contracts: Contract[];
  color: string;
  onClose: () => void;
  showPrices?: boolean;
}) {
  const t = today();
  const displayed = useMemo(() => {
    return [...contracts].sort((a, b) => b.returnDate.localeCompare(a.returnDate));
  }, [contracts]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className={`flex items-center justify-between px-5 py-4 ${color} rounded-t-2xl`}>
          <h3 className="font-bold text-white flex items-center gap-2">
            {title}
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{displayed.length}</span>
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">×</button>
        </div>



        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0
            ? <p className="text-center text-slate-400 py-10 text-sm">Aucun contrat</p>
            : <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-slate-400 text-xs uppercase">
                    <th className="px-4 py-2.5 text-start">N°</th>
                    <th className="px-4 py-2.5 text-start">Client</th>
                    <th className="px-4 py-2.5 text-start">Véhicule</th>
                    <th className="px-4 py-2.5 text-start">Départ</th>
                    <th className="px-4 py-2.5 text-start">Retour</th>
                    <th className="px-4 py-2.5 text-start">Durée</th>
                    <th className="px-4 py-2.5 text-start">Tél</th>
                    {showPrices && <th className="px-4 py-2.5 text-start">Montant</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map(c => {
                    const isLate = c.returnDate < t;
                    const nj = daysBetween(c.departureDate, c.returnDate);
                    const isLong = nj >= 365;
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isLong ? "bg-orange-50/60" : isLate ? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-2.5 font-mono text-amber-600 text-xs">#{c.contractNumber}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-800 text-xs">{c.driverName}</p>
                          <p className="text-[10px] text-slate-400">{c.driverCin}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">{c.brand} {c.model}<br/><span className="font-mono text-slate-400">{c.registration}</span></td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDate(c.departureDate)}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={isLate ? "text-red-600 font-bold" : "text-slate-500"}>{fmtDate(c.returnDate)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={`font-bold ${isLong ? "text-orange-600" : "text-slate-600"}`}>
                            {nj >= 365 ? `${(nj/365).toFixed(1)} ans` : `${nj}j`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{c.driverPhone || "-"}</td>
                        {showPrices && <td className="px-4 py-2.5 text-xs font-semibold text-green-600">{parseFloat(c.totalFacture || "0").toFixed(3)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          }
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const contracts = useContractStore(s => s.contracts);
  const { setContracts } = useContractStore();
  const fleetStats = useContractStore(s => s.fleetStats);
  const navigate = useNavigate();
  const [modal, setModal] = useState<"active" | "late" | "total" | "revenue" | null>(null);
  const user = useAuthStore(s => s.user);
  const selectedBranch = useAuthStore(s => s.selectedBranch);
  const isAdmin = user?.role === "admin";

  // Load car profiles from Firebase for accurate document alerts
  const [carProfiles, setCarProfiles] = useState<Record<string, any>>(() => {
    try { return JSON.parse(localStorage.getItem("palma_car_profiles") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    fetch("https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/car_profiles.json")
      .then(r => r.json())
      .then(data => {
        if (data) {
          setCarProfiles(data);
          localStorage.setItem("palma_car_profiles", JSON.stringify(data));
        }
      }).catch(() => {});
  }, []);

  // Admin can filter by branch; non-admin uses their selected branch
  const [adminBranchFilter, setAdminBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/branches.json")
      .then(r => r.json())
      .then(data => {
        if (data) setBranches(Object.entries(data).map(([id, v]: any) => ({ id, name: v.name })));
      }).catch(() => {});
  }, [isAdmin]);

  // Effective branch filter
  const effectiveBranch = isAdmin ? adminBranchFilter : (selectedBranch?.id || "all");
  const stRegs = useSousTraitantCars();

  function isSTContract(c: any) {
    return !!(c as any).ownerId ||
      stRegs.has((c.registration || "").replace(/\s+/g, "").toUpperCase());
  }

  // branchContracts = for revenue only (excludes ST cars)
  const branchContracts = useMemo(() => {
    const base = contracts.filter(c => !isSTContract(c));
    if (effectiveBranch === "all") return base;
    return base.filter(c => (c as any).branchId === effectiveBranch);
  }, [contracts, effectiveBranch, stRegs]);

  // For counts (active, total) - show all contracts including old ones without branchId
  const allVisibleContracts = useMemo(() => {
    if (effectiveBranch === "all") return contracts;
    return contracts.filter(c => !(c as any).branchId || (c as any).branchId === effectiveBranch);
  }, [contracts, effectiveBranch]);

  const t = today();

  // Subscribe to real-time contract updates
  useEffect(() => {
    const unsub = subscribeToContracts(data => {
      setContracts(data.filter(isRealContract));
    });
    return unsub;
  }, []);

  // Load vehicle override history to exclude cars manually set to "available" (returned)
  const overrides = useMemo<Record<string, string>>(() => {
    try {
      const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
      const result: Record<string, string> = {};
      for (const [reg, entries] of Object.entries(history) as any) {
        const entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to >= t));
        if (entry) result[reg] = entry.state;
      }
      return result;
    } catch { return {}; }
  }, [t]);

  function norm(s: string) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }

  // â”€â”€ Use same logic as Fleet to compute late/active counts â”€â”€
  const fleetCars = useMemo(() => {
    try {
      const saved = localStorage.getItem("palma_fleet_cars");
      if (saved) { const p = JSON.parse(saved); if (p.length > 0) return p; }
    } catch {}
    return [] as { registration: string; brand: string; model: string }[];
  }, []);

  const fleetStatus = useMemo(() => {
    const nowDT = t + " " + String(new Date().getHours()).padStart(2,"0") + ":" + String(new Date().getMinutes()).padStart(2,"0");

    // Active contracts today
    const active = contracts.filter(c => c.departureDate && c.returnDate && c.departureDate <= t && c.returnDate >= t && !c._deleted);
    const activeMap = new Map<string, Contract>();
    for (const c of active) {
      const key = norm(c.registration || "");
      const ex = activeMap.get(key);
      if (!ex || c.departureDate > ex.departureDate) activeMap.set(key, c);
    }

    return fleetCars.map(car => {
      const key = norm(car.registration);
      const override = overrides[key];
      if (override === "available" || override === "maintenance") return { state: override };

      const contract = activeMap.get(key);
      if (contract) {
        const retDT = contract.returnDate + " " + (contract.returnTime || "23:59");
        const isLate = retDT < nowDT || contract.returnDate < t;
        return { state: isLate ? "late" : "rented" };
      }
      return { state: "available" };
    });
  }, [fleetCars, contracts, overrides, t]);

  const lateCount   = fleetStats.late;
  const activeCount = allVisibleContracts.filter(c => !c._deleted && c.departureDate <= t && c.returnDate >= t).length;
  const vis = useVisibility();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthlyRevenue = branchContracts
      .filter(c => {
        const d = new Date(c.departureDate || "");
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && !c._deleted;
      })
      .reduce((s, c) => s + parseFloat(c.depot || "0"), 0);

    const yearRevenue = branchContracts
      .filter(c => {
        const d = new Date(c.departureDate || "");
        return d.getFullYear() === thisYear && !c._deleted;
      })
      .reduce((s, c) => s + parseFloat(c.depot || "0"), 0);

    const monthly: { label: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.getMonth(); const y = d.getFullYear();
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      const cc = branchContracts.filter(c => {
        const cd = new Date(c.departureDate || "");
        return cd.getMonth() === m && cd.getFullYear() === y && !c._deleted;
      });
      monthly.push({ label, revenue: cc.reduce((s, c) => s + parseFloat(c.depot || "0"), 0), count: cc.length });
    }

    const profiles: Record<string, any> = carProfiles;
    const urgentDocs: { car: string; doc: string; days: number }[] = [];
    for (const [reg, p] of Object.entries(profiles) as any) {
      const docs: any[] = p.documents || [];
      for (const doc of docs) {
        // For vidange: use km-based logic
        if (doc.type === "vidange") {
          if (!doc.nextVidangeKm) continue;
          // Only show the last vidange (highest nextVidangeKm)
          const maxNextKm = Math.max(...docs.filter((d: any) => d.type === "vidange" && d.nextVidangeKm).map((d: any) => d.nextVidangeKm || 0));
          if (doc.nextVidangeKm !== maxNextKm) continue;
          // Will be handled by km alerts elsewhere - skip date-based check
          continue;
        }
        const days = daysUntil(doc.expiryDate);
        // Skip expired docs if there's a newer valid one of the same type
        if (days < 0) {
          const hasNewerValid = docs.some((d: any) =>
            d.id !== doc.id && d.type === doc.type && daysUntil(d.expiryDate) >= 0
          );
          if (hasNewerValid) continue;
          // No newer valid one - show as expired
          urgentDocs.push({ car: reg, doc: doc.label, days });
          continue;
        }
        if (days <= 30) urgentDocs.push({ car: reg, doc: doc.label, days });
      }
    }

    return { monthlyRevenue, yearRevenue, monthly, urgentDocs };
  }, [branchContracts, carProfiles]);

  // Revenue detail for modal
  const revenueDetail = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Monthly income from contracts
    const monthContracts = branchContracts.filter(c => {
      const d = new Date(c.departureDate || "");
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && !c._deleted;
    });

    // Expenses from car profiles
    const profiles: Record<string, any> = (() => {
      try { return JSON.parse(localStorage.getItem("palma_car_profiles") || "{}"); } catch { return {}; }
    })();
    const monthKey = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}`;
    const expenses: { car: string; category: string; amount: number; description: string; date: string }[] = [];
    for (const [reg, p] of Object.entries(profiles) as any) {
      for (const e of (p.expenses || [])) {
        if (e.date?.startsWith(monthKey)) {
          expenses.push({ car: reg, category: e.category, amount: e.amount, description: e.description, date: e.date });
        }
      }
    }
    // Mensualités
    const mensualites: { car: string; amount: number }[] = [];
    for (const [reg, p] of Object.entries(profiles) as any) {
      if (p.priceTrait && p.dateFirstTrait && p.nombreMoisFix) {
        const start = new Date(p.dateFirstTrait);
        const end = new Date(start);
        end.setMonth(end.getMonth() + p.nombreMoisFix);
        if (now >= start && now < end) {
          mensualites.push({ car: reg, amount: p.priceTrait });
        }
      }
    }

    const totalRevenue = monthContracts.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalMensualites = mensualites.reduce((s, m) => s + m.amount, 0);
    const netProfit = totalRevenue - totalExpenses - totalMensualites;

    return { monthContracts, expenses, mensualites, totalRevenue, totalExpenses, totalMensualites, netProfit };
  }, [branchContracts]);

  const recent = useMemo(() =>
    [...allVisibleContracts].filter(c => !c._deleted)
      .sort((a, b) => (b._createdAt ?? 0) - (a._createdAt ?? 0)).slice(0, 6),
    [allVisibleContracts]
  );

  const maxRevenue = Math.max(...stats.monthly.map(m => m.revenue), 1);

  const kpiCards = [
    {
      key: "active" as const,
      label: "Contrats actifs", value: activeCount,
      color: "bg-green-500", icon: CheckCircle, sub: "en cours aujourd'hui",
    },
    {
      key: "late" as const,
      label: "En retard", value: lateCount,
      color: "bg-red-500", icon: AlertTriangle, sub: "retour dépassé",
    },
    {
      key: "revenue" as const,
      label: "Revenus du mois", value: `${stats.monthlyRevenue.toFixed(0)} TND`,
      color: "bg-amber-500", icon: TrendingUp, sub: "mois en cours",
      adminOnly: true,
    },
    {
      key: "total" as const,
      label: "Total contrats", value: allVisibleContracts.filter(c => !c._deleted).length,
      color: "bg-blue-500", icon: FileText, sub: "tous les contrats",
    },
  ];

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tableau de bord</h1>
          {!isAdmin && selectedBranch && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
              <Building2 size={11} /> {selectedBranch.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Admin branch filter */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={adminBranchFilter}
                onChange={e => setAdminBranchFilter(e.target.value)}
                className="text-sm text-slate-700 border-none outline-none bg-transparent font-medium"
              >
                <option value="all">Toutes les agences</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <p className="text-xs text-slate-400">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* â”€â”€ KPI Cards â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.filter(c => !c.adminOnly || isAdmin).map(({ key, label, value, color, icon: Icon, sub }) => (
          <div
            key={label}
            onClick={() => key && setModal(key)}
            className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ${key ? "cursor-pointer hover:shadow-md hover:border-slate-200 transition-all" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${color} rounded-xl p-2`}><Icon size={16} className="text-white" /></div>
              {key && <ArrowUpRight size={14} className="text-slate-300" />}
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* â”€â”€ Revenue chart â”€â”€ */}
        {(isAdmin || vis.showStatistics) && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <DollarSign size={15} className="text-amber-500" /> Revenus - 6 derniers mois
            </h2>
            <span className="text-xs text-slate-400">{stats.yearRevenue.toFixed(0)} TND cette année</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {stats.monthly.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500 font-medium">{m.revenue > 0 ? m.revenue.toFixed(0) : ""}</span>
                <div className="w-full rounded-t-lg bg-amber-400 transition-all"
                  style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 96)}px` }} />
                <span className="text-[10px] text-slate-400">{m.label}</span>
                <span className="text-[10px] text-slate-300">{m.count}c</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* â”€â”€ Alerts â”€â”€ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" /> Alertes documents
          </h2>
          {stats.urgentDocs.length === 0
            ? <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                Tous les documents sont Ã  jour
              </div>
            : <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.urgentDocs.sort((a, b) => a.days - b.days).map((d, i) => (
                  <div key={i} onClick={() => navigate(`/vehicles/${encodeURIComponent(d.car)}`)}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.days < 0 ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{d.doc}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{d.car}</p>
                    </div>
                    <span className={`text-[10px] font-bold whitespace-nowrap ${d.days < 0 ? "text-red-600" : "text-amber-600"}`}>
                      {d.days < 0 ? "Expiré" : `${d.days}j`}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* â”€â”€ Recent contracts â”€â”€ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
            <Clock size={15} className="text-slate-400" /> Derniers contrats
          </h2>
          <button onClick={() => navigate("/app/contracts")}
            className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
            Voir tout <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          {recent.length === 0
            ? <p className="text-center text-slate-400 py-8 text-sm">Aucun contrat</p>
            : <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase bg-slate-50">
                    <th className="px-5 py-2.5 text-start">N°</th>
                    <th className="px-5 py-2.5 text-start">Client</th>
                    <th className="px-5 py-2.5 text-start">Véhicule</th>
                    <th className="px-5 py-2.5 text-start">Départ</th>
                    <th className="px-5 py-2.5 text-start">Retour</th>
                    {(isAdmin || vis.showPrices) && <th className="px-5 py-2.5 text-start">Montant</th>}
                    <th className="px-5 py-2.5 text-start">Créé par</th>
                    <th className="px-5 py-2.5 text-start">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map(c => {
                    const isActive = c.departureDate <= t && c.returnDate >= t;
                    const isLate   = c.returnDate < t;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-2.5 font-mono text-amber-600 text-xs">#{c.contractNumber}</td>
                        <td className="px-5 py-2.5 font-medium text-slate-700">{c.driverName}</td>
                        <td className="px-5 py-2.5 text-slate-500 text-xs">{c.brand} {c.model} · {c.registration}</td>
                        <td className="px-5 py-2.5 text-slate-400 text-xs">{fmtDate(c.departureDate)}</td>
                        <td className="px-5 py-2.5 text-xs font-medium" style={{ color: isLate ? "#ef4444" : "#64748b" }}>{fmtDate(c.returnDate)}</td>
                        {(isAdmin || vis.showPrices) && (
                          <td className="px-5 py-2.5 font-semibold text-green-600 text-xs">{parseFloat(c.totalFacture || "0").toFixed(3)} TND</td>
                        )}
                        <td className="px-5 py-2.5 text-xs text-slate-500">
                          <p className="font-medium text-slate-700">{(c as any)._createdBy || (c as any)._updatedBy || "-"}</p>
                          <p className="text-slate-400">{
                            (c as any)._updatedAt
                              ? new Date((c as any)._updatedAt < 1e12 ? (c as any)._updatedAt * 1000 : (c as any)._updatedAt).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })
                              : (c as any)._createdAt
                              ? new Date((c as any)._createdAt < 1e12 ? (c as any)._createdAt * 1000 : (c as any)._createdAt).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })
                              : "-"
                          }</p>
                          {(c as any)._updatedBy && (c as any)._updatedBy !== (c as any)._createdBy && (
                            <p className="text-[10px] text-amber-500">✎ {(c as any)._updatedBy}</p>
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          {isLate   && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-medium">Retard</span>}
                          {isActive && !isLate && <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[10px] font-medium">Actif</span>}
                          {!isActive && !isLate && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px]">Terminé</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          }
        </div>
      </div>

      {/* â”€â”€ Detail Modals â”€â”€ */}
      {modal === "active" && (
        <DetailModal title="Contrats actifs" contracts={allVisibleContracts.filter(c => !c._deleted && c.departureDate <= t && c.returnDate >= t)} color="bg-green-500" onClose={() => setModal(null)} showPrices={isAdmin || vis.showPrices} />
      )}
      {modal === "late" && (
        <DetailModal title="Contrats en retard" contracts={fleetStats.lateContracts} color="bg-red-500" onClose={() => setModal(null)} showPrices={isAdmin || vis.showPrices} />
      )}
      {modal === "total" && (
        <DetailModal title="Tous les contrats" contracts={allVisibleContracts.filter(c => !c._deleted)} color="bg-blue-500" onClose={() => setModal(null)} showPrices={isAdmin || vis.showPrices} />
      )}

      {/* Revenue detail modal */}
      {modal === "revenue" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-amber-500 rounded-t-2xl">
              <h3 className="font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} /> Analyse financière - {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Revenus location", value: revenueDetail.totalRevenue, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Dépenses", value: revenueDetail.totalExpenses + (effectiveBranch === "all" ? revenueDetail.totalMensualites : 0), color: "text-red-600", bg: "bg-red-50" },
                  { label: "Bénéfice net", value: revenueDetail.totalRevenue - revenueDetail.totalExpenses - (effectiveBranch === "all" ? revenueDetail.totalMensualites : 0), color: (revenueDetail.totalRevenue - revenueDetail.totalExpenses - (effectiveBranch === "all" ? revenueDetail.totalMensualites : 0)) >= 0 ? "text-green-700" : "text-red-700", bg: (revenueDetail.totalRevenue - revenueDetail.totalExpenses - (effectiveBranch === "all" ? revenueDetail.totalMensualites : 0)) >= 0 ? "bg-green-100" : "bg-red-100" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-xl font-bold ${color}`}>{value.toFixed(3)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Income from contracts */}
              <div>
                <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"/> مداخيل - Contrats ({revenueDetail.monthContracts.length})
                </h4>
                {revenueDetail.monthContracts.length === 0
                  ? <p className="text-xs text-slate-400 py-2">Aucun contrat ce mois</p>
                  : <div className="space-y-1.5">
                    {revenueDetail.monthContracts.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs font-mono text-amber-600">#{c.contractNumber}</span>
                          <span className="text-sm text-slate-700 ms-2">{c.driverName}</span>
                          <span className="text-xs text-slate-400 ms-2">{c.brand} {c.registration}</span>
                        </div>
                        <span className="font-bold text-green-600 text-sm">+{parseFloat(c.totalFacture||"0").toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                }
              </div>

              {/* Mensualités - admin all branches only */}
              {effectiveBranch === "all" && revenueDetail.mensualites.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"/> Mensualités ({revenueDetail.mensualites.length})
                  </h4>
                  <div className="space-y-1.5">
                    {revenueDetail.mensualites.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-700 font-mono">{m.car}</span>
                        <span className="font-bold text-red-500 text-sm">-{m.amount.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses */}
              {revenueDetail.expenses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-700 text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"/> Dépenses ({revenueDetail.expenses.length})
                  </h4>
                  <div className="space-y-1.5">
                    {revenueDetail.expenses.map((e, i) => (
                      <div key={i} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-xs font-mono text-slate-500">{e.car}</span>
                          <span className="text-sm text-slate-700 ms-2">{e.description || e.category}</span>
                          <span className="text-xs text-slate-400 ms-2">{e.date}</span>
                        </div>
                        <span className="font-bold text-purple-600 text-sm">-{e.amount.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

