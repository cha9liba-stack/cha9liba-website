import { config } from "../lib/config";
import { Payment, ContractPaymentSummary } from "../types";

const PAYMENTS_KEY = "palma_payments";
const DB_URL = config.firebase.databaseUrl;

function getPayments(): Payment[] {
  try {
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePayments(payments: Payment[]): void {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  // Sync to Firebase
  fetch(`${DB_URL}/payments.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payments),
  }).catch(() => {});
}

export function getPaymentsForContract(contractId: string): Payment[] {
  return getPayments().filter(p => p.contractId === contractId);
}

export function getPaymentSummary(contractId: string, totalAmount: number): ContractPaymentSummary {
  const payments = getPaymentsForContract(contractId);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const lastPaymentDate = payments.length > 0 
    ? payments.sort((a, b) => b._createdAt - a._createdAt)[0].date 
    : undefined;
  
  return {
    total: totalAmount,
    paid,
    remaining: Math.max(0, totalAmount - paid),
    payments,
    lastPaymentDate,
  };
}

export function addPayment(payment: Omit<Payment, "id" | "_createdAt">): Payment {
  const newPayment: Payment = {
    ...payment,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    _createdAt: Date.now(),
  };
  
  const payments = getPayments();
  payments.push(newPayment);
  savePayments(payments);
  
  return newPayment;
}

export function deletePayment(paymentId: string): void {
  const payments = getPayments().filter(p => p.id !== paymentId);
  savePayments(payments);
}

export function updatePayment(paymentId: string, updates: Partial<Payment>): Payment | null {
  const payments = getPayments();
  const index = payments.findIndex(p => p.id === paymentId);
  if (index === -1) return null;
  
  payments[index] = { ...payments[index], ...updates };
  savePayments(payments);
  
  return payments[index];
}

export function getTotalUnpaid(): { count: number; amount: number } {
  const payments = getPayments();
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const recentPayments = payments.filter(p => p._createdAt >= weekAgo);
  const totalAmount = recentPayments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    count: recentPayments.length,
    amount: totalAmount,
  };
}

export function getPaymentsByDateRange(startDate: string, endDate: string): Payment[] {
  return getPayments().filter(p => p.date >= startDate && p.date <= endDate);
}

export function getPaymentsByMethod(method: Payment["method"]): Payment[] {
  return getPayments().filter(p => p.method === method);
}
