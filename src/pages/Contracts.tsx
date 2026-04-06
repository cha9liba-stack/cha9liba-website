import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Edit2, Trash2, RefreshCw, Eye, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useContractStore } from "../store/useContractStore";
import { deleteContract, getAllContracts, subscribeToContracts, isRealContract } from "../services/contractService";
import { isSousTraitant } from "../lib/permissions";
import { logAction } from "../services/auditService";
import { useAuthStore } from "../store/useAuthStore";
import ContractModal from "../components/Contracts/ContractModal";
import ContractPreview from "../components/Contracts/ContractPreview";
import type { Contract } from "../types";

type SortKey = "contractNumber" | "driverName" | "brand" | "departureDate" | "returnDate" | "totalFacture";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="opacity-30 ms-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-amber-500 ms-1 inline" />
    : <ChevronDown size={12} className="text-amber-500 ms-1 inline" />;
}

export default function Contracts() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { contracts, setContracts, removeContract, searchQuery, setSearchQuery } = useContractStore();
  const user = useAuthStore((s) => s.user);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("contractNumber");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showArchive, setShowArchive] = useState(false);
  const [archiveContracts, setArchiveContracts] = useState<Contract[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const isST = isSousTraitant(user);

  useEffect(() => {
    setLoading(true);
    getAllContracts().then(data => {
      const real = data.filter(isRealContract);
      // Sous-traitant sees only their own contracts
      const visible = isST ? real.filter(c => c._createdBy === user?.username) : real;
      setContracts(visible);
      setArchiveContracts(isST ? [] : data.filter(c => !isRealContract(c) && !c._deleted));
    }).finally(() => setLoading(false));
    const unsub = subscribeToContracts(data => {
      const real = data.filter(isRealContract);
      const visible = isST ? real.filter(c => c._createdBy === user?.username) : real;
      setContracts(visible);
      setArchiveContracts(isST ? [] : data.filter(c => !isRealContract(c) && !c._deleted));
    });
    return unsub;
  }, [isST, user?.username]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    // Search in both real contracts and archive contracts
    const allContracts = q ? [...contracts, ...archiveContracts] : [...contracts];
    let result = q
      ? allContracts.filter(c =>
          c.contractNumber.includes(q) ||
          (c.driverName || "").toLowerCase().includes(q) ||
          (c.brand || "").toLowerCase().includes(q) ||
          (c.model || "").toLowerCase().includes(q) ||
          (c.registration || "").toLowerCase().includes(q)
        )
      : [...contracts];

    result.sort((a, b) => {
      let va = String(a[sortKey] || "");
      let vb = String(b[sortKey] || "");
      // Numeric sort for contract number and amount
      if (sortKey === "contractNumber" || sortKey === "totalFacture") {
        const na = parseFloat(va) || 0;
        const nb = parseFloat(vb) || 0;
        return sortDir === "asc" ? na - nb : nb - na;
      }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return result;
  }, [contracts, archiveContracts, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew() { setEditingContract(null); setModalOpen(true); }
  function openEdit(c: Contract) { setEditingContract(c); setModalOpen(true); }

  async function handleDelete(id: string) {
    await deleteContract(id);
    removeContract(id);
    await logAction(user, "delete_contract", id);
    setConfirmDeleteId(null);
  }

  const thClass = "px-5 py-3 text-start cursor-pointer select-none hover:text-amber-600 transition-colors whitespace-nowrap";

  const cols: { key: SortKey; label: string }[] = [
    { key: "contractNumber", label: t("contract_number") },
    { key: "driverName",     label: t("driver_name") },
    { key: "brand",          label: t("brand") },
    { key: "departureDate",  label: t("departure_date") },
    { key: "returnDate",     label: t("return_date") },
    { key: "totalFacture",   label: t("total_invoice") },
  ];

  return (
    <div className="p-6 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">{t("contracts")}</h1>
        <div className="flex items-center gap-2">
          {!isST && (
            <button onClick={() => setShowArchive(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${showArchive ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              📁 Archives {archiveContracts.length > 0 && <span className="bg-slate-500 text-white text-xs px-1.5 py-0.5 rounded-full">{archiveContracts.length}</span>}
            </button>
          )}
          <button onClick={openNew}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />{t("new_contract")}
          </button>
        </div>
      </div>

      {/* Archive view */}
      {showArchive && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-600 mb-3">📁 Contrats archivés ({archiveContracts.length})</p>
          {archiveContracts.length === 0
            ? <p className="text-xs text-slate-400 text-center py-4">Aucun contrat archivé</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 uppercase bg-white">
                    <th className="px-3 py-2 text-start">N°</th>
                    <th className="px-3 py-2 text-start">Client</th>
                    <th className="px-3 py-2 text-start">Véhicule</th>
                    <th className="px-3 py-2 text-start">Départ</th>
                    <th className="px-3 py-2 text-start">Retour</th>
                    <th className="px-3 py-2 text-start">Montant</th>
                    <th className="px-3 py-2"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {archiveContracts.sort((a,b) => b.contractNumber.localeCompare(a.contractNumber)).map(c => (
                      <tr key={c.id} className="hover:bg-white transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-500">#{c.contractNumber}</td>
                        <td className="px-3 py-2 text-slate-700">{c.driverName}</td>
                        <td className="px-3 py-2 text-slate-500">{c.brand} {c.model} · {c.registration}</td>
                        <td className="px-3 py-2 text-slate-400">{c.departureDate}</td>
                        <td className="px-3 py-2 text-slate-400">{c.returnDate}</td>
                        <td className="px-3 py-2 font-semibold text-green-600">{parseFloat(c.totalFacture||"0").toFixed(3)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => setPreviewContract(c)} className="p-1 text-slate-400 hover:text-amber-500">
                            <Eye size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
        <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder={t("search_placeholder")}
          className={`w-full bg-white border border-slate-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${isRTL ? "pr-9 pl-4" : "pl-9 pr-4"}`} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">{t("loading")}</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-16 text-sm">{t("no_results")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase bg-slate-50 border-b border-slate-100">
                  {cols.map(({ key, label }) => (
                    <th key={key} className={thClass} onClick={() => handleSort(key)}>
                      {label}
                      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-5 py-3 text-start">{isRTL ? "التسجيل" : "Immat."}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-amber-600">#{c.contractNumber}</td>
                    <td className="px-5 py-3 text-slate-700">{c.driverName}</td>
                    <td className="px-5 py-3 text-slate-600">{c.brand} {c.model}</td>
                    <td className="px-5 py-3 text-slate-500">{c.departureDate}</td>
                    <td className="px-5 py-3 text-slate-500">{c.returnDate}</td>
                    <td className="px-5 py-3 font-medium text-green-600">{c.totalFacture || "—"} TND</td>
                    <td className="px-5 py-3 text-slate-500">{c.registration}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPreviewContract(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title={t("preview")}>
                          <Eye size={15} />
                        </button>
                        {!isST && (
                          <button onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title={t("edit")}>
                            <Edit2 size={15} />
                          </button>
                        )}
                        {!isST && (
                          <button onClick={() => setConfirmDeleteId(c.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t("delete")}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs text-slate-500">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} contrats
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${p === page ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">»</button>
          </div>
        </div>
      )}

      {modalOpen && <ContractModal contract={editingContract} onClose={() => setModalOpen(false)} />}
      {previewContract && <ContractPreview contract={previewContract} onClose={() => setPreviewContract(null)} />}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-slate-700 font-medium mb-5">{t("confirm_delete")}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">{t("no")}</button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg">{t("yes")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
