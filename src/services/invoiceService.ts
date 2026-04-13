// Firebase imports removed - using REST API directly
import type { Invoice } from "../types/invoice";

const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
const PATH   = "invoices";
const FETCH_TIMEOUT = 30000; // 30 seconds

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${FETCH_TIMEOUT}ms`);
    }
    throw error;
  }
}

async function restGet(path: string) {
  const res = await fetchWithTimeout(`${DB_URL}/${path}.json`);
  return res.ok ? res.json() : null;
}
async function restPost(path: string, data: any): Promise<string> {
  const res = await fetchWithTimeout(`${DB_URL}/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return json.name;
}
async function restDelete(path: string) {
  await fetchWithTimeout(`${DB_URL}/${path}.json`, { method: "DELETE" });
}

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const raw = await restGet(PATH);
    if (!raw) return [];
    return Object.entries(raw as Record<string, any>)
      .map(([id, v]) => normalizeInvoice(id, v))
      .filter(inv => inv.number || inv.totalTTC > 0)
      .sort((a, b) => (b._createdAt ?? 0) - (a._createdAt ?? 0));
  } catch (e) {
    console.warn("[Invoices] getAllInvoices failed:", e);
    return [];
  }
}

/** Normalize old Firebase format to new Invoice interface */
function normalizeInvoice(id: string, v: any): Invoice {
  // Already new format
  if (v.number && v.client) return { ...v, id };

  // Old format mapping
  const clientInfo = v["معلومات_العميل"] || {};
  const contracts  = v["العقود"] || [];

  const lines: any[] = contracts.map((c: any) => ({
    contractNumber: c["رقم العقد"] || c["N°"] || "",
    date:           c["يوم الانطلاق"] || c["Date"] || "",
    designation:    c["designation"] || "",
    days:           parseInt(c["عدد الأيام"] || c["N de Jour"] || "1") || 1,
    amount:         parseFloat(c["المبلغ"] || c["Montant"] || "0") || 0,
  }));

  const montantHT = parseFloat(v["المجموع_HT"] || "0");
  const tva       = parseFloat(v["TVA"] || "0");
  const timbre    = parseFloat(v["timbre"] || "0");
  const totalTTC  = parseFloat(v["المجموع_TTC"] || "0");

  // Parse date: supports DD/MM/YYYY and YYYY-MM-DD
  let date = v["تاريخ الفاتورة"] || v["date"] || "";
  if (date && date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      date = `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
    }
  }

  return {
    id,
    number:   v["رقم الفاتورة"] || v["number"] || "",
    date,
    type:     (v["type"] || "facture") as any,
    client: {
      name:    clientInfo["اسم_العميل"]           || clientInfo["name"]    || "",
      mf:      clientInfo["رقم_بطاقة_التعريف"]    || clientInfo["mf"]      || "",
      address: clientInfo["عنوان"]                || clientInfo["address"] || "",
      phone:   clientInfo["هاتف"]                 || clientInfo["phone"]   || "",
    },
    lines,
    montantHT,
    tva,
    tsl2dj:  v["tsl2dj"] || 0,
    timbre,
    totalTTC,
    amountInWords: v["amountInWords"] || amountInWords(totalTTC),
    _createdAt: v["_createdAt"] || v["created_at"] || 0,
    _createdBy: v["_createdBy"] || v["created_by"] || "",
  };
}

export async function insertInvoice(invoice: Omit<Invoice, "id">): Promise<string> {
  const payload = { ...invoice, _createdAt: Date.now() };
  return restPost(PATH, payload);
}

export async function updateInvoice(id: string, invoice: Partial<Invoice>): Promise<void> {
  await restPatch(`${PATH}/${id}`, { ...invoice, _updatedAt: Date.now() });
}

export async function deleteInvoice(id: string): Promise<void> {
  await restDelete(`${PATH}/${id}`);
}

export async function getNextInvoiceNumber(year?: number): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const all = await getAllInvoices();
  const thisYear = all.filter(inv => inv.number?.endsWith(`/${y}`));
  if (thisYear.length === 0) return `01/${y}`;
  const nums = thisYear.map(inv => parseInt(inv.number.split("/")[0]) || 0);
  const next = Math.max(...nums) + 1;
  return `${String(next).padStart(2, "0")}/${y}`;
}

// ─── Calculations ─────────────────────────────────────────────────────────────

export function calcInvoiceTotals(
  lines: { amount: number; days: number }[],
  type: "facture" | "bon" | "devis",
  is2026Plus: boolean
): { montantHT: number; tva: number; tsl2dj: number; timbre: number; totalTTC: number } {
  const totalAmount = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const totalDays   = lines.reduce((s, l) => s + (l.days || 0), 0);

  const tva     = type === "facture" ? totalAmount * 0.19 / 1.19 : 0;
  const montantHT = totalAmount - tva;
  const tsl2dj  = is2026Plus ? totalDays * 2 : 0;
  const timbre  = type === "facture" ? 1 : 0;
  const totalTTC = totalAmount + tsl2dj + timbre;

  return { montantHT, tva, tsl2dj, timbre, totalTTC };
}

// ─── Number to words (French) ─────────────────────────────────────────────────
const UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS  = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

function numToWordsFr(n: number): string {
  if (n === 0) return "zéro";
  if (n < 0) return "moins " + numToWordsFr(-n);
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    if (t === 7 || t === 9) return TENS[t - 1] + (u === 1 ? " et " : "-") + UNITS[10 + u];
    return TENS[t] + (u === 1 && t !== 8 ? " et un" : u > 0 ? "-" + UNITS[u] : "");
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? "cent" : UNITS[h] + " cent") + (r > 0 ? " " + numToWordsFr(r) : "");
  }
  const k = Math.floor(n / 1000), r = n % 1000;
  return (k === 1 ? "mille" : numToWordsFr(k) + " mille") + (r > 0 ? " " + numToWordsFr(r) : "");
}

export function amountInWords(amount: number): string {
  const intPart  = Math.floor(amount);
  const decPart  = Math.round((amount - intPart) * 1000);
  let result = numToWordsFr(intPart) + " Dinar" + (intPart > 1 ? "s" : "");
  if (decPart > 0) result += " et " + numToWordsFr(decPart) + " Millime" + (decPart > 1 ? "s" : "");
  return result.charAt(0).toUpperCase() + result.slice(1);
}
