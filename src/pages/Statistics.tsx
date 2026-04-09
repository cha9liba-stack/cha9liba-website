import { useMemo, useState, useEffect } from "react";
import { useContractStore } from "../store/useContractStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSousTraitantCars } from "../hooks/useSousTraitantCars";
import { TrendingUp, DollarSign, FileText, Car, Building2 } from "lucide-react";

function today() { return new Date().toISOString().split("T")[0]; }

export default function Statistics() {
  const contracts = useContractStore(s => s.contracts);
  const user = useAuthStore(s => s.user);
  const selectedBranch = useAuthStore(s => s.selectedBranch);
  const isAdmin = user?.role === "admin";

  const [branches, setBranches] = useState<{id: string; name: string}[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [period, setPeriod] = useState<"month" | "year" | "all">("month");

  useEffect(() => {
    if (!isAdmin) return;
    fetch("https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/branches.json")
      .then(r => r.json())
      .then(data => {
        if (data) setBranches(Object.entries(data).map(([id, v]: any) => ({ id, name: v.name })));
      }).catch(() => {});
  }, [isAdmin]);

  const effectiveBranch = isAdmin ? branchFilter : (selectedBranch?.id || "all");
  const stRegs = useSousTraitantCars();

  // Helper: is this contract from a sous-traitant car?
  function isSTContract(c: any) {
    return !!(c as any).ownerId ||
      stRegs.has((c.registration || "").replace(/\s+/g, "").toUpperCase());
  }

  const filtered = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let base = contracts.filter(c => !c._deleted && !isSTContract(c));

    // Branch filter
    if (effectiveBranch !== "all") {
      base = base.filter(c => (c as any).branchId === effectiveBranch);
    }

    // Period filter
    if (period === "month") {
      base = base.filter(c => {
        const d = new Date(c.departureDate || "");
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
    } else if (period === "year") {
      base = base.filter(c => {
        const d = new Date(c.departureDate || "");
        return d.getFullYear() === thisYear;
      });
    }

    return base;
  }, [contracts, effectiveBranch, period]);

  // Monthly breakdown for chart
  const monthly = useMemo(() => {
    const months: { label: string; revenue: number; count: number; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.getMonth(); const y = d.getFullYear();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      let cc = contracts.filter(c => !c._deleted && !isSTContract(c) && c.departureDate?.startsWith(key));
      if (effectiveBranch !== "all") cc = cc.filter(c => (c as any).branchId === effectiveBranch);
      months.push({ key, label, revenue: cc.reduce((s, c) => s + parseFloat(c.depot || "0"), 0), count: cc.length });
    }
    return months;
  }, [contracts, effectiveBranch]);

  // Car stats
  const carStats = useMemo(() => {
    const map: Record<string, { reg: string; brand: string; model: string; revenue: number; count: number; days: number }> = {};
    for (const c of filtered) {
      const key = c.registration || "?";
      if (!map[key]) map[key] = { reg: key, brand: c.brand, model: c.model, revenue: 0, count: 0, days: 0 };
      map[key].revenue += parseFloat(c.depot || "0");
      map[key].count++;
      if (c.departureDate && c.returnDate) {
        map[key].days += Math.max(1, Math.ceil((new Date(c.returnDate).getTime() - new Date(c.departureDate).getTime()) / 86400000));
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const totalRevenue = filtered.reduce((s, c) => s + parseFloat(c.depot || "0"), 0);
  const totalContracts = filtered.length;
  const avgPerContract = totalContracts > 0 ? totalRevenue / totalContracts : 0;
  const maxMonthly = Math.max(...monthly.map(m => m.revenue), 1);

  const t = today();
  const activeNow = contracts.filter(c => !c._deleted && c.departureDate <= t && c.returnDate >= t &&
    (effectiveBranch === "all" || (c as any).branchId === effectiveBranch)).length;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp size={20} className="text-amber-500" />
          Statistiques
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch filter — admin only */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
              <Building2 size={14} className="text-slate-400" />
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                className="text-sm text-slate-700 border-none outline-none bg-transparent font-medium">
                <option value="all">Toutes les agences</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {/* Period filter */}
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {([["month", "Ce mois"], ["year", "Cette année"], ["all", "Tout"]] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setPeriod(val)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${period === val ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ...(isAdmin ? [
            { label: "Revenus", value: `${totalRevenue.toFixed(0)} TND`, color: "bg-green-500", icon: DollarSign },
          ] : []),
          { label: "Contrats", value: totalContracts, color: "bg-blue-500", icon: FileText },
          ...(isAdmin ? [
            { label: "Moy. / contrat", value: `${avgPerContract.toFixed(0)} TND`, color: "bg-amber-500", icon: TrendingUp },
          ] : []),
          { label: "Actifs maintenant", value: activeNow, color: "bg-slate-800", icon: Car },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`${color} rounded-xl p-2 w-fit mb-3`}><Icon size={16} className="text-white" /></div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart — 12 months (admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-amber-500" /> Revenus — 12 derniers mois
          </h2>
          <div className="flex items-end gap-2 h-40">
            {monthly.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none shadow-lg">
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-amber-300">{m.revenue.toFixed(0)} TND</p>
                  <p className="text-slate-300">{m.count} contrats</p>
                </div>
                <div className="w-full rounded-t-lg bg-amber-400 hover:bg-amber-500 transition-colors"
                  style={{ height: `${Math.max(4, (m.revenue / maxMonthly) * 128)}px` }} />
                <span className="text-[9px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per car stats (admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Car size={15} className="text-amber-500" /> Performance par véhicule
            </h2>
          </div>
          {carStats.length === 0
            ? <p className="text-center text-slate-400 text-sm py-8">Aucune donnée</p>
            : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-start">Véhicule</th>
                    <th className="px-5 py-3 text-start">Série</th>
                    <th className="px-5 py-3 text-end">Contrats</th>
                    <th className="px-5 py-3 text-end">Jours loués</th>
                    <th className="px-5 py-3 text-end">Revenus</th>
                    <th className="px-5 py-3 text-end">Moy./jour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {carStats.map(c => (
                    <tr key={c.reg} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{c.brand} {c.model}</td>
                      <td className="px-5 py-3 font-mono text-slate-500 text-xs">{c.reg}</td>
                      <td className="px-5 py-3 text-end text-slate-600">{c.count}</td>
                      <td className="px-5 py-3 text-end text-slate-600">{c.days}</td>
                      <td className="px-5 py-3 text-end font-bold text-green-600">{c.revenue.toFixed(3)}</td>
                      <td className="px-5 py-3 text-end text-slate-500">{c.days > 0 ? (c.revenue / c.days).toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}
    </div>
  );
}
