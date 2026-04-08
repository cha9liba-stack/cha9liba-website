import { ref, onValue, off } from "firebase/database";
import { db as firebaseDb } from "../lib/firebase";
import { localGetAll, localPut, localDelete, localBulkPut } from "../lib/db";
import { mapFirebaseToContract, mapContractToFirebase } from "../lib/contractMapper";
import type { Contract } from "../types";

const CONTRACTS_PATH = "contracts";
const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

function isOnline(): boolean {
  return navigator.onLine;
}

// ─── REST API fallback (works without apiKey when DB rules allow) ─────────────

async function restGet(path: string): Promise<any> {
  const res = await fetch(`${DB_URL}/${path}.json`);
  if (!res.ok) throw new Error(`REST GET failed: ${res.status}`);
  return res.json();
}

async function restPost(path: string, data: any): Promise<string> {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST POST failed: ${res.status}`);
  const json = await res.json();
  return json.name; // Firebase returns { name: "-OXxxx" }
}

async function restPatch(path: string, data: any): Promise<void> {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST PATCH failed: ${res.status}`);
}

async function restDelete(path: string): Promise<void> {
  const res = await fetch(`${DB_URL}/${path}.json`, { method: "DELETE" });
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
  await restDelete(`${CONTRACTS_PATH}/${id}`);
}

// ─── Filter: exclude "virtual" contracts (number doesn't start with 0) ────────
export function isRealContract(c: Contract): boolean {
  const num = String(c.contractNumber || "").trim();
  return num.startsWith("0") || num === "";
}

// ─── Unified API ──────────────────────────────────────────────────────────────

export async function getAllContracts(): Promise<Contract[]> {
  if (isOnline()) {
    try {
      // Load recent contracts fast (last 300)
      const recent = await fbGetRecentContracts(300);
      // Merge with local cache (which may have older contracts)
      const cached = await localGetAll<Contract>("contracts");
      const recentIds = new Set(recent.map(c => c.id));
      // Keep cached contracts not in recent (older ones), plus all recent
      const older = cached.filter(c => !recentIds.has(c.id!) && !c._deleted);
      const merged = [...recent, ...older];
      // Update cache in background
      localBulkPut("contracts", recent).catch(() => {});
      return merged;
    } catch (e) {
      console.warn("[Firebase] getAllContracts failed, using local cache:", e);
    }
  }
  return localGetAll<Contract>("contracts");
}

export async function insertContract(contract: Omit<Contract, "id">): Promise<string> {
  const now = Date.now();
  if (isOnline()) {
    const id = await fbInsertContract(contract);
    await localPut("contracts", { ...contract, id, _createdAt: now, _updatedAt: now });
    return id;
  }
  const tempId = `local_${now}`;
  await localPut("contracts", { ...contract, id: tempId, _createdAt: now, _updatedAt: now });
  return tempId;
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<void> {
  const updated = { ...data, _updatedAt: Date.now() };
  if (isOnline()) {
    await fbUpdateContract(id, updated);
  }
  const all = await localGetAll<Contract>("contracts");
  const existing = all.find((c) => c.id === id);
  if (existing) {
    await localPut("contracts", { ...existing, ...updated });
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

// ─── Realtime polling (replaces onValue since we use REST) ───────────────────

export function subscribeToContracts(
  callback: (contracts: Contract[]) => void
): () => void {
  let active = true;

  // Try Firebase SDK realtime first
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
    };
  } catch {
    startPolling();
    return () => { active = false; };
  }

  function startPolling() {
    const poll = async () => {
      if (!active) return;
      try {
        const contracts = await fbGetRecentContracts(300);
        callback(contracts);
        await localBulkPut("contracts", contracts);
      } catch {/* silent */}
      if (active) setTimeout(poll, 15000);
    };
    poll();
  }
}
