import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Star, Gift, TrendingUp, Users, Search, ChevronRight, Award, RefreshCw } from "lucide-react";
import { 
  getAllClientPoints, 
  getTopClients, 
  getLevelInfo, 
  getNextLevel,
  getPointsToNextLevel,
  LOYALTY_LEVELS,
  type ClientPoints 
} from "../services/loyaltyService";

export default function LoyaltyProgram() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [allClients, setAllClients] = useState<ClientPoints[]>([]);
  const [topClients, setTopClients] = useState<ClientPoints[]>([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    setLoading(true);
    try {
      const [all, top] = await Promise.all([
        getAllClientPoints(),
        getTopClients(10)
      ]);
      setAllClients(all);
      setTopClients(top);
    } finally {
      setLoading(false);
    }
  }
  
  const filteredClients = search
    ? allClients.filter(c => 
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.cin.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : allClients;
  
  const stats = {
    totalClients: allClients.length,
    totalPoints: allClients.reduce((sum, c) => sum + c.points, 0),
    totalRents: allClients.reduce((sum, c) => sum + c.totalRents, 0),
    avgPoints: allClients.length > 0 ? Math.round(allClients.reduce((sum, c) => sum + c.points, 0) / allClients.length) : 0,
  };
  
  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Award size={20} className="text-amber-500" />
          {isRTL ? "برنامج الولاء" : "Programme de fidélité"}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {isRTL ? "إدارة نقاط العملاء ومكافآتهم" : "Gérer les points et récompenses des clients"}
        </p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <Users size={20} className="mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold text-slate-800">{stats.totalClients}</p>
          <p className="text-xs text-slate-500">{isRTL ? "عميل" : "Clients"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <Star size={20} className="mx-auto mb-2 text-amber-500" />
          <p className="text-2xl font-bold text-slate-800">{stats.totalPoints.toLocaleString()}</p>
          <p className="text-xs text-slate-500">{isRTL ? "نقطة" : "Points"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <TrendingUp size={20} className="mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold text-slate-800">{stats.avgPoints}</p>
          <p className="text-xs text-slate-500">{isRTL ? "متوسط النقاط" : "Moyenne"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <Gift size={20} className="mx-auto mb-2 text-purple-500" />
          <p className="text-2xl font-bold text-slate-800">{stats.totalRents}</p>
          <p className="text-xs text-slate-500">{isRTL ? "إيجار" : "Locations"}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 text-sm">
            {isRTL ? "مستويات الولاء" : "Niveaux de fidélité"}
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          {LOYALTY_LEVELS.map(level => (
            <div 
              key={level.id}
              className="rounded-xl p-4 text-center border-2"
              style={{ borderColor: level.color + "40", backgroundColor: level.color + "10" }}
            >
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: level.color }}
              >
                {level.name[0]}
              </div>
              <p className="font-bold text-slate-800">{isRTL ? level.nameAr : level.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {isRTL ? "من" : "From"} {level.minPoints.toLocaleString()} {isRTL ? "نقطة" : "pts"}
              </p>
              {level.discountPercent > 0 && (
                <p className="text-sm font-bold text-green-600 mt-2">
                  -{level.discountPercent}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
            <Star size={14} className="text-amber-500" />
            {isRTL ? "أفضل العملاء" : "Meilleurs clients"}
          </h2>
          <button 
            onClick={loadData} 
            className="p-1 text-slate-400 hover:text-amber-500"
            title={isRTL ? "تحديث" : "Actualiser"}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm">{isRTL ? "جاري التحميل..." : "Chargement..."}</p>
          </div>
        ) : topClients.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isRTL ? "لا يوجد عملاء بعد" : "Aucun client"}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topClients.slice(0, 5).map((client, index) => {
              const level = getLevelInfo(client.level);
              return (
                <div 
                  key={client.clientId}
                  onClick={() => setSelectedClient(client)}
                  className="px-5 py-4 hover:bg-slate-50 cursor-pointer flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{client.clientName}</p>
                    <p className="text-xs text-slate-500">{client.cin}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">{client.points.toLocaleString()} pts</p>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: level?.color + "30", color: level?.color }}
                    >
                      {isRTL ? level?.nameAr : level?.name}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRTL ? "البحث عن عميل..." : "Rechercher un client..."}
              className={`w-full ${isRTL ? "pr-9" : "pl-9"} pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400`}
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredClients.slice(0, 20).map(client => {
            const level = getLevelInfo(client.level);
            const nextLevel = getNextLevel(client.level);
            const pointsToNext = getPointsToNextLevel(client.points);
            return (
              <div 
                key={client.clientId}
                onClick={() => setSelectedClient(client)}
                className="px-5 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-b-0"
              >
                <div>
                  <p className="font-medium text-slate-800 text-sm">{client.clientName}</p>
                  <p className="text-xs text-slate-400">{client.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">{client.points.toLocaleString()} pts</p>
                  {pointsToNext > 0 && nextLevel && (
                    <p className="text-[10px] text-slate-400">
                      {pointsToNext} {isRTL ? "للحظة التالية" : "au suivant"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {filteredClients.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-sm">{isRTL ? "لا توجد نتائج" : "Aucun résultat"}</p>
            </div>
          )}
        </div>
      </div>
      
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">{selectedClient.clientName}</h2>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              {(() => {
                const level = getLevelInfo(selectedClient.level);
                const nextLevel = getNextLevel(selectedClient.level);
                const pointsToNext = getPointsToNextLevel(selectedClient.points);
                return (
                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: level?.color + "20" }}>
                    <div 
                      className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: level?.color }}
                    >
                      {level?.name[0]}
                    </div>
                    <p className="font-bold text-slate-800">{isRTL ? level?.nameAr : level?.name}</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2">{selectedClient.points.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">points</p>
                    
                    {nextLevel && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 mb-1">
                          {pointsToNext} {isRTL ? "نقطة للترقية" : "pts pour le suivant"}
                        </p>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${Math.min(100, (selectedClient.points / nextLevel.minPoints) * 100)}%`,
                              backgroundColor: nextLevel.color 
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {isRTL ? "الهدف:" : "Objectif:"} {nextLevel.minPoints.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{selectedClient.totalRents}</p>
                  <p className="text-xs text-slate-500">{isRTL ? "إيجار" : "Locations"}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedClient.totalSpent.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">TND {isRTL ? "مُنفق" : "dépensés"}</p>
                </div>
              </div>
              
              {(() => {
                const level = getLevelInfo(selectedClient.level);
                if (!level) return null;
                return (
                  <div className="bg-amber-50 rounded-xl p-4">
                    <p className="font-medium text-slate-700 text-sm mb-2">
                      {isRTL ? "المزايا:" : "Avantages:"}
                    </p>
                    <ul className="space-y-1">
                      {(isRTL ? level.benefitsAr : level.benefits).map((benefit, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
