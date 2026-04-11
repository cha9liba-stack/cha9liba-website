// SMS Configuration - stored in localStorage

export interface SMSConfig {
  gatewayUrl: string;           // e.g. http://192.168.100.35:8080/send-sms
  notifyPhones: string[];       // phones to notify when SMS is sent
  reminderTemplate: string;     // auto-reminder message template
  reminderHoursBefore: number;  // hours before return to send reminder
}

const DEFAULT_CONFIG: SMSConfig = {
  gatewayUrl: "http://192.168.100.35:8080/send-sms",
  notifyPhones: [],
  reminderTemplate: "Rappel Palma Rent: Cher(e) {nom}, votre véhicule {marque} ({immat}) doit être retourné le {date} à {heure}. Merci.",
  reminderHoursBefore: 2,
};

const KEY = "palma_sms_config";

export function getSMSConfig(): SMSConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSMSConfig(config: SMSConfig) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function buildReminderMessage(
  template: string,
  driverName: string,
  brand: string,
  registration: string,
  returnDate: string,
  returnTime: string
): string {
  return template
    .replace("{nom}", driverName)
    .replace("{marque}", brand)
    .replace("{immat}", registration)
    .replace("{date}", returnDate)
    .replace("{heure}", returnTime);
}

// Track sent reminders to avoid duplicates
const SENT_KEY = "palma_sms_sent";

export function markReminderSent(contractId: string) {
  const sent = getSentReminders();
  sent[contractId] = Date.now();
  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}

export function wasReminderSent(contractId: string): boolean {
  const sent = getSentReminders();
  return !!sent[contractId];
}

function getSentReminders(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}");
  } catch {
    return {};
  }
}
