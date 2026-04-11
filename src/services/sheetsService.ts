/**
 * Google Sheets sync service.
 * Uses Tauri commands (Rust backend) to call Sheets API securely.
 * Falls back gracefully when running in browser (dev mode without Tauri).
 */
import { invoke } from "@tauri-apps/api/core";
import { SHEETS_CONFIG } from "../lib/sheetsConfig";
import type { Contract } from "../types";

export interface SheetRow {
  voiture: string;
  serie: string;
  sortie: string;
  entree: string;
  nom: string;
  tel: string;
  i: string;
  nj: string;
  taxe2d: string;
  montant_t: string;
  avance: string;
  reste: string;
  num_contrat: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Map a Contract to a SheetRow */
export function contractToSheetRow(c: Contract): SheetRow {
  // Calculate number of days
  const dep = new Date(c.departureDate);
  const ret = new Date(c.returnDate);
  const nj = isNaN(dep.getTime()) || isNaN(ret.getTime())
    ? ""
    : String(Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / 86400000)));

  return {
    voiture:     `${c.brand} ${c.model}`.trim(),
    serie:       c.registration,
    sortie:      c.departureDate ? `${c.departureDate} ${c.departureTime || ""}`.trim() : "",
    entree:      c.returnDate    ? `${c.returnDate} ${c.returnTime || ""}`.trim() : "",
    nom:         c.driverName,
    tel:         c.driverPhone,
    i:           c.totalPartiel || "0",
    nj,
    taxe2d:      c.tva || "0",
    montant_t:   c.totalFacture || "0",
    avance:      c.depot || "0",
    reste:       c.somme || "0",
    num_contrat: c.contractNumber,
  };
}

/** Map a SheetRow back to partial Contract fields */
export function sheetRowToContract(row: SheetRow): Partial<Contract> {
  const [brand = "", ...modelParts] = row.voiture.split(" ");
  const [departureDate = "", departureTime = ""] = row.sortie.split(" ");
  const [returnDate = "", returnTime = ""] = row.entree.split(" ");

  return {
    contractNumber: row.num_contrat,
    brand,
    model:          modelParts.join(" "),
    registration:   row.serie,
    departureDate,
    departureTime,
    returnDate,
    returnTime,
    driverName:     row.nom,
    driverPhone:    row.tel,
    totalPartiel:   row.i,
    tva:            row.taxe2d,
    totalFacture:   row.montant_t,
    depot:          row.avance,
    somme:          row.reste,
  };
}

// ─── Tauri-backed API ─────────────────────────────────────────────────────────

export async function sheetsReadAll(): Promise<SheetRow[]> {
  if (!isTauri()) {
    console.warn("[Sheets] Not running in Tauri, skipping read");
    return [];
  }
  return invoke<SheetRow[]>("sheets_read", {
    clientEmail: SHEETS_CONFIG.client_email,
    privateKey:  SHEETS_CONFIG.private_key,
  });
}

export async function sheetsAppend(contract: Contract): Promise<void> {
  if (!isTauri()) return;
  const row = contractToSheetRow(contract);
  await invoke("sheets_append", {
    clientEmail: SHEETS_CONFIG.client_email,
    privateKey:  SHEETS_CONFIG.private_key,
    row,
  });
}

export async function sheetsUpdate(contract: Contract): Promise<void> {
  if (!isTauri()) return;
  const row = contractToSheetRow(contract);
  await invoke("sheets_update", {
    clientEmail: SHEETS_CONFIG.client_email,
    privateKey:  SHEETS_CONFIG.private_key,
    row,
  });
}

export async function sheetsDelete(contractNumber: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("sheets_delete", {
    clientEmail:    SHEETS_CONFIG.client_email,
    privateKey:     SHEETS_CONFIG.private_key,
    contractNumber,
  });
}

/** Full bidirectional sync: pull from Sheets → merge with local contracts */
export async function syncFromSheets(
  existingContracts: Contract[]
): Promise<Contract[]> {
  if (!isTauri()) return existingContracts;

  try {
    const rows = await sheetsReadAll();
    const merged = [...existingContracts];

    for (const row of rows) {
      if (!row.num_contrat) continue;
      const exists = merged.find((c) => c.contractNumber === row.num_contrat);
      if (!exists) {
        // New contract from Sheets - add it
        merged.push({
          contractNumber: row.num_contrat,
          brand:          row.voiture.split(" ")[0] || "",
          model:          row.voiture.split(" ").slice(1).join(" ") || "",
          registration:   row.serie,
          departureDate:  row.sortie.split(" ")[0] || "",
          departureTime:  row.sortie.split(" ")[1] || "",
          returnDate:     row.entree.split(" ")[0] || "",
          returnTime:     row.entree.split(" ")[1] || "",
          driverName:     row.nom,
          driverPhone:    row.tel,
          totalPartiel:   row.i,
          tva:            row.taxe2d,
          totalFacture:   row.montant_t,
          depot:          row.avance,
          somme:          row.reste,
          // defaults
          category: "", fuelType: "", remiseRetour: "",
          departurePlace: "", departureKm: "", returnKm: "",
          driverDob: "", driverBirthPlace: "", driverAddress: "",
          driverCin: "", driverCinDate: "", driverCinPlace: "",
          driverLicense: "", driverLicenseDate: "", driverLicensePlace: "",
          hasDriver2: false,
          driver2Name: "", driver2Dob: "", driver2BirthPlace: "",
          driver2Address: "", driver2Phone: "", driver2Cin: "",
          driver2CinDate: "", driver2CinPlace: "", driver2License: "",
          driver2LicenseDate: "", driver2LicensePlace: "",
          divers: "", totalHT: "", plusMoinsDivers: "",
          prep: "", total: "", city: "", date: "",
          _createdAt: Date.now(),
        } as Contract);
      }
    }

    return merged;
  } catch (e) {
    console.warn("[Sheets] Sync failed:", e);
    return existingContracts;
  }
}
