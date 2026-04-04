/**
 * Local SQLite-like storage using IndexedDB via a simple wrapper.
 * Acts as offline cache and fallback when Firebase is unavailable.
 */

const DB_NAME = "palma_renta_car";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("contracts")) {
        const store = db.createObjectStore("contracts", { keyPath: "id" });
        store.createIndex("contractNumber", "contractNumber", { unique: false });
        store.createIndex("_updatedAt", "_updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("invoices")) {
        db.createObjectStore("invoices", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sync_meta")) {
        db.createObjectStore("sync_meta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function localGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function localPut<T>(store: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function localDelete(store: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function localBulkPut<T>(store: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const s = tx.objectStore(store);
    items.forEach((item) => s.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncMeta(key: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("sync_meta", "readonly");
    const req = tx.objectStore("sync_meta").get(key);
    req.onsuccess = () => resolve(req.result?.value ?? 0);
    req.onerror = () => resolve(0);
  });
}

export async function setSyncMeta(key: string, value: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_meta", "readwrite");
    tx.objectStore("sync_meta").put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
