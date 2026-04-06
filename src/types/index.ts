export interface Contract {
  id?: string;
  // Vehicle
  contractNumber: string;
  brand: string;
  model: string;
  category: string;
  registration: string; // e.g. "1234TU567"
  departureDate: string;
  departureTime: string;
  departurePlace: string;
  returnDate: string;
  returnTime: string;
  departureKm: string;
  returnKm: string;
  fuelType: "Essence" | "Gasoil" | "";
  remiseRetour: string;
  // Driver 1
  driverName: string;
  driverDob: string;
  driverBirthPlace: string;
  driverAddress: string;
  driverPhone: string;
  driverCin: string;
  driverCinDate: string;
  driverCinPlace: string;
  driverLicense: string;
  driverLicenseDate: string;
  driverLicensePlace: string;
  // Driver 2 (optional)
  hasDriver2: boolean;
  driver2Name: string;
  driver2Dob: string;
  driver2BirthPlace: string;
  driver2Address: string;
  driver2Phone: string;
  driver2Cin: string;
  driver2CinDate: string;
  driver2CinPlace: string;
  driver2License: string;
  driver2LicenseDate: string;
  driver2LicensePlace: string;
  // Financial
  totalPartiel: string;
  divers: string;
  totalHT: string;
  tva: string;
  totalFacture: string;
  plusMoinsDivers: string;
  depot: string;
  prep: string;
  total: string;
  somme: string;
  resteAPayer: string;
  // Other
  city: string;
  date: string;
  // Metadata
  _createdAt?: number;
  _updatedAt?: number;
  _deleted?: boolean;
}

export interface User {
  id?: string;
  username: string;
  role: "admin" | "user" | "sous-traitant";
  permissions: string[];
}

export interface AuditLog {
  userId: string;
  username: string;
  role: string;
  action: string;
  targetId?: string;
  timestamp: string;
  details?: string;
}

export type Lang = "ar" | "fr";

export interface MaintenanceCar {
  id?: string;
  registration: string;
  brand: string;
  reason: string;
  entryDate: string;
  exitDate: string;
  mechanic: string;
  price: string;
  notes: string;
}

export interface Reservation {
  id?: string;
  clientName: string;
  phone: string;
  startDate: string;
  endDate: string;
  brand: string;
  registration: string;
  notes: string;
  advance: string;
}

export interface UnpaidRecord {
  id?: string;
  clientName: string;
  contractNumber: string;
  advance: string;
  rest: string;
  total: string;
  date: string;
  phone: string;
}

export type CarStatus = "rented" | "available" | "maintenance" | "reserved";

export interface CarDocument {
  id: string;
  type: "assurance" | "vignette" | "vidange" | "visite_technique" | "autre";
  label: string;
  expiryDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface CarExpense {
  id: string;
  date: string; // YYYY-MM-DD
  category: "carburant" | "reparation" | "entretien" | "assurance" | "vignette" | "autre";
  amount: number;
  description: string;
}

export interface CarProfile {
  registration: string;
  photo?: string; // base64 or URL
  documents: CarDocument[];
  expenses: CarExpense[];
  // Financial data (imported from old system)
  priceAchat?: number;       // سعر الشراء
  priceVent?: number;        // سعر البيع
  avance?: number;           // الدفعة الأولى
  priceTrait?: number;       // القسط الشهري
  nombreMoisFix?: number;    // عدد الأشهر
  dateFirstCirculation?: string; // تاريخ أول تسجيل
  dateFirstTrait?: string;   // تاريخ أول قسط
  kilometrage?: number;      // الكيلومتراج
  color?: string;            // اللون
  year?: number;             // سنة الصنع
  category?: string;         // الفئة
}

export interface ClientCompany {
  name: string;
  mf: string;       // Matricule fiscal
  phone: string;
  address: string;
  email?: string;
}

export interface ClientAlert {
  id: string;
  type: "debt" | "damage" | "fine" | "problem" | "other";
  message: string;
  amount?: number;
  date: string;
  resolved: boolean;
}

export interface Client {
  id: string;
  name: string;
  cin: string;
  phone: string;
  address: string;
  dob?: string;
  notes?: string;
  isCompany: boolean;
  company?: ClientCompany;
  banned?: boolean;
  banReason?: string;
  alerts?: ClientAlert[];
  // Metadata
  _createdAt: number;
  _updatedAt: number;
}

export interface FleetSnapshot {
  date: string; // YYYY-MM-DD
  rentedContracts: Contract[];
  maintenance: MaintenanceCar[];
  reservations: Reservation[];
  unpaid: UnpaidRecord[];
}
