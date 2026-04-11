import { invoke } from "@tauri-apps/api/core";
import { getSMSConfig, buildReminderMessage, markReminderSent, wasReminderSent } from "../lib/smsConfig";
import type { SMSConfig } from "../lib/smsConfig";
import type { Contract } from "../types";

export interface SMSResult {
  success: boolean;
  error?: string;
}

export async function sendSMS(
  phone: string,
  message: string,
  config?: SMSConfig
): Promise<SMSResult> {
  const cfg = config ?? getSMSConfig();

  let normalized = phone.replace(/\s+/g, "").replace(/^00216/, "").replace(/^\+216/, "");
  if (!normalized.startsWith("+")) normalized = "+216" + normalized;

  const result = await _send(normalized, message, cfg.gatewayUrl);

  // Notify internal phones if send succeeded
  if (result.success && cfg.notifyPhones.length > 0) {
    const notif = `[Palma Rent] SMS envoyé à ${normalized}:\n${message}`;
    for (const np of cfg.notifyPhones) {
      let n = np.replace(/\s+/g, "").replace(/^00216/, "").replace(/^\+216/, "");
      if (!n.startsWith("+")) n = "+216" + n;
      await _send(n, notif, cfg.gatewayUrl);
    }
  }

  return result;
}

async function _send(phone: string, message: string, gatewayUrl: string): Promise<SMSResult> {
  try {
    // Try Tauri Rust command first (desktop app)
    try {
      await invoke("send_sms", { phone, message, gatewayUrl });
      return { success: true };
    } catch {
      // Fallback to fetch (browser dev mode via Vite proxy)
      const response = await fetch("/sms-proxy/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message ?? "Network error" };
  }
}

// Auto reminder - called every 5 minutes
export async function checkAndSendReminders(contracts: Contract[]): Promise<void> {
  const cfg = getSMSConfig();
  const now = new Date();

  for (const contract of contracts) {
    if (contract._deleted) continue;
    if (!contract.driverPhone || !contract.returnDate || !contract.returnTime) continue;

    const id = contract.id ?? contract.contractNumber;
    if (wasReminderSent(id)) continue;

    const [year, month, day] = contract.returnDate.split("-").map(Number);
    const [hour, minute] = contract.returnTime.split(":").map(Number);
    if (!year || !month || !day) continue;

    const returnDt = new Date(year, month - 1, day, hour || 0, minute || 0);
    const diffHours = (returnDt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const window = 5 / 60; // 5-minute check window

    if (diffHours >= cfg.reminderHoursBefore - window && diffHours <= cfg.reminderHoursBefore + window) {
      const message = buildReminderMessage(
        cfg.reminderTemplate,
        contract.driverName,
        contract.brand,
        contract.registration,
        contract.returnDate,
        contract.returnTime
      );
      const result = await sendSMS(contract.driverPhone, message, cfg);
      if (result.success) markReminderSent(id);
    }
  }
}

export function openWhatsAppReminder(
  phone: string,
  driverName: string,
  brand: string,
  registration: string,
  returnDate: string,
  returnTime: string
) {
  const cfg = getSMSConfig();
  let normalized = phone.replace(/\s+/g, "").replace(/^00216/, "").replace(/^\+216/, "").replace(/^\+/, "");
  if (!normalized.startsWith("216")) normalized = "216" + normalized;
  const message = buildReminderMessage(cfg.reminderTemplate, driverName, brand, registration, returnDate, returnTime);
  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank");
}

// Keep for backward compat
export function buildReturnReminderMessage(
  driverName: string, brand: string, registration: string,
  returnDate: string, returnTime: string
): string {
  const cfg = getSMSConfig();
  return buildReminderMessage(cfg.reminderTemplate, driverName, brand, registration, returnDate, returnTime);
}
