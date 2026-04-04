import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, FileText } from "lucide-react";
import { getAllContracts } from "../../services/contractService";
import type { Contract } from "../../types";

interface Props {
  onSelect: (contract: Contract) => void;
  onClose: () => void;
}

export default function ContractLookupDialog({ onSelect, onClose }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const all = await getAllContracts();
      const q = query.trim().toLowerCase();
      setResults(
        all
          .filter((c) =>
            c.contractNumber.includes(q) ||
            (c.driverName || "").toLowerCase().includes(q) ||
            (c.driverCin  || "").toLowerCase().includes(q) ||
            (c.registration || "").toLowerCase().includes(q) ||
            (c.brand || "").toLowerCase().includes(q)
          )
          .sort((a, b) => (b._createdAt ?? 0) - (a._createdAt ?? 0))
          .slice(0, 30)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-amber-500" />
            <div>
              <h3 className="font-semibold text-slate-800">
                {isRTL ? "استرداد من عقد سابق" : "Récupérer d'un contrat précédent"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRTL
                  ? "اختر عقداً لنسخ بياناته — يمكنك تعديل أي حقل بعد الاسترداد"
                  : "Sélectionnez un contrat pour copier ses données — modifiables après récupération"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`}
              />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={
                  isRTL
                    ? "ابحث برقم العقد، الاسم، رقم البطاقة، السيارة..."
                    : "Rechercher par N° contrat, nom, CIN, voiture..."
                }
                className={`w-full input ${isRTL ? "pr-9" : "pl-9"}`}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? "..." : isRTL ? "بحث" : "Chercher"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!searched ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">
                {isRTL ? "ابحث عن عقد سابق للاسترداد" : "Recherchez un contrat précédent"}
              </p>
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-14">
              {isRTL ? "لا توجد نتائج" : "Aucun résultat"}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                  <th className="px-4 py-2 text-start">{isRTL ? "رقم العقد" : "N° Contrat"}</th>
                  <th className="px-4 py-2 text-start">{isRTL ? "الاسم" : "Nom"}</th>
                  <th className="px-4 py-2 text-start">{isRTL ? "السيارة" : "Voiture"}</th>
                  <th className="px-4 py-2 text-start">{isRTL ? "التسجيل" : "Immat."}</th>
                  <th className="px-4 py-2 text-start">{isRTL ? "الانطلاق" : "Départ"}</th>
                  <th className="px-4 py-2 text-start">{isRTL ? "المبلغ" : "Montant"}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-amber-600">#{c.contractNumber}</td>
                    <td className="px-4 py-2.5 text-slate-700">{c.driverName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.brand} {c.model}</td>
                    <td className="px-4 py-2.5 text-slate-500">{c.registration}</td>
                    <td className="px-4 py-2.5 text-slate-500">{c.departureDate}</td>
                    <td className="px-4 py-2.5 text-green-600 font-medium">{c.totalFacture || "—"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => { onSelect(c); onClose(); }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        {isRTL ? "استرداد" : "Récupérer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
