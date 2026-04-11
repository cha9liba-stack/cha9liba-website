import { describe, it, expect } from "vitest";
import { validateContract, isRealContract } from "./contractService";
import type { Contract } from "../types";

describe("contractService", () => {
  describe("validateContract", () => {
    it("should validate a complete contract", () => {
      const contract: Partial<Contract> = {
        contractNumber: "01/2024",
        brand: "Toyota",
        model: "Corolla",
        registration: "123 TN 1234",
        departureDate: "2024-01-15",
        returnDate: "2024-01-20",
        departureTime: "10:00",
        returnTime: "10:00",
        driverName: "John Doe",
        driverPhone: "1234567890",
        driverCin: "12345678",
      };

      const result = validateContract(contract);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject contract with missing required fields", () => {
      const contract: Partial<Contract> = {
        contractNumber: "01/2024",
      };

      const result = validateContract(contract);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject contract with invalid date range", () => {
      const contract: Partial<Contract> = {
        contractNumber: "01/2024",
        brand: "Toyota",
        model: "Corolla",
        registration: "123 TN 1234",
        departureDate: "2024-01-20",
        returnDate: "2024-01-15", // Return before departure
        departureTime: "10:00",
        returnTime: "10:00",
        driverName: "John Doe",
        driverPhone: "1234567890",
        driverCin: "12345678",
      };

      const result = validateContract(contract);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("departureDate must be before returnDate");
    });

    it("should reject contract with invalid phone number", () => {
      const contract: Partial<Contract> = {
        contractNumber: "01/2024",
        brand: "Toyota",
        model: "Corolla",
        registration: "123 TN 1234",
        departureDate: "2024-01-15",
        returnDate: "2024-01-20",
        departureTime: "10:00",
        returnTime: "10:00",
        driverName: "John Doe",
        driverPhone: "123", // Too short
        driverCin: "12345678",
      };

      const result = validateContract(contract);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("driverPhone is invalid");
    });
  });

  describe("isRealContract", () => {
    it("should return true for contracts starting with 0", () => {
      const contract: Partial<Contract> = {
        id: "1",
        contractNumber: "01/2024",
        brand: "Toyota",
        model: "Corolla",
        registration: "123 TN 1234",
        departureDate: "2024-01-15",
        returnDate: "2024-01-20",
        departureTime: "10:00",
        returnTime: "10:00",
        driverName: "John Doe",
        driverPhone: "1234567890",
        driverCin: "12345678",
        totalFacture: "100",
        depot: "50",
      };

      expect(isRealContract(contract as Contract)).toBe(true);
    });

    it("should return true for empty contract numbers", () => {
      const contract: Partial<Contract> = {
        id: "1",
        contractNumber: "",
        brand: "Toyota",
        model: "Corolla",
        registration: "123 TN 1234",
        departureDate: "2024-01-15",
        returnDate: "2024-01-20",
        departureTime: "10:00",
        returnTime: "10:00",
        driverName: "John Doe",
        driverPhone: "1234567890",
        driverCin: "12345678",
        totalFacture: "100",
        depot: "50",
      };

      expect(isRealContract(contract as Contract)).toBe(true);
    });

    it("should return false for contracts not starting with 0", () => {
      const contract: Partial<Contract> = {
        id: "1",
        contractNumber: "99/2024",
        brand: "Toyota",
        model: "Corolla",
        registration: "123 TN 1234",
        departureDate: "2024-01-15",
        returnDate: "2024-01-20",
        departureTime: "10:00",
        returnTime: "10:00",
        driverName: "John Doe",
        driverPhone: "1234567890",
        driverCin: "12345678",
        totalFacture: "100",
        depot: "50",
      };

      expect(isRealContract(contract as Contract)).toBe(false);
    });
  });
});
