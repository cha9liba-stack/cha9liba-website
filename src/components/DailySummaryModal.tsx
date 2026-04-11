import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useContractStore } from "../store/useContractStore";
import { DollarSign, TrendingUp, X, LogOut } from "lucide-react";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

export default function DailySummaryModal() {
  const user = useAuthStore(s => s.user);
  const contracts = useContractStore(s => s.contracts);
  const [show, setShow] = useState(false);
  const [summary, setSummary] = useState({ income: 0, advance: 0, contractsCount: 0 });
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      setShow(true);
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  useEffect(() => {
    if (!show) return;

    // Calculate today's summary (exclude sous-traitant contracts)
    const today = new Date().toISOString().split("T")[0];
    const todayContracts = contracts.filter(c => {
      const createdDate = (c as any)._createdAt
        ? new Date((c as any)._createdAt < 1e12 ? (c as any)._createdAt * 1000 : (c as any)._createdAt).toISOString().split("T")[0]
        : "";
      // Exclude sous-traitant contracts (they have ownerId)
      return createdDate === today && !(c as any).ownerId;
    });

    const income = todayContracts.reduce((sum, c) => sum + (parseFloat(c.totalFacture || "0") || 0), 0);
    const advance = todayContracts.reduce((sum, c) => sum + (parseFloat(c.depot || "0") || 0), 0);

    setSummary({
      income,
      advance,
      contractsCount: todayContracts.length
    });
  }, [show, contracts]);

  const handleConfirmClose = () => {
    setClosing(true);
    window.close();
    // Fallback if window.close() doesn't work
    setTimeout(() => {
      setClosing(false);
      setShow(false);
    }, 500);
  };

  if (!show || !user || user.role !== "admin") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">ملخص اليوم</h3>
              <p className="text-white/80 text-xs">{new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Income */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" />
                <span className="text-sm text-green-700 font-medium">إجمالي المداخيل</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{summary.income.toFixed(3)} TND</span>
            </div>
          </div>

          {/* Advance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">السلف</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">{summary.advance.toFixed(3)} TND</span>
            </div>
          </div>

          {/* Contracts Count */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">عدد العقود</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{summary.contractsCount}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <p className="text-center text-sm text-slate-500 mb-4">
            هل تريد إغلاق البرنامج؟
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShow(false)}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmClose}
              disabled={closing}
              className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {closing ? (
                <>جاري الإغلاق...</>
              ) : (
                <>
                  <LogOut size={16} />
                  إغلاق البرنامج
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
