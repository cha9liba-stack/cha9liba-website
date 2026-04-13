import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Bell, X, AlertTriangle, Clock, CreditCard, ChevronRight, Check, CheckCheck } from "lucide-react";
import { useSmartReminders, formatReminderMessage } from "../hooks/useSmartReminders";
import { useContractStore } from "../store/useContractStore";
import { openWhatsAppReminder } from "../services/smsService";

export default function RemindersBell() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const contracts = useContractStore(s => s.contracts);
  const { 
    reminders, 
    unreadCount, 
    overdueCount, 
    paymentCount, 
    returnCount,
    dismissReminder, 
    dismissAll 
  } = useSmartReminders(contracts);
  
  const [isOpen, setIsOpen] = useState(false);

  const hasHighPriority = overdueCount > 0 || paymentCount > 0;

  function handleSendReminder(reminder: typeof reminders[0]) {
    if (!reminder.driverPhone) return;
    
    const message = formatReminderMessage(reminder);
    
    if (reminder.type === "overdue" || reminder.type === "return_reminder") {
      // For return/overdue, we need the contract to get full details
      const contract = contracts.find(c => c.id === reminder.contractId);
      if (contract) {
        openWhatsAppReminder(
          reminder.driverPhone,
          reminder.driverName || "",
          contract.brand,
          contract.registration,
          contract.returnDate,
          contract.returnTime
        );
      }
    } else {
      // For other types, send as SMS
      const phone = reminder.driverPhone?.replace(/\D/g, "");
      if (phone) {
        window.open(`https://wa.me/216${phone}?text=${encodeURIComponent(message)}`, "_blank");
      }
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`relative p-2 rounded-lg transition-colors ${
          hasHighPriority 
            ? "text-red-500 hover:bg-red-50" 
            : unreadCount > 0 
              ? "text-amber-500 hover:bg-amber-50" 
              : "text-slate-400 hover:bg-slate-100"
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full ${
            hasHighPriority ? "bg-red-500" : "bg-amber-500"
          }`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - using portal to render outside sidebar */}
      {isOpen && createPortal(
        <>
          {/* Panel */}
          <div className="fixed bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] overflow-hidden"
            style={{ 
              left: "270px", 
              top: "75px",
              width: "320px"
            }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                <span className="font-semibold text-slate-700">
                  {isRTL ? "التذكيرات" : "Rappels"}
                </span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={dismissAll}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    title={isRTL ? "إغلاق الكل" : "Tout marquer comme lu"}
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            {(overdueCount > 0 || paymentCount > 0 || returnCount > 0) && (
              <div className="flex gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                {overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                    <AlertTriangle size={10} />
                    {overdueCount} {isRTL ? "متأخر" : "en retard"}
                  </div>
                )}
                {paymentCount > 0 && (
                  <div className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                    <CreditCard size={10} />
                    {paymentCount} {isRTL ? "مستحق" : "à payer"}
                  </div>
                )}
                {returnCount > 0 && (
                  <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                    <Clock size={10} />
                    {returnCount} {isRTL ? "قريب" : "proche"}
                  </div>
                )}
              </div>
            )}

            {/* Reminders List */}
            <div className="max-h-80 overflow-y-auto">
              {reminders.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Bell size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{isRTL ? "لا توجد تذكيرات" : "Aucun rappel"}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {reminders.map(reminder => (
                    <div 
                      key={reminder.id}
                      className={`px-4 py-3 hover:bg-slate-50 transition-colors ${
                        reminder.priority === "high" ? "bg-red-50/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${
                          reminder.type === "overdue" ? "bg-red-100" :
                          reminder.type === "payment_due" ? "bg-amber-100" :
                          reminder.type === "return_reminder" ? "bg-blue-100" :
                          "bg-slate-100"
                        }`}>
                          {reminder.type === "overdue" ? (
                            <AlertTriangle size={14} className="text-red-600" />
                          ) : reminder.type === "payment_due" ? (
                            <CreditCard size={14} className="text-amber-600" />
                          ) : reminder.type === "return_reminder" ? (
                            <Clock size={14} className="text-blue-600" />
                          ) : (
                            <Bell size={14} className="text-slate-500" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              reminder.priority === "high" ? "text-red-700" : "text-slate-700"
                            }`}>
                              {reminder.title}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              reminder.type === "overdue" ? "bg-red-100 text-red-600" :
                              reminder.type === "payment_due" ? "bg-amber-100 text-amber-600" :
                              "bg-blue-100 text-blue-600"
                            }`}>
                              {reminder.type === "overdue" ? (isRTL ? "متأخر" : "Retard") :
                               reminder.type === "payment_due" ? (isRTL ? "مستحق" : "Paiement") :
                               reminder.type === "return_reminder" ? (isRTL ? "إرجاع" : "Retour") :
                               ""}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {reminder.message}
                          </p>
                          {reminder.date && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              {reminder.date}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        {reminder.driverPhone && (reminder.type === "overdue" || reminder.type === "return_reminder") && (
                          <button
                            onClick={() => handleSendReminder(reminder)}
                            className="flex-1 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          >
                            {isRTL ? "إرسال تذكير" : "Envoyer rappel"}
                          </button>
                        )}
                        <button
                          onClick={() => dismissReminder(reminder.id)}
                          className="py-1.5 px-3 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
