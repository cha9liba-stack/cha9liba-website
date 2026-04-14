export type InvoiceType = "facture" | "bon" | "devis";

export interface InvoiceLine {
  contractNumber: string;
  date: string;
  designation: string;
  days: number;
  pricePerDay?: number; // devis only
  amount: number;
}

export interface InvoiceClient {
  name: string;
  mf: string;       // Matricule Fiscal
  address: string;
  phone: string;
}

export interface Invoice {
  id?: string;
  number: string;           // e.g. "09/2026"
  date: string;             // YYYY-MM-DD
  type: InvoiceType;
  client: InvoiceClient;
  companyId?: string | null; // ID of the selected company from palma_companies
  lines: InvoiceLine[];
  montantHT: number;
  tva: number;
  tsl2dj: number;           // Taxe Services Location 2dt/j (2026+)
  timbre: number;           // 1.000 for facture, 0 for bon/devis
  totalTTC: number;
  amountInWords?: string;
  _createdAt?: number;
  _createdBy?: string;
}
