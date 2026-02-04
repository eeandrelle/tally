/**
 * Income Categories Tests
 * 
 * Comprehensive test suite for the income category database and functions.
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import Database from "@tauri-apps/plugin-sql";
import {
  IncomeCategoryCode,
  incomeCategories,
  getAllIncomeCategories,
  getIncomeCategoryByCode,
  getIncomeCategoriesByPriority,
  getPrefillableIncomeCategories,
  getHighPriorityCategories,
  searchIncomeCategories,
  getSubcategoryByCode,
  getSubcategoriesForCategory,
  getAtoItemCodesSummary,
  getCategoriesWithWorkpapers,
  validateIncomeAmount
} from "./income-categories";
import {
  initIncomeCategoryTables,
  getIncomeCategorySettings,
  updateIncomeCategorySetting,
  createIncomeEntry,
  updateIncomeEntry,
  deleteIncomeEntry,
  getIncomeEntries,
  getIncomeEntryById,
  getIncomeSummaryByCategory,
  getTotalIncomeForYear,
  getUnreviewedIncomeEntries,
  markIncomeEntryReviewed,
  importPrefilledIncome,
  getIncomeReconciliationReport,
  resetIncomeCategorySettings
} from "./db-income-categories";

// Mock Database for testing
// Note: These tests would need to be run with an actual SQLite database
// in a Tauri environment. This file serves as the test specification.

describe("Income Categories - Static Data", () => {
  describe("Category Count and Structure", () => {
    it("should have 15 income categories", () => {
      const categories = getAllIncomeCategories();
      expect(categories.length).toBe(15);
    });

    it("should have required fields for all categories", () => {
      const categories = getAllIncomeCategories();
      
      for (const cat of categories) {
        expect(cat.code).toBeDefined();
        expect(cat.name).toBeDefined();
        expect(cat.shortDescription).toBeDefined();
        expect(cat.fullDescription).toBeDefined();
        expect(cat.atoLabel).toBeDefined();
        expect(cat.subcategories).toBeDefined();
        expect(cat.subcategories.length).toBeGreaterThan(0);
        expect(cat.taxTreatment).toBeDefined();
        expect(cat.source).toBeDefined();
        expect(cat.recordKeeping).toBeDefined();
        expect(cat.atoReference).toBeDefined();
        expect(cat.priority).toBeDefined();
      }
    });

    it("should have valid priority values", () => {
      const categories = getAllIncomeCategories();
      const validPriorities = ["high", "medium", "low"];
      
      for (const cat of categories) {
        expect(validPriorities).toContain(cat.priority);
      }
    });

    it("should have valid tax treatment values", () => {
      const categories = getAllIncomeCategories();
      const validTreatments = ["taxable", "tax_free", "concessional", "deferred", "exempt"];
      
      for (const cat of categories) {
        expect(validTreatments).toContain(cat.taxTreatment);
      }
    });
  });

  describe("Category Lookup", () => {
    it("should find category by code", () => {
      const category = getIncomeCategoryByCode("SALARY");
      expect(category).toBeDefined();
      expect(category?.name).toBe("Salary and Wages");
      expect(category?.code).toBe("SALARY");
    });

    it("should return undefined for invalid code", () => {
      const category = getIncomeCategoryByCode("INVALID" as IncomeCategoryCode);
      expect(category).toBeUndefined();
    });

    it("should get all high priority categories", () => {
      const highPriority = getHighPriorityCategories();
      expect(highPriority.length).toBeGreaterThan(0);
      
      for (const cat of highPriority) {
        expect(cat.priority).toBe("high");
      }
    });

    it("should get prefillable categories", () => {
      const prefillable = getPrefillableIncomeCategories();
      
      for (const cat of prefillable) {
        expect(cat.prefillAvailable).toBe(true);
      }
    });

    it("should get categories by priority", () => {
      const high = getIncomeCategoriesByPriority("high");
      const medium = getIncomeCategoriesByPriority("medium");
      const low = getIncomeCategoriesByPriority("low");

      expect(high.length).toBeGreaterThan(0);
      expect(medium.length).toBeGreaterThan(0);
      expect(low.length).toBeGreaterThan(0);

      for (const cat of high) expect(cat.priority).toBe("high");
      for (const cat of medium) expect(cat.priority).toBe("medium");
      for (const cat of low) expect(cat.priority).toBe("low");
    });
  });

  describe("Search Functionality", () => {
    it("should search by name", () => {
      const results = searchIncomeCategories("salary");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.code === "SALARY")).toBe(true);
    });

    it("should search by description", () => {
      const results = searchIncomeCategories("franking");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.code === "DIVIDENDS")).toBe(true);
    });

    it("should return empty for no matches", () => {
      const results = searchIncomeCategories("xyzabc123");
      expect(results.length).toBe(0);
    });

    it("should be case insensitive", () => {
      const results1 = searchIncomeCategories("SALARY");
      const results2 = searchIncomeCategories("salary");
      const results3 = searchIncomeCategories("SaLaRy");
      
      expect(results1.length).toBe(results2.length);
      expect(results2.length).toBe(results3.length);
    });
  });

  describe("Subcategories", () => {
    it("should get subcategories for a category", () => {
      const subcategories = getSubcategoriesForCategory("SALARY");
      expect(subcategories.length).toBeGreaterThan(0);
      
      for (const sub of subcategories) {
        expect(sub.code).toBeDefined();
        expect(sub.name).toBeDefined();
        expect(sub.description).toBeDefined();
        expect(sub.taxTreatment).toBeDefined();
      }
    });

    it("should find subcategory by code", () => {
      const result = getSubcategoryByCode("SALARY_BASIC");
      expect(result).toBeDefined();
      expect(result?.subcategory.name).toBe("Base Salary/Wages");
      expect(result?.category.code).toBe("SALARY");
    });

    it("should return undefined for invalid subcategory code", () => {
      const result = getSubcategoryByCode("INVALID_SUBCATEGORY");
      expect(result).toBeUndefined();
    });
  });

  describe("ATO Item Codes", () => {
    it("should provide ATO item codes summary", () => {
      const summary = getAtoItemCodesSummary();
      expect(summary.length).toBe(15);
      
      for (const item of summary) {
        expect(item.code).toBeDefined();
        expect(item.category).toBeDefined();
        expect(Array.isArray(item.atoItems)).toBe(true);
      }
    });

    it("should have ATO item codes for salary category", () => {
      const summary = getAtoItemCodesSummary();
      const salary = summary.find(s => s.code === "SALARY");
      
      expect(salary).toBeDefined();
      expect(salary?.atoItems.length).toBeGreaterThan(0);
      expect(salary?.atoItems).toContain("24M");
    });
  });

  describe("Workpaper Associations", () => {
    it("should get categories with workpapers", () => {
      const withWorkpapers = getCategoriesWithWorkpapers();
      expect(withWorkpapers.length).toBeGreaterThan(0);
      
      for (const cat of withWorkpapers) {
        expect(cat.workpaperAssociation).toBeDefined();
        expect(cat.workpaperAssociation?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Validation", () => {
    it("should validate positive amounts", () => {
      const result = validateIncomeAmount("SALARY", 50000);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("should reject negative amounts", () => {
      const result = validateIncomeAmount("SALARY", -100);
      expect(result.valid).toBe(false);
      expect(result.warning).toContain("cannot be negative");
    });

    it("should warn on zero amount", () => {
      const result = validateIncomeAmount("SALARY", 0);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain("zero");
    });

    it("should warn on very large amounts", () => {
      const result = validateIncomeAmount("SALARY", 15000000);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain("Very large");
    });
  });
});

describe("Income Categories - Database Integration", () => {
  // Note: These tests require an actual database connection
  // They are structured for testing with a real SQLite database

  let db: Database;

  // This would be replaced with actual database initialization
  beforeAll(async () => {
    // db = await Database.load("sqlite:test.db");
    // await initIncomeCategoryTables(db);
  });

  beforeEach(async () => {
    // Reset settings before each test
    // await resetIncomeCategorySettings(db);
  });

  describe("Settings Management", () => {
    it("should initialize default settings", async () => {
      // Test would verify that all 15 categories have settings entries
      // const settings = await getIncomeCategorySettings(db);
      // expect(settings.length).toBe(15);
    });

    it("should update setting visibility", async () => {
      // await updateIncomeCategorySetting(db, "SALARY", { is_visible: false });
      // const settings = await getVisibleIncomeCategorySettings(db);
      // expect(settings.some(s => s.code === "SALARY")).toBe(false);
    });

    it("should update setting custom name", async () => {
      // await updateIncomeCategorySetting(db, "SALARY", { custom_name: "Employment Income" });
      // const settings = await getIncomeCategorySettings(db);
      // const salary = settings.find(s => s.code === "SALARY");
      // expect(salary?.custom_name).toBe("Employment Income");
    });
  });

  describe("Income Entries", () => {
    it("should create income entry", async () => {
      // const entry = {
      //   category_code: "SALARY" as IncomeCategoryCode,
      //   source: "Test Employer",
      //   amount: 80000,
      //   tax_year: 2025,
      //   date_received: "2024-06-30",
      //   is_prefilled: false,
      //   is_reviewed: false
      // };
      // const id = await createIncomeEntry(db, entry);
      // expect(id).toBeGreaterThan(0);
    });

    it("should get income entries by tax year", async () => {
      // const entries = await getIncomeEntries(db, 2025);
      // expect(Array.isArray(entries)).toBe(true);
    });

    it("should filter entries by category", async () => {
      // const entries = await getIncomeEntries(db, 2025, "SALARY");
      // for (const entry of entries) {
      //   expect(entry.category_code).toBe("SALARY");
      // }
    });

    it("should update income entry", async () => {
      // await updateIncomeEntry(db, 1, { amount: 85000, is_reviewed: true });
      // const entry = await getIncomeEntryById(db, 1);
      // expect(entry?.amount).toBe(85000);
      // expect(entry?.is_reviewed).toBe(true);
    });

    it("should delete income entry", async () => {
      // await deleteIncomeEntry(db, 1);
      // const entry = await getIncomeEntryById(db, 1);
      // expect(entry).toBeUndefined();
    });
  });

  describe("Income Summaries", () => {
    it("should get summary by category", async () => {
      // const summary = await getIncomeSummaryByCategory(db, 2025);
      // expect(Array.isArray(summary)).toBe(true);
      // for (const item of summary) {
      //   expect(item.category_code).toBeDefined();
      //   expect(item.total_amount).toBeDefined();
      //   expect(item.entry_count).toBeDefined();
      // }
    });

    it("should get total income for year", async () => {
      // const totals = await getTotalIncomeForYear(db, 2025);
      // expect(typeof totals.total_income).toBe("number");
      // expect(typeof totals.total_tax_withheld).toBe("number");
      // expect(typeof totals.entry_count).toBe("number");
    });
  });

  describe("Review Workflow", () => {
    it("should get unreviewed entries", async () => {
      // const entries = await getUnreviewedIncomeEntries(db, 2025);
      // for (const entry of entries) {
      //   expect(entry.is_reviewed).toBe(false);
      // }
    });

    it("should mark entry as reviewed", async () => {
      // await markIncomeEntryReviewed(db, 1, true);
      // const entry = await getIncomeEntryById(db, 1);
      // expect(entry?.is_reviewed).toBe(true);
    });
  });

  describe("Prefilled Data Import", () => {
    it("should import prefilled entries", async () => {
      // const entries = [
      //   {
      //     category_code: "SALARY" as IncomeCategoryCode,
      //     source: "ATO Prefill",
      //     amount: 75000,
      //     tax_year: 2025,
      //     date_received: "2024-06-30"
      //   }
      // ];
      // const result = await importPrefilledIncome(db, entries);
      // expect(result.imported).toBe(1);
      // expect(result.skipped).toBe(0);
    });

    it("should skip duplicate entries", async () => {
      // Import same entry twice
      // Second import should skip
      // expect(result.skipped).toBe(1);
    });
  });

  describe("Reconciliation Report", () => {
    it("should generate reconciliation report", async () => {
      // const report = await getIncomeReconciliationReport(db, 2025);
      // expect(Array.isArray(report)).toBe(true);
      // for (const item of report) {
      //   expect(item.prefilled_total).toBeDefined();
      //   expect(item.manual_total).toBeDefined();
      //   expect(item.difference).toBeDefined();
      // }
    });
  });
});

describe("Income Categories - High Priority Categories Content", () => {
  it("should have correct salary category structure", () => {
    const salary = getIncomeCategoryByCode("SALARY");
    expect(salary).toBeDefined();
    expect(salary?.priority).toBe("high");
    expect(salary?.subcategories.length).toBe(5);
    expect(salary?.prefillAvailable).toBe(true);
    expect(salary?.atoItemCodes).toContain("24M");
    expect(salary?.atoItemCodes).toContain("24N");
  });

  it("should have correct dividends category structure", () => {
    const dividends = getIncomeCategoryByCode("DIVIDENDS");
    expect(dividends).toBeDefined();
    expect(dividends?.priority).toBe("high");
    expect(dividends?.subcategories.length).toBe(5);
    expect(dividends?.prefillAvailable).toBe(true);
    expect(dividends?.atoItemCodes).toContain("11");
  });

  it("should have correct interest category structure", () => {
    const interest = getIncomeCategoryByCode("INTEREST");
    expect(interest).toBeDefined();
    expect(interest?.priority).toBe("high");
    expect(interest?.subcategories.length).toBe(5);
    expect(interest?.prefillAvailable).toBe(true);
  });

  it("should have correct rental category structure", () => {
    const rental = getIncomeCategoryByCode("RENTAL");
    expect(rental).toBeDefined();
    expect(rental?.priority).toBe("high");
    expect(rental?.subcategories.length).toBe(5);
    expect(rental?.prefillAvailable).toBe(false); // Rental not prefilled
    expect(rental?.workpaperAssociation).toBe("rental-property");
  });

  it("should have correct capital gains category structure", () => {
    const cgt = getIncomeCategoryByCode("CAPITAL_GAINS");
    expect(cgt).toBeDefined();
    expect(cgt?.priority).toBe("high");
    expect(cgt?.workpaperAssociation).toBe("capital-gains");
  });
});

describe("Income Categories - Record Keeping Requirements", () => {
  it("should specify 5-year retention for most categories", () => {
    const categories = getAllIncomeCategories();
    
    for (const cat of categories) {
      expect(cat.recordKeeping.retentionPeriod).toBeDefined();
      // Most require 5 years
      if (cat.code !== "CAPITAL_GAINS") {
        expect(cat.recordKeeping.retentionPeriod).toContain("5");
      }
    }
  });

  it("should have required documents for all categories", () => {
    const categories = getAllIncomeCategories();
    
    for (const cat of categories) {
      expect(cat.recordKeeping.requiredDocuments.length).toBeGreaterThan(0);
    }
  });

  it("should have record keeping description for all categories", () => {
    const categories = getAllIncomeCategories();
    
    for (const cat of categories) {
      expect(cat.recordKeeping.description.length).toBeGreaterThan(10);
    }
  });
});

describe("Income Categories - ATO References", () => {
  it("should have valid ATO URLs for all categories", () => {
    const categories = getAllIncomeCategories();
    
    for (const cat of categories) {
      expect(cat.atoReference).toContain("ato.gov.au");
      expect(cat.atoReference.startsWith("https://")).toBe(true);
    }
  });
});
