/**
 * Franking Credit Calculation Engine Tests
 * 
 * Comprehensive unit tests for franking credit calculations
 * ATO Formula: Franking Credit = (Dividend Amount × 0.3) / 0.7
 */

import { describe, it, expect } from 'vitest';
import {
  // Constants
  COMPANY_TAX_RATE_2025,
  FRANKING_MULTIPLIER_2025,
  
  // Core calculations
  calculateFrankingCredit,
  calculateFrankingFromDividend,
  calculateGrossedUpDividend,
  
  // Tax rate functions
  getMarginalTaxRate,
  calculateTaxImpact,
  calculateTaxImpactAtAllRates,
  calculateTaxImpactForIncome,
  
  // Aggregation
  calculateAnnualSummary,
  
  // Utilities
  formatCurrency,
  formatPercentage,
  getFinancialYear,
  validateDividendEntry,
  exportToCSV,
  exportToJSON,
  
  // Types
  MARGINAL_TAX_RATES_2025,
} from './franking-credits';

describe('Franking Credit Calculation Engine', () => {
  // ============= CONSTANT TESTS =============
  describe('Constants', () => {
    it('should have correct company tax rate for 2024-2025', () => {
      expect(COMPANY_TAX_RATE_2025).toBe(0.30);
    });

    it('should have correct franking multiplier', () => {
      expect(FRANKING_MULTIPLIER_2025).toBeCloseTo(0.428571, 5);
      expect(FRANKING_MULTIPLIER_2025).toBe(0.30 / 0.70);
    });
  });

  // ============= CORE CALCULATION TESTS =============
  describe('calculateFrankingCredit', () => {
    it('should calculate franking credit for fully franked dividend', () => {
      // $700 dividend × 0.3 / 0.7 = $300 franking credit
      const result = calculateFrankingCredit(700);
      expect(result).toBeCloseTo(300, 2);
    });

    it('should calculate franking credit for specific ATO example', () => {
      // ATO example: $700 franked dividend = $300 credit
      const result = calculateFrankingCredit(700);
      expect(result).toBe(300);
    });

    it('should return 0 for zero franked amount', () => {
      const result = calculateFrankingCredit(0);
      expect(result).toBe(0);
    });

    it('should return 0 for negative franked amount', () => {
      const result = calculateFrankingCredit(-100);
      expect(result).toBe(0);
    });

    it('should handle large amounts correctly', () => {
      // $100,000 franked dividend
      const result = calculateFrankingCredit(100000);
      expect(result).toBeCloseTo(42857.14, 2);
    });

    it('should handle small amounts correctly', () => {
      // $1 franked dividend
      const result = calculateFrankingCredit(1);
      expect(result).toBeCloseTo(0.43, 2);
    });
  });

  describe('calculateFrankingFromDividend', () => {
    it('should calculate for fully franked dividend (100%)', () => {
      const result = calculateFrankingFromDividend(700, 100);
      
      expect(result.dividendAmount).toBe(700);
      expect(result.frankingPercentage).toBe(100);
      expect(result.frankedAmount).toBe(700);
      expect(result.unfrankedAmount).toBe(0);
      expect(result.frankingCredit).toBe(300);
      expect(result.grossedUpDividend).toBe(1000);
    });

    it('should calculate for partially franked dividend (50%)', () => {
      const result = calculateFrankingFromDividend(700, 50);
      
      expect(result.dividendAmount).toBe(700);
      expect(result.frankingPercentage).toBe(50);
      expect(result.frankedAmount).toBe(350);
      expect(result.unfrankedAmount).toBe(350);
      expect(result.frankingCredit).toBe(150); // 350 * 0.3 / 0.7
      expect(result.grossedUpDividend).toBe(850); // 700 + 150
    });

    it('should calculate for unfranked dividend (0%)', () => {
      const result = calculateFrankingFromDividend(700, 0);
      
      expect(result.dividendAmount).toBe(700);
      expect(result.frankingPercentage).toBe(0);
      expect(result.frankedAmount).toBe(0);
      expect(result.unfrankedAmount).toBe(700);
      expect(result.frankingCredit).toBe(0);
      expect(result.grossedUpDividend).toBe(700);
    });

    it('should handle edge case: zero dividend', () => {
      const result = calculateFrankingFromDividend(0, 100);
      
      expect(result.dividendAmount).toBe(0);
      expect(result.frankingCredit).toBe(0);
      expect(result.grossedUpDividend).toBe(0);
    });

    it('should handle edge case: negative dividend (treat as 0)', () => {
      const result = calculateFrankingFromDividend(-100, 100);
      
      expect(result.dividendAmount).toBe(0);
      expect(result.frankingCredit).toBe(0);
    });

    it('should clamp franking percentage above 100', () => {
      const result = calculateFrankingFromDividend(700, 150);
      
      expect(result.frankingPercentage).toBe(100);
    });

    it('should clamp franking percentage below 0', () => {
      const result = calculateFrankingFromDividend(700, -50);
      
      expect(result.frankingPercentage).toBe(0);
    });

    it('should round results to 2 decimal places', () => {
      const result = calculateFrankingFromDividend(100, 33.33);
      
      // Check all values are rounded
      expect(result.frankedAmount).toBe(Math.round(result.frankedAmount * 100) / 100);
      expect(result.unfrankedAmount).toBe(Math.round(result.unfrankedAmount * 100) / 100);
      expect(result.frankingCredit).toBe(Math.round(result.frankingCredit * 100) / 100);
      expect(result.grossedUpDividend).toBe(Math.round(result.grossedUpDividend * 100) / 100);
    });
  });

  describe('calculateGrossedUpDividend', () => {
    it('should calculate grossed-up dividend correctly', () => {
      const result = calculateGrossedUpDividend(700, 300);
      expect(result).toBe(1000);
    });

    it('should handle zero values', () => {
      const result = calculateGrossedUpDividend(0, 0);
      expect(result).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateGrossedUpDividend(100.555, 50.555);
      expect(result).toBe(151.11);
    });
  });

  // ============= TAX RATE TESTS =============
  describe('getMarginalTaxRate', () => {
    it('should return 0% for income up to $18,200', () => {
      expect(getMarginalTaxRate(0).rate).toBe(0);
      expect(getMarginalTaxRate(18200).rate).toBe(0);
    });

    it('should return 16% for income $18,201-$45,000', () => {
      expect(getMarginalTaxRate(18201).rate).toBe(0.16);
      expect(getMarginalTaxRate(30000).rate).toBe(0.16);
      expect(getMarginalTaxRate(45000).rate).toBe(0.16);
    });

    it('should return 30% for income $45,001-$135,000', () => {
      expect(getMarginalTaxRate(45001).rate).toBe(0.30);
      expect(getMarginalTaxRate(75000).rate).toBe(0.30);
      expect(getMarginalTaxRate(135000).rate).toBe(0.30);
    });

    it('should return 37% for income $135,001-$190,000', () => {
      expect(getMarginalTaxRate(135001).rate).toBe(0.37);
      expect(getMarginalTaxRate(150000).rate).toBe(0.37);
      expect(getMarginalTaxRate(190000).rate).toBe(0.37);
    });

    it('should return 45% for income above $190,000', () => {
      expect(getMarginalTaxRate(190001).rate).toBe(0.45);
      expect(getMarginalTaxRate(250000).rate).toBe(0.45);
    });
  });

  describe('calculateTaxImpact', () => {
    it('should calculate tax payable at 30% marginal rate', () => {
      // $1000 grossed-up dividend at 30%
      // Tax = $300, Credit = $300, Net = $0
      const result = calculateTaxImpact(1000, 300, 0.30);
      
      expect(result.marginalRate).toBe(0.30);
      expect(result.taxOnGrossedUp).toBe(300);
      expect(result.frankingCreditOffset).toBe(300);
      expect(result.netTaxPosition).toBe(0);
    });

    it('should calculate refund at 0% marginal rate', () => {
      // $1000 grossed-up dividend at 0%
      // Tax = $0, Credit = $300, Net = -$300 (refund)
      const result = calculateTaxImpact(1000, 300, 0);
      
      expect(result.netTaxPosition).toBe(-300);
      expect(result.netTaxPosition).toBeLessThan(0); // Negative = refund
    });

    it('should calculate tax payable at 45% marginal rate', () => {
      // $1000 grossed-up dividend at 45%
      // Tax = $450, Credit = $300, Net = $150 payable
      const result = calculateTaxImpact(1000, 300, 0.45);
      
      expect(result.taxOnGrossedUp).toBe(450);
      expect(result.netTaxPosition).toBe(150);
    });

    it('should calculate partial refund at 16% marginal rate', () => {
      // $1000 grossed-up dividend at 16%
      // Tax = $160, Credit = $300, Net = -$140 (refund)
      const result = calculateTaxImpact(1000, 300, 0.16);
      
      expect(result.taxOnGrossedUp).toBe(160);
      expect(result.netTaxPosition).toBe(-140);
    });

    it('should handle zero grossed-up dividend', () => {
      const result = calculateTaxImpact(0, 0, 0.30);
      
      expect(result.taxOnGrossedUp).toBe(0);
      expect(result.netTaxPosition).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('should calculate effective tax rate correctly', () => {
      const result = calculateTaxImpact(1000, 300, 0.45);
      
      // Net tax $150 on $1000 = 15% effective rate
      expect(result.effectiveTaxRate).toBe(15);
    });
  });

  describe('calculateTaxImpactAtAllRates', () => {
    it('should return tax impact for all unique marginal rates', () => {
      const results = calculateTaxImpactAtAllRates(1000, 300);
      const uniqueRates = [...new Set(results.map(r => r.marginalRate))];
      
      // Should have 0%, 16%, 30%, 37%, 45%
      expect(uniqueRates).toContain(0);
      expect(uniqueRates).toContain(0.16);
      expect(uniqueRates).toContain(0.30);
      expect(uniqueRates).toContain(0.37);
      expect(uniqueRates).toContain(0.45);
    });
  });

  describe('calculateTaxImpactForIncome', () => {
    it('should use correct marginal rate based on income', () => {
      // $75,000 income should use 30% rate
      const result = calculateTaxImpactForIncome(1000, 300, 75000);
      
      expect(result.marginalRate).toBe(0.30);
    });

    it('should handle low income (0% bracket)', () => {
      const result = calculateTaxImpactForIncome(1000, 300, 15000);
      
      expect(result.marginalRate).toBe(0);
      expect(result.netTaxPosition).toBe(-300); // Full refund
    });

    it('should handle high income (45% bracket)', () => {
      const result = calculateTaxImpactForIncome(1000, 300, 200000);
      
      expect(result.marginalRate).toBe(0.45);
    });
  });

  // ============= AGGREGATION TESTS =============
  describe('calculateAnnualSummary', () => {
    const mockEntries = [
      {
        id: 1,
        companyName: 'Company A',
        dividendAmount: 1000,
        frankingPercentage: 100,
        frankingCredit: 428.57,
        grossedUpDividend: 1428.57,
        dateReceived: '2024-08-15',
        taxYear: '2024-2025',
      },
      {
        id: 2,
        companyName: 'Company B',
        dividendAmount: 500,
        frankingPercentage: 50,
        frankingCredit: 107.14,
        grossedUpDividend: 607.14,
        dateReceived: '2024-09-20',
        taxYear: '2024-2025',
      },
      {
        id: 3,
        companyName: 'Company C',
        dividendAmount: 300,
        frankingPercentage: 0,
        frankingCredit: 0,
        grossedUpDividend: 300,
        dateReceived: '2024-10-01',
        taxYear: '2024-2025',
      },
    ];

    it('should calculate totals correctly', () => {
      const summary = calculateAnnualSummary(mockEntries, '2024-2025');
      
      expect(summary.taxYear).toBe('2024-2025');
      expect(summary.totalDividends).toBe(1800); // 1000 + 500 + 300
      expect(summary.totalFrankingCredits).toBeCloseTo(535.71, 2); // 428.57 + 107.14
      expect(summary.totalGrossedUpDividends).toBeCloseTo(2335.71, 2);
      expect(summary.entries).toHaveLength(3);
    });

    it('should filter by tax year', () => {
      const entryDifferentYear = {
        ...mockEntries[0],
        id: 4,
        taxYear: '2023-2024',
      };
      
      const summary = calculateAnnualSummary([...mockEntries, entryDifferentYear], '2024-2025');
      
      expect(summary.entries).toHaveLength(3);
      expect(summary.totalDividends).toBe(1800);
    });

    it('should handle empty entries array', () => {
      const summary = calculateAnnualSummary([], '2024-2025');
      
      expect(summary.totalDividends).toBe(0);
      expect(summary.totalFrankingCredits).toBe(0);
      expect(summary.totalGrossedUpDividends).toBe(0);
      expect(summary.entries).toHaveLength(0);
    });

    it('should include tax impact at all rates', () => {
      const summary = calculateAnnualSummary(mockEntries, '2024-2025');
      
      expect(summary.taxImpactAtRates).toBeDefined();
      expect(summary.taxImpactAtRates.length).toBeGreaterThan(0);
    });
  });

  // ============= UTILITY TESTS =============
  describe('formatCurrency', () => {
    it('should format AUD currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(1000.5)).toBe('$1,000.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(50.5)).toBe('50.5%');
      expect(formatPercentage(0)).toBe('0.0%');
    });
  });

  describe('getFinancialYear', () => {
    it('should return correct FY for dates before July', () => {
      // June 2024 should be FY 2023-2024
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(getFinancialYear(date)).toBe('2023-2024');
    });

    it('should return correct FY for dates in July onwards', () => {
      // July 2024 should be FY 2024-2025
      const date = new Date(2024, 6, 1); // July 1, 2024
      expect(getFinancialYear(date)).toBe('2024-2025');
    });

    it('should return correct FY for end of financial year', () => {
      // June 30, 2025 should be FY 2024-2025
      const date = new Date(2025, 5, 30);
      expect(getFinancialYear(date)).toBe('2024-2025');
    });

    it('should use current date when no date provided', () => {
      const result = getFinancialYear();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{4}$/);
    });
  });

  describe('validateDividendEntry', () => {
    it('should validate valid entry', () => {
      const entry = {
        companyName: 'Test Company',
        dividendAmount: 1000,
        frankingPercentage: 100,
        dateReceived: '2024-08-15',
      };
      
      const result = validateDividendEntry(entry);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject entry without company name', () => {
      const entry = {
        companyName: '',
        dividendAmount: 1000,
        frankingPercentage: 100,
        dateReceived: '2024-08-15',
      };
      
      const result = validateDividendEntry(entry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Company name is required');
    });

    it('should reject negative dividend amount', () => {
      const entry = {
        companyName: 'Test Company',
        dividendAmount: -100,
        frankingPercentage: 100,
        dateReceived: '2024-08-15',
      };
      
      const result = validateDividendEntry(entry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dividend amount must be 0 or greater');
    });

    it('should reject invalid franking percentage', () => {
      const entry = {
        companyName: 'Test Company',
        dividendAmount: 1000,
        frankingPercentage: 150,
        dateReceived: '2024-08-15',
      };
      
      const result = validateDividendEntry(entry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Franking percentage must be between 0 and 100');
    });

    it('should reject entry without date', () => {
      const entry = {
        companyName: 'Test Company',
        dividendAmount: 1000,
        frankingPercentage: 100,
        dateReceived: '',
      };
      
      const result = validateDividendEntry(entry);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date received is required');
    });

    it('should collect multiple errors', () => {
      const entry = {
        companyName: '',
        dividendAmount: -100,
        frankingPercentage: 150,
        dateReceived: '',
      };
      
      const result = validateDividendEntry(entry);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('exportToCSV', () => {
    it('should export entries to CSV format', () => {
      const entries = [
        {
          id: 1,
          companyName: 'Test Co',
          dividendAmount: 1000,
          frankingPercentage: 100,
          frankingCredit: 428.57,
          grossedUpDividend: 1428.57,
          dateReceived: '2024-08-15',
          taxYear: '2024-2025',
          notes: 'Test note',
        },
      ];
      
      const csv = exportToCSV(entries);
      
      expect(csv).toContain('Company Name');
      expect(csv).toContain('Dividend Amount');
      expect(csv).toContain('Test Co');
      expect(csv).toContain('1000');
    });
  });

  describe('exportToJSON', () => {
    it('should export entries to JSON format', () => {
      const entries = [
        {
          id: 1,
          companyName: 'Test Co',
          dividendAmount: 1000,
          frankingPercentage: 100,
          frankingCredit: 428.57,
          grossedUpDividend: 1428.57,
          dateReceived: '2024-08-15',
          taxYear: '2024-2025',
          notes: 'Test note',
        },
      ];
      
      const json = exportToJSON(entries);
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].companyName).toBe('Test Co');
    });
  });
});

describe('ATO Formula Accuracy', () => {
  /**
   * These tests verify the exact ATO formula implementation
   * Formula: Franking Credit = (Dividend Amount × Company Tax Rate) / (1 - Company Tax Rate)
   * For 30% rate: FC = (Dividend × 0.3) / 0.7
   */
  
  it('should match ATO standard example: $700 dividend = $300 credit', () => {
    // ATO published example
    const dividend = 700;
    const expectedCredit = 300;
    
    const result = calculateFrankingCredit(dividend);
    expect(result).toBe(expectedCredit);
  });

  it('should match ATO standard example: $1000 grossed-up = $700 dividend + $300 credit', () => {
    const dividend = 700;
    const credit = calculateFrankingCredit(dividend);
    const grossedUp = calculateGrossedUpDividend(dividend, credit);
    
    expect(credit).toBe(300);
    expect(grossedUp).toBe(1000);
  });

  it('should calculate correct multiplier for 30% tax rate', () => {
    // Multiplier = 0.3 / 0.7 ≈ 0.428571
    const multiplier = 0.30 / 0.70;
    
    const dividend = 1000;
    const credit = dividend * multiplier;
    
    expect(calculateFrankingCredit(dividend)).toBeCloseTo(credit, 2);
  });
});
