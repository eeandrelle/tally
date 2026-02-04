/**
 * ATO Categories Tests
 * 
 * Test suite for ATO deduction category database.
 */

import { describe, it, expect } from "vitest";
import {
  atoCategories,
  getCategoryByCode,
  getAllCategories,
  getCategoriesByPriority,
  getCategoriesByUsage,
  searchCategories,
  getRelatedCategories,
  getCategoryCount,
  getCategoryStats,
  requiresReceipts,
  AtoCategoryCode
} from "./ato-categories";

describe("ATO Categories", () => {
  describe("Data Integrity", () => {
    it("should have all 15 categories D1-D15", () => {
      expect(atoCategories).toHaveLength(15);
      expect(getCategoryCount()).toBe(15);
    });

    it("should have all codes from D1 to D15", () => {
      const codes = atoCategories.map(c => c.code).sort((a, b) => {
        const numA = parseInt(a.slice(1));
        const numB = parseInt(b.slice(1));
        return numA - numB;
      });
      const expectedCodes = Array.from({ length: 15 }, (_, i) => `D${i + 1}`);
      expect(codes).toEqual(expectedCodes);
    });

    it("each category should have required fields", () => {
      for (const cat of atoCategories) {
        expect(cat.code).toBeDefined();
        expect(cat.name).toBeDefined();
        expect(cat.name.length).toBeGreaterThan(0);
        expect(cat.shortDescription).toBeDefined();
        expect(cat.fullDescription).toBeDefined();
        expect(cat.eligibilityCriteria).toBeInstanceOf(Array);
        expect(cat.eligibilityCriteria.length).toBeGreaterThan(0);
        expect(cat.receiptRequirements).toBeDefined();
        expect(cat.recordKeeping).toBeDefined();
        expect(cat.commonMistakes).toBeInstanceOf(Array);
        expect(cat.tips).toBeInstanceOf(Array);
        expect(cat.examples.claimable).toBeInstanceOf(Array);
        expect(cat.examples.notClaimable).toBeInstanceOf(Array);
        expect(cat.atoReference).toMatch(/^https:\/\/www.ato.gov.au/);
      }
    });
  });

  describe("getCategoryByCode", () => {
    it("should return correct category for each code", () => {
      expect(getCategoryByCode("D1")?.name).toBe("Work-related car expenses");
      expect(getCategoryByCode("D5")?.name).toBe("Other work-related expenses");
      expect(getCategoryByCode("D9")?.name).toBe("Cost of managing tax affairs");
      expect(getCategoryByCode("D10")?.name).toBe("Personal superannuation contributions");
    });

    it("should return undefined for invalid code", () => {
      expect(getCategoryByCode("D99" as AtoCategoryCode)).toBeUndefined();
      expect(getCategoryByCode("X1" as AtoCategoryCode)).toBeUndefined();
    });
  });

  describe("getAllCategories", () => {
    it("should return all categories", () => {
      const all = getAllCategories();
      expect(all).toHaveLength(15);
      expect(all[0].code).toBe("D1");
    });

    it("should return a copy (not reference)", () => {
      const all = getAllCategories();
      all.pop();
      expect(getAllCategories()).toHaveLength(15);
    });
  });

  describe("getCategoriesByPriority", () => {
    it("should return categories filtered by priority", () => {
      const high = getCategoriesByPriority("high");
      const medium = getCategoriesByPriority("medium");
      const low = getCategoriesByPriority("low");

      expect(high.length).toBeGreaterThan(0);
      expect(medium.length).toBeGreaterThan(0);
      expect(low.length).toBeGreaterThan(0);

      for (const cat of high) {
        expect(cat.priority).toBe("high");
      }
      for (const cat of medium) {
        expect(cat.priority).toBe("medium");
      }
      for (const cat of low) {
        expect(cat.priority).toBe("low");
      }
    });

    it("high priority should include D1, D2, D5, D9", () => {
      const highCodes = getCategoriesByPriority("high").map(c => c.code);
      expect(highCodes).toContain("D1");
      expect(highCodes).toContain("D5");
      expect(highCodes).toContain("D9");
    });
  });

  describe("getCategoriesByUsage", () => {
    it("should return categories sorted by usage percentage", () => {
      const sorted = getCategoriesByUsage();
      
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].estimatedUsersPercentage).toBeGreaterThanOrEqual(
          sorted[i + 1].estimatedUsersPercentage
        );
      }
    });

    it("most common should be D9 (Cost of managing tax affairs)", () => {
      const sorted = getCategoriesByUsage();
      expect(sorted[0].code).toBe("D9");
      expect(sorted[0].estimatedUsersPercentage).toBe(45);
    });
  });

  describe("searchCategories", () => {
    it("should find categories by code", () => {
      const results = searchCategories("D1");
      expect(results).toHaveLength(1);
      expect(results[0].code).toBe("D1");
    });

    it("should find categories by name", () => {
      const results = searchCategories("car");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.code === "D1")).toBe(true);
    });

    it("should find categories by description", () => {
      const results = searchCategories("donation");
      expect(results.some(c => c.code === "D8")).toBe(true);
    });

    it("should be case insensitive", () => {
      const lower = searchCategories("car");
      const upper = searchCategories("CAR");
      expect(lower).toEqual(upper);
    });

    it("should return empty array for no matches", () => {
      const results = searchCategories("xyzabc123");
      expect(results).toEqual([]);
    });
  });

  describe("getRelatedCategories", () => {
    it("should return related categories", () => {
      const related = getRelatedCategories("D1");
      expect(related.length).toBeGreaterThan(0);
      expect(related.some(c => c.code === "D2")).toBe(true);
    });

    it("should return empty array for category with no relations", () => {
      const related = getRelatedCategories("D12");
      expect(related).toEqual([]);
    });
  });

  describe("getCategoryStats", () => {
    it("should return correct statistics", () => {
      const stats = getCategoryStats();
      expect(stats.total).toBe(15);
      expect(stats.highPriority + stats.mediumPriority + stats.lowPriority).toBe(15);
      expect(stats.highUsage).toBeGreaterThan(0);
    });
  });

  describe("requiresReceipts", () => {
    it("should indicate when receipts are required", () => {
      const d1 = requiresReceipts("D1");
      expect(d1.required).toBe(true);
      expect(d1.description).toContain("receipt");
    });

    it("should include threshold when specified", () => {
      const d8 = requiresReceipts("D8");
      expect(d8.threshold).toBe(2);
    });

    it("should handle unknown categories gracefully", () => {
      const unknown = requiresReceipts("D99" as AtoCategoryCode);
      expect(unknown.required).toBe(true);
      expect(unknown.description).toBe("Unknown category");
    });
  });

  describe("Category Content", () => {
    it("D1 should have car expense specific data", () => {
      const d1 = getCategoryByCode("D1")!;
      expect(d1.name).toContain("car");
      expect(d1.claimLimits?.method).toBe("cents_per_km");
      expect(d1.eligibilityCriteria.some(c => c.includes("commute"))).toBe(true);
    });

    it("D8 should have donation specific data", () => {
      const d8 = getCategoryByCode("D8")!;
      expect(d8.name).toContain("donations");
      expect(d8.receiptRequirements.required).toBe("required");
      expect(d8.examples.claimable.some(e => e.includes("charity"))).toBe(true);
    });

    it("D9 should have high usage percentage", () => {
      const d9 = getCategoryByCode("D9")!;
      expect(d9.estimatedUsersPercentage).toBe(45);
      expect(d9.priority).toBe("high");
    });

    it("all categories should have ATO website links", () => {
      for (const cat of atoCategories) {
        expect(cat.atoReference).toMatch(/^https:\/\/www.ato.gov.au/);
      }
    });
  });
});
