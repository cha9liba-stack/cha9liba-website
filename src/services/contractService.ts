import { ref, onValue, off } from "firebase/database";
import { db as firebaseDb } from "../lib/firebase";
import { localGetAll, localPut, localDelete, localBulkPut } from "../lib/db";
import { mapFirebaseToContract, mapContractToFirebase } from "../lib/contractMapper";
import { config } from "../lib/config";
import type { Contract } from "../types";

const CONTRACTS_PATH = config.firebase.paths.contracts;
const DB_URL = config.firebase.databaseUrl;
const FETCH_TIMEOUT = 30000;

function isOnline(): boolean {
  return navigator.onLine;
}

// ─── Data Validation ─────────────────────────────────────────────────────────────

export function validateContract(contract: Partial<Contract>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!contract.contractNumber?.trim()) errors.push("contractNumber is required");
  if (!contract.brand?.trim()) errors.push("brand is required");
  if (!contract.model?.trim()) errors.push("model is required");
  if (!contract.registration?.trim()) errors.push("registration is required");
  if (!contract.departureDate?.trim()) errors.push("departureDate is required");
  if (!contract.returnDate?.trim()) errors.push("returnDate is required");
  if (!contract.departureTime?.trim()) errors.push("departureTime is required");
  if (!contract.returnTime?.trim()) errors.push("returnTime is required");

  // Driver info
  if (!contract.driverName?.trim()) errors.push("driverName is required");
  if (!contract.driverPhone?.trim()) errors.push("driverPhone is required");
  if (!contract.driverCin?.trim()) errors.push("driverCin is required");

  // Date validation
  if (contract.departureDate && contract.returnDate) {
    if (contract.departureDate > contract.returnDate) {
      errors.push("departureDate must be before returnDate");
    }
  }

  // Phone validation (basic) - removed length restriction
  if (contract.driverPhone && !/^\d[\d\s\-\+\(\)]*$/.test(contract.driverPhone)) {
    errors.push("driverPhone is invalid");
  }

  return { valid: errors.length === 0, errors };
}

// ─── REST API fallback (works without apiKey when DB rules allow) ─────────────

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

async function restGet(path: string): Promise<any> {
  const res = await fetchWithTimeout(`${DB_URL}/${path}.json`);
  if (!res.ok) throw new Error(`REST GET failed: ${res.status}`);
  return res.json();
}

async function restPost(path: string, data: any): Promise<string> {
  const res = await fetchWithTimeout(`${DB_URL}/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST POST failed: ${res.status}`);
  const json = await res.json();
  return json.name; // Firebase returns { name: "-OXxxx" }
}

async function restPatch(path: string, data: any): Promise<void> {
  const res = await fetchWithTimeout(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST PATCH failed: ${res.status}`);
}

async function restDelete(path: string): Promise<void> {
  const res = await fetchWithTimeout(`${DB_URL}/${path}.json`, { method: "DELETE" });
  if (!res.ok) throw new Error(`REST DELETE failed: ${res.status}`);
}

// ─── Firebase CRUD via REST ───────────────────────────────────────────────────

export async function fbGetAllContracts(): Promise<Contract[]> {
  const raw = await restGet(CONTRACTS_PATH);
  if (!raw) return [];
  return Object.entries(raw as Record<string, Record<string, any>>)
    .filter(([, v]) => v && !v._deleted)
    .map(([id, v]) => mapFirebaseToContract(id, v));
}

// Get only the latest N contracts (faster initial load)
export async function fbGetRecentContracts(limit = 300): Promise<Contract[]> {
  try {
    // Use limitToLast on keys (Firebase key order = insertion order)
    const url = `${DB_URL}/${CONTRACTS_PATH}.json?orderBy=%22%24key%22&limitToLast=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`REST GET failed: ${res.status}`);
    const raw = await res.json();
    if (!raw) return [];
    return Object.entries(raw as Record<string, Record<string, any>>)
      .filter(([, v]) => v && !v._deleted)
      .map(([id, v]) => mapFirebaseToContract(id, v));
  } catch {
    return fbGetAllContracts();
  }
}

