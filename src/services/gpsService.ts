import { invoke } from "@tauri-apps/api/core";
import { safeGetItem, safeSetItem } from "../lib/localStorageUtils";

const CACHE_KEY = "gps_odometer_cache";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface CacheEntry {
  km: number;
  timestamp: number;
}

function getCachedKm(registration: string): number | null {
  try {
    const cache = safeGetItem<Record<string, CacheEntry>>(CACHE_KEY, {});
    const entry = cache[registration];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      delete cache[registration];
      safeSetItem(CACHE_KEY, cache);
      return null;
    }
    return entry.km;
  } catch {
    return null;
  }
}

function setCachedKm(registration: string, km: number): void {
  try {
    const cache = safeGetItem<Record<string, CacheEntry>>(CACHE_KEY, {});
    cache[registration] = { km, timestamp: Date.now() };
    safeSetItem(CACHE_KEY, cache);
  } catch {}
}

export async function getOdometerForReg(registration: string): Promise<number | null> {
  const normalizedReg = registration.replace(/\s+/g, "").toUpperCase();

  // Check cache first
  const cached = getCachedKm(normalizedReg);
  if (cached !== null) return cached;

  // Fetch from GPS
  try {
    const km = await invoke<number | null>("get_gps_odometer", {
      registration: normalizedReg,
    });
    if (km !== null) {
      setCachedKm(normalizedReg, km);
    }
    return km;
  } catch {
    return null;
  }
}
