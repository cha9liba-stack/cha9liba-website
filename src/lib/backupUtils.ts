/**
 * Backup utilities for automated data backups
 */

import { getAllContracts } from "../services/contractService";
import { getAllInvoices } from "../services/invoiceService";
import { exportContractsToJSON } from "./exportUtils";

const BACKUP_KEY = "palma_last_backup";
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

interface BackupMetadata {
  timestamp: number;
  contractCount: number;
  invoiceCount: number;
}

/**
 * Get last backup timestamp
 */
export function getLastBackup(): number {
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) return 0;
    const metadata = JSON.parse(backup) as BackupMetadata;
    return metadata.timestamp;
  } catch {
    return 0;
  }
}

/**
 * Check if backup is needed
 */
export function isBackupNeeded(): boolean {
  const lastBackup = getLastBackup();
  const now = Date.now();
  return now - lastBackup > BACKUP_INTERVAL;
}

/**
 * Perform automatic backup
 */
export async function performBackup(): Promise<boolean> {
  try {
    console.log("[Backup] Starting backup...");

    const contracts = await getAllContracts();
    const invoices = await getAllInvoices();

    const backupData = {
      timestamp: Date.now(),
      contracts,
      invoices,
      metadata: {
        contractCount: contracts.length,
        invoiceCount: invoices.length,
      },
    };

    // Save to localStorage as fallback
    const backupKey = `palma_backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backupData));

    // Update last backup timestamp
    const metadata: BackupMetadata = {
      timestamp: Date.now(),
      contractCount: contracts.length,
      invoiceCount: invoices.length,
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(metadata));

    // Clean up old backups (keep only last 5)
    cleanupOldBackups();

    console.log("[Backup] Backup completed successfully");
    return true;
  } catch (error) {
    console.error("[Backup] Backup failed:", error);
    return false;
  }
}

/**
 * Clean up old backups, keeping only the last 5
 */
function cleanupOldBackups(): void {
  try {
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter((key) => key.startsWith("palma_backup_"));

    if (backupKeys.length > 5) {
      // Sort by timestamp (newest first)
      backupKeys.sort((a, b) => {
        const timestampA = parseInt(a.split("_").pop() || "0");
        const timestampB = parseInt(b.split("_").pop() || "0");
        return timestampB - timestampA;
      });

      // Remove old backups (keep only last 5)
      for (let i = 5; i < backupKeys.length; i++) {
        localStorage.removeItem(backupKeys[i]);
      }

      console.log(`[Backup] Cleaned up ${backupKeys.length - 5} old backups`);
    }
  } catch (error) {
    console.error("[Backup] Failed to clean up old backups:", error);
  }
}

/**
 * Get backup history
 */
export function getBackupHistory(): BackupMetadata[] {
  try {
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter((key) => key.startsWith("palma_backup_"));

    const backups: BackupMetadata[] = [];

    for (const key of backupKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          backups.push({
            timestamp: parsed.timestamp,
            contractCount: parsed.metadata?.contractCount || 0,
            invoiceCount: parsed.metadata?.invoiceCount || 0,
          });
        }
      } catch {
        // Skip corrupted backups
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);

    return backups;
  } catch {
    return [];
  }
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(timestamp: number): Promise<boolean> {
  try {
    const backupKey = `palma_backup_${timestamp}`;
    const backupData = localStorage.getItem(backupKey);

    if (!backupData) {
      console.error("[Backup] Backup not found:", timestamp);
      return false;
    }

    const parsed = JSON.parse(backupData);
    console.log("[Backup] Restoring backup from:", new Date(timestamp).toLocaleString());
    console.log("[Backup] Contracts:", parsed.contracts.length);
    console.log("[Backup] Invoices:", parsed.invoices.length);

    // Note: This is a placeholder for actual restoration logic
    // In a real implementation, you would restore the data to Firebase/local storage
    console.log("[Backup] Restoration logic not implemented");

    return true;
  } catch (error) {
    console.error("[Backup] Restoration failed:", error);
    return false;
  }
}

/**
 * Export backup to file
 */
export function exportBackup(timestamp: number): void {
  try {
    const backupKey = `palma_backup_${timestamp}`;
    const backupData = localStorage.getItem(backupKey);

    if (!backupData) {
      console.error("[Backup] Backup not found:", timestamp);
      return;
    }

    const blob = new Blob([backupData], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `palma_backup_${new Date(timestamp).toISOString().split("T")[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[Backup] Export failed:", error);
  }
}
