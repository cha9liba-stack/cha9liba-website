import { useState, useEffect } from "react";
import { Check, X, Clock, Phone, User, Calendar, Car, ChevronDown } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import type { OnlineBooking } from "../types";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmé",   color: "bg-green-100 text-green-700" },
  rejected:  { label: "Refusé",     color: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulé",     color: "bg-slate-100 text-slate-500" },
};

export default function OnlineBookings() {
  const user = useAuthStore(s => s.user);
  const [bookings, setBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected" | "cancelled">("pending");
  const [depositPct, setDepositPct] = useState(30);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetch(`${DB}/booking_settings.json`).then(r => r.json()).then(d => {
      if (d?.depositPct) setDepositPct(d.depositPct);
    }).catch(() => {});

    fetch(`${DB}/bookings.json`).then(r => r.json()).then(data => {
      if (data && typeof data === "object") {
        const list = Object.entries(data).map(([id, v]: any) => ({ ...v, id, status: v.status || "pending" }))
          .sort((a: any, b: any) => (b._createdAt || 0) - (a._createdAt || 0));
        setBookings(list);
      } else {
        setBookings([]);
      }
    }).catch(err => {
      console.error("[OnlineBookings] Failed to load bookings:", err);
      setBookings([]);
    }).finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: OnlineBooking["status"]) {
    await fetch(`${DB}/bookings/${id}.json`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, _updatedAt: Date.now(), _confirmedBy: user?.username }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  async function deleteBooking(id: string) {
    if (!confirm("Supprimer cette réservation ?")) return;
    await fetch(`${DB}/bookings/${id}.json`, {
      method: "DELETE",
    });
    setBookings(prev => prev.filter(b => b.id !== id));
  }

  async function saveDepositPct() {
    setSavingSettings(true);
    await fetch(`${DB}/booking_settings.json`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositPct }),
    });
    setSavingSettings(false);
  }

  const filtered = bookings.filter(b => filter === "all" || b.status === filter);
  const pendingCount = bookings.filter(b => b.status === "pending").length;

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Réservations en ligne
            {pendingCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Demandes reçues via le site de réservation</p>
        </div>

        {/* Deposit setting */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs text-slate-500">Acompte:</span>
          <input type="number" value={depositPct} min={0} max={100}
            onChange={e => setDepositPct(Number(e.target.value))}
            className="w-14 text-sm font-bold text-amber-600 border-none outline-none text-center" />
          <span className="text-xs text-slate-500">%</span>
          <button onClick={saveDepositPct} disabled={savingSettings}
            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors disabled:opacity-60">
            {savingSettings ? "..." : "Sauv."}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "confirmed", "rejected", "cancelled", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === f ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>
            {f === "all" ? "Tous" : STATUS_LABELS[f].label}
            {f === "pending" && pendingCount > 0 && <span className="ms-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading
        ? <div className="text-center py-12 text-slate-400">Chargement...</div>
        : filtered.length === 0
        ? <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">Aucune réservation</div>
        : <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Car size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{b.brand} {b.model}</p>
                    <p className="text-xs font-mono text-slate-400">{b.registration}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={11} /> {b.startDate} → {b.endDate} ({b.days}j)
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <User size={11} /> {b.clientName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone size={11} /> {b.clientPhone}
                      </span>
                    </div>
                    {b.clientCin && <p className="text-xs text-slate-400 mt-0.5">CIN: {b.clientCin}</p>}
                    {b.notes && <p className="text-xs text-slate-400 mt-0.5 italic">"{b.notes}"</p>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_LABELS[b.status]?.color}`}>
                    {STATUS_LABELS[b.status]?.label}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{(b.totalAmount || 0).toFixed(0)} TND</p>
                    <p className="text-xs text-amber-600">Acompte: {(b.depositAmount || 0).toFixed(0)} TND</p>
                  </div>
                  <p className="text-[10px] text-slate-400">{new Date(b._createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                {b.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus(b.id!, "confirmed")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-colors">
                      <Check size={14} /> Confirmer
                    </button>
                    <button onClick={() => updateStatus(b.id!, "rejected")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors">
                      <X size={14} /> Refuser
                    </button>
                    <button onClick={() => updateStatus(b.id!, "cancelled")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors">
                      <X size={14} /> Annuler
                    </button>
                  </>
                )}
                <button onClick={() => deleteBooking(b.id!)}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-medium rounded-xl transition-colors">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
