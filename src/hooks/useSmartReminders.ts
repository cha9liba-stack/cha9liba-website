import { useState, useEffect, useCallback } from "react";
import type { Contract } from "../types";

interface Reminder {
  id: string;
  type: "return_reminder" | "overdue" | "payment_due" | "document_expiry" | "maintenance";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  contractId?: string;
  contractNumber?: string;
  driverName?: string;
  driverPhone?: string;
  date?: string;
  amount?: number;
  createdAt: number;
  dismissed: boolean;
}

const REMINDERS_KEY = "palma_smart_reminders";
const CHECK_INTERVAL_MS = 60 * 1000; // every 1 minute

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function loadReminders(): Reminder[] {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReminders(reminders: Reminder[]): void {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function useSmartReminders(contracts: Contract[]) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const generateReminders = useCallback((contracts: Contract[]) => {
    const today = getToday();
    const newReminders: Reminder[] = [];
    const existingReminders = loadReminders();
    const existingMap = new Map(existingReminders.map(r => [r.id, r]));

    // Check contracts for reminders
    contracts.forEach(contract => {
      if (contract._deleted) return;

      const contractId = contract.id || contract.contractNumber;
      
      // 1. Return in 1-3 days reminder
      const daysToReturn = daysBetween(today, contract.returnDate);
      if (daysToReturn > 0 && daysToReturn <= 3) {
        const id = `return_${contractId}_${contract.returnDate}`;
        if (!existingMap.has(id)) {
          newReminders.push({
            id,
            type: "return_reminder",
            priority: daysToReturn === 1 ? "high" : "medium",
            title: daysToReturn === 1 
              ? "Retour demain!" 
              : `Retour dans ${daysToReturn} jours`,
            message: `${contract.driverName} - ${contract.brand} ${contract.model} (${contract.registration})`,
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            driverName: contract.driverName,
            driverPhone: contract.driverPhone,
            date: contract.returnDate,
            createdAt: Date.now(),
            dismissed: false,
          });
        }
      }

      // 2. Overdue contracts
      if (daysToReturn < 0) {
        const id = `overdue_${contractId}`;
        if (!existingMap.has(id)) {
          newReminders.push({
            id,
            type: "overdue",
            priority: "high",
            title: "عقود متأخرة",
            message: `${contract.driverName} - متأخر ${Math.abs(daysToReturn)} يوم`,
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            driverName: contract.driverName,
            driverPhone: contract.driverPhone,
            date: contract.returnDate,
            createdAt: Date.now(),
            dismissed: false,
          });
        }
      }

      // 3. Payment due (remaining amount)
      const resteAPayer = parseFloat(contract.resteAPayer || "0");
      if (resteAPayer > 0) {
        const id = `payment_${contractId}`;
        if (!existingMap.has(id)) {
          newReminders.push({
            id,
            type: "payment_due",
            priority: "high",
            title: "دفعة مستحقة",
            message: `المتبقي: ${resteAPayer.toFixed(3)} TND`,
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            driverName: contract.driverName,
            driverPhone: contract.driverPhone,
            amount: resteAPayer,
            createdAt: Date.now(),
            dismissed: false,
          });
        }
      }
    });

    // Auto-dismiss old reminders (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = existingReminders.filter(r => 
      !r.dismissed && r.createdAt > sevenDaysAgo
    );

    const allReminders = [...filtered, ...newReminders];
    saveReminders(allReminders);
    
    return allReminders;
  }, []);

  useEffect(() => {
    if (contracts.length === 0) return;
    
    const generated = generateReminders(contracts);
    setReminders(generated);
    setUnreadCount(generated.filter(r => !r.dismissed).length);
  }, [contracts, generateReminders]);

  // Periodic check
  useEffect(() => {
    if (contracts.length === 0) return;
    
    const interval = setInterval(() => {
      const generated = generateReminders(contracts);
      setReminders(generated);
      setUnreadCount(generated.filter(r => !r.dismissed).length);
    }, CHECK_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [contracts, generateReminders]);

  const dismissReminder = useCallback((id: string) => {
    const updated = reminders.map(r => 
      r.id === id ? { ...r, dismissed: true } : r
    );
    saveReminders(updated);
    setReminders(updated);
    setUnreadCount(updated.filter(r => !r.dismissed).length);
  }, [reminders]);

  const dismissAll = useCallback(() => {
    const updated = reminders.map(r => ({ ...r, dismissed: true }));
    saveReminders(updated);
    setReminders(updated);
    setUnreadCount(0);
  }, [reminders]);

  const activeReminders = reminders.filter(r => !r.dismissed);
  const overdueReminders = activeReminders.filter(r => r.type === "overdue");
  const paymentReminders = activeReminders.filter(r => r.type === "payment_due");
  const returnReminders = activeReminders.filter(r => r.type === "return_reminder");

  return {
    reminders: activeReminders,
    allReminders: reminders,
    unreadCount,
    overdueCount: overdueReminders.length,
    paymentCount: paymentReminders.length,
    returnCount: returnReminders.length,
    dismissReminder,
    dismissAll,
  };
}

// Helper to format reminder for WhatsApp/SMS
export function formatReminderMessage(reminder: Reminder): string {
  switch (reminder.type) {
    case "return_reminder":
      return `Bonjour ${reminder.driverName}, nous vous rappelons que la restitution du véhicule ${reminder.contractNumber} est prévue le ${reminder.date}. Merci de votre confiance.`;
    case "overdue":
      return `Bonjour ${reminder.driverName}, le véhicule ${reminder.contractNumber} est en retard depuis le ${reminder.date}. Merci de nous contacter.`;
    case "payment_due":
      return `Bonjour ${reminder.driverName}, il reste ${reminder.amount?.toFixed(3)} TND à payer pour le contrat ${reminder.contractNumber}. Merci de régulariser.`;
    default:
      return reminder.message;
  }
}
