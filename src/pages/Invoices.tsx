import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Printer, Trash2, Search, FileText, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { getAllInvoices, deleteInvoice } from "../services/invoiceService";
import type { Invoice } from "../types/invoice";

type SortKey = "number" | "date" | "type" | "client";
type SortDir = "asc" | "desc";

function SortBtn({ col, sortKey, sortDir, onClick }: { col: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
      {col === sortKey
        ? sortDir === "asc" ? <ChevronUp size={12} className="text-amber-500"/> : <ChevronDown size={12} className="text-amber-500"/>
        : <ChevronsUpDown size={12} className="opacity-30"/>
      }
    </button>
  );
}

export default function Invoices() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  useEffect(() => {
    getAllInvoices()
      .then(setInvoices)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = !q ? [...invoices] : invoices.filter(inv =>
      (inv.number || "").toLowerCase().includes(q) ||
      (inv.client?.name || "").toLowerCase().includes(q)
    );
    result.sort((a, b) => {
      let va = "", vb = "";
      if (sortKey === "number") { va = a.number || ""; vb = b.number || ""; }
      else if (sortKey === "date") { va = a.date || ""; vb = b.date || ""; }
      else if (sortKey === "type") { va = a.type || ""; vb = b.type || ""; }
      else if (sortKey === "client") { va = a.client?.name || ""; vb = b.client?.name || ""; }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return result;
  }, [invoices, search, sortKey, sortDir]);

  async function handleDelete(id: string) {
    await deleteInvoice(id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    setConfirmDelete(null);
  }

  const typeLabel = (t: string) =>
    ({ facture: "Facture", bon: "Bon de livraison", devis: "Devis" }[t] || t);

  const typeBadge = (t: string) =>
    ({ facture: "bg-blue-100 text-blue-700", bon: "bg-green-100 text-green-700", devis: "bg-amber-100 text-amber-700" }[t] || "bg-slate-100 text-slate-600");

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Erreur: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={20} className="text-amber-500" />
          {isRTL ? "الفواتير" : "Factures"}
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {isRTL ? "فاتورة جديدة" : "Nouvelle facture"}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isRTL ? "بحث..." : "Rechercher..."}
          className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${isRTL ? "pr-9 pl-4" : "pl-9 pr-4"}`}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">{isRTL ? "جاري التحميل..." : "Chargement..."}</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">
            {isRTL ? "لا توجد فواتير" : "Aucune facture"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-start"><button onClick={() => toggleSort("number")} className="flex items-center gap-1 hover:text-slate-700">N° <SortBtn col="number" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("number")}/></button></th>
                  <th className="px-5 py-3 text-start"><button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-slate-700">{isRTL ? "التاريخ" : "Date"} <SortBtn col="date" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("date")}/></button></th>
                  <th className="px-5 py-3 text-start"><button onClick={() => toggleSort("type")} className="flex items-center gap-1 hover:text-slate-700">{isRTL ? "النوع" : "Type"} <SortBtn col="type" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("type")}/></button></th>
                  <th className="px-5 py-3 text-start"><button onClick={() => toggleSort("client")} className="flex items-center gap-1 hover:text-slate-700">{isRTL ? "العميل" : "Client"} <SortBtn col="client" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("client")}/></button></th>
                  <th className="px-5 py-3 text-start">Total TTC</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-amber-600">{inv.number}</td>
                    <td className="px-5 py-3 text-slate-500">{inv.date}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(inv.type)}`}>
                        {typeLabel(inv.type)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{inv.client?.name}</td>
                    <td className="px-5 py-3 font-semibold text-green-600">
                      {(inv.totalTTC || 0).toFixed(3)} TND
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(inv.id!)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lazy-loaded modals */}
      {modalOpen && (
        <LazyInvoiceModal
          onSave={(inv: Invoice) => { setInvoices(prev => [inv, ...prev]); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
        />
      )}
      {printInvoice && (
        <LazyInvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-slate-700 font-medium mb-5">
              {isRTL ? "هل تريد حذف هذه الفاتورة؟" : "Supprimer cette facture ?"}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                {isRTL ? "إلغاء" : "Annuler"}
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg">
                {isRTL ? "حذف" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lazy load heavy components to avoid crash on import
function LazyInvoiceModal(props: any) {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    import("../components/Invoices/InvoiceModal").then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return null;
  return <Comp {...props} />;
}

function LazyInvoicePrint(props: any) {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    import("../components/Invoices/InvoicePrint").then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return null;
  return <Comp {...props} />;
}
