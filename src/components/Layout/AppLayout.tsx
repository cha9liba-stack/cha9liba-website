import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import Sidebar from "./Sidebar";
import { getAllContracts, subscribeToContracts } from "../../services/contractService";
import { useContractStore } from "../../store/useContractStore";

export default function AppLayout() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const setContracts = useContractStore((s) => s.setContracts);
  const contracts = useContractStore((s) => s.contracts);
  const [loading, setLoading] = useState(contracts.length === 0);

  useEffect(() => {
    // Load contracts once on mount
    if (contracts.length === 0) {
      setLoading(true);
      getAllContracts()
        .then((data) => {
          setContracts(data);
        })
        .catch(console.warn)
        .finally(() => setLoading(false));
    }

    // Subscribe to realtime updates
    const unsub = subscribeToContracts((data) => {
      setContracts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div
      className={`flex min-h-screen bg-slate-50 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute top-3 end-4 flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm text-xs text-slate-500 z-10">
            <RefreshCw size={12} className="animate-spin text-amber-500" />
            {isRTL ? "جاري تحميل البيانات..." : "Chargement..."}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
