import { config } from "../lib/config";
import type { MaintenanceCar, CarProfile } from "../types";

const MAINTENANCE_KEY = "palma_maintenance";
const MAINTENANCE_INTERVAL_KM = 10000; // 10,000 km between oil changes

const DB_URL = config.firebase.databaseUrl;

export interface MaintenanceRecord {
  id: string;
  registration: string;
  type: "oil_change" | "tire_change" | "brake_check" | "general_service" | "repair" | "other";
  date: string;
  km: number;
  cost: number;
  mechanic: string;
  notes: string;
  nextMaintenanceKm?: number;
  createdBy: string;
  _createdAt: number;
}

export interface MaintenanceAlert {
  id: string;
  registration: string;
  type: "km_based" | "time_based" | "document_expiry";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  dueDate?: string;
  dueKm?: number;
  dismissed: boolean;
}

function getMaintenanceRecords(): MaintenanceRecord[] {
  try {
    return JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMaintenanceRecords(records: MaintenanceRecord[]): void {
  localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(records));
  // Sync to Firebase
  fetch(`${DB_URL}/maintenance.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(records),
  }).catch(() => {});
}

export function getMaintenanceForCar(registration: string): MaintenanceRecord[] {
  return getMaintenanceRecords()
    .filter(r => r.registration === registration)
    .sort((a, b) => b.km - a.km);
}

export function getLastMaintenance(registration: string): MaintenanceRecord | null {
  const records = getMaintenanceForCar(registration);
  return records.length > 0 ? records[0] : null;
}

export function getNextOilChangeKm(registration: string): number | null {
  const lastOil = getMaintenanceRecords()
    .filter(r => r.registration === registration && (r.type === "oil_change" || r.type === "general_service"))
    .sort((a, b) => b.km - a.km)[0];
  
  return lastOil ? lastOil.km + MAINTENANCE_INTERVAL_KM : null;
}

export function addMaintenanceRecord(record: Omit<MaintenanceRecord, "id" | "_createdAt">): MaintenanceRecord {
  const newRecord: MaintenanceRecord = {
    ...record,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    _createdAt: Date.now(),
  };
  
  const records = getMaintenanceRecords();
  records.push(newRecord);
  saveMaintenanceRecords(records);
  
  return newRecord;
}

export function deleteMaintenanceRecord(id: string): void {
  const records = getMaintenanceRecords().filter(r => r.id !== id);
  saveMaintenanceRecords(records);
}

export function generateMaintenanceAlerts(carProfiles: Record<string, CarProfile>): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];
  const records = getMaintenanceRecords();
  const today = new Date().toISOString().split("T")[0];
  
  Object.entries(carProfiles).forEach(([reg, profile]) => {
    const lastOil = records
      .filter(r => r.registration === reg && (r.type === "oil_change" || r.type === "general_service"))
      .sort((a, b) => b.km - a.km)[0];
    
    const currentKm = profile.kilometrage || 0;
    const nextOilKm = lastOil ? lastOil.km + MAINTENANCE_INTERVAL_KM : MAINTENANCE_INTERVAL_KM;
    const kmRemaining = nextOilKm - currentKm;
    
    // KM-based alerts
    if (kmRemaining <= 0) {
      alerts.push({
        id: `km_overdue_${reg}`,
        registration: reg,
        type: "km_based",
        priority: "high",
        title: "Vidange overdue",
        message: `${reg}: ${Math.abs(kmRemaining)} km overdue for oil change`,
        dueKm: nextOilKm,
        dismissed: false,
      });
    } else if (kmRemaining <= 500) {
      alerts.push({
        id: `km_due_${reg}`,
        registration: reg,
        type: "km_based",
        priority: "medium",
        title: "Vidange bientôt due",
        message: `${reg}: ${kmRemaining} km remaining until oil change`,
        dueKm: nextOilKm,
        dismissed: false,
      });
    }
    
    // Document expiry alerts
    profile.documents?.forEach(doc => {
      const daysUntilExpiry = Math.ceil(
        (new Date(doc.expiryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        alerts.push({
          id: `doc_expired_${reg}_${doc.type}`,
          registration: reg,
          type: "document_expiry",
          priority: "high",
          title: `${doc.type} expiré`,
          message: `${reg}: ${doc.label} expired on ${doc.expiryDate}`,
          dueDate: doc.expiryDate,
          dismissed: false,
        });
      } else if (daysUntilExpiry <= 30) {
        alerts.push({
          id: `doc_expiring_${reg}_${doc.type}`,
          registration: reg,
          type: "document_expiry",
          priority: daysUntilExpiry <= 7 ? "high" : "medium",
          title: `${doc.type} expire bientôt`,
          message: `${reg}: ${doc.label} expires in ${daysUntilExpiry} days`,
          dueDate: doc.expiryDate,
          dismissed: false,
        });
      }
    });
  });
  
  return alerts;
}

export function getMaintenanceStats(): {
  totalRecords: number;
  totalCost: number;
  avgCostPerCar: number;
  mostCommonType: string;
} {
  const records = getMaintenanceRecords();
  
  if (records.length === 0) {
    return {
      totalRecords: 0,
      totalCost: 0,
      avgCostPerCar: 0,
      mostCommonType: "-",
    };
  }
  
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
  const uniqueCars = new Set(records.map(r => r.registration));
  const typeCounts = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  
  return {
    totalRecords: records.length,
    totalCost,
    avgCostPerCar: totalCost / uniqueCars.size,
    mostCommonType,
  };
}
