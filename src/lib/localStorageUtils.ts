/**
 * LocalStorage utility functions with error handling and space checking
 */

const QUOTA_KEY = "__quota_test__";

/**
 * Get the approximate available space in localStorage (in bytes)
 */
export function getAvailableSpace(): number {
  try {
    const test = new Array(1024).join("x");
    localStorage.setItem(QUOTA_KEY, test);
    localStorage.removeItem(QUOTA_KEY);
    return 5 * 1024 * 1024; // Approximate 5MB limit
  } catch (e) {
    return 0;
  }
}

/**
 * Check if there's enough space to save data
 */
export function hasSpaceFor(data: unknown): boolean {
  try {
    const serialized = JSON.stringify(data);
    const testKey = "__space_test__";
    localStorage.setItem(testKey, serialized);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe localStorage.setItem with error handling
 */
export function safeSetItem(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.error(`[localStorage] Failed to set ${key}:`, e);
    // Try to clear old data if quota exceeded
    try {
      clearOldData();
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Safe localStorage.getItem with error handling
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`[localStorage] Failed to get ${key}:`, e);
    return defaultValue;
  }
}

/**
 * Safe localStorage.removeItem with error handling
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`[localStorage] Failed to remove ${key}:`, e);
  }
}

/**
 * Clear old/cached data to free up space
 */
function clearOldData(): void {
  const keysToRemove = [
    "palma_car_profiles",
    "palma_fleet_cars",
    "palma_state_overrides",
    "palma_custom_states",
    "gps_odometer_cache",
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  });
}

/**
 * Get localStorage usage statistics
 */
export function getStorageStats(): { used: number; available: number; percentage: number } {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }
    const available = 5 * 1024 * 1024; // Approximate 5MB limit
    const used = total * 2; // UTF-16 encoding
    return {
      used,
      available: available - used,
      percentage: (used / available) * 100,
    };
  } catch {
    return { used: 0, available: 0, percentage: 0 };
  }
}
