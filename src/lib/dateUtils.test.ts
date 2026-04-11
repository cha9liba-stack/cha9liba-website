import { describe, it, expect } from "vitest";
import {
  getCurrentDateUTC,
  getCurrentDateLocal,
  parseDate,
  formatDateUTC,
  formatDateLocal,
  formatDateFrench,
  formatDateArabic,
  formatTime,
  combineDateTime,
  isPastDate,
  isFutureDate,
  isToday,
  daysBetween,
  addDays,
  getStartOfMonth,
  getEndOfMonth,
  formatDateLocale,
} from "./dateUtils";

describe("dateUtils", () => {
  describe("getCurrentDateUTC", () => {
    it("should return current date in UTC format", () => {
      const date = getCurrentDateUTC();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getCurrentDateLocal", () => {
    it("should return current date in local format", () => {
      const date = getCurrentDateLocal();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("parseDate", () => {
    it("should parse date string to Date object", () => {
      const date = parseDate("2024-01-15");
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });

    it("should return current date for empty string", () => {
      const date = parseDate("");
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe("formatDateUTC", () => {
    it("should format date to UTC format", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const formatted = formatDateUTC(date);
      expect(formatted).toBe("2024-01-15");
    });
  });

  describe("formatDateLocal", () => {
    it("should format date to local format", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateLocal(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("formatDateFrench", () => {
    it("should format date to French format", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateFrench(date);
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe("formatDateArabic", () => {
    it("should format date to Arabic format", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateArabic(date);
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe("formatTime", () => {
    it("should format time to HH:MM format", () => {
      const date = new Date("2024-01-15T14:30:00");
      const formatted = formatTime(date);
      expect(formatted).toBe("14:30");
    });
  });

  describe("combineDateTime", () => {
    it("should combine date and time strings", () => {
      const result = combineDateTime("2024-01-15", "14:30");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe("isPastDate", () => {
    it("should return true for past dates", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isPastDate(formatDateLocal(yesterday))).toBe(true);
    });

    it("should return false for future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isPastDate(formatDateLocal(tomorrow))).toBe(false);
    });
  });

  describe("isFutureDate", () => {
    it("should return true for future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isFutureDate(formatDateLocal(tomorrow))).toBe(true);
    });

    it("should return false for past dates", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isFutureDate(formatDateLocal(yesterday))).toBe(false);
    });
  });

  describe("isToday", () => {
    it("should return true for today's date", () => {
      expect(isToday(formatDateLocal(new Date()))).toBe(true);
    });

    it("should return false for other dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(formatDateLocal(tomorrow))).toBe(false);
    });
  });

  describe("daysBetween", () => {
    it("should calculate days between two dates", () => {
      const result = daysBetween("2024-01-15", "2024-01-17");
      expect(result).toBe(2);
    });
  });

  describe("addDays", () => {
    it("should add days to a date", () => {
      const result = addDays("2024-01-15", 5);
      expect(result).toBe("2024-01-20");
    });
  });

  describe("getStartOfMonth", () => {
    it("should return start of month", () => {
      const date = new Date("2024-01-15");
      const result = getStartOfMonth(date);
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(0);
    });
  });

  describe("getEndOfMonth", () => {
    it("should return end of month", () => {
      const date = new Date("2024-01-15");
      const result = getEndOfMonth(date);
      expect(result.getMonth()).toBe(0); // January (0-indexed)
      expect(result.getDate()).toBe(31);
    });
  });

  describe("formatDateLocale", () => {
    it("should format date to French locale", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateLocale(date, "fr");
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it("should format date to Arabic locale", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateLocale(date, "ar");
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it("should default to French locale", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateLocale(date);
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });
});
