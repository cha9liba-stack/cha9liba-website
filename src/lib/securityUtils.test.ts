import { describe, it, expect } from "vitest";
import {
  sanitizeHtml,
  sanitizeInput,
  validatePhoneNumber,
  validateEmail,
  validateCIN,
  generateToken,
  isSafeString,
} from "./securityUtils";

describe("securityUtils", () => {
  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("Hello");
    });

    it("should allow safe HTML", () => {
      const input = "<p>Hello</p><strong>World</strong>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
    });
  });

  describe("sanitizeInput", () => {
    it("should escape HTML special characters", () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).not.toContain("<script>");
    });

    it("should trim whitespace", () => {
      const input = "  test  ";
      const result = sanitizeInput(input);
      expect(result).toBe("test");
    });
  });

  describe("validatePhoneNumber", () => {
    it("should validate valid phone numbers", () => {
      expect(validatePhoneNumber("1234567890")).toBe(true);
      expect(validatePhoneNumber("+216 12345678")).toBe(true);
      expect(validatePhoneNumber("(123) 456-7890")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(validatePhoneNumber("123")).toBe(false);
      expect(validatePhoneNumber("abc")).toBe(false);
      expect(validatePhoneNumber("")).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("should validate valid emails", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
    });
  });

  describe("validateCIN", () => {
    it("should validate valid CIN numbers", () => {
      expect(validateCIN("12345678")).toBe(true);
      expect(validateCIN("1234567A")).toBe(true);
      expect(validateCIN("1234567 a")).toBe(true);
    });

    it("should reject invalid CIN numbers", () => {
      expect(validateCIN("123")).toBe(false);
      expect(validateCIN("abc")).toBe(false);
      expect(validateCIN("")).toBe(false);
    });
  });

  describe("generateToken", () => {
    it("should generate a random token", () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes * 2 hex chars
    });
  });

  describe("isSafeString", () => {
    it("should detect safe strings", () => {
      expect(isSafeString("Hello World")).toBe(true);
      expect(isSafeString("Test123")).toBe(true);
    });

    it("should detect dangerous strings", () => {
      expect(isSafeString("<script>alert('xss')</script>")).toBe(false);
      expect(isSafeString("javascript:void(0)")).toBe(false);
      expect(isSafeString("onclick=alert('xss')")).toBe(false);
      expect(isSafeString("data:text/html,<script>alert('xss')</script>")).toBe(false);
    });
  });
});
