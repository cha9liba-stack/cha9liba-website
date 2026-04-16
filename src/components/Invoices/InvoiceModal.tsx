import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Trash2, Search, Building2, Plus, ChevronDown } from "lucide-react";
import { useContractStore } from "../../store/useContractStore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  insertInvoice, getNextInvoiceNumber,
  calcInvoiceTotals, amountInWords, updateInvoice
} from "../../services/invoiceService";
import type { Invoice, InvoiceLine, InvoiceType } from "../../types/invoice";
import type { Client } from "../../types";

// ─── Company registry ─────────────────────────────────────────────────────────
const COMPANIES_KEY = "palma_companies";
const CLIENTS_KEY = "palma_clients";
interface Company {
  id: string;
  name: string;
  mf: string;
  address: string;
  phone: string;
}
function loadCompanies(): Company[] {
  try { return JSON.parse(localStorage.getItem(COMPANIES_KEY) || "[]"); } catch { return []; }
}
function saveCompanies(d: Company[]) { localStorage.setItem(COMPANIES_KEY, JSON.stringify(d)); }

// Load companies from clients (clients with isCompany=true or company info)
function loadCompaniesFromClients(): Company[] {
  try {
    const clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]") as Client[];
    console.log("Clients loaded:", clients.length);
    const companies: Company[] = [];
    for (const client of clients) {
      console.log("Client:", client.name, "isCompany:", client.isCompany, "company:", client.company);
      if (client.isCompany && client.company?.name) {
        companies.push({
          id: client.id,
          name: client.company.name,
          mf: client.company.mf || "",
          address: client.company.address || "",
          phone: client.company.phone || "",
        });
      }
    }
    console.log("Companies from clients:", companies);
    return companies;
  } catch (e) {
    console.error("Error loading companies from clients:", e);
    return [];
  }
}

