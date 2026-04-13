import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Trash2, Wrench, Calendar, Gauge, DollarSign, AlertTriangle } from "lucide-react";
import { 
  getMaintenanceForCar, 
  addMaintenanceRecord, 
  deleteMaintenanceRecord,
  getLastMaintenance,
  getNextOilChangeKm,
  type MaintenanceRecord 
} from "../../services/maintenanceService";
import type { CarProfile } from "../../types";

interface Props {
  car: CarProfile | { registration: string; brand: string; model: string; kilometrage?: number };
  onClose: () => void;
}

const MAINTENANCE_TYPES = [
  { value: "oil_change", label: "Vidange", labelAr: "تغيير زيت", icon: "🔧" },
  { value: "tire_change", label: "Pneumatiques", labelAr: "إطارات", icon: "🛞" },
  { value: "brake_check", label: "Freins", labelAr: "فرامل", icon: "🛑" },
  { value: "general_service", label: "Révision", labelAr: "خدمة عامة", icon: "⚙️" },
  { value: "repair", label: "Réparation", labelAr: "إصلاح", icon: "🔩" },
  { value: "other", label: "Autre", labelAr: "أخرى", icon: "📝" },
] as const;

export default function MaintenanceModal({ car, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [nextOilKm, setNextOilKm] = useState<number | null>(null);
  
  // Form state
  const [type, setType] = useState<MaintenanceRecord["type"]>("oil_change");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [km, setKm] = useState(car.kilometrage?.toString() || "");
  const [cost, setCost] = useState("");
  const [mechanic, setMechanic] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [car.registration]);

  function loadRecords() {
    const r = getMaintenanceForCar(car.registration);
    setRecords(r);
    const next = getNextOilChangeKm(car.registration);
    setNextOilKm(next);
  }

  async function handleAddRecord() {
    if (!date || !km) return;
    setSaving(true);
    
    try {
      addMaintenanceRecord({
        registration: car.registration,
        type,
        date,
        km: parseInt(km),
        cost: parseFloat(cost) || 0,
        mechanic,
        notes,
        createdBy: "Current User", // TODO: Get from auth store
      });
      
      loadRecords();
      setShowAddForm(false);
      setCost("");
      setMechanic("");
      setNotes("");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cet enregistrement ?")) return;
    deleteMaintenanceRecord(id);
    loadRecords();
  }

  const currentKm = car.kilometrage || 0;
  const kmToNextOil = nextOilKm ? nextOilKm - currentKm : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Wrench size={20} className="text-amber-500" />
              {isRTL ? "صيانة السيارة" : "Maintenance véhicule"}
            </h2>
            <p className="text-sm text-slate-500">
              {car.brand} {car.model} - {car.registration}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Oil Change Status */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">{isRTL ? "الكيلومتر الحالي" : "Kilométrage actuel"}</p>
              <p className="text-xl font-bold text-slate-800">{(currentKm || 0).toLocaleString()} km</p>
            </div>
            <div className={`${kmToNextOil !== null && kmToNextOil <= 0 ? "bg-red-50" : kmToNextOil !== null && kmToNextOil <= 500 ? "bg-amber-50" : "bg-green-50"} rounded-xl p-4 text-center`}>
              <p className={`text-xs mb-1 ${kmToNextOil !== null && kmToNextOil <= 0 ? "text-red-600" : kmToNextOil !== null && kmToNextOil <= 500 ? "text-amber-600" : "text-green-600"}`}>
                {isRTL ? "للزيوت القادمة" : "Prochaine vidange"}
              </p>
              <p className={`text-xl font-bold ${kmToNextOil !== null && kmToNextOil <= 0 ? "text-red-600" : kmToNextOil !== null && kmToNextOil <= 500 ? "text-amber-600" : "text-green-600"}`}>
                {nextOilKm ? `${nextOilKm.toLocaleString()} km` : "-"}
              </p>
            </div>
            <div className={`${kmToNextOil !== null && kmToNextOil <= 0 ? "bg-red-50" : "bg-slate-50"} rounded-xl p-4 text-center`}>
              <p className={`text-xs mb-1 ${kmToNextOil !== null && kmToNextOil <= 0 ? "text-red-600" : "text-slate-500"}`}>
                {isRTL ? "المتبقي" : "Restant"}
              </p>
              <p className={`text-xl font-bold ${kmToNextOil !== null && kmToNextOil <= 0 ? "text-red-600" : "text-slate-800"}`}>
                {kmToNextOil !== null ? `${kmToNextOil.toLocaleString()} km` : "-"}
              </p>
            </div>
          </div>

          {/* Alert if overdue */}
          {kmToNextOil !== null && kmToNextOil <= 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  {isRTL ? "تغيير الزيت متأخر!" : "Vidange en retard!"}
                </p>
                <p className="text-xs text-red-600">
                  {isRTL 
                    ? `تأخرت بـ ${Math.abs(kmToNextOil).toLocaleString()} كم عن الموعد المحدد`
                    : `En retard de ${Math.abs(kmToNextOil).toLocaleString()} km`}
                </p>
              </div>
            </div>
          )}

          {/* Add Record Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors mb-6"
            >
              <Plus size={18} />
              {isRTL ? "إضافة صيانة" : "Ajouter maintenance"}
            </button>
          )}

          {/* Add Record Form */}
          {showAddForm && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-4">
              <h3 className="font-semibold text-slate-700">
                {isRTL ? "إضافة سجل صيانة جديد" : "Nouveau enregistrement"}
              </h3>
              
              {/* Type */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">
                  {isRTL ? "النوع" : "Type"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MAINTENANCE_TYPES.map((mt) => (
                    <button
                      key={mt.value}
                      onClick={() => setType(mt.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        type === mt.value
                          ? "bg-amber-500 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300"
                      }`}
                    >
                      <span className="me-1">{mt.icon}</span>
                      {isRTL ? mt.labelAr : mt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & KM */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "التاريخ" : "Date"}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "الكيلومتر" : "Kilométrage"}</label>
                  <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Cost & Mechanic */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "التكلفة (TND)" : "Coût (TND)"}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "الميكانيكي" : "Mécanicien"}</label>
                  <input
                    type="text"
                    value={mechanic}
                    onChange={(e) => setMechanic(e.target.value)}
                    placeholder={isRTL ? "اسم الميكانيكي" : "Nom mécanicien"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  {isRTL ? "ملاحظات (اختياري)" : "Notes (optionnel)"}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRTL ? "ملاحظات..." : "Notes..."}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isRTL ? "إلغاء" : "Annuler"}
                </button>
                <button
                  onClick={handleAddRecord}
                  disabled={!date || !km || saving}
                  className="flex-1 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? (isRTL ? "جاري الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ" : "Enregistrer")}
                </button>
              </div>
            </div>
          )}

          {/* Maintenance History */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              {isRTL ? "سجل الصيانة" : "Historique maintenance"}
              <span className="text-xs text-slate-400">({records.length})</span>
            </h3>
            
            {records.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Wrench size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{isRTL ? "لا توجد سجلات" : "Aucun enregistrement"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map((record) => {
                  const typeInfo = MAINTENANCE_TYPES.find(t => t.value === record.type);
                  return (
                    <div 
                      key={record.id}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                    >
                      <div className="text-2xl">{typeInfo?.icon || "📝"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">
                            {isRTL ? typeInfo?.labelAr : typeInfo?.label}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {record.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Gauge size={10} />
                            {record.km.toLocaleString()} km
                          </span>
                          {record.cost > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign size={10} />
                              {record.cost.toFixed(3)} TND
                            </span>
                          )}
                        </div>
                        {record.notes && (
                          <p className="text-xs text-slate-400 mt-1">{record.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={isRTL ? "حذف" : "Supprimer"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
          >
            {isRTL ? "إغلاق" : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}
