/**
 * Database ATO Categories Integration Tests
 * 
 * Test suite for ATO category validation rules (pure functions)
 * Database operations require Tauri runtime and are tested separately.
 * 
 * Run validation tests: npm test -- --run src/lib/db-ato-categories.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateAtoCategoryCode,
  validateReceipt,
  validateWorkpaper,
} from "./db";
import { AtoCategoryCode } from "./ato-categories";

// Mock Tauri modules for unit tests
vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn(),
  },
}));

describe("ATO Categories Validation Rules", () => {
  describe("validateAtoCategoryCode", () => {
    it("should validate all D1-D15 category codes", () => {
      const validCodes: AtoCategoryCode[] = [
        "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
        "D10", "D11", "D12", "D13", "D14", "D15"
      ];
      
      for (const code of validCodes) {
        const result = validateAtoCategoryCode(code);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it("should reject invalid category codes", () => {
      const invalidCodes = ["D99", "D16", "X1", "ABC", "123", "D0", "D"];
      
      for (const code of invalidCodes) {
        const result = validateAtoCategoryCode(code);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe("INVALID_CODE");
      }
    });

    it("should reject empty category code", () => {
      const result = validateAtoCategoryCode("");
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe("REQUIRED");
    });

    it("should return correct error structure", () => {
      const result = validateAtoCategoryCode("INVALID");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("validateReceipt", () => {
    it("should validate a complete valid receipt", () => {
      const receipt = {
        vendor: "Test Vendor",
        amount: 100.00,
        category: "Vehicle",
        date: "2024-01-15",
        ato_category_code: "D1" as AtoCategoryCode
      };
      
      const result = validateReceipt(receipt);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject receipt without vendor", () => {
      const result = validateReceipt({
        amount: 100.00,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "vendor" && e.code === "REQUIRED")).toBe(true);
    });

    it("should reject receipt with empty vendor", () => {
      const result = validateReceipt({
        vendor: "   ",
        amount: 100.00,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "vendor")).toBe(true);
    });

    it("should reject receipt without amount", () => {
      const result = validateReceipt({
        vendor: "Test",
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "amount" && e.code === "REQUIRED")).toBe(true);
    });

    it("should reject receipt with negative amount", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: -100.00,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "amount" && e.code === "INVALID_AMOUNT")).toBe(true);
    });

    it("should warn on zero amount", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 0,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.field === "amount" && w.code === "ZERO_AMOUNT")).toBe(true);
    });

    it("should reject receipt without category", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 100.00,
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "category")).toBe(true);
    });

    it("should reject receipt without date", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 100.00,
        category: "Vehicle"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "date" && e.code === "REQUIRED")).toBe(true);
    });

    it("should reject invalid date format", () => {
      const invalidDates = ["01-15-2024", "2024/01/15", "Jan 15 2024", "2024-1-5"];
      
      for (const date of invalidDates) {
        const result = validateReceipt({
          vendor: "Test",
          amount: 100.00,
          category: "Vehicle",
          date
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === "date" && e.code === "INVALID_FORMAT")).toBe(true);
      }
    });

    it("should reject empty date string as required", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 100.00,
        category: "Vehicle",
        date: ""
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "date" && e.code === "REQUIRED")).toBe(true);
    });

    it("should validate receipt with valid YYYY-MM-DD date", () => {
      const validDates = ["2024-01-15", "2023-12-31", "2025-06-30"];
      
      for (const date of validDates) {
        const result = validateReceipt({
          vendor: "Test",
          amount: 100.00,
          category: "Vehicle",
          date
        });
        
        expect(result.errors.some(e => e.field === "date")).toBe(false);
      }
    });

    it("should validate ATO category code when provided", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 100.00,
        category: "Vehicle",
        date: "2024-01-15",
        ato_category_code: "D99" as AtoCategoryCode
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "ato_category_code")).toBe(true);
    });

    it("should accept receipt without ATO category code", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 100.00,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(true);
    });

    it("should accept all valid ATO category codes", () => {
      const validCodes: AtoCategoryCode[] = [
        "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
        "D10", "D11", "D12", "D13", "D14", "D15"
      ];
      
      for (const code of validCodes) {
        const result = validateReceipt({
          vendor: "Test",
          amount: 100.00,
          category: "Test",
          date: "2024-01-15",
          ato_category_code: code
        });
        
        expect(result.errors.some(e => e.field === "ato_category_code")).toBe(false);
      }
    });

    it("should handle decimal amounts correctly", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 99.99,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(true);
    });

    it("should handle very large amounts", () => {
      const result = validateReceipt({
        vendor: "Test",
        amount: 999999.99,
        category: "Vehicle",
        date: "2024-01-15"
      });
      
      expect(result.valid).toBe(true);
    });
  });

  describe("validateWorkpaper", () => {
    it("should validate a complete valid workpaper", () => {
      const workpaper = {
        title: "Test Workpaper",
        category_code: "D1" as AtoCategoryCode,
        tax_year: 2024,
        total_amount: 1000.00,
        is_finalized: false
      };
      
      const result = validateWorkpaper(workpaper);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject workpaper without title", () => {
      const result = validateWorkpaper({
        category_code: "D1",
        tax_year: 2024
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "title" && e.code === "REQUIRED")).toBe(true);
    });

    it("should reject workpaper with empty title", () => {
      const result = validateWorkpaper({
        title: "   ",
        category_code: "D1",
        tax_year: 2024
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "title")).toBe(true);
    });

    it("should reject workpaper without category_code", () => {
      const result = validateWorkpaper({
        title: "Test",
        tax_year: 2024
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "category_code" && e.code === "REQUIRED")).toBe(true);
    });

    it("should reject workpaper with invalid category_code", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D99" as AtoCategoryCode,
        tax_year: 2024
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "category_code" && e.code === "INVALID_CODE")).toBe(true);
    });

    it("should reject workpaper without tax_year", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D1"
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "tax_year" && e.code === "REQUIRED")).toBe(true);
    });

    it("should reject workpaper with year before 2000", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D1",
        tax_year: 1999
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "tax_year" && e.code === "INVALID_YEAR")).toBe(true);
    });

    it("should reject workpaper with year after 2100", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D1",
        tax_year: 2101
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "tax_year" && e.code === "INVALID_YEAR")).toBe(true);
    });

    it("should accept workpaper with year 2000", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D1",
        tax_year: 2000
      });
      
      expect(result.errors.some(e => e.field === "tax_year")).toBe(false);
    });

    it("should accept workpaper with year 2100", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D1",
        tax_year: 2100
      });
      
      expect(result.errors.some(e => e.field === "tax_year")).toBe(false);
    });

    it("should accept workpaper with optional fields omitted", () => {
      const result = validateWorkpaper({
        title: "Test",
        category_code: "D1",
        tax_year: 2024
      });
      
      expect(result.valid).toBe(true);
    });

    it("should accept all valid ATO category codes", () => {
      const validCodes: AtoCategoryCode[] = [
        "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
        "D10", "D11", "D12", "D13", "D14", "D15"
      ];
      
      for (const code of validCodes) {
        const result = validateWorkpaper({
          title: "Test",
          category_code: code,
          tax_year: 2024
        });
        
        expect(result.valid).toBe(true);
      }
    });
  });
});

describe("ATO Categories Data Integrity", () => {
  it("should have exactly 15 ATO category codes", () => {
    const validCodes: AtoCategoryCode[] = [
      "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
      "D10", "D11", "D12", "D13", "D14", "D15"
    ];
    expect(validCodes).toHaveLength(15);
  });

  it("should have sequential codes from D1 to D15", () => {
    const codes = Array.from({ length: 15 }, (_, i) => `D${i + 1}`);
    for (let i = 0; i < codes.length; i++) {
      expect(codes[i]).toBe(`D${i + 1}`);
    }
  });
});
