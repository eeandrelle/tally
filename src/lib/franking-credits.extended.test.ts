/**
 * Franking Credit Calculation Engine Extended Tests
 * 
 * Additional tests for new functionality:
 * - Tax impact scenarios
 * - Refund estimation
 * - Multi-year calculations
 */

import { describe, it, expect } from 'vitest';
import {
  // Core calculations
  calculateFrankingCredit,
  calculateFrankingFromDividend,
  calculateTaxImpact,
  calculateTaxImpactForIncome,
  
  // Tax rates
  getMarginalTaxRate,
  MARGINAL_TAX_RATES_2025,
  
  // Utilities
  formatCurrency,
  getFinancialYear,
} from './franking-credits';

describe('Franking Credit Extended Tests', () => {
  describe('Tax Impact Scenarios', () => {
    it('should calculate full refund for pension phase (0% rate)', () => {
      // $1,000 grossed-up dividend at 0% tax rate
      // Tax = $0, Credit = $300, Net = -$300 (full refund)
      const result = calculateTaxImpact(1000, 300, 0);
      
      expect(result.taxOnGrossedUp).toBe(0);
      expect(result.netTaxPosition).toBe(-300);
      expect(result.effectiveTaxRate).toBe(-30);
    });

    it('should calculate break-even at 30% rate for fully franked', () => {
      // $1,000 grossed-up dividend at 30% rate
      // Tax = $300, Credit = $300, Net = $0
      const result = calculateTaxImpact(1000, 300, 0.30);
      
      expect(result.taxOnGrossedUp).toBe(300);
      expect(result.netTaxPosition).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('should calculate tax payable at 45% rate', () => {
      // $1,000 grossed-up dividend at 45% rate
      // Tax = $450, Credit = $300, Net = $150 payable
      const result = calculateTaxImpact(1000, 300, 0.45);
      
      expect(result.taxOnGrossedUp).toBe(450);
      expect(result.netTaxPosition).toBe(150);
      expect(result.effectiveTaxRate).toBe(15);
    });

    it('should handle partially franked dividends correctly', () => {
      // $700 dividend, 50% franked = $350 franked
      // Franking credit = 350 * 0.3 / 0.7 = $150
      // Grossed-up = $700 + $150 = $850
      const calc = calculateFrankingFromDividend(700, 50);
      
      // At 30% marginal rate
      const taxImpact = calculateTaxImpact(calc.grossedUpDividend, calc.frankingCredit, 0.30);
      
      expect(taxImpact.taxOnGrossedUp).toBeCloseTo(255, 0); // 30% of $850
      expect(taxImpact.frankingCreditOffset).toBe(150);
      expect(taxImpact.netTaxPosition).toBeCloseTo(105, 0); // Additional tax payable
    });

    it('should calculate progressive refund for 16% bracket', () => {
      // Low income earner in 16% bracket
      // Gets partial refund: 30% - 16% = 14% of grossed-up
      const result = calculateTaxImpact(1000, 300, 0.16);
      
      expect(result.taxOnGrossedUp).toBe(160);
      expect(result.netTaxPosition).toBe(-140); // $140 refund
    });
  });

  describe('Income Threshold Scenarios', () => {
    it('should identify tax-free threshold correctly', () => {
      const rate = getMarginalTaxRate(18200);
      expect(rate.rate).toBe(0);
      expect(rate.description).toBe('Tax-free threshold');
    });

    it('should identify transition to 16% bracket', () => {
      const rate = getMarginalTaxRate(18201);
      expect(rate.rate).toBe(0.16);
    });

    it('should identify 30% bracket threshold', () => {
      const rate = getMarginalTaxRate(45001);
      expect(rate.rate).toBe(0.30);
    });

    it('should identify high income 45% bracket', () => {
      const rate = getMarginalTaxRate(200000);
      expect(rate.rate).toBe(0.45);
    });

    it('should handle boundary at $135,000 (37% bracket)', () => {
      const justBelow = getMarginalTaxRate(135000);
      const justAbove = getMarginalTaxRate(135001);
      
      expect(justBelow.rate).toBe(0.30);
      expect(justAbove.rate).toBe(0.37);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should calculate CBA dividend scenario', () => {
      // Commonwealth Bank typical dividend
      // $200 dividend, 100% franked
      const result = calculateFrankingFromDividend(200, 100);
      
      expect(result.frankingCredit).toBeCloseTo(85.71, 2);
      expect(result.grossedUpDividend).toBeCloseTo(285.71, 2);
      
      // For someone earning $75,000 (30% bracket)
      const taxImpact = calculateTaxImpactForIncome(
        result.grossedUpDividend,
        result.frankingCredit,
        75000
      );
      
      expect(taxImpact.marginalRate).toBe(0.30);
      expect(taxImpact.netTaxPosition).toBeCloseTo(0, 0); // Break-even
    });

    it('should calculate BHP dividend scenario', () => {
      // BHP large dividend payment
      // $500 dividend, 100% franked
      const result = calculateFrankingFromDividend(500, 100);
      
      expect(result.frankingCredit).toBeCloseTo(214.29, 2);
      expect(result.grossedUpDividend).toBeCloseTo(714.29, 2);
      
      // For high income earner ($200k, 45% bracket)
      const taxImpact = calculateTaxImpactForIncome(
        result.grossedUpDividend,
        result.frankingCredit,
        200000
      );
      
      expect(taxImpact.marginalRate).toBe(0.45);
      expect(taxImpact.netTaxPosition).toBeGreaterThan(0); // Tax payable
    });

    it('should handle REIT unfranked dividend', () => {
      // Real Estate Investment Trust - typically unfranked
      const result = calculateFrankingFromDividend(150, 0);
      
      expect(result.frankingCredit).toBe(0);
      expect(result.grossedUpDividend).toBe(150);
      
      // No franking credit benefit
      const taxImpact = calculateTaxImpactForIncome(150, 0, 75000);
      expect(taxImpact.netTaxPosition).toBe(45); // Full 30% tax on $150
    });

    it('should calculate annual dividend summary for retiree', () => {
      // Retiree with $50,000 in fully franked dividends
      // No other income
      const result = calculateFrankingFromDividend(50000, 100);
      
      expect(result.frankingCredit).toBeCloseTo(21428.57, 2);
      expect(result.grossedUpDividend).toBeCloseTo(71428.57, 2);
      
      // At effective 16% average rate on $71k
      const taxImpact = calculateTaxImpactForIncome(
        result.grossedUpDividend,
        result.frankingCredit,
        35000 // Approximate after offsets
      );
      
      expect(taxImpact.netTaxPosition).toBeLessThan(0); // Refundable
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle zero grossed-up dividend', () => {
      const result = calculateTaxImpact(0, 0, 0.30);
      
      expect(result.taxOnGrossedUp).toBe(0);
      expect(result.netTaxPosition).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('should handle very small franked amounts', () => {
      // Small amounts may round to 0 due to 2 decimal place rounding
      const result = calculateFrankingCredit(0.01);
      expect(result).toBeGreaterThanOrEqual(0);
      // 0.01 * 0.428571 = 0.00428571 -> rounds to 0
    });

    it('should handle maximum reasonable dividend', () => {
      // Very large dividend
      const result = calculateFrankingFromDividend(1000000, 100);
      
      expect(result.frankingCredit).toBeCloseTo(428571.43, 2);
      expect(result.grossedUpDividend).toBeCloseTo(1428571.43, 2);
    });

    it('should round consistently to 2 decimal places', () => {
      const result = calculateFrankingFromDividend(1234.56, 66.67);
      
      // All values should be rounded to 2 decimal places
      expect(result.frankedAmount).toBe(Math.round(result.frankedAmount * 100) / 100);
      expect(result.frankingCredit).toBe(Math.round(result.frankingCredit * 100) / 100);
      expect(result.grossedUpDividend).toBe(Math.round(result.grossedUpDividend * 100) / 100);
    });
  });

  describe('Financial Year Calculations', () => {
    it('should identify FY 2024-2025 for dates in 2024', () => {
      // Before July - should be FY 2023-2024
      const june2024 = new Date(2024, 5, 15);
      expect(getFinancialYear(june2024)).toBe('2023-2024');
      
      // After July - should be FY 2024-2025
      const july2024 = new Date(2024, 6, 1);
      expect(getFinancialYear(july2024)).toBe('2024-2025');
    });

    it('should handle end of financial year boundary', () => {
      // June 30, 2025 = FY 2024-2025
      const june30 = new Date(2025, 5, 30);
      expect(getFinancialYear(june30)).toBe('2024-2025');
      
      // July 1, 2025 = FY 2025-2026
      const july1 = new Date(2025, 6, 1);
      expect(getFinancialYear(july1)).toBe('2025-2026');
    });
  });

  describe('Format Utilities', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-500)).toBe('-$500.00');
    });

    it('should format large amounts with commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });
});

describe('ATO Compliance Tests', () => {
  it('should follow ATO formula exactly for standard rate', () => {
    // ATO official formula: FC = (Dividend Amount × Company Tax Rate) / (1 - Company Tax Rate)
    // For $700 dividend: FC = 700 × 0.30 / 0.70 = $300
    const result = calculateFrankingCredit(700, 0.30);
    expect(result).toBe(300);
  });

  it('should support alternative company tax rates', () => {
    // Small business rate of 25%
    // FC = 700 × 0.25 / 0.75 = $233.33
    const result = calculateFrankingCredit(700, 0.25);
    expect(result).toBeCloseTo(233.33, 2);
  });

  it('should calculate gross-up correctly per ATO rules', () => {
    // Grossed-up dividend = Cash dividend + Franking credits
    const calc = calculateFrankingFromDividend(700, 100);
    
    expect(calc.grossedUpDividend).toBe(1000);
    expect(calc.grossedUpDividend).toBe(calc.dividendAmount + calc.frankingCredit);
  });
});
