import { useState, useEffect, useMemo } from "react";
import { useContractStore } from "../store/useContractStore";
import type { SousTraitant } from "../types";
import { Plus, Trash2, Edit2, Car, X, ChevronRight, Phone, FileText, TrendingUp, StickyNote } from "lucide-react";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

async function loadFromFirebase(): Promise<SousTraitant[]> {
  try {
    const res = await fetch(`${DB}/sous_traitants.json`);
    const data = await res.json();
    if (!data) return [];
    return Object.entries(data).map(([id, v]: any) => ({ ...v, id }));
  } catch { return []; }
}

async function saveToFirebase(list: SousTraitant[]) {
  const obj: Record<string, any> = {};
  for (const st of list) obj[st.id] = st;
  await fetch(`${DB}/sous_traitants.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  }).catch(() => {});
}

export default function SousTraitants() {
  const contracts = useContractStore(s => s.contracts);
  const [list, setList] = useState<SousTraitant[]>([]);
  const [selected, setSelected] = useState<SousTraitant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editST, setEditST] = useState<SousTraitant | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [newCar, setNewCar] = useState({ registration: "", brand: "", model: "" });
  const [showAddCar, setShowAddCar] = useState(false);

  useEffect(() => {
    loadFromFirebase().then(data => {
      if (data.length > 0) setList(data);
    });
  }, []);

  function persist(updated: SousTraitant[]) {
    setList(updated);
    saveToFirebase(updated);
    const sel = updated.find(s => s.id === selected?.id);
    if (sel) setSelected(sel);
  }

  function openAdd() {
    setEditST(null);
    setForm({ name: "", phone: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(st: SousTraitant) {
    setEditST(st);
    setForm({ name: st.name, phone: st.phone || "", notes: st.notes || "" });
    setShowModal(true);
  }

  function saveST() {
    if (!form.name.trim()) return;
    const now = Date.now();
    if (editST) {
      persist(list.map(s => s.id === editST.id ? { ...s, ...form, _updatedAt: now } : s));
    } else {
      const newST: SousTraitant = { id: uid(), ...form, cars: [], _createdAt: now, _updatedAt: now };
      persist([...list, newST]);
    }
    setShowModal(false);
  }

  function deleteST(id: string) {
    if (!confirm("Supprimer ce sous-traitant ?")) return;
    persist(list.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function addCar() {
    if (!newCar.registration.trim() || !selected) return;
    const updated = list.map(s => s.id === selected.id
      ? { ...s, cars: [...s.cars, { ...newCar }], _updatedAt: Date.now() }
      : s
    );
    persist(updated);
    setNewCar({ registration: "", brand: "", model: "" });
    setShowAddCar(false);
  }

  function removeCar(stId: string, reg: string) {
    const updated = list.map(s => s.id === stId
      ? { ...s, cars: s.cars.filter(c => c.registration !== reg), _updatedAt: Date.now() }
      : s
    );
    persist(updated);
  }

  function saveNotes(notes: string) {
    if (!selected) return;
    persist(list.map(s => s.id === selected.id ? { ...s, notes, _updatedAt: Date.now() } : s));
  }

  // Get contracts for a sous-traitant
  function getSTContracts(st: SousTraitant) {
    const regs = new Set(st.cars.map(c => c.registration.replace(/\s+/g, "").toUpperCase()));
    return contracts.filter(c =>
      !c._deleted && (
        (c as any).ownerId === st.id ||
        regs.has((c.registration || "").replace(/\s+/g, "").toUpperCase())
      )
    );
  }

  const selectedContracts = useMemo(() =>
    selected ? getSTContracts(selected) : [],
    [selected, contracts]
  );

  const selectedRevenue = selectedContracts.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">

      {/* LEFT — list */}
      <div className={`flex flex-col border-r border-slate-100 bg-white ${selected ? "w-80 min-w-[280px]" : "flex-1"}`}>
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <h1 className="font-bold text-slate-800 flex items-center gap-2">
            <Car size={18} className="text-amber-500" /> Sous-traitants
            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{list.length}</span>
          </h1>
          <button onClick={openAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors">
            <Plus size={13} /> Nouveau
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {list.length === 0
            ? <div className="text-center py-12 text-slate-400 text-sm">
                <Car size={32} className="mx-auto mb-2 opacity-30" />
                <p>Aucun sous-traitant</p>
              </div>
            : list.map(st => {
              const stContracts = getSTContracts(st);
              const revenue = stContracts.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);
              return (
                <button key={st.id} onClick={() => setSelected(selected?.id === st.id ? null : st)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 ${selected?.id === st.id ? "bg-amber-50 border-r-2 border-amber-500" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Car size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{st.name}</p>
                    <p className="text-xs text-slate-400">{st.cars.length} véhicule{st.cars.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-green-600">{revenue.toFixed(0)} TND</p>
                    <p className="text-[10px] text-slate-400">{stContracts.length} contrats</p>
                  </div>
                  <ChevronRight size={14} className={`text-slate-300 flex-shrink-0 ${selected?.id === st.id ? "text-amber-400" : ""}`} />
                </button>
              );
            })
          }
        </div>
      </div>

      {/* RIGHT — detail */}
      {selected && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
              {selected.phone && <p className="text-sm text-slate-500 flex items-center gap-1"><Phone size={12}/> {selected.phone}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selected)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 text-slate-600 text-xs rounded-lg transition-colors">
                <Edit2 size={12} /> Modifier
              </button>
              <button onClick={() => deleteST(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:text-red-500 text-slate-600 text-xs rounded-lg transition-colors">
                <Trash2 size={12} /> Supprimer
              </button>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Véhicules", value: selected.cars.length, color: "bg-amber-500", icon: Car },
              { label: "Contrats", value: selectedContracts.length, color: "bg-blue-500", icon: FileText },
              { label: "Revenus totaux", value: `${selectedRevenue.toFixed(0)} TND`, color: "bg-green-500", icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
                <div className={`${color} rounded-lg p-2`}><Icon size={14} className="text-white" /></div>
                <div><p className="text-sm font-bold text-slate-800">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
              </div>
            ))}
          </div>

          {/* Cars */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Car size={14} className="text-amber-500" /> Véhicules ({selected.cars.length})
              </h3>
              <button onClick={() => setShowAddCar(v => !v)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                <Plus size={11} /> Ajouter
              </button>
            </div>

            {showAddCar && (
              <div className="p-3 bg-amber-50 border-b border-amber-100 flex gap-2 flex-wrap">
                <input value={newCar.brand} onChange={e => setNewCar(v => ({ ...v, brand: e.target.value }))}
                  placeholder="Marque" className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs flex-1 min-w-[80px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <input value={newCar.model} onChange={e => setNewCar(v => ({ ...v, model: e.target.value }))}
                  placeholder="Modèle" className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs flex-1 min-w-[80px] focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <input value={newCar.registration} onChange={e => setNewCar(v => ({ ...v, registration: e.target.value }))}
                  placeholder="Immatriculation" className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs flex-1 min-w-[100px] font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <button onClick={addCar} className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600">Ajouter</button>
                <button onClick={() => setShowAddCar(false)} className="px-2 py-1.5 text-slate-500 text-xs hover:bg-slate-100 rounded-lg">×</button>
              </div>
            )}

            <div className="divide-y divide-slate-50">
              {selected.cars.length === 0
                ? <p className="text-center text-slate-400 text-xs py-4">Aucun véhicule</p>
                : selected.cars.map(car => {
                  const carContracts = contracts.filter(c =>
                    !c._deleted && (c.registration || "").replace(/\s+/g, "").toUpperCase() === car.registration.replace(/\s+/g, "").toUpperCase()
                  );
                  const carRevenue = carContracts.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);
                  return (
                    <div key={car.registration} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{car.brand} {car.model}</p>
                        <p className="text-xs font-mono text-slate-400">{car.registration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-green-600">{carRevenue.toFixed(0)} TND</p>
                        <p className="text-[10px] text-slate-400">{carContracts.length} contrats</p>
                      </div>
                      <button onClick={() => removeCar(selected.id, car.registration)}
                        className="text-slate-300 hover:text-red-500 transition-colors ms-2">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2 mb-2">
              <StickyNote size={14} className="text-slate-400" /> Notes
            </h3>
            <textarea
              defaultValue={selected.notes || ""}
              onBlur={e => saveNotes(e.target.value)}
              placeholder="Ajouter des notes..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* Contracts */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <FileText size={14} className="text-amber-500" /> Contrats ({selectedContracts.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {selectedContracts.length === 0
                ? <p className="text-center text-slate-400 text-xs py-4">Aucun contrat</p>
                : [...selectedContracts].sort((a, b) => b.departureDate.localeCompare(a.departureDate)).map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-600">#{c.contractNumber}</span>
                        <span className="text-sm text-slate-700 truncate">{c.driverName}</span>
                      </div>
                      <p className="text-xs text-slate-400">{c.brand} {c.registration} · {c.departureDate} → {c.returnDate}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600 flex-shrink-0">{parseFloat(c.totalFacture||"0").toFixed(3)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal add/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editST ? "Modifier" : "Nouveau sous-traitant"}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Téléphone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={saveST} disabled={!form.name.trim()}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium">
                {editST ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
