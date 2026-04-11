import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Trash2, Phone, Calendar } from "lucide-react";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

type Notification = {
  id: string;
  clientName: string;
  clientPhone: string;
  registration: string;
  brand: string;
  model: string;
  availableFrom: string;
  requestedDates: string;
  lang: string;
  _createdAt: number;
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${DB}/notifications.json`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          const list = Object.entries(data).map(([id, v]: any) => ({ ...v, id }))
            .sort((a: any, b: any) => b._createdAt - a._createdAt);
          setNotifications(list);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function deleteNotification(id: string) {
    if (!confirm("Supprimer cette notification ?")) return;
    await fetch(`${DB}/notifications/${id}.json`, {
      method: "DELETE",
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell size={20} className="text-amber-500" />
            Notifications de disponibilité
            {notifications.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{notifications.length}</span>}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Demandes de notification des clients</p>
        </div>
      </div>

      {loading
        ? <div className="text-center py-12 text-slate-400">Chargement...</div>
        : notifications.length === 0
        ? <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">Aucune notification</div>
        : <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => navigate(`/app/vehicles/${n.registration}`)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Bell size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{n.brand} {n.model}</p>
                    <p className="text-xs font-mono text-slate-400">{n.registration}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone size={11} /> {n.clientPhone}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={11} /> {n.requestedDates}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Client: <span className="font-medium text-slate-600">{n.clientName}</span>
                    </p>
                    {n.availableFrom && (
                      <p className="text-xs text-green-600 font-semibold mt-0.5">
                        Disponible à partir du {n.availableFrom.split("-").reverse().join("/")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-[10px] text-slate-400">
                    {new Date(n._createdAt).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
