import { config } from "../lib/config";
import { useAuthStore } from "../store/useAuthStore";

const DB_URL = config.firebase.databaseUrl;

export type ActionType =
  | "contract.create"
  | "contract.update"
  | "contract.delete"
  | "contract.print"
  | "payment.create"
  | "payment.delete"
  | "vehicle.update"
  | "maintenance.create"
  | "client.create"
  | "client.update"
  | "client.ban"
  | "user.login"
  | "user.logout"
  | "settings.update";

export interface ActivityLogEntry {
  id: string;
  userId: string;
  username: string;
  action: ActionType;
  targetType: "contract" | "payment" | "vehicle" | "client" | "user" | "settings" | "system";
  targetId?: string;
  targetLabel?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  userAgent?: string;
}

const MAX_ENTRIES = 1000;

async function fetchLogs(): Promise<ActivityLogEntry[]> {
  try {
    const res = await fetch(`${DB_URL}/activity_log.json`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
  } catch {
    return [];
  }
}

async function saveLogs(logs: ActivityLogEntry[]): Promise<void> {
  const trimmed = logs.slice(-MAX_ENTRIES);
  try {
    await fetch(`${DB_URL}/activity_log.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trimmed.slice(-100)),
    });
  } catch (e) {
    console.warn("[ActivityLog] Failed to sync to Firebase", e);
  }
}

export async function logAction(
  action: ActionType,
  targetType: ActivityLogEntry["targetType"],
  options: {
    targetId?: string;
    targetLabel?: string;
    details?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const user = useAuthStore.getState().user;
  
  const entry: ActivityLogEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    userId: user?.id || "anonymous",
    username: user?.username || "Anonymous",
    action,
    targetType,
    targetId: options.targetId,
    targetLabel: options.targetLabel,
    details: options.details,
    metadata: options.metadata,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  };
  
  const logs = await fetchLogs();
  logs.push(entry);
  await saveLogs(logs);
}

export async function getActivityLogs(filters?: {
  userId?: string;
  action?: ActionType;
  targetType?: ActivityLogEntry["targetType"];
  startDate?: number;
  endDate?: number;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  let logs = await fetchLogs();
  
  if (filters) {
    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters.targetType) {
      logs = logs.filter(l => l.targetType === filters.targetType);
    }
    if (filters.startDate) {
      logs = logs.filter(l => l.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      logs = logs.filter(l => l.timestamp <= filters.endDate!);
    }
  }
  
  logs.sort((a, b) => b.timestamp - a.timestamp);
  
  if (filters?.limit) {
    logs = logs.slice(0, filters.limit);
  }
  
  return logs;
}

export async function getRecentActivity(limit = 20): Promise<ActivityLogEntry[]> {
  return await getActivityLogs({ limit });
}

export async function clearOldLogs(daysToKeep = 30): Promise<void> {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const logs = await fetchLogs();
  const filtered = logs.filter(l => l.timestamp >= cutoff);
  await saveLogs(filtered);
}

export async function getActivityStats(days = 7): Promise<{
  total: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
}> {
  const startDate = Date.now() - days * 24 * 60 * 60 * 1000;
  const logs = await getActivityLogs({ startDate });
  
  const byAction: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  
  logs.forEach(log => {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byUser[log.username] = (byUser[log.username] || 0) + 1;
  });
  
  return {
    total: logs.length,
    byAction,
    byUser,
  };
}

export function formatActionLabel(action: ActionType): { label: string; labelAr: string } {
  const labels: Record<ActionType, { label: string; labelAr: string }> = {
    "contract.create": { label: "Création contrat", labelAr: "إنشاء عقد" },
    "contract.update": { label: "Modification contrat", labelAr: "تعديل عقد" },
    "contract.delete": { label: "Suppression contrat", labelAr: "حذف عقد" },
    "contract.print": { label: "Impression contrat", labelAr: "طباعة عقد" },
    "payment.create": { label: "Nouveau paiement", labelAr: "إضافة دفعة" },
    "payment.delete": { label: "Suppression paiement", labelAr: "حذف دفعة" },
    "vehicle.update": { label: "Modification véhicule", labelAr: "تعديل سيارة" },
    "maintenance.create": { label: "Nouvelle maintenance", labelAr: "إضافة صيانة" },
    "client.create": { label: "Nouveau client", labelAr: "إضافة عميل" },
    "client.update": { label: "Modification client", labelAr: "تعديل عميل" },
    "client.ban": { label: "Client bloqué", labelAr: "حظر عميل" },
    "user.login": { label: "Connexion", labelAr: "تسجيل دخول" },
    "user.logout": { label: "Déconnexion", labelAr: "تسجيل خروج" },
    "settings.update": { label: "Modification paramètres", labelAr: "تعديل إعدادات" },
  };
  
  return labels[action] || { label: action, labelAr: action };
}
