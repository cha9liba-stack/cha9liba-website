import { useEffect, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import type { Branch } from "../store/useAuthStore";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

interface Props {
  onSelect: (branch: Branch) => void;
}

export default function BranchSelectModal({ onSelect }: Props) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${DB}/branches.json`)
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === "object") {
          const list: Branch[] = Object.entries(data).map(([id, val]: any) => ({
            id,
            name: val.name || id,
          }));
          setBranches(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-b border-amber-100 rounded-t-2xl">
          <Building2 size={20} className="text-amber-600" />
          <div>
            <h2 className="font-bold text-slate-800">Choisir une agence</h2>
            <p className="text-xs text-slate-500">Sélectionnez votre agence pour cette session</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {loading
            ? <p className="text-center text-slate-400 text-sm py-6">Chargement...</p>
            : branches.length === 0
            ? <p className="text-center text-slate-400 text-sm py-6">Aucune agence configurée</p>
            : branches.map(b => (
              <button
                key={b.id}
                onClick={() => onSelect(b)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
              >
                <div className="w-9 h-9 bg-amber-100 group-hover:bg-amber-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                  <MapPin size={16} className="text-amber-600" />
                </div>
                <span className="font-semibold text-slate-800">{b.name}</span>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  );
}
