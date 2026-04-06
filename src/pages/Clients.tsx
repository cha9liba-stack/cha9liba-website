import { useState, useMemo, useEffect } from "react";
import { useContractStore } from "../store/useContractStore";
import type { Client, ClientAlert } from "../types";
import {
  Users, Plus, Search, X, Building2, User, Phone, MapPin,
  FileText, TrendingUp, ChevronRight, Trash2, Edit2, CreditCard,
  Mail, Hash, AlertCircle, GitMerge, DollarSign, ShieldOff, ShieldCheck, Bell
} from "lucide-react";

// ─── localStorage ─────────────────────────────────────────────────────────────
const CLIENTS_KEY = "palma_clients";
const DEBTS_KEY   = "palma_contract_debts"; // { [contractId]: { paid: number, reste: number } }

function loadClients(): Client[] {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]"); } catch { return []; }
}
function saveClients(c: Client[]) { localStorage.setItem(CLIENTS_KEY, JSON.stringify(c)); }

function loadDebts(): Record<string, { paid: number; reste: number }> {
  try { return JSON.parse(localStorage.getItem(DEBTS_KEY) || "{}"); } catch { return {}; }
}
function saveDebts(d: Record<string, { paid: number; reste: number }>) {
  localStorage.setItem(DEBTS_KEY, JSON.stringify(d));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ─── Empty forms ──────────────────────────────────────────────────────────────
const emptyClient = (): Omit<Client, "id" | "_createdAt" | "_updatedAt"> => ({
  name: "", cin: "", phone: "", address: "", dob: "", notes: "",
  isCompany: false, company: { name: "", mf: "", phone: "", address: "", email: "" },
});

// ─── Field component ──────────────────────────────────────────────────────────
function F({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );
}

export default function Clients() {
  const contracts = useContractStore(s => s.contracts);
  const [clients, setClients] = useState<Client[]>(loadClients);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "individual" | "company">("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mergeGroup, setMergeGroup] = useState<Client[] | null>(null);
  const [debts, setDebts] = useState<Record<string, { paid: number; reste: number }>>(loadDebts);
  const [editDebtContract, setEditDebtContract] = useState<{ id: string; contractNumber: string; total: number; paid: number; reste: number } | null>(null);

  function persistDebts(d: Record<string, { paid: number; reste: number }>) {
    setDebts(d); saveDebts(d);
  }

  // Get debt for a contract — defaults to 0 (soldé) if not set
  function getDebt(contractId: string) {
    return debts[contractId] ?? { paid: 0, reste: 0 };
  }

  // Detect duplicates: same CIN, different data
  const duplicateGroups = useMemo(() => {
    const byCin = new Map<string, Client[]>();
    for (const c of clients) {
      const cin = c.cin?.trim().toUpperCase();
      if (!cin) continue;
      if (!byCin.has(cin)) byCin.set(cin, []);
      byCin.get(cin)!.push(c);
    }
    return Array.from(byCin.values()).filter(group => group.length > 1);
  }, [clients]);

  function persist(updated: Client[]) { setClients(updated); saveClients(updated); }

  // Merge: keep one client, delete the rest
  function mergeInto(keep: Client, remove: Client[]) {
    const removeIds = new Set(remove.map(c => c.id));
    persist(clients.filter(c => !removeIds.has(c.id)));
    setMergeGroup(null);
    setSelected(keep);
  }

  // Auto-import from contracts if list is empty
  useEffect(() => {
    if (clients.length > 0 || contracts.length === 0) return;
    const newClients: Client[] = [];
    const seen = new Set<string>();
    for (const c of contracts) {
      const cin = c.driverCin?.trim().toUpperCase();
      const key = cin || c.driverName?.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      newClients.push({
        id: uid(), name: c.driverName || "", cin: c.driverCin || "",
        phone: c.driverPhone || "", address: c.driverAddress || "",
        dob: c.driverDob || "", notes: "", isCompany: false,
        company: { name: "", mf: "", phone: "", address: "", email: "" },
        _createdAt: Date.now(), _updatedAt: Date.now(),
      });
    }
    if (newClients.length > 0) persist(newClients);
  }, [contracts]);

  function openAdd() {
    setEditClient(null);
    setForm(emptyClient());
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditClient(c);
    setForm({ name: c.name, cin: c.cin, phone: c.phone, address: c.address,
      dob: c.dob || "", notes: c.notes || "", isCompany: c.isCompany,
      company: c.company || { name: "", mf: "", phone: "", address: "", email: "" } });
    setShowModal(true);
  }

  function saveClient() {
    if (!form.name.trim()) return;
    const now = Date.now();
    if (editClient) {
      const updated = clients.map(c => c.id === editClient.id
        ? { ...c, ...form, _updatedAt: now } : c);
      persist(updated);
      if (selected?.id === editClient.id) setSelected({ ...editClient, ...form, _updatedAt: now });
    } else {
      const newC: Client = { ...form, id: uid(), _createdAt: now, _updatedAt: now };
      persist([...clients, newC]);
    }
    setShowModal(false);
  }

  function deleteClient(id: string) {
    if (!confirm("Supprimer ce client ?")) return;
    persist(clients.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState("");

  function toggleBan(client: Client) {
    if (client.banned) {
      // Unban
      const updated = clients.map(c => c.id === client.id ? { ...c, banned: false, banReason: "" } : c);
      persist(updated);
      setSelected(updated.find(c => c.id === client.id) || null);
    } else {
      setBanReason("");
      setShowBanModal(true);
    }
  }

  function confirmBan() {
    if (!selected) return;
    const updated = clients.map(c => c.id === selected.id
      ? { ...c, banned: true, banReason: banReason.trim() }
      : c
    );
    persist(updated);
    setSelected(updated.find(c => c.id === selected.id) || null);
    setShowBanModal(false);
    setBanReason("");
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  const ALERT_TYPES: { value: ClientAlert["type"]; label: string; color: string; icon: string }[] = [
    { value: "debt",    label: "Dette impayée",    color: "bg-red-500",    icon: "💰" },
    { value: "damage",  label: "Dommages véhicule", color: "bg-orange-500", icon: "🔧" },
    { value: "fine",    label: "Amende / Infraction", color: "bg-yellow-500", icon: "⚠️" },
    { value: "problem", label: "Problème signalé",  color: "bg-purple-500", icon: "🚨" },
    { value: "other",   label: "Autre",             color: "bg-slate-500",  icon: "📝" },
  ];

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<ClientAlert>>({ type: "debt", date: new Date().toISOString().split("T")[0] });

  function addAlert() {
    if (!selected || !newAlert.message?.trim()) return;
    const alert: ClientAlert = {
      id: uid(),
      type: newAlert.type || "other",
      message: newAlert.message.trim(),
      amount: newAlert.amount,
      date: newAlert.date || new Date().toISOString().split("T")[0],
      resolved: false,
    };
    const updated = clients.map(c => c.id === selected.id
      ? { ...c, alerts: [...(c.alerts || []), alert] }
      : c
    );
    persist(updated);
    setSelected(updated.find(c => c.id === selected.id) || null);
    setNewAlert({ type: "debt", date: new Date().toISOString().split("T")[0] });
    setShowAlertModal(false);
  }

  function resolveAlert(alertId: string) {
    if (!selected) return;
    const updated = clients.map(c => c.id === selected.id
      ? { ...c, alerts: (c.alerts || []).filter(a => a.id !== alertId) }
      : c
    );
    persist(updated);
    setSelected(updated.find(c => c.id === selected.id) || null);
  }

  // Auto-import clients from contracts (CIN-based dedup)
  function importFromContracts() {
    const existing = new Set(clients.map(c => c.cin?.trim().toUpperCase()).filter(Boolean));
    const newClients: Client[] = [];
    const seen = new Set<string>();
    for (const c of contracts) {
      const cin = c.driverCin?.trim().toUpperCase();
      if (!cin || existing.has(cin) || seen.has(cin)) continue;
      seen.add(cin);
      newClients.push({
        id: uid(), name: c.driverName || "", cin: c.driverCin || "",
        phone: c.driverPhone || "", address: c.driverAddress || "",
        dob: c.driverDob || "", notes: "", isCompany: false,
        company: { name: "", mf: "", phone: "", address: "", email: "" },
        _createdAt: Date.now(), _updatedAt: Date.now(),
      });
    }
    if (newClients.length === 0) { alert("Aucun nouveau client trouvé."); return; }
    persist([...clients, ...newClients]);
    alert(`${newClients.length} client(s) importé(s).`);
  }

  // Per-client contract stats — debt from localStorage only (starts at 0)
  function getClientStats(client: Client) {
    const cc = contracts.filter(c =>
      (client.cin && c.driverCin?.trim().toUpperCase() === client.cin.trim().toUpperCase()) ||
      c.driverName?.trim().toLowerCase() === client.name.trim().toLowerCase()
    );
    const total = cc.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);
    const totalPaid  = cc.reduce((s, c) => s + (getDebt(c.id!).paid),  0);
    const totalDebt  = cc.reduce((s, c) => s + (getDebt(c.id!).reste), 0);
    const last = [...cc].sort((a, b) => b.departureDate.localeCompare(a.departureDate))[0];
    return { count: cc.length, total, totalPaid, totalDebt, last, contracts: cc };
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      const matchType = filterType === "all" || (filterType === "company" ? c.isCompany : !c.isCompany);
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.cin.toLowerCase().includes(q) ||
        c.phone.includes(q) || c.company?.name.toLowerCase().includes(q) || false;
      return matchType && matchQ;
    }).sort((a, b) => b._updatedAt - a._updatedAt);
  }, [clients, search, filterType]);

  const selectedStats = useMemo(() =>
    selected ? getClientStats(selected) : null, [selected, contracts]);

  return (
    <>
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">

      {/* ── LEFT: Client list ── */}
      <div className={`flex flex-col border-r border-slate-100 bg-white ${selected ? "w-80 min-w-[280px]" : "flex-1"} transition-all`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-amber-500" /> Clients
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{clients.length}</span>
            </h1>
            <div className="flex gap-1.5">
              <button onClick={importFromContracts}
                className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Importer depuis les contrats">
                Importer
              </button>
              {duplicateGroups.length > 0 && (
                <button onClick={() => setShowDuplicates(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors">
                  <AlertCircle size={12} />
                  {duplicateGroups.length} doublon{duplicateGroups.length > 1 ? "s" : ""}
                </button>
              )}
              <button onClick={openAdd}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors">
                <Plus size={13} /> Nouveau
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, CIN, téléphone..."
              className="w-full pl-8 pr-7 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1">
            {(["all", "individual", "company"] as const).map(f => (
              <button key={f} onClick={() => setFilterType(f)}
                className={`flex-1 py-1 text-xs rounded-lg transition-colors ${filterType === f ? "bg-amber-500 text-white font-medium" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {f === "all" ? "Tous" : f === "individual" ? "Particuliers" : "Entreprises"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filtered.length === 0
            ? <div className="text-center py-12 text-slate-400 text-sm">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p>Aucun client</p>
              </div>
            : filtered.map(c => {
              const stats = getClientStats(c);
              const isActive = selected?.id === c.id;
              const hasDup = duplicateGroups.some(g => g.some(x => x.id === c.id));
              return (
                <button key={c.id} onClick={() => setSelected(isActive ? null : c)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 ${isActive ? "bg-amber-50 border-r-2 border-amber-500" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.isCompany ? "bg-blue-100" : "bg-slate-100"}`}>
                    {c.isCompany ? <Building2 size={16} className="text-blue-600" /> : <User size={16} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                      {hasDup && <AlertCircle size={11} className="text-red-400 flex-shrink-0" />}
                      {c.banned && <ShieldOff size={11} className="text-red-600 flex-shrink-0" />}
                      {(c.alerts?.length || 0) > 0 && <Bell size={11} className="text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {c.isCompany && c.company?.name ? c.company.name : c.cin || c.phone}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-green-600">{stats.total.toFixed(0)} TND</p>
                    <p className="text-[10px] text-slate-400">{stats.count} contrat{stats.count !== 1 ? "s" : ""}</p>
                    {stats.totalDebt > 0 && (
                      <p className="text-[10px] font-bold text-red-500">Dette: {stats.totalDebt.toFixed(3)}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className={`text-slate-300 flex-shrink-0 ${isActive ? "text-amber-400" : ""}`} />
                </button>
              );
            })
          }
        </div>
      </div>

      {/* ── RIGHT: Client detail ── */}
      {selected && selectedStats && (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-4">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selected.isCompany ? "bg-blue-100" : "bg-slate-200"}`}>
                {selected.isCompany ? <Building2 size={22} className="text-blue-600" /> : <User size={22} className="text-slate-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {selected.name}
                  {selected.banned && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium flex items-center gap-1"><ShieldOff size={10}/> Bloqué</span>}
                </h2>
                {selected.isCompany && selected.company?.name && (
                  <p className="text-sm text-blue-600 font-medium">{selected.company.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selected)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 text-slate-600 text-xs rounded-lg transition-colors">
                <Edit2 size={12} /> Modifier
              </button>
              <button onClick={() => toggleBan(selected)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs rounded-lg transition-colors ${selected.banned ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "bg-white border-slate-200 hover:border-red-300 hover:text-red-600 text-slate-600"}`}>
                {selected.banned ? <><ShieldCheck size={12} /> Débloquer</> : <><ShieldOff size={12} /> Bloquer</>}
              </button>
              <button onClick={() => deleteClient(selected.id)}
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
              { label: "Contrats",       value: selectedStats.count,                          color: "bg-blue-500",  icon: FileText },
              { label: "Total payé",     value: `${selectedStats.totalPaid.toFixed(3)} TND`,  color: "bg-green-500", icon: TrendingUp },
              { label: "Dette restante", value: `${selectedStats.totalDebt.toFixed(3)} TND`,  color: selectedStats.totalDebt > 0 ? "bg-red-500" : "bg-slate-400", icon: AlertCircle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3">
                <div className={`${color} rounded-lg p-2`}><Icon size={14} className="text-white" /></div>
                <div><p className="text-sm font-bold text-slate-800">{value}</p><p className="text-xs text-slate-400">{label}</p></div>
              </div>
            ))}
          </div>

          {/* Alerts section */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Bell size={14} className="text-amber-500" />
                Alertes {(selected.alerts?.filter(a => !a.resolved).length || 0) > 0 &&
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{selected.alerts?.filter(a => !a.resolved).length}</span>
                }
              </h3>
              <button onClick={() => setShowAlertModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                <Plus size={11} /> Ajouter
              </button>
            </div>
            <div className="p-3 space-y-2">
              {(!selected.alerts || selected.alerts.length === 0)
                ? <p className="text-center text-slate-400 text-xs py-3">Aucune alerte</p>
                : selected.alerts.map(alert => {
                  const type = ALERT_TYPES.find(t => t.value === alert.type);
                  return (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <span className="text-lg flex-shrink-0">{type?.icon || "📝"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${type?.color || "bg-slate-500"}`}>{type?.label}</span>
                          <span className="text-[10px] text-slate-400">{alert.date}</span>
                        </div>
                        <p className="text-sm text-slate-800 mt-1">{alert.message}</p>
                        {alert.amount && <p className="text-xs font-bold text-red-600 mt-0.5">{alert.amount.toFixed(3)} TND</p>}
                      </div>
                      <button onClick={() => resolveAlert(alert.id)}
                        className="text-slate-300 hover:text-green-500 transition-colors flex-shrink-0" title="Résolu / Supprimer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Ban alert */}
          {selected.banned && (
            <div className="flex items-center gap-3 bg-red-100 border border-red-300 rounded-xl px-4 py-3">
              <ShieldOff size={16} className="text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">Client bloqué</p>
                {selected.banReason && <p className="text-xs text-red-600 mt-0.5">Raison: {selected.banReason}</p>}
              </div>
            </div>
          )}

          {/* Debt alert */}
          {selectedStats.totalDebt > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">Client débiteur</p>
                <p className="text-xs text-red-500">
                  Montant restant à payer: <span className="font-bold">{selectedStats.totalDebt.toFixed(3)} TND</span>
                  {" "}sur {selectedStats.contracts.filter(c => {
                    const r = parseFloat(c.resteAPayer || "0") || Math.max(0, parseFloat(c.somme||"0") - parseFloat(c.depot||"0"));
                    return r > 0;
                  }).length} contrat(s)
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Personal info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <User size={14} className="text-slate-400" /> Informations personnelles
              </h3>
              {[
                { icon: CreditCard, label: "CIN", value: selected.cin },
                { icon: Phone,      label: "Téléphone", value: selected.phone },
                { icon: MapPin,     label: "Adresse", value: selected.address },
                { icon: FileText,   label: "Date de naissance", value: selected.dob || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">{label}</p>
                    <p className="text-sm text-slate-700">{value || "—"}</p>
                  </div>
                </div>
              ))}
              {selected.notes && (
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-500">{selected.notes}</div>
              )}
            </div>

            {/* Company info */}
            {selected.isCompany && selected.company && (
              <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 space-y-3">
                <h3 className="font-semibold text-blue-700 text-sm flex items-center gap-2">
                  <Building2 size={14} className="text-blue-500" /> Entreprise
                </h3>
                {[
                  { icon: Building2, label: "Raison sociale", value: selected.company.name },
                  { icon: Hash,      label: "Matricule fiscal (MF)", value: selected.company.mf },
                  { icon: Phone,     label: "Téléphone", value: selected.company.phone },
                  { icon: MapPin,    label: "Adresse", value: selected.company.address },
                  { icon: Mail,      label: "Email", value: selected.company.email || "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <Icon size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <p className="text-sm text-slate-700 font-medium">{value || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contracts history */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <FileText size={14} className="text-amber-500" />
              <span className="font-semibold text-slate-700 text-sm">Historique des contrats ({selectedStats.count})</span>
            </div>
            <div className="divide-y divide-slate-50">
              {selectedStats.contracts.length === 0
                ? <p className="text-center text-slate-400 text-xs py-6">Aucun contrat</p>
                : [...selectedStats.contracts]
                    .sort((a, b) => b.departureDate.localeCompare(a.departureDate))
                    .map(c => {
                    const debt = getDebt(c.id!);
                    const total = parseFloat(c.somme || c.totalFacture || "0");
                    return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-amber-600">#{c.contractNumber}</span>
                          <span className="text-sm text-slate-700">{c.brand} {c.model}</span>
                          <span className="text-xs font-mono text-slate-400">{c.registration}</span>
                        </div>
                        <p className="text-xs text-slate-400">{c.departureDate} → {c.returnDate}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-xs text-slate-500">Total: <span className="font-semibold text-slate-700">{total.toFixed(3)}</span></p>
                        <p className="text-xs text-green-600">Payé: <span className="font-semibold">{debt.paid.toFixed(3)}</span></p>
                        {debt.reste > 0
                          ? <p className="text-xs font-bold text-red-500">Reste: {debt.reste.toFixed(3)} TND</p>
                          : <p className="text-xs font-bold text-green-500">✓ Soldé</p>
                        }
                      </div>
                      <button
                        onClick={() => setEditDebtContract({ id: c.id!, contractNumber: c.contractNumber, total, paid: debt.paid, reste: debt.reste })}
                        className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors flex-shrink-0"
                        title="Modifier le paiement"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  );})
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add / Edit ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editClient ? "Modifier le client" : "Nouveau client"}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {[false, true].map(isComp => (
                  <button key={String(isComp)} onClick={() => setForm(f => ({ ...f, isCompany: isComp }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors border ${form.isCompany === isComp ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-500 border-slate-200 hover:border-amber-300"}`}>
                    {isComp ? <><Building2 size={15} /> Entreprise</> : <><User size={15} /> Particulier</>}
                  </button>
                ))}
              </div>

              {/* Personal fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <F label="Nom complet *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                </div>
                <F label="CIN" value={form.cin} onChange={v => setForm(f => ({ ...f, cin: v }))} />
                <F label="Téléphone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                <div className="col-span-2">
                  <F label="Adresse" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
                </div>
                <F label="Date de naissance" value={form.dob || ""} onChange={v => setForm(f => ({ ...f, dob: v }))} type="date" />
                <div className="col-span-2">
                  <F label="Notes" value={form.notes || ""} onChange={v => setForm(f => ({ ...f, notes: v }))} />
                </div>
              </div>

              {/* Company fields */}
              {form.isCompany && (
                <div className="border border-blue-100 rounded-xl p-4 space-y-3 bg-blue-50/50">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <Building2 size={13} /> Informations de l'entreprise
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <F label="Raison sociale" value={form.company?.name || ""}
                        onChange={v => setForm(f => ({ ...f, company: { ...f.company!, name: v } }))} />
                    </div>
                    <F label="Matricule fiscal (MF)" value={form.company?.mf || ""}
                      onChange={v => setForm(f => ({ ...f, company: { ...f.company!, mf: v } }))}
                      placeholder="ex: 1021113/G/A/M/000" />
                    <F label="Téléphone entreprise" value={form.company?.phone || ""}
                      onChange={v => setForm(f => ({ ...f, company: { ...f.company!, phone: v } }))} />
                    <div className="col-span-2">
                      <F label="Adresse entreprise" value={form.company?.address || ""}
                        onChange={v => setForm(f => ({ ...f, company: { ...f.company!, address: v } }))} />
                    </div>
                    <div className="col-span-2">
                      <F label="Email" value={form.company?.email || ""}
                        onChange={v => setForm(f => ({ ...f, company: { ...f.company!, email: v } }))}
                        type="email" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={saveClient} className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
                {editClient ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Debt Modal ── */}
      {editDebtContract && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <DollarSign size={15} className="text-amber-500" />
                Paiement — Contrat #{editDebtContract.contractNumber}
              </h3>
              <button onClick={() => setEditDebtContract(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span className="text-slate-500">Montant total</span>
                <span className="font-bold text-slate-800">{editDebtContract.total.toFixed(3)} TND</span>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Montant payé (TND)</label>
                <input
                  type="number" step="0.001" min="0"
                  value={editDebtContract.paid}
                  onChange={e => {
                    const paid = Math.max(0, parseFloat(e.target.value) || 0);
                    const reste = Math.max(0, editDebtContract.total - paid);
                    setEditDebtContract(d => d ? { ...d, paid, reste } : null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Reste à payer (TND)</label>
                <input
                  type="number" step="0.001" min="0"
                  value={editDebtContract.reste}
                  onChange={e => {
                    const reste = Math.max(0, parseFloat(e.target.value) || 0);
                    const paid = Math.max(0, editDebtContract.total - reste);
                    setEditDebtContract(d => d ? { ...d, reste, paid } : null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className={`rounded-xl px-4 py-2.5 flex justify-between text-sm ${editDebtContract.reste > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <span className={editDebtContract.reste > 0 ? "text-red-600" : "text-green-600"}>
                  {editDebtContract.reste > 0 ? "Dette restante" : "✓ Soldé"}
                </span>
                <span className={`font-bold ${editDebtContract.reste > 0 ? "text-red-700" : "text-green-700"}`}>
                  {editDebtContract.reste.toFixed(3)} TND
                </span>
              </div>
              {/* Quick buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditDebtContract(d => d ? { ...d, paid: d.total, reste: 0 } : null)}
                  className="flex-1 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors font-medium">
                  Tout payé
                </button>
                <button
                  onClick={() => setEditDebtContract(d => d ? { ...d, paid: 0, reste: 0 } : null)}
                  className="flex-1 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                  Remettre à 0
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setEditDebtContract(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button
                onClick={() => {
                  persistDebts({ ...debts, [editDebtContract.id]: { paid: editDebtContract.paid, reste: editDebtContract.reste } });
                  setEditDebtContract(null);
                }}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicates Modal ── */}
      {showDuplicates && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                Doublons détectés — {duplicateGroups.length} groupe{duplicateGroups.length > 1 ? "s" : ""}
              </h3>
              <button onClick={() => setShowDuplicates(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <p className="px-5 py-2 text-xs text-slate-500 bg-amber-50 border-b border-amber-100">
              Ces clients ont le même numéro CIN mais des données différentes. Choisissez lequel garder et fusionnez les autres.
            </p>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {duplicateGroups.map((group, gi) => (
                <div key={gi} className="border border-red-100 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                      <CreditCard size={12} /> CIN: {group[0].cin} — {group.length} entrées
                    </span>
                    <button
                      onClick={() => { setMergeGroup(group); setShowDuplicates(false); }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors">
                      <GitMerge size={11} /> Fusionner
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.map(c => {
                      const stats = getClientStats(c);
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.phone} · {c.address}</p>
                          </div>
                          <span className="text-xs text-green-600 font-medium">{stats.count} contrats</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowDuplicates(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge Modal ── */}
      {mergeGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <GitMerge size={16} className="text-amber-500" /> Fusionner les doublons
              </h3>
              <button onClick={() => setMergeGroup(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <p className="px-5 py-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
              Choisissez le client à conserver. Les autres seront supprimés.
            </p>
            <div className="p-4 space-y-2">
              {mergeGroup.map(c => {
                const stats = getClientStats(c);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-amber-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">CIN: {c.cin} · {c.phone}</p>
                      <p className="text-xs text-slate-400">{c.address}</p>
                      <p className="text-xs text-green-600 font-medium mt-0.5">{stats.count} contrats · {stats.total.toFixed(0)} TND</p>
                    </div>
                    <button
                      onClick={() => mergeInto(c, mergeGroup.filter(x => x.id !== c.id))}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors whitespace-nowrap">
                      Garder celui-ci
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setMergeGroup(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Alert Modal */}
    {showAlertModal && selected && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-amber-50 rounded-t-2xl">
            <Bell size={18} className="text-amber-600" />
            <h3 className="font-bold text-slate-800">Nouvelle alerte — {selected.name}</h3>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Type</label>
              <div className="flex flex-wrap gap-2">
                {ALERT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setNewAlert(p => ({ ...p, type: t.value }))}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-colors ${newAlert.type === t.value ? `${t.color} text-white border-transparent` : "border-slate-200 text-slate-600"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Description *</label>
              <textarea value={newAlert.message || ""} onChange={e => setNewAlert(p => ({ ...p, message: e.target.value }))}
                placeholder="Ex: Doit 500 TND suite à accident..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Montant (optionnel)</label>
                <input type="number" step="0.001" value={newAlert.amount || ""} onChange={e => setNewAlert(p => ({ ...p, amount: parseFloat(e.target.value) || undefined }))}
                  placeholder="0.000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Date</label>
                <input type="date" value={newAlert.date || ""} onChange={e => setNewAlert(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
            <button onClick={() => setShowAlertModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button onClick={addAlert} disabled={!newAlert.message?.trim()}
              className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium">
              Ajouter
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Ban Modal */}
    {showBanModal && selected && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-red-50 rounded-t-2xl">
            <ShieldOff size={18} className="text-red-600" />
            <h3 className="font-bold text-slate-800">Bloquer {selected.name}</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-slate-600">Ce client sera signalé comme bloqué. Un avertissement apparaîtra lors de la création d'un contrat.</p>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Raison du blocage *</label>
              <textarea value={banReason} onChange={e => setBanReason(e.target.value)}
                placeholder="Ex: Accident non déclaré, dommages non payés..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
            <button onClick={() => setShowBanModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button onClick={confirmBan} disabled={!banReason.trim()}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1.5">
              <ShieldOff size={13} /> Bloquer
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}