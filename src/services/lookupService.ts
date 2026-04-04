/**
 * Lookup services:
 * - Find driver data by CIN from existing contracts
 * - Get next contract number
 */
import { getAllContracts } from "./contractService";
import type { Contract } from "../types";

/** Find the most recent contract for a given CIN (driver 1 or 2) */
export async function findDriverByCin(cin: string): Promise<Partial<Contract> | null> {
  if (!cin || cin.length < 4) return null;

  const all = await getAllContracts();
  const cinNorm = cin.trim().replace(/\s/g, "");

  // Search driver 1
  const matches = all.filter((c) => {
    const c1 = (c.driverCin || "").trim().replace(/\s/g, "");
    const c2 = (c.driver2Cin || "").trim().replace(/\s/g, "");
    return c1 === cinNorm || c2 === cinNorm;
  });

  if (matches.length === 0) return null;

  // Most recent
  const latest = matches.sort((a, b) => (b._createdAt ?? 0) - (a._createdAt ?? 0))[0];

  // Determine if it's driver1 or driver2
  const isDriver2 = (latest.driver2Cin || "").trim().replace(/\s/g, "") === cinNorm;

  if (isDriver2) {
    return {
      driverName:         latest.driver2Name,
      driverDob:          latest.driver2Dob,
      driverBirthPlace:   latest.driver2BirthPlace,
      driverAddress:      latest.driver2Address,
      driverPhone:        latest.driver2Phone,
      driverCin:          latest.driver2Cin,
      driverCinDate:      latest.driver2CinDate,
      driverCinPlace:     latest.driver2CinPlace,
      driverLicense:      latest.driver2License,
      driverLicenseDate:  latest.driver2LicenseDate,
      driverLicensePlace: latest.driver2LicensePlace,
    };
  }

  return {
    driverName:         latest.driverName,
    driverDob:          latest.driverDob,
    driverBirthPlace:   latest.driverBirthPlace,
    driverAddress:      latest.driverAddress,
    driverPhone:        latest.driverPhone,
    driverCin:          latest.driverCin,
    driverCinDate:      latest.driverCinDate,
    driverCinPlace:     latest.driverCinPlace,
    driverLicense:      latest.driverLicense,
    driverLicenseDate:  latest.driverLicenseDate,
    driverLicensePlace: latest.driverLicensePlace,
  };
}

/** Find driver 2 data by CIN */
export async function findDriver2ByCin(cin: string): Promise<Partial<Contract> | null> {
  const data = await findDriverByCin(cin);
  if (!data) return null;
  // Return as driver2 fields
  return {
    driver2Name:          data.driverName,
    driver2Dob:           data.driverDob,
    driver2BirthPlace:    data.driverBirthPlace,
    driver2Address:       data.driverAddress,
    driver2Phone:         data.driverPhone,
    driver2Cin:           data.driverCin,
    driver2CinDate:       data.driverCinDate,
    driver2CinPlace:      data.driverCinPlace,
    driver2License:       data.driverLicense,
    driver2LicenseDate:   data.driverLicenseDate,
    driver2LicensePlace:  data.driverLicensePlace,
  };
}

/** Get next contract number (max existing + 1) */
export async function getNextContractNumber(): Promise<string> {
  try {
    const all = await getAllContracts();
    let max = 0;
    for (const c of all) {
      const n = parseInt(c.contractNumber.replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return String(max + 1).padStart(6, "0");
  } catch {
    return "";
  }
}