export async function fbInsertContract(contract: Omit<Contract, "id">): Promise<string> {
  const now = Date.now();
  const payload = {
    ...mapContractToFirebase(contract),
    _created_at: now,
    _updated_at: now,
    _createdBy: (contract as any)._createdBy || undefined,
    branchId: (contract as any).branchId || undefined,
    ownerId: (contract as any).ownerId || undefined,
    _deleted: false,
  };
  return restPost(CONTRACTS_PATH, payload);
}

export async function fbUpdateContract(id: string, data: Partial<Contract>): Promise<void> {
  await restPatch(`${CONTRACTS_PATH}/${id}`, {
    ...mapContractToFirebase(data),
    _updated_at: Date.now(),
    _updatedBy: (data as any)._updatedBy || undefined,
    _deleted: false,
  });
}

export async function fbDeleteContract(id: string): Promise<void> {
  await restPatch(`${CONTRACTS_PATH}/${id}`, { _deleted: true, status: "cancelled", _updated_at: Date.now() });
}

// ─── Filter: exclude "virtual" contracts (number doesn't start with 0) ────────
export function isRealContract(c: Contract): boolean {
  const num = String(c.contractNumber || "").trim();
  return num.startsWith("0") || num === "";
}

// ─── Unified API ──────────────────────────────────────────────────────────────

