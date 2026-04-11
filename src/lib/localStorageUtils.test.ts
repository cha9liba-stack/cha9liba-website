import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { safeSetItem, safeGetItem, safeRemoveItem, getStorageStats } from "./localStorageUtils";

describe("localStorageUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("safeSetItem", () => {
    it("should save data successfully", () => {
      const result = safeSetItem("test-key", { value: "test" });
      expect(result).toBe(true);
      expect(localStorage.getItem("test-key")).toBe('{"value":"test"}');
    });

    it("should handle large data gracefully", () => {
      // Create a large object to simulate quota pressure
      const largeData = { data: "x".repeat(1000000) };
      const result = safeSetItem("test-key", largeData);
      // Should either succeed or fail gracefully without throwing
      expect(typeof result).toBe("boolean");
    });
  });

  describe("safeGetItem", () => {
    it("should retrieve data successfully", () => {
      localStorage.setItem("test-key", '{"value":"test"}');
      const result = safeGetItem("test-key", { value: "default" });
      expect(result).toEqual({ value: "test" });
    });

    it("should return default value if key does not exist", () => {
      const result = safeGetItem("non-existent-key", { value: "default" });
      expect(result).toEqual({ value: "default" });
    });

    it("should return default value if data is corrupted", () => {
      localStorage.setItem("test-key", "invalid-json");
      const result = safeGetItem("test-key", { value: "default" });
      expect(result).toEqual({ value: "default" });
    });
  });

  describe("safeRemoveItem", () => {
    it("should remove data successfully", () => {
      localStorage.setItem("test-key", '{"value":"test"}');
      safeRemoveItem("test-key");
      expect(localStorage.getItem("test-key")).toBeNull();
    });

    it("should handle errors gracefully", () => {
      // Should not throw even if key doesn't exist
      expect(() => safeRemoveItem("non-existent-key")).not.toThrow();
    });
  });

  describe("getStorageStats", () => {
    it("should return storage statistics", () => {
      localStorage.setItem("key1", "value1");
      localStorage.setItem("key2", "value2");

      const stats = getStorageStats();
      expect(stats).toHaveProperty("used");
      expect(stats).toHaveProperty("available");
      expect(stats).toHaveProperty("percentage");
      expect(stats.used).toBeGreaterThan(0);
      expect(stats.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeLessThanOrEqual(100);
    });

    it("should return zero stats when localStorage is empty", () => {
      const stats = getStorageStats();
      expect(stats.used).toBe(0);
      expect(stats.percentage).toBe(0);
    });
  });
});
