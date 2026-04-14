import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw, WifiOff, Wifi } from "lucide-react";
import Sidebar from "./Sidebar";
import { getAllContracts, subscribeToContracts, isRealContract } from "../../services/contractService";
import { useContractStore } from "../../store/useContractStore";
import { useFleetStats } from "../../hooks/useFleetStats";
import { useAuthStore } from "../../store/useAuthStore";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import BranchSelectModal from "../BranchSelectModal";
import DailySummaryModal from "../DailySummaryModal";
import { config } from "../../lib/config";
import { fetchRolePermissions } from "../../lib/permissions";

export default function AppLayout() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const setContracts = useContractStore((s) => s.setContracts);
  const contracts = useContractStore((s) => s.contracts);
  const setContractSettings = useContractStore((s) => s.setContractSettings);
  const [loading, setLoading] = useState(contracts.length === 0);
  const [isMobile, setIsMobile] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load contract settings from Firebase
  useEffect(() => {
    fetch(`${config.firebase.databaseUrl}/${config.firebase.paths.contractSettings}.json`)
      .then(r => r.json())
      .then(data => { if (data) setContractSettings(data); })
      .catch(() => {});
  }, []);

  // Load role permissions from Firebase
  useEffect(() => {
    fetchRolePermissions();
  }, []);
  const user = useAuthStore(s => s.user);
  const selectedBranch = useAuthStore(s => s.selectedBranch);
  const setSelectedBranch = useAuthStore(s => s.setSelectedBranch);

  // Show branch selector for non-admin users who haven't selected a branch yet
  // If user has a pre-assigned branch, use it automatically
  useEffect(() => {
    if (user && user.role !== "admin" && !selectedBranch && (user as any).branchId) {
      // Auto-assign from user profile
      fetch(`${config.firebase.databaseUrl}/${config.firebase.paths.branches}/${(user as any).branchId}.json`)
        .then(r => r.json())
        .then(data => {
          if (data) setSelectedBranch({ id: (user as any).branchId, name: data.name });
        }).catch(() => {});
    }
  }, [user]);

  const needsBranchSelect = user && user.role !== "admin" && !selectedBranch && !(user as any).branchId;

  // Compute fleet stats globally
  useFleetStats();

  useEffect(() => {
    // Load contracts once on mount
    if (contracts.length === 0) {
      setLoading(true);
      getAllContracts()
        .then((data) => {
          setContracts(data.filter(isRealContract));
        })
        .catch(console.warn)
        .finally(() => setLoading(false));
    }

    // Subscribe to realtime updates
    const unsub = subscribeToContracts((data) => {
      setContracts(data.filter(isRealContract));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div
      className={`flex min-h-screen bg-slate-50 ${isRTL ? "flex-row-reverse" : "flex-row"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {needsBranchSelect && <BranchSelectModal onSelect={setSelectedBranch} />}
      <Sidebar />
      <main className={`flex-1 overflow-auto relative ${isMobile ? 'pt-16 px-2' : ''}`}>
        {!isOnline && (
          <div className={`absolute flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1.5 shadow-sm text-xs text-red-600 z-50 ${isMobile ? 'top-16 start-2 end-2' : 'top-3 start-4'}`}>
            <WifiOff size={12} />
            {isRTL ? "غير متصل بالإنترنت - البيانات المحلية معروضة" : "Hors ligne - Affichage des données locales"}
          </div>
        )}
        {isOnline && loading && (
          <div className={`absolute flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm text-xs text-slate-500 z-10 ${isMobile ? 'top-20 end-2' : 'top-3 end-4'}`}>
            <RefreshCw size={12} className="animate-spin text-amber-500" />
            {isRTL ? "جاري تحميل البيانات..." : "Chargement..."}
          </div>
        )}
        <div className={isMobile ? 'pb-20' : ''}>
          <Outlet />
        </div>
      </main>
      <DailySummaryModal />
    </div>
  );
}
