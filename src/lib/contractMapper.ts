/**
 * Maps legacy Firebase contract data (Arabic/French field names)
 * to the new TypeScript Contract interface.
 */
import type { Contract } from "../types";

export function mapFirebaseToContract(id: string, raw: Record<string, any>): Contract {
  const fuelType = raw["Essence"] === "X" ? "Essence" : raw["Gasoil"] === "X" ? "Gasoil" : "";

  return {
    id,
    // Vehicle
    contractNumber: str(raw["رقم العقد"]),
    brand:          str(raw["Marque"]),
    model:          str(raw["Modèl"] ?? raw["Modèle"]),
    category:       str(raw["صنف السيارة"] ?? raw["Catégorie"]),
    registration:   str(raw["Immatricule"] ?? raw["Immatriculation"]),
    departureDate:  str(raw["يوم الانطلاق"] ?? raw["Jour départ"]),
    departureTime:  str(raw["ساعة الانطلاق"] ?? raw["Heure départ"]),
    departurePlace: str(raw["مكان الانطلاق"] ?? raw["Lieu départ"]),
    returnDate:     str(raw["يوم الرجوع"] ?? raw["Jour retour"]),
    returnTime:     str(raw["ساعة الرجوع"] ?? raw["Heure retour"]),
    departureKm:    str(raw["كلم الانطلاق"] ?? raw["Km départ"]),
    returnKm:       str(raw["كلم الرجوع"] ?? raw["Km retour"]),
    fuelType:       fuelType as Contract["fuelType"],
    remiseRetour:   str(raw["Remise au retour"]),
    // Driver 1
    driverName:         str(raw["الاسم و اللقب"] ?? raw["Nom & Prénom"]),
    driverDob:          str(raw["تاريخ الولادة"] ?? raw["Date naissance"]),
    driverBirthPlace:   str(raw["مكان الولادة"] ?? raw["Lieu naissance"]),
    driverAddress:      str(raw["العنوان"] ?? raw["Adresse"]),
    driverPhone:        str(raw["الهاتف"] ?? raw["Téléphone"]),
    driverCin:          str(raw["رقم بطاقة التعريف"] ?? raw["CIN"]),
    driverCinDate:      str(raw["تاريخ البطاقة"] ?? raw["Date CIN"]),
    driverCinPlace:     str(raw["مكان البطاقة"] ?? raw["Lieu CIN"]),
    driverLicense:      str(raw["رخصة السياقة عدد"] ?? raw["Permis N°"]),
    driverLicenseDate:  str(raw["تاريخ الرخصة"] ?? raw["Date permis"]),
    driverLicensePlace: str(raw["مكان الرخصة"] ?? raw["Lieu permis"]),
    // Driver 2
    hasDriver2:           !!(raw["الاسم و االقب 2"] || raw["Nom & Prénom 2"]),
    driver2Name:          str(raw["الاسم و االقب 2"] ?? raw["Nom & Prénom 2"]),
    driver2Dob:           str(raw["تاريخ ولادة 2"] ?? raw["Date naissance 2"]),
    driver2BirthPlace:    str(raw["مكان الولادة 2"] ?? raw["Lieu naissance 2"]),
    driver2Address:       str(raw["العنوان 2"] ?? raw["Adresse 2"]),
    driver2Phone:         str(raw["الهاتف 2"] ?? raw["Téléphone 2"]),
    driver2Cin:           str(raw["رقم بطاقة التعريف 2"] ?? raw["CIN 2"]),
    driver2CinDate:       str(raw["تاريخ البطاقة 2"] ?? raw["Date CIN 2"]),
    driver2CinPlace:      str(raw["مكان البطاقة 2"] ?? raw["Lieu CIN 2"]),
    driver2License:       str(raw["رخصة السياقة عدد 2"] ?? raw["Permis N° 2"]),
    driver2LicenseDate:   str(raw["تاريخ الرخصة 2"] ?? raw["Date permis 2"]),
    driver2LicensePlace:  str(raw["مكان الرخصة 2"] ?? raw["Lieu permis 2"]),
    // Financial
    totalPartiel:    str(raw["TOTAL PARTIEL"]),
    divers:          str(raw["Divers"]),
    totalHT:         str(raw["TOTAL HT"]),
    tva:             str(raw["TVA"]),
    totalFacture:    str(raw["TOTAL FACTURE"]),
    plusMoinsDivers: str(raw["Plus ou moins divers"]),
    depot:           str(raw["ضمان الايداع"] ?? raw["Dépôt garantie"]),
    prep:            str(raw["prep"]),
    total:           str(raw["الجملة"] ?? raw["Total"]),
    somme:           str(raw["المجموع"] ?? raw["Somme"]),
    resteAPayer:     str(raw["resteAPayer"] ?? raw["Reste à payer"] ?? "0"),
    // Other
    city: str(raw["مدينة الخروج"] ?? raw["Ville"]),
    date: str(raw["التاريخ"] ?? raw["Date"]),
    // Metadata - normalize timestamp: old Python app saves in seconds, new app in milliseconds
    _createdAt: (() => {
      const ts = raw["_created_at"] ?? raw["_createdAt"];
      if (!ts) return undefined;
      // If timestamp < 1e12 it's in seconds → convert to ms
      return ts < 1e12 ? Math.round(ts * 1000) : ts;
    })(),
    _updatedAt: (() => {
      const ts = raw["_updated_at"] ?? raw["_updatedAt"];
      if (!ts) return undefined;
      return ts < 1e12 ? Math.round(ts * 1000) : ts;
    })(),
    _deleted:   raw["_deleted"] ?? false,
    _createdBy: raw["_createdBy"] ?? raw["created_by"],
    _updatedBy: raw["_updatedBy"] ?? raw["updated_by"],
    branchId:   raw["branchId"],
    ownerId:    raw["ownerId"],
  };
}