// Cache for contracts to avoid re-fetching
let contractsCache: Contract[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 300000; // 5 minutes cache

export async function getAllContracts(forceRefresh = false): Promise<Contract[]> {
  // Return cached data if available and fresh
  if (!forceRefresh && contractsCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return contractsCache;
  }

  // First, return local data immediately for fast load
  const localContracts = await localGetAll<Contract>("contracts");
  if (!contractsCache) {
    contractsCache = localContracts;
    cacheTimestamp = Date.now();
  }

  // Then fetch from Firebase in background if online
  if (isOnline()) {
    try {
      // Load only recent contracts (300) for faster load
      const recentFromFirebase = await fbGetRecentContracts(300);
      
      // Use recent from Firebase for faster load
      const merged = [...recentFromFirebase];
      
      // Add any contracts from localStorage that aren't in Firebase (offline-created)
      localContracts.forEach(c => {
        if (!merged.find(m => m.id === c.id)) {
          merged.push(c);
        }
      });

      // Update cache
      contractsCache = merged;
      cacheTimestamp = Date.now();
      
      // Update local cache with fresh data
      localBulkPut("contracts", merged).catch(() => {});
      return merged;
    } catch (e) {
      console.warn("[Firebase] getAllContracts failed, using local cache:", e);
    }
  }
  
  return contractsCache || localContracts;
}

// Clear cache when contracts are updated
export function clearContractsCache(): void {
  contractsCache = null;
  cacheTimestamp = 0;
}

export async function getPaginatedContracts(page: number = 1, pageSize: number = 50): Promise<{ contracts: Contract[]; total: number }> {
  const all = await getAllContracts();
  const filtered = all.filter(c => !c._deleted);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const contracts = filtered.slice(start, end);
  return { contracts, total };
}

export async function insertContract(contract: Omit<Contract, "id">): Promise<string> {
  const validation = validateContract(contract);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  const now = Date.now();
  const tempId = `temp_${now}`;
  
  // Optimistic update: add to local cache immediately
  const tempContract = { ...contract, id: tempId, _createdAt: now, _updatedAt: now };
  await localPut("contracts", tempContract);
  
  if (isOnline()) {
    try {
      const id = await fbInsertContract(contract);
      // Replace temp ID with real ID
      await localPut("contracts", { ...contract, id, _createdAt: now, _updatedAt: now });
      return id;
    } catch (e) {
      console.error("[Firebase] insertContract failed, keeping local copy:", e);
      // Keep the local copy with temp ID for later sync
      return tempId;
    }
  }
  
  return tempId;
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<void> {
  const updated = { ...data, _updatedAt: Date.now() };
  
  // Optimistic update: update local cache immediately
  const all = await localGetAll<Contract>("contracts");
  const existing = all.find((c) => c.id === id);
  if (existing) {
    const merged = { ...existing, ...updated };
    await localPut("contracts", merged);
  }
  
  if (isOnline()) {
    try {
      await fbUpdateContract(id, updated);
    } catch (e) {
      console.error("[Firebase] updateContract failed, keeping local copy:", e);
      // Keep the local update for later sync
      throw new Error("Échec de la mise à jour. Vérifiez votre connexion internet.");
    }
  }
}

export async function deleteContract(id: string): Promise<void> {
  if (isOnline()) {
    await fbDeleteContract(id);
  }
  await localDelete("contracts", id);
}

export async function isDuplicateContractNumber(
  number: string,
  excludeId?: string
): Promise<boolean> {
  const all = await getAllContracts();
  return all.some(
    (c) => c.contractNumber === number && c.id !== excludeId && !c._deleted
  );
}

// ─── Check if a car is available for a given period ──────────────────────────
export async function checkCarAvailability(
  registration: string,
  departureDate: string,
  returnDate: string,
  excludeId?: string
): Promise<{ available: boolean; conflictContract?: Contract }> {
  const all = await getAllContracts();
  const reg = registration.replace(/\s+/g, "").toUpperCase();

  const conflict = all.find(c => {
    if (c._deleted) return false;
    if (c.id === excludeId) return false;
    if ((c.registration || "").replace(/\s+/g, "").toUpperCase() !== reg) return false;
    // Check date overlap: A overlaps B if A.start < B.end AND A.end > B.start
    return departureDate < c.returnDate && returnDate > c.departureDate;
  });

  return conflict
    ? { available: false, conflictContract: conflict }
    : { available: true };
}

// ─── Realtime polling (replaces onValue since we use REST) ───────────────────

export function subscribeToContracts(
  callback: (contracts: Contract[]) => void
): () => void {
  let active = true;
  let pollInterval: ReturnType<typeof setTimeout> | null = null;

  // Try Firebase SDK realtime first (preferred method)
  try {
    const contractsRef = ref(firebaseDb, CONTRACTS_PATH);
    const handler = onValue(
      contractsRef,
      (snapshot) => {
        if (!snapshot.exists()) return callback([]);
        const raw = snapshot.val() as Record<string, Record<string, any>>;
        const contracts = Object.entries(raw)
          .filter(([, v]) => v && !v._deleted)
          .map(([id, v]) => mapFirebaseToContract(id, v));
        // Update cache
        contractsCache = contracts;
        cacheTimestamp = Date.now();
        callback(contracts);
        localBulkPut("contracts", contracts);
      },
      (error) => {
        console.warn("[Firebase] SDK listener failed, switching to polling:", error);
        startPolling();
      }
    );
    return () => {
      active = false;
      off(contractsRef, "value", handler);
      if (pollInterval) clearTimeout(pollInterval);
    };
  } catch {
    startPolling();
    return () => { 
      active = false; 
      if (pollInterval) clearTimeout(pollInterval);
    };
  }

  function startPolling() {
    const poll = async () => {
      if (!active) return;
      try {
        // Use recent contracts only for polling (faster)
        const contracts = await fbGetRecentContracts(300);
        // Update cache
        contractsCache = contracts;
        cacheTimestamp = Date.now();
        callback(contracts);
        await localBulkPut("contracts", contracts);
      } catch {/* silent */}
      // Poll every 30 seconds (reduced from 15)
      if (active) pollInterval = setTimeout(poll, 30000);
    };
    poll();
  }
}
