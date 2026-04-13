import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Trash2, CreditCard, Banknote, Building2, Wallet, Clock, Receipt } from "lucide-react";
import { 
  getPaymentsForContract, 
  addPayment, 
  deletePayment, 
  getPaymentSummary,
  type Payment 
} from "../../services/paymentService";
import type { Contract } from "../../types";

interface Props {
  contract: Contract;
  onClose: () => void;
  onPaymentAdded?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces", icon: Banknote },
  { value: "card", label: "Carte bancaire", icon: CreditCard },
  { value: "check", label: "Chèque", icon: Receipt },
  { value: "transfer", label: "Virement", icon: Building2 },
  { value: "other", label: "Autre", icon: Wallet },
] as const;

const PAYMENT_TYPES = [
  { value: "deposit", label: "Acompte", labelAr: "عربون" },
  { value: "partial", label: "Paiement partiel", labelAr: "دفع جزئي" },
  { value: "final", label: "Paiement final", labelAr: "الدفعة الأخيرة" },
  { value: "other", label: "Autre", labelAr: "أخرى" },
] as const;

export default function PaymentModal({ contract, onClose, onPaymentAdded }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState(getPaymentSummary(contract.id!, parseFloat(contract.totalFacture || contract.somme || "0")));
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("cash");
  const [type, setType] = useState<Payment["type"]>("partial");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [contract.id]);

  function loadPayments() {
    const p = getPaymentsForContract(contract.id!);
    setPayments(p.sort((a, b) => b._createdAt - a._createdAt));
    setSummary(getPaymentSummary(contract.id!, parseFloat(contract.totalFacture || contract.somme || "0")));
  }

  async function handleAddPayment() {
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    
    try {
      addPayment({
        contractId: contract.id!,
        contractNumber: contract.contractNumber,
        amount: parseFloat(amount),
        method,
        type,
        date,
        time,
        notes,
        receivedBy: "Current User", // TODO: Get from auth store
      });
      
      loadPayments();
      setShowAddForm(false);
      setAmount("");
      setNotes("");
      onPaymentAdded?.();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(paymentId: string) {
    if (!confirm("Supprimer ce paiement ?")) return;
    deletePayment(paymentId);
    loadPayments();
    onPaymentAdded?.();
  }

  const totalAmount = parseFloat(contract.totalFacture || contract.somme || "0");
  const paidAmount = summary.paid;
  const remainingAmount = summary.remaining;
  const progressPercent = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;

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
              <Receipt size={20} className="text-amber-500" />
              {isRTL ? "إدارة المدفوعات" : "Gestion des paiements"}
            </h2>
            <p className="text-sm text-slate-500">
              {isRTL ? "العقد" : "Contrat"} #{contract.contractNumber} - {contract.driverName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">{isRTL ? "المبلغ الإجمالي" : "Montant total"}</p>
              <p className="text-xl font-bold text-slate-800">{totalAmount.toFixed(3)} TND</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">{isRTL ? "المدفوع" : "Payé"}</p>
              <p className="text-xl font-bold text-green-600">{paidAmount.toFixed(3)} TND</p>
            </div>
            <div className={`${remainingAmount > 0 ? "bg-red-50" : "bg-green-50"} rounded-xl p-4 text-center`}>
              <p className={`text-xs ${remainingAmount > 0 ? "text-red-600" : "text-green-600"} mb-1`}>
                {isRTL ? "المتبقي" : "Restant"}
              </p>
              <p className={`text-xl font-bold ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                {remainingAmount.toFixed(3)} TND
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{isRTL ? "التقدم" : "Progression"}</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${remainingAmount > 0 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Add Payment Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors mb-6"
            >
              <Plus size={18} />
              {isRTL ? "إضافة دفعة" : "Ajouter un paiement"}
            </button>
          )}

          {/* Add Payment Form */}
          {showAddForm && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-4">
              <h3 className="font-semibold text-slate-700">
                {isRTL ? "إضافة دفعة جديدة" : "Nouveau paiement"}
              </h3>
              
              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  {isRTL ? "المبلغ (TND)" : "Montant (TND)"}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {remainingAmount > 0 && (
                  <button
                    onClick={() => setAmount(remainingAmount.toString())}
                    className="text-xs text-amber-600 hover:text-amber-700 mt-1"
                  >
                    {isRTL ? `حدد المبلغ المتبقي (${remainingAmount.toFixed(3)})` : `Saisir le reste (${remainingAmount.toFixed(3)})`}
                  </button>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">
                  {isRTL ? "طريقة الدفع" : "Méthode de paiement"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMethod(m.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          method === m.value
                            ? "bg-amber-500 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300"
                        }`}
                      >
                        <Icon size={14} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">
                  {isRTL ? "نوع الدفعة" : "Type de paiement"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setType(pt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        type === pt.value
                          ? "bg-amber-500 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300"
                      }`}
                    >
                      {isRTL ? pt.labelAr : pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
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
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "الوقت" : "Heure"}</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
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
                  onClick={handleAddPayment}
                  disabled={!amount || parseFloat(amount) <= 0 || saving}
                  className="flex-1 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? (isRTL ? "جاري الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ" : "Enregistrer")}
                </button>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              {isRTL ? "سجل المدفوعات" : "Historique des paiements"}
              <span className="text-xs text-slate-400">({payments.length})</span>
            </h3>
            
            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{isRTL ? "لا توجد مدفوعات" : "Aucun paiement enregistré"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => {
                  const methodInfo = PAYMENT_METHODS.find(m => m.value === payment.method);
                  const Icon = methodInfo?.icon || Wallet;
                  return (
                    <div 
                      key={payment.id}
                      className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${payment.type === "final" ? "bg-green-100" : "bg-slate-100"}`}>
                        <Icon size={18} className={payment.type === "final" ? "text-green-600" : "text-slate-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{payment.amount.toFixed(3)} TND</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            payment.type === "deposit" ? "bg-blue-100 text-blue-600" :
                            payment.type === "final" ? "bg-green-100 text-green-600" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {isRTL 
                              ? PAYMENT_TYPES.find(pt => pt.value === payment.type)?.labelAr 
                              : PAYMENT_TYPES.find(pt => pt.value === payment.type)?.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {payment.date} {payment.time && `• ${payment.time}`} • {methodInfo?.label}
                          {payment.notes && ` • ${payment.notes}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={isRTL ? "حذف" : "Supprimer"}
                      >
                        <Trash2 size={16} />
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