/**
 * Maps new Contract interface back to legacy Firebase field names
 * so existing Python app stays compatible.
 */
export function mapContractToFirebase(contract: Partial<Contract>): Record<string, any> {
  const out: Record<string, any> = {};

  if (contract.contractNumber !== undefined) out["رقم العقد"] = contract.contractNumber;
  if (contract.brand !== undefined)          out["Marque"] = contract.brand;
  if (contract.model !== undefined)          out["Modèl"] = contract.model;
  if (contract.category !== undefined)       out["صنف السيارة"] = contract.category;
  if (contract.registration !== undefined)   out["Immatricule"] = contract.registration;
  if (contract.departureDate !== undefined)  out["يوم الانطلاق"] = contract.departureDate;
  if (contract.departureTime !== undefined)  out["ساعة الانطلاق"] = contract.departureTime;
  if (contract.departurePlace !== undefined) out["مكان الانطلاق"] = contract.departurePlace;
  if (contract.returnDate !== undefined)     out["يوم الرجوع"] = contract.returnDate;
  if (contract.returnTime !== undefined)     out["ساعة الرجوع"] = contract.returnTime;
  if (contract.departureKm !== undefined)    out["كلم الانطلاق"] = contract.departureKm;
  if (contract.returnKm !== undefined)       out["كلم الرجوع"] = contract.returnKm;
  if (contract.fuelType !== undefined) {
    out["Essence"] = contract.fuelType === "Essence" ? "X" : "";
    out["Gasoil"]  = contract.fuelType === "Gasoil"  ? "X" : "";
  }
  if (contract.remiseRetour !== undefined)   out["Remise au retour"] = contract.remiseRetour;

  if (contract.driverName !== undefined)         out["الاسم و اللقب"] = contract.driverName;
  if (contract.driverDob !== undefined)          out["تاريخ الولادة"] = contract.driverDob;
  if (contract.driverBirthPlace !== undefined)   out["مكان الولادة"] = contract.driverBirthPlace;
  if (contract.driverAddress !== undefined)      out["العنوان"] = contract.driverAddress;
  if (contract.driverPhone !== undefined)        out["الهاتف"] = contract.driverPhone;
  if (contract.driverCin !== undefined)          out["رقم بطاقة التعريف"] = contract.driverCin;
  if (contract.driverCinDate !== undefined)      out["تاريخ البطاقة"] = contract.driverCinDate;
  if (contract.driverCinPlace !== undefined)     out["مكان البطاقة"] = contract.driverCinPlace;
  if (contract.driverLicense !== undefined)      out["رخصة السياقة عدد"] = contract.driverLicense;
  if (contract.driverLicenseDate !== undefined)  out["تاريخ الرخصة"] = contract.driverLicenseDate;
  if (contract.driverLicensePlace !== undefined) out["مكان الرخصة"] = contract.driverLicensePlace;

  if (contract.driver2Name !== undefined)          out["الاسم و االقب 2"] = contract.driver2Name;
  if (contract.driver2Dob !== undefined)           out["تاريخ ولادة 2"] = contract.driver2Dob;
  if (contract.driver2BirthPlace !== undefined)    out["مكان الولادة 2"] = contract.driver2BirthPlace;
  if (contract.driver2Address !== undefined)       out["العنوان 2"] = contract.driver2Address;
  if (contract.driver2Phone !== undefined)         out["الهاتف 2"] = contract.driver2Phone;
  if (contract.driver2Cin !== undefined)           out["رقم بطاقة التعريف 2"] = contract.driver2Cin;
  if (contract.driver2CinDate !== undefined)       out["تاريخ البطاقة 2"] = contract.driver2CinDate;
  if (contract.driver2CinPlace !== undefined)      out["مكان البطاقة 2"] = contract.driver2CinPlace;
  if (contract.driver2License !== undefined)       out["رخصة السياقة عدد 2"] = contract.driver2License;
  if (contract.driver2LicenseDate !== undefined)   out["تاريخ الرخصة 2"] = contract.driver2LicenseDate;
  if (contract.driver2LicensePlace !== undefined)  out["مكان الرخصة 2"] = contract.driver2LicensePlace;

  if (contract.totalPartiel !== undefined)    out["TOTAL PARTIEL"] = contract.totalPartiel;
  if (contract.divers !== undefined)          out["Divers"] = contract.divers;
  if (contract.totalHT !== undefined)         out["TOTAL HT"] = contract.totalHT;
  if (contract.tva !== undefined)             out["TVA"] = contract.tva;
  if (contract.totalFacture !== undefined)    out["TOTAL FACTURE"] = contract.totalFacture;
  if (contract.plusMoinsDivers !== undefined) out["Plus ou moins divers"] = contract.plusMoinsDivers;
  if (contract.depot !== undefined)           out["ضمان الايداع"] = contract.depot;
  if (contract.prep !== undefined)            out["prep"] = contract.prep;
  if (contract.total !== undefined)           out["الجملة"] = contract.total;
  if (contract.somme !== undefined)           out["المجموع"] = contract.somme;

  if (contract.city !== undefined) out["مدينة الخروج"] = contract.city;
  if (contract.date !== undefined) out["التاريخ"] = contract.date;

  // Metadata fields - pass through directly
  if ((contract as any).branchId !== undefined)   out["branchId"]   = (contract as any).branchId;
  if ((contract as any)._createdBy !== undefined) out["_createdBy"] = (contract as any)._createdBy;
  if ((contract as any)._updatedBy !== undefined) out["_updatedBy"] = (contract as any)._updatedBy;
  if ((contract as any).ownerId !== undefined)    out["ownerId"]    = (contract as any).ownerId;

  return out;
}

function str(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}
