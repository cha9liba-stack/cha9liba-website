import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Plus, Trash2, ToggleLeft, ToggleRight, DollarSign, Calendar, Percent, RefreshCw } from "lucide-react";
import { 
  getPricingConfig, 
  savePricingConfig, 
  addPricingRule, 
  updatePricingRule, 
  deletePricingRule,
  getDefaultPricingConfig,
  type PricingConfig,
  type PricingRule,
  calculatePrice,
} from "../services/pricingService";
import { FLEET_CARS } from "../lib/config";

export default function PricingSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [testDays, setTestDays] = useState(7);
  const [testBasePrice, setTestBasePrice] = useState(100);
  const [testResult, setTestResult] = useState<Awaited<ReturnType<typeof calculatePrice>> | null>(null);
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  useEffect(() => {
    if (config) {
      calculateTestPrice();
    }
  }, [testDays, testBasePrice, config]);
  
  async function loadConfig() {
    setLoading(true);
    try {
      const cfg = await getPricingConfig();
      setConfig(cfg);
    } catch {
      setConfig(getDefaultPricingConfig());
    } finally {
      setLoading(false);
    }
  }
  
  async function calculateTestPrice() {
    if (!config) return;
    const result = await calculatePrice(testBasePrice, { days: testDays });
    setTestResult(result);
  }
  
  async function handleToggleRule(ruleId: string) {
    const rule = config?.rules.find(r => r.id === ruleId);
    if (rule) {
      await updatePricingRule(ruleId, { active: !rule.active });
      await loadConfig();
    }
  }
  
  async function handleDeleteRule(ruleId: string) {
    if (confirm(isRTL ? "هل تريد حذف هذه القاعدة؟" : "Supprimer cette règle ?")) {
      await deletePricingRule(ruleId);
      await loadConfig();
    }
  }
  
  function getRuleTypeIcon(type: PricingRule["type"]) {
    switch (type) {
      case "weekend": return <Calendar size={14} className="text-purple-500" />;
      case "holiday": return <Calendar size={14} className="text-red-500" />;
      case "season": return <Calendar size={14} className="text-blue-500" />;
      case "long_term": return <Percent size={14} className="text-green-500" />;
      case "loyalty": return <Settings size={14} className="text-amber-500" />;
      case "category": return <Settings size={14} className="text-slate-500" />;
      default: return <DollarSign size={14} />;
    }
  }
  
  function getModifierText(modifier: number) {
    if (modifier > 1) return `+${((modifier - 1) * 100).toFixed(0)}%`;
    if (modifier < 1) return `-${((1 - modifier) * 100).toFixed(0)}%`;
    return "0%";
  }
  
  function getModifierClass(modifier: number) {
    if (modifier > 1) return "bg-red-100 text-red-700";
    if (modifier < 1) return "bg-green-100 text-green-700";
    return "bg-slate-100 text-slate-700";
  }
  
  if (loading || !config) {
    return (
      <div className="p-5">
        <p className="text-slate-400 text-center py-16">{isRTL ? "جاري التحميل..." : "Chargement..."}</p>
      </div>
    );
  }
  
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign size={20} className="text-amber-500" />
            {isRTL ? "إدارة التسعير" : "Gestion des prix"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? "تكوين قواعد التسعير الديناميكي" : "Configurer les règles de tarification dynamique"}
          </p>
        </div>
        <button
          onClick={loadConfig}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-lg transition-colors"
          title={isRTL ? "تحديث" : "Actualiser"}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 text-sm">
            {isRTL ? "قواعد التسعير" : "Règles de tarification"}
          </h2>
        </div>
        
        {config.rules.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{isRTL ? "لا توجد قواعد" : "Aucune règle"}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {config.rules.sort((a, b) => b.priority - a.priority).map(rule => (
              <div key={rule.id} className={`px-5 py-4 ${rule.active ? "" : "bg-slate-50 opacity-60"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`${rule.active ? "text-green-500" : "text-slate-300"}`}
                    >
                      {rule.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {getRuleTypeIcon(rule.type)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {isRTL ? rule.nameAr : rule.name}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {rule.type.replace("_", " ")}
                        {rule.minDays && ` - ${isRTL ? "من" : "from"} ${rule.minDays} ${isRTL ? "يوم" : "jours"}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getModifierClass(rule.modifier)}`}>
                      {getModifierText(rule.modifier)}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 text-sm mb-4">
          {isRTL ? "اختبار حاسبة الأسعار" : "Test calculateur de prix"}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              {isRTL ? "السعر الأساسي (TND)" : "Prix de base (TND)"}
            </label>
            <input
              type="number"
              value={testBasePrice}
              onChange={(e) => setTestBasePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              {isRTL ? "عدد الأيام" : "Nombre de jours"}
            </label>
            <input
              type="number"
              value={testDays}
              onChange={(e) => setTestDays(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              min="1"
            />
          </div>
        </div>
        
        {testResult && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">
                {isRTL ? "السعر الأصلي" : "Prix original"}:
              </span>
              <span className="font-medium">{testResult.originalPrice.toFixed(3)} TND</span>
            </div>
            
            {testResult.appliedRules.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">
                  {isRTL ? "القواعد المطبقة:" : "Règles appliquées:"}
                </p>
                {testResult.appliedRules.map(rule => (
                  <div key={rule.id} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">
                      {isRTL ? rule.nameAr : rule.name}
                    </span>
                    <span className={rule.modifier > 1 ? "text-red-600" : "text-green-600"}>
                      {getModifierText(rule.modifier)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-medium text-slate-700">
                {isRTL ? "السعر النهائي" : "Prix final"}:
              </span>
              <span className="text-xl font-bold text-amber-600">
                {testResult.finalPrice.toFixed(3)} TND
              </span>
            </div>
            
            {testResult.savings > 0 && (
              <div className="flex justify-end">
                <span className="text-xs text-green-600 font-medium">
                  {isRTL ? "توفير:" : "Économie:"} {testResult.savings.toFixed(3)} TND
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 text-sm">
            {isRTL ? "أسعار الأسطول الأساسية" : "Prix de base de la flotte"}
          </h2>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {FLEET_CARS.map(car => (
            <div key={car.registration} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0">
              <div>
                <p className="font-medium text-slate-800 text-sm">{car.brand} {car.model}</p>
                <p className="text-xs text-slate-400 font-mono">{car.registration}</p>
              </div>
              <span className="font-bold text-amber-600">{car.dailyPrice} TND/jour</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
