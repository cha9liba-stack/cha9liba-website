import { useMemo, useState } from "react";import { useNavigate } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import type { Contract } from "../types";
import {
  FileText, TrendingUp, Clock, AlertTriangle,
  CheckCircle, ArrowUpRight, DollarSign
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
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ title, contracts, color, onClose }: {
  title: string;
  contracts: Contract[];
  color: string;
  onClose: () => void;
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
                    <th className="px-4 py-2.5 text-start">Montant</th>
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
                        <td className="px-4 py-2.5 text-xs text-slate-500">{c.driverPhone || "—"}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-green-600">{parseFloat(c.totalFacture || "0").toFixed(3)}</td>
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
  const navigate = useNavigate();
  const [modal, setModal] = useState<"active" | "late" | "total" | null>(null);

  const t = today();

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

  const activeContracts = useMemo(() =>
    contracts.filter(c => c.departureDate <= t && c.returnDate >= t && !c._deleted),
    [contracts]
  );

  // A contract is "en retard" only if:
  // 1. Its return date has passed
  // 2. The car has NOT been manually set to "available" (meaning it was returned)
  // 3. The car has NO newer contract that started after this one
  const lateContracts = useMemo(() => {
    // Build a map: registration → latest contract departure date
    const latestDep: Record<string, string> = {};
    for (const c of contracts) {
      if (!c.registration || c._deleted) continue;
      const key = norm(c.registration);
      if (!latestDep[key] || c.departureDate > latestDep[key]) {
        latestDep[key] = c.departureDate;
      }
    }

    const nowDT = nowDateTime();

    return contracts.filter(c => {
      if (c._deleted) return false;
      // Only contracts whose return date is today
      if (c.returnDate !== t) return false;
      if (c.departureDate > t) return false;

      // If return time exists and hasn't passed yet → not late
      const returnDT = c.returnDate + " " + (c.returnTime || "23:59");
      if (returnDT > nowDT) return false;

      const key = norm(c.registration || "");

      // If user manually marked this car as available/dispo → it was returned, not late
      const override = overrides[key];
      if (override === "available") return false;

      // If there's a newer contract for this car → the old one was completed
      const latest = latestDep[key];
      if (latest && latest > c.departureDate) return false;

      return true;
    });
  }, [contracts, overrides]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthlyRevenue = contracts
      .filter(c => {
        const d = new Date(c.departureDate || "");
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && !c._deleted;
      })
      .reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);

    const yearRevenue = contracts
      .filter(c => {
        const d = new Date(c.departureDate || "");
        return d.getFullYear() === thisYear && !c._deleted;
      })
      .reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);

    const monthly: { label: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.getMonth(); const y = d.getFullYear();
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      const cc = contracts.filter(c => {
        const cd = new Date(c.departureDate || "");
        return cd.getMonth() === m && cd.getFullYear() === y && !c._deleted;
      });
      monthly.push({ label, revenue: cc.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0), count: cc.length });
    }

    const profiles: Record<string, any> = (() => {
      try { return JSON.parse(localStorage.getItem("palma_car_profiles") || "{}"); } catch { return {}; }
    })();
    const urgentDocs: { car: string; doc: string; days: number }[] = [];
    for (const [reg, p] of Object.entries(profiles) as any) {
      for (const doc of (p.documents || [])) {
        const days = daysUntil(doc.expiryDate);
        if (days >= 0 && days <= 30) urgentDocs.push({ car: reg, doc: doc.label, days });
        if (days < 0) urgentDocs.push({ car: reg, doc: doc.label, days });
      }
    }

    return { monthlyRevenue, yearRevenue, monthly, urgentDocs };
  }, [contracts]);

  const recent = useMemo(() =>
    [...contracts].filter(c => !c._deleted)
      .sort((a, b) => (b._createdAt ?? 0) - (a._createdAt ?? 0)).slice(0, 6),
    [contracts]
  );

  const maxRevenue = Math.max(...stats.monthly.map(m => m.revenue), 1);

  const kpiCards = [
    {
      key: "active" as const,
      label: "Contrats actifs", value: activeContracts.length,
      color: "bg-green-500", icon: CheckCircle, sub: "en cours aujourd'hui",
    },
    {
      key: "late" as const,
      label: "En retard", value: lateContracts.length,
      color: "bg-red-500", icon: AlertTriangle, sub: "retour dépassé",
    },
    {
      key: null,
      label: "Revenus du mois", value: `${stats.monthlyRevenue.toFixed(0)} TND`,
      color: "bg-amber-500", icon: TrendingUp, sub: "mois en cours",
    },
    {
      key: "total" as const,
      label: "Total contrats", value: contracts.filter(c => !c._deleted).length,
      color: "bg-blue-500", icon: FileText, sub: "tous les contrats",
    },
  ];

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-xs text-slate-400">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(({ key, label, value, color, icon: Icon, sub }) => (
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
        {/* ── Revenue chart ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <DollarSign size={15} className="text-amber-500" /> Revenus — 6 derniers mois
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

        {/* ── Alerts ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" /> Alertes documents
          </h2>
          {stats.urgentDocs.length === 0
            ? <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                Tous les documents sont à jour
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

      {/* ── Recent contracts ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
            <Clock size={15} className="text-slate-400" /> Derniers contrats
          </h2>
          <button onClick={() => navigate("/contracts")}
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
                    <th className="px-5 py-2.5 text-start">Montant</th>
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
                        <td className="px-5 py-2.5 font-semibold text-green-600 text-xs">{parseFloat(c.totalFacture || "0").toFixed(3)} TND</td>
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

      {/* ── Detail Modals ── */}
      {modal === "active" && (
        <DetailModal title="Contrats actifs" contracts={activeContracts} color="bg-green-500" onClose={() => setModal(null)} />
      )}
      {modal === "late" && (
        <DetailModal title="Contrats en retard" contracts={lateContracts} color="bg-red-500" onClose={() => setModal(null)} />
      )}
      {modal === "total" && (
        <DetailModal title="Tous les contrats" contracts={contracts.filter(c => !c._deleted)} color="bg-blue-500" onClose={() => setModal(null)} />
      )}
    </div>
  );
}
