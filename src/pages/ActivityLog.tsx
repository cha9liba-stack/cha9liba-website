import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock, FileText, CreditCard, User, Settings, Download, Filter, RefreshCw } from "lucide-react";
import { getActivityLogs, formatActionLabel, type ActionType, type ActivityLogEntry } from "../services/activityLogService";

export default function ActivityLog() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const [filterAction, setFilterAction] = useState<ActionType | "all">("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("week");
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadLogs();
  }, [filterAction, filterUser, dateRange]);
  
  async function loadLogs() {
    setLoading(true);
    try {
      const startDate = dateRange === "today" 
        ? new Date().setHours(0, 0, 0, 0)
        : dateRange === "week"
          ? Date.now() - 7 * 24 * 60 * 60 * 1000
          : 0;
      
      const data = await getActivityLogs({ 
        startDate,
        action: filterAction === "all" ? undefined : filterAction,
        userId: filterUser === "all" ? undefined : filterUser,
      });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }
  
  const uniqueUsers = Array.from(new Set(logs.map(l => l.username)));
  
  const actionTypes: (ActionType | "all")[] = [
    "all",
    "contract.create",
    "contract.update",
    "contract.delete",
    "payment.create",
    "payment.delete",
    "client.create",
    "user.login",
  ];
  
  function getActionIcon(action: ActionType) {
    if (action.startsWith("contract")) return <FileText size={14} className="text-amber-500" />;
    if (action.startsWith("payment")) return <CreditCard size={14} className="text-green-500" />;
    if (action.startsWith("client")) return <User size={14} className="text-blue-500" />;
    if (action.startsWith("user")) return <User size={14} className="text-purple-500" />;
    return <Settings size={14} className="text-slate-500" />;
  }
  
  function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleDateString(isRTL ? "ar-TN" : "fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  
  function exportCSV() {
    const csv = [
      ["Date", "Utilisateur", "Action", "Détails", "Cible"].join(","),
      ...logs.map(l => [
        new Date(l.timestamp).toISOString(),
        l.username,
        l.action,
        l.details || "",
        l.targetLabel || "",
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }
  
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            {isRTL ? "سجل النشاط" : "Journal d'activité"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {logs.length} {isRTL ? "إجراء" : "actions"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-lg transition-colors"
            title={isRTL ? "تحديث" : "Actualiser"}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Download size={16} />
            {isRTL ? "تصدير CSV" : "Exporter CSV"}
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Filter size={14} className="text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="text-sm text-slate-700 border-none outline-none bg-transparent"
          >
            <option value="today">{isRTL ? "اليوم" : "Aujourd'hui"}</option>
            <option value="week">{isRTL ? "الأسبوع" : "Cette semaine"}</option>
            <option value="month">{isRTL ? "الشهر" : "Ce mois"}</option>
            <option value="all">{isRTL ? "الكل" : "Tout"}</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as any)}
            className="text-sm text-slate-700 border-none outline-none bg-transparent"
          >
            {actionTypes.map(action => (
              <option key={action} value={action}>
                {action === "all" 
                  ? (isRTL ? "كل الإجراءات" : "Toutes actions")
                  : formatActionLabel(action).label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="text-sm text-slate-700 border-none outline-none bg-transparent"
          >
            <option value="all">{isRTL ? "كل المستخدمين" : "Tous utilisateurs"}</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">{isRTL ? "جاري التحميل..." : "Chargement..."}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isRTL ? "لا توجد إجراءات" : "Aucune action"}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => {
              const actionLabels = formatActionLabel(log.action);
              return (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">
                          {isRTL ? actionLabels.labelAr : actionLabels.label}
                        </span>
                        {log.targetLabel && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            {log.targetLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {log.username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-slate-400 mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