interface Props {
  invoice?: Invoice;
  onSave: (inv: Invoice) => void;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onSave, onClose }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const contracts = useContractStore(s => s.contracts);
  const user = useAuthStore(s => s.user);

  const [type, setType] = useState<InvoiceType>("facture");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientName, setClientName] = useState("");
  const [clientMF, setClientMF] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [contractSearch, setContractSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Company state - load from both palma_companies and clients
  const [companies, setCompanies] = useState<Company[]>(() => {
    const regCompanies = loadCompanies();
    const clientCompanies = loadCompaniesFromClients();
    // Merge without duplicates (by id)
    const merged = [...regCompanies];
    for (const cc of clientCompanies) {
      if (!merged.find(c => c.id === cc.id)) {
        merged.push(cc);
      }
    }
    return merged;
  });
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState<Omit<Company, "id">>({ name: "", mf: "", address: "", phone: "" });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    getNextInvoiceNumber().then(n => {
      if (invoice) {
        setType(invoice.type);
        setNumber(invoice.number || "");
        setDate(invoice.date || n);
        setClientName(invoice.client?.name || "");
        setClientMF(invoice.client?.mf || "");
        setClientAddress(invoice.client?.address || "");
        setClientPhone(invoice.client?.phone || "");
        setLines(invoice.lines || []);
        setSelectedCompanyId(invoice.companyId || null);
      } else {
        setNumber(n);
      }
    });
  }, [invoice]);

  function selectCompany(c: Company) {
    setSelectedCompanyId(c.id);
    setClientName(c.name);
    setClientMF(c.mf);
    setClientAddress(c.address);
    setClientPhone(c.phone);
    setShowCompanyPicker(false);
  }

  function addCompany() {
    if (!newCompany.name.trim()) return;
    const c: Company = { ...newCompany, id: "co_" + Date.now() };
    const updated = [...companies, c];
    setCompanies(updated);
    saveCompanies(updated);
    selectCompany(c);
    setNewCompany({ name: "", mf: "", address: "", phone: "" });
    setShowAddCompany(false);
  }

  function deleteCompany(id: string) {
    const updated = companies.filter(c => c.id !== id);
    setCompanies(updated);
    saveCompanies(updated);
    if (selectedCompanyId === id) setSelectedCompanyId(null);
  }

  const is2026Plus = useMemo(() => {
    const y = parseInt(date.slice(0, 4), 10);
    return y >= 2026;
  }, [date]);

  const totals = useMemo(() =>
    calcInvoiceTotals(lines, type, is2026Plus),
    [lines, type, is2026Plus]
  );

  // Search contracts to add
  const contractResults = useMemo(() => {
    const q = contractSearch.toLowerCase().trim();
    if (!q) return [];
    return contracts
      .filter(c =>
        c.contractNumber.includes(q) ||
        (c.driverName || "").toLowerCase().includes(q) ||
        (c.registration || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [contracts, contractSearch]);

  function addContractLine(c: typeof contracts[0]) {
    // Auto-fill client from first contract
    if (lines.length === 0) {
      setClientName(c.driverName || "");
      setClientPhone(c.driverPhone || "");
      setClientAddress(c.driverAddress || "");
    }
    const dep = new Date(c.departureDate || "");
    const ret = new Date(c.returnDate || "");
    const days = isNaN(dep.getTime()) || isNaN(ret.getTime())
      ? 1
      : Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / 86400000));
    const amount = parseFloat(c.totalFacture || "0");

    setLines(prev => [...prev, {
      contractNumber: c.contractNumber,
      date: c.departureDate || "",
      designation: `Voiture ${c.brand} ${c.model} ${c.registration}`,
      days,
      amount,
    }]);
    setContractSearch("");
  }

  function removeLine(i: number) {
    setLines(prev => prev.filter((_, j) => j !== i));
  }

  function updateLine(i: number, field: keyof InvoiceLine, val: string | number) {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, [field]: val } : l));
  }

  async function handleSave() {
    if (!clientName || lines.length === 0) return;
    setSaving(true);
try {
      setSaving(true);
      const invoiceData: Invoice = {
        id: invoice?.id,
        type,
        number,
        date,
        client: { name: clientName, mf: clientMF, address: clientAddress, phone: clientPhone },
        companyId: selectedCompanyId,
        lines,
        ...totals,
        amountInWords: amountInWords(totals.totalTTC),
        _createdAt: invoice?._createdAt || Date.now(),
        _createdBy: invoice?._createdBy || user?.username,
      };

      if (invoiceData.id) {
        await updateInvoice(invoiceData.id, invoiceData);
        onSave(invoiceData);
      } else {
        const id = await insertInvoice(invoiceData);
        onSave({ ...invoiceData, id });
      }
    } finally {
      setSaving(false);
    }
  }

  const typeOptions: { value: InvoiceType; label: string }[] = [
    { value: "facture", label: "Facture" },
    { value: "bon",     label: "Bon de livraison" },
    { value: "devis",   label: "Devis" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" dir={isRTL ? "rtl" : "ltr"}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">
            {isRTL ? "فاتورة جديدة" : "Nouvelle facture"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Type + Number + Date */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Type</label>
              <select value={type} onChange={e => setType(e.target.value as InvoiceType)}
                className="input">
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase">N° Facture</label>
              <input value={number} onChange={e => setNumber(e.target.value)} className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
            </div>
          </div>

          {/* Client info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                {isRTL ? "معلومات العميل" : "Informations client"}
              </p>
              {/* Company picker button */}
              <div className="relative">
                <button
                  onClick={() => { setShowCompanyPicker(p => !p); setShowAddCompany(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
                >
                  <Building2 size={13} />
                  {selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name : "Société"}
                  <ChevronDown size={11} />
                </button>
                {showCompanyPicker && (
                  <div className="absolute end-0 top-9 z-30 bg-white border border-slate-200 rounded-xl shadow-xl w-72 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Sélectionner une société</span>
                      <button onClick={() => { setShowAddCompany(p => !p); }}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700">
                        <Plus size={11} /> Ajouter
                      </button>
                    </div>
                    {/* Add company form */}
                    {showAddCompany && (
                      <div className="p-3 border-b border-slate-100 space-y-2 bg-amber-50">
                        <input value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))}
                          placeholder="Nom société *" className="input text-xs py-1.5 w-full" />
                        <input value={newCompany.mf} onChange={e => setNewCompany(p => ({ ...p, mf: e.target.value }))}
                          placeholder="MF (ex: 1322956/T)" className="input text-xs py-1.5 w-full" />
                        <input value={newCompany.address} onChange={e => setNewCompany(p => ({ ...p, address: e.target.value }))}
                          placeholder="Adresse" className="input text-xs py-1.5 w-full" />
                        <input value={newCompany.phone} onChange={e => setNewCompany(p => ({ ...p, phone: e.target.value }))}
                          placeholder="Tél." className="input text-xs py-1.5 w-full" />
                        <button onClick={addCompany} disabled={!newCompany.name.trim()}
                          className="w-full py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50">
                          Enregistrer
                        </button>
                      </div>
                    )}
                    {/* Company list */}
                    <div className="max-h-48 overflow-y-auto">
                      {companies.length === 0
                        ? <p className="text-center text-slate-400 text-xs py-4">Aucune société enregistrée</p>
                        : companies.map(c => (
                          <div key={c.id}
                            className={`flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 ${selectedCompanyId === c.id ? "bg-blue-50" : ""}`}
                            onClick={() => selectCompany(c)}>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                              <p className="text-[10px] text-slate-400">{c.mf} · {c.phone}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteCompany(c.id); }}
                              className="text-slate-300 hover:text-red-500 p-1">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-slate-500">{isRTL ? "الاسم" : "Nom"}</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">MF</label>
                <input value={clientMF} onChange={e => setClientMF(e.target.value)} className="input" placeholder="1322956/T" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">{isRTL ? "الهاتف" : "Tél."}</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-slate-500">{isRTL ? "العنوان" : "Adresse"}</label>
                <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="input" />
              </div>
            </div>
          </div>

          {/* Add contract */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              {isRTL ? "إضافة عقد" : "Ajouter un contrat"}
            </p>
            <div className="relative">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
              <input value={contractSearch} onChange={e => setContractSearch(e.target.value)}
                placeholder={isRTL ? "ابحث برقم العقد أو الاسم..." : "Rechercher par N° contrat ou nom..."}
                className={`w-full input ${isRTL ? "pr-9" : "pl-9"}`} />
            </div>
            {contractResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {contractResults.map(c => (
                  <button key={c.id} onClick={() => addContractLine(c)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 text-sm border-b border-slate-50 last:border-0 transition-colors text-start">
                    <span className="font-medium text-amber-600">#{c.contractNumber}</span>
                    <span className="text-slate-600">{c.driverName}</span>
                    <span className="text-slate-500">{c.brand} {c.model} - {c.registration}</span>
                    <span className="text-green-600 font-medium">{c.totalFacture} TND</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines table */}
          {lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase">
                    <th className="px-3 py-2 text-start">N° Contrat</th>
                    <th className="px-3 py-2 text-start">Date</th>
                    <th className="px-3 py-2 text-start">Désignation</th>
                    <th className="px-3 py-2 text-center">Jours</th>
                    {type === "devis" && <th className="px-3 py-2 text-end">Prix/j</th>}
                    <th className="px-3 py-2 text-end">Montant</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-amber-600">#{l.contractNumber}</td>
                      <td className="px-3 py-2">
                        <input type="date" value={l.date} onChange={e => updateLine(i, "date", e.target.value)}
                          className="input text-xs py-1 w-32" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={l.designation} onChange={e => updateLine(i, "designation", e.target.value)}
                          className="input text-xs py-1 w-48" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={l.days} onChange={e => updateLine(i, "days", parseInt(e.target.value) || 0)}
                          className="input text-xs py-1 w-14 text-center" />
                      </td>
                      {type === "devis" && (
                        <td className="px-3 py-2">
                          <input type="number" value={l.pricePerDay || 0}
                            onChange={e => {
                              const p = parseFloat(e.target.value) || 0;
                              updateLine(i, "pricePerDay", p);
                              updateLine(i, "amount", p * l.days);
                            }}
                            className="input text-xs py-1 w-20 text-end" />
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <input type="number" value={l.amount} onChange={e => updateLine(i, "amount", parseFloat(e.target.value) || 0)}
                          className="input text-xs py-1 w-24 text-end font-mono" />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeLine(i)} className="text-slate-300 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {lines.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 ms-auto max-w-xs">
              <TotalRow label="Montant HT"   value={totals.montantHT.toFixed(3)} />
              {type === "facture" && <TotalRow label="TVA 19%"    value={totals.tva.toFixed(3)} />}
              {is2026Plus && totals.tsl2dj > 0 && <TotalRow label="TSL 2dt/j" value={totals.tsl2dj.toFixed(3)} color="text-amber-700" />}
              {type === "facture" && <TotalRow label="Timbre"     value={totals.timbre.toFixed(3)} />}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                <span className="text-slate-700">TOTAL TTC</span>
                <span className="text-green-700 font-mono">{totals.totalTTC.toFixed(3)} TND</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">
            {isRTL ? "إلغاء" : "Annuler"}
          </button>
          <button onClick={handleSave} disabled={saving || !clientName || lines.length === 0}
            className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg disabled:opacity-60">
            {saving ? "..." : isRTL ? "حفظ" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, color = "text-slate-700" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-medium ${color}`}>{value}</span>
    </div>
  );
}
