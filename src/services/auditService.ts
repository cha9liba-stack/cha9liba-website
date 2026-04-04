import { ref, push } from "firebase/database";
import { db as firebaseDb } from "../lib/firebase";
import type { AuditLog, User } from "../types";

export async function logAction(
  user: User | null,
  action: string,
  targetId?: string,
  details?: string
): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const logsRef = ref(firebaseDb, "logs");
    const entry: AuditLog = {
      userId: user?.id ?? "unknown",
      username: user?.username ?? "unknown",
      role: user?.role ?? "unknown",
      action,
      targetId,
      timestamp: new Date().toISOString(),
      details,
    };
    await push(logsRef, entry);
  } catch (e) {
    console.warn("[Audit] Failed to log action", e);
  }
}
