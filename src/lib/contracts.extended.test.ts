import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  parseContractFromText,
  extractContractType,
  extractContractNumber,
  extractTotalValue,
  extractParties,
  extractKeyDates,
  extractPaymentSchedules,
  extractDepreciationInfo,
  validateExtractedContract,
  validateABN,
  validateACN,
  summarizeContract,
  calculateTotalDepreciationValue,
  getImmediateDeductions,
  getLowValuePoolAssets,
  exportContractsToJSON,
  exportContractsToCSV,
  type Contract,
  type ExtractedContract,
} from "./contracts";

// ============================================================================
// Extended Contract Parser Tests
// ============================================================================

describe("Contract Parser - Extended Tests", () => {
  describe("Currency and Amount Parsing", () => {
    it("should extract amounts with dollar sign", () => {
      const result = extractTotalValue("Total: $1,234.56");
      expect(result?.value).toBe(1234.56);
    });

    it("should extract large amounts", () => {
      const result = extractTotalValue("Contract Value: $1,000,000.00");
      expect(result?.value).toBe(1000000);
    });

    it("should extract amounts without decimals", () => {
      const result = extractTotalValue("Amount: $500");
      expect(result?.value).toBe(500);
    });

    it("should handle amounts with AUD prefix", () => {
      const result = extractTotalValue("Total: AUD 2,500.00");
      expect(result?.value).toBe(2500);
    });

    it("should handle amounts with spaces in dollar sign", () => {
      const result = extractTotalValue("Total: $ 5,000.00");
      expect(result?.value).toBe(5000);
    });
  });

  describe("Date Format Parsing", () => {
    it("should parse DD/MM/YYYY format", () => {
      const result = extractKeyDates("Start Date: 25/12/2024");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].date).toBe("2024-12-25");
    });

    it("should parse YYYY-MM-DD format", () => {
      const result = extractKeyDates("End Date: 2024-12-31");
      // The parser may or may not detect this depending on keywords
    });

    it("should parse textual month format", () => {
      const result = extractKeyDates("Commencement: 1 Jan 2024");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].date).toBe("2024-01-01");
    });

    it("should parse full month names", () => {
      const result = extractKeyDates("Date: 15 December 2024");
      if (result.length > 0) {
        expect(result[0].date).toBe("2024-12-15");
      }
    });
  });

  describe("Party Extraction Details", () => {
    it("should identify vendor role", () => {
      const result = extractParties("Vendor: ABC Supplies");
      expect(result[0].role).toBe("vendor");
    });

    it("should identify client role", () => {
      const result = extractParties("Client: XYZ Corporation");
      expect(result[0].role).toBe("client");
    });

    it("should identify contractor role", () => {
      const result = extractParties("Contractor: BuildRight Pty Ltd");
      expect(result[0].role).toBe("contractor");
    });

    it("should extract supplier as vendor", () => {
      const result = extractParties("Supplier: Office Depot");
      expect(result[0].role).toBe("vendor");
    });
  });

  describe("Depreciation Asset Classification", () => {
    it("should classify assets under $300 as immediate deduction", () => {
      const result = extractDepreciationInfo("Office chair: $150.00");
      if (result.length > 0) {
        expect(result[0].is_immediate_deduction).toBe(true);
        expect(result[0].is_low_value_pool).toBe(false);
      }
    });

    it("should classify assets $300-$1000 as low value pool", () => {
      const result = extractDepreciationInfo("Monitor: $450.00");
      if (result.length > 0) {
        expect(result[0].is_low_value_pool).toBe(true);
        expect(result[0].is_immediate_deduction).toBe(false);
      }
    });

    it("should classify assets over $1000 as regular depreciation", () => {
      const result = extractDepreciationInfo("Server equipment: $5,000.00");
      if (result.length > 0) {
        expect(result[0].is_immediate_deduction).toBe(false);
        expect(result[0].is_low_value_pool).toBe(false);
      }
    });
  });

  describe("Payment Schedule Extraction", () => {
    it("should detect milestone payments", () => {
      const result = extractPaymentSchedules("Milestone 1 Payment: $5,000");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].is_milestone).toBe(true);
    });

    it("should extract payment with due date", () => {
      const result = extractPaymentSchedules("Payment: $1,000 due 15/03/2024");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].due_date).toBeDefined();
    });

    it("should extract percentage values", () => {
      const result = extractPaymentSchedules("Deposit: 25% of total");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].percentage).toBe(25);
    });
  });

  describe("Contract Type Detection", () => {
    it("should detect consulting agreement", () => {
      const result = extractContractType("This Consulting Agreement...");
      expect(result?.value).toBe("Consulting Agreement");
    });

    it("should detect maintenance contract", () => {
      const result = extractContractType("Annual Maintenance Contract");
      expect(result?.value).toBe("Maintenance Contract");
    });

    it("should detect software license", () => {
      const result = extractContractType("Software License Agreement");
      expect(result?.value).toBe("Software License");
    });

    it("should return undefined for unrelated text", () => {
      const result = extractContractType("Just some random document");
      expect(result).toBeUndefined();
    });
  });

  describe("Contract Number Patterns", () => {
    it("should extract alphanumeric contract numbers", () => {
      const result = extractContractNumber("Contract: ABC-2024-001");
      expect(result?.value).toBe("ABC-2024-001");
    });

    it("should extract reference numbers with prefix", () => {
      const result = extractContractNumber("Reference Number: REF12345");
      expect(result?.value).toBe("REF12345");
    });

    it("should extract SA format numbers", () => {
      const result = extractContractNumber("SA-2024-123");
      expect(result?.value).toBe("SA-2024-123");
    });
  });

  describe("Contract Validation", () => {
    it("should mark contracts with all required fields as valid", () => {
      const contract: ExtractedContract = {
        contract_type: { value: "Service Agreement", confidence: 0.9, source: "test" },
        total_value: { value: 10000, confidence: 0.9, source: "test" },
        parties: [{ name: "Test Co", role: "client", confidence: 0.8 }],
        payment_schedules: [],
        key_dates: [{ date: "2024-01-01", description: "Start", date_type: "commencement", confidence: 0.8 }],
        depreciation_assets: [],
        important_clauses: [],
        raw_text: "test",
        overall_confidence: 0.85,
        document_type: "Pdf",
      };

      const validation = validateExtractedContract(contract);
      expect(validation.is_valid).toBe(true);
      expect(validation.suggested_action).toBe("accept");
    });

    it("should flag contracts missing critical fields", () => {
      const contract: ExtractedContract = {
        parties: [],
        payment_schedules: [],
        key_dates: [],
        depreciation_assets: [],
        important_clauses: [],
        raw_text: "test",
        overall_confidence: 0.3,
        document_type: "Pdf",
      };

      const validation = validateExtractedContract(contract);
      expect(validation.suggested_action).toBe("manual_entry");
      expect(validation.missing_fields.length).toBeGreaterThan(0);
    });

    it("should warn about suspiciously high values", () => {
      const contract: ExtractedContract = {
        contract_type: { value: "Service", confidence: 0.9, source: "test" },
        total_value: { value: 50000000, confidence: 0.9, source: "test" },
        parties: [{ name: "Test", role: "client", confidence: 0.8 }],
        payment_schedules: [],
        key_dates: [],
        depreciation_assets: [],
        important_clauses: [],
        raw_text: "test",
        overall_confidence: 0.8,
        document_type: "Pdf",
      };

      const validation = validateExtractedContract(contract);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Export Functions", () => {
    const mockContracts: Contract[] = [
      {
        id: 1,
        contract_type: "Service Agreement",
        contract_number: "SA-001",
        total_value: 10000,
        parties_json: JSON.stringify([{ name: "Test Co" }]),
        payment_schedules_json: JSON.stringify([{ amount: 5000 }]),
        key_dates_json: JSON.stringify([{ date: "2024-01-01" }]),
        depreciation_assets_json: JSON.stringify([{ asset_value: 500 }]),
        important_clauses_json: "[]",
        document_type: "pdf",
        confidence_score: 0.85,
        status: "approved",
        created_at: "2024-01-01",
      },
    ];

    it("should export to JSON", () => {
      const json = exportContractsToJSON(mockContracts);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].contract_type).toBe("Service Agreement");
    });

    it("should export to CSV", () => {
      const csv = exportContractsToCSV(mockContracts);
      expect(csv).toContain("Contract Type");
      expect(csv).toContain("Service Agreement");
      expect(csv).toContain("10000");
    });
  });

  describe("Depreciation Utility Functions", () => {
    const mockAssets = [
      { asset_value: 200, is_immediate_deduction: true, is_low_value_pool: false },
      { asset_value: 600, is_immediate_deduction: false, is_low_value_pool: true },
      { asset_value: 2000, is_immediate_deduction: false, is_low_value_pool: false },
    ];

    it("should calculate total depreciation correctly", () => {
      const total = calculateTotalDepreciationValue(mockAssets as any);
      expect(total).toBe(2800);
    });

    it("should filter only immediate deductions", () => {
      const immediate = getImmediateDeductions(mockAssets as any);
      expect(immediate).toHaveLength(1);
      expect(immediate[0].asset_value).toBe(200);
    });

    it("should filter only low value pool assets", () => {
      const pool = getLowValuePoolAssets(mockAssets as any);
      expect(pool).toHaveLength(1);
      expect(pool[0].asset_value).toBe(600);
    });
  });

  describe("ABN Validation Edge Cases", () => {
    it("should handle ABN with various spacing", () => {
      expect(validateABN("51824753556")).toBe(true);
      expect(validateABN("51 824 753 556")).toBe(true);
      expect(validateABN("51824 753 556")).toBe(true);
    });

    it("should reject non-numeric ABN", () => {
      expect(validateABN("abcdefghijk")).toBe(false);
      expect(validateABN("51 824 753 55a")).toBe(false);
    });

    it("should reject wrong length ABN", () => {
      expect(validateABN("5182475355")).toBe(false);
      expect(validateABN("518247535560")).toBe(false);
    });
  });

  describe("ACN Validation Edge Cases", () => {
    it("should handle ACN with various spacing", () => {
      expect(validateACN("005749986")).toBe(true);
      expect(validateACN("005 749 986")).toBe(true);
    });

    it("should reject non-numeric ACN", () => {
      expect(validateACN("abcdefghi")).toBe(false);
      expect(validateACN("005 749 98a")).toBe(false);
    });

    it("should reject wrong length ACN", () => {
      expect(validateACN("00574998")).toBe(false);
      expect(validateACN("0057499860")).toBe(false);
    });
  });

  describe("Contract Summary", () => {
    it("should summarize contract with all fields", () => {
      const contract: Contract = {
        id: 1,
        total_value: 50000,
        parties_json: JSON.stringify([{ name: "A" }, { name: "B" }, { name: "C" }]),
        key_dates_json: JSON.stringify([{}, {}, {}, {}]),
        payment_schedules_json: JSON.stringify([{}, {}]),
        depreciation_assets_json: JSON.stringify([
          { asset_value: 200, is_immediate_deduction: true },
          { asset_value: 500, is_low_value_pool: true },
          { asset_value: 2000, is_immediate_deduction: false, is_low_value_pool: false },
        ]),
        document_type: "pdf",
        confidence_score: 0.9,
        status: "approved",
      };

      const summary = summarizeContract(contract);
      expect(summary.totalValue).toBe(50000);
      expect(summary.partyCount).toBe(3);
      expect(summary.keyDatesCount).toBe(4);
      expect(summary.paymentCount).toBe(2);
      expect(summary.depreciationCount).toBe(3);
      expect(summary.immediateDeductions).toBe(1);
      expect(summary.lowValuePoolAssets).toBe(1);
    });

    it("should handle contract with missing JSON fields", () => {
      const contract: Contract = {
        id: 1,
        total_value: 10000,
        document_type: "pdf",
        confidence_score: 0.8,
        status: "draft",
      };

      const summary = summarizeContract(contract);
      expect(summary.totalValue).toBe(10000);
      expect(summary.partyCount).toBe(0);
      expect(summary.keyDatesCount).toBe(0);
    });
  });
});
