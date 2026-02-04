/**
 * Tax Offset & Credits Engine - Test Suite
 * 
 * Comprehensive tests for all tax offset calculations
 * Based on 2024-2025 Australian tax year rates
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLITO,
  calculateLMITO,
  calculateSAPTO,
  calculateFrankingCredits,
  calculateFrankingCreditFromPercentage,
  calculatePHIRebate,
  determinePHITier,
  calculateAllTaxOffsets,
  formatCurrency,
  getFinancialYear,
  type TaxPayerProfile,
  type FrankingCredit
} from './tax-offsets';

// ============= LITO TESTS =============

describe('LITO (Low Income Tax Offset)', () => {
  it('calculates full $700 offset for income <= $15,000', () => {
    const result = calculateLITO(15000);
    expect(result.amount).toBe(700);
    expect(result.eligibilityMet).toBe(true);
  });

  it('calculates full $700 offset for income of $10,000', () => {
    const result = calculateLITO(10000);
    expect(result.amount).toBe(700);
    expect(result.eligibilityMet).toBe(true);
  });

  it('reduces offset for income between $15,000 and $37,500', () => {
    const result = calculateLITO(20000);
    // $20,000 - $15,000 = $5,000 excess
    // Reduction = $5,000 * 1% = $50
    // Offset = $700 - $50 = $650
    expect(result.amount).toBeCloseTo(650, 0);
    expect(result.eligibilityMet).toBe(true);
  });

  it('calculates reduced offset at $30,000 income', () => {
    const result = calculateLITO(30000);
    // $30,000 - $15,000 = $15,000 excess
    // Reduction = $15,000 * 1% = $150
    // Offset = $700 - $150 = $550
    expect(result.amount).toBeCloseTo(550, 0);
    expect(result.eligibilityMet).toBe(true);
  });

  it('phases out offset between $37,500 and $66,667', () => {
    const result = calculateLITO(45000);
    // In phase-out zone: base $475 - ($7,500 × 5%) = $100
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(500);
    expect(result.eligibilityMet).toBe(true);
  });

  it('returns $0 for income above $66,667', () => {
    const result = calculateLITO(70000);
    expect(result.amount).toBe(0);
    expect(result.eligibilityMet).toBe(false);
  });

  it('returns $0 for high income', () => {
    const result = calculateLITO(100000);
    expect(result.amount).toBe(0);
    expect(result.eligibilityMet).toBe(false);
  });
});

// ============= LMITO TESTS =============

describe('LMITO (Low and Middle Income Tax Offset)', () => {
  it('returns $0 for all incomes (ended in 2021-22)', () => {
    expect(calculateLMITO(30000).amount).toBe(0);
    expect(calculateLMITO(60000).amount).toBe(0);
    expect(calculateLMITO(100000).amount).toBe(0);
  });

  it('marks as not eligible for all incomes', () => {
    expect(calculateLMITO(30000).eligibilityMet).toBe(false);
    expect(calculateLMITO(60000).eligibilityMet).toBe(false);
  });

  it('includes explanation in calculation details', () => {
    const result = calculateLMITO(40000);
    expect(result.calculationDetails).toContain('ENDED');
    expect(result.calculationDetails).toContain('2021-22');
  });
});

// ============= SAPTO TESTS =============

describe('SAPTO (Seniors and Pensioners Tax Offset)', () => {
  it('returns $0 for individuals under 67', () => {
    const result = calculateSAPTO(30000, 60, false);
    expect(result.amount).toBe(0);
    expect(result.eligibilityMet).toBe(false);
  });

  it('returns full $2,230 for single senior with income below threshold', () => {
    const result = calculateSAPTO(30000, 70, false);
    expect(result.amount).toBe(2230);
    expect(result.eligibilityMet).toBe(true);
  });

  it('reduces offset for income above shade-out threshold', () => {
    const result = calculateSAPTO(40000, 70, false);
    // $40,000 - $33,089 = $6,911 excess
    // Shade-out = $6,911 * 12.5% = $863.88
    // Offset = $2,230 - $863.88 = $1,366.12
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(2230);
    expect(result.eligibilityMet).toBe(true);
  });

  it('returns lower max for coupled seniors', () => {
    const result = calculateSAPTO(25000, 70, true, 20000);
    // Couple rate max is $1,602
    expect(result.amount).toBeLessThanOrEqual(1602);
    expect(result.eligibilityMet).toBe(true);
  });

  it('handles sole parent seniors', () => {
    const result = calculateSAPTO(25000, 70, false, 0, true);
    expect(result.eligibilityMet).toBe(true);
    expect(result.amount).toBeGreaterThan(0);
  });
});

// ============= FRANKING CREDITS TESTS =============

describe('Franking Credits', () => {
  it('calculates franking credit for 100% franked dividend', () => {
    const credit = calculateFrankingCreditFromPercentage(700, 100);
    // For a $700 fully franked dividend:
    // Franking credit = $700 * (30/70) = $300
    expect(credit).toBeCloseTo(300, 0);
  });

  it('calculates franking credit for 50% franked dividend', () => {
    const credit = calculateFrankingCreditFromPercentage(700, 50);
    // Franked portion = $350
    // Franking credit = $350 * (30/70) = $150
    expect(credit).toBeCloseTo(150, 0);
  });

  it('calculates total franking credits from multiple dividends', () => {
    const dividends: FrankingCredit[] = [
      {
        companyName: 'Company A',
        dividendAmount: 700,
        frankedAmount: 700,
        frankingCredit: 300,
        frankingPercentage: 100,
        paymentDate: new Date('2024-03-15')
      },
      {
        companyName: 'Company B',
        dividendAmount: 500,
        frankedAmount: 500,
        frankingCredit: 214.29,
        frankingPercentage: 100,
        paymentDate: new Date('2024-06-15')
      }
    ];

    const result = calculateFrankingCredits(dividends);
    expect(result.totalCredits).toBeCloseTo(514.29, 1);
    expect(result.grossedUpDividends).toBeCloseTo(1714.29, 1);
  });

  it('handles zero dividends', () => {
    const result = calculateFrankingCredits([]);
    expect(result.totalCredits).toBe(0);
    expect(result.grossedUpDividends).toBe(0);
  });
});

// ============= PHI REBATE TESTS =============

describe('Private Health Insurance Rebate', () => {
  it('determines base tier for single with income below $97,000', () => {
    expect(determinePHITier(80000, false, 0)).toBe('base');
    expect(determinePHITier(96000, false, 0)).toBe('base');
  });

  it('determines tier1 for single with income between $97k-$113k', () => {
    expect(determinePHITier(100000, false, 0)).toBe('tier1');
  });

  it('determines tier2 for single with income between $113k-$151k', () => {
    expect(determinePHITier(120000, false, 0)).toBe('tier2');
  });

  it('determines tier3 for high income single', () => {
    expect(determinePHITier(160000, false, 0)).toBe('tier3');
  });

  it('calculates rebate for base tier under 65', () => {
    const result = calculatePHIRebate(2000, 40, 'base');
    // 24.743% of $2,000 = $494.86
    expect(result.amount).toBeCloseTo(494.86, 0);
    expect(result.eligibilityMet).toBe(true);
  });

  it('calculates rebate for age 65-69', () => {
    const result = calculatePHIRebate(2000, 67, 'base');
    // 28.971% of $2,000 = $579.42
    expect(result.amount).toBeCloseTo(579.42, 0);
  });

  it('calculates rebate for age 70+', () => {
    const result = calculatePHIRebate(2000, 72, 'base');
    // 33.2% of $2,000 = $664
    expect(result.amount).toBeCloseTo(664, 0);
  });

  it('returns $0 for tier3', () => {
    const result = calculatePHIRebate(2000, 40, 'tier3');
    expect(result.amount).toBe(0);
    expect(result.eligibilityMet).toBe(false);
  });
});

// ============= INTEGRATION TESTS =============

describe('Complete Tax Offset Calculation', () => {
  it('calculates offsets for low income earner', () => {
    const profile: TaxPayerProfile = {
      taxableIncome: 35000,
      age: 30,
      isResident: true,
      hasPrivateHealthInsurance: false,
      isSeniorOrPensioner: false,
      hasSpouse: false
    };

    const result = calculateAllTaxOffsets({ profile });
    
    // Should have LITO
    const lito = result.breakdown.find(o => o.offsetType === 'LITO');
    expect(lito?.amount).toBeGreaterThan(0);
    
    // Should have LMITO (but $0)
    const lmito = result.breakdown.find(o => o.offsetType === 'LMITO');
    expect(lmito?.amount).toBe(0);
    
    // Should not have SAPTO
    const sapto = result.breakdown.find(o => o.offsetType === 'SAPTO');
    expect(sapto?.amount).toBe(0);
  });

  it('calculates offsets for senior with private health', () => {
    const profile: TaxPayerProfile = {
      taxableIncome: 40000,
      age: 70,
      isResident: true,
      hasPrivateHealthInsurance: true,
      privateHealthCoverType: 'single',
      isSeniorOrPensioner: true,
      hasSpouse: false
    };

    const result = calculateAllTaxOffsets({ 
      profile, 
      phiPremiumAmount: 2500 
    });
    
    // Should have SAPTO
    const sapto = result.breakdown.find(o => o.offsetType === 'SAPTO');
    expect(sapto?.amount).toBeGreaterThan(0);
    
    // Should have PHI rebate
    const phi = result.breakdown.find(o => o.offsetType === 'PHI_Rebate');
    expect(phi?.amount).toBeGreaterThan(0);
  });

  it('includes franking credits in summary', () => {
    const profile: TaxPayerProfile = {
      taxableIncome: 80000,
      age: 45,
      isResident: true,
      hasPrivateHealthInsurance: false,
      isSeniorOrPensioner: false,
      hasSpouse: false
    };

    const frankingCredits: FrankingCredit[] = [
      {
        companyName: 'Test Corp',
        dividendAmount: 1400,
        frankedAmount: 1400,
        frankingCredit: 600,
        frankingPercentage: 100,
        paymentDate: new Date()
      }
    ];

    const result = calculateAllTaxOffsets({ profile, frankingCredits });
    
    expect(result.frankingCredits.totalCredits).toBe(600);
    expect(result.frankingCredits.credits.length).toBe(1);
  });
});

// ============= UTILITY TESTS =============

describe('Utility Functions', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('determines correct financial year', () => {
    // July 2024 should be 2024-25
    const july2024 = new Date(2024, 6, 1);
    expect(getFinancialYear(july2024)).toBe('2024-25');
    
    // June 2024 should be 2023-24
    const june2024 = new Date(2024, 5, 30);
    expect(getFinancialYear(june2024)).toBe('2023-24');
    
    // January 2025 should be 2024-25
    const jan2025 = new Date(2025, 0, 15);
    expect(getFinancialYear(jan2025)).toBe('2024-25');
  });
});

// Export test results summary
console.log('Tax Offset Engine Test Suite - 2024-2025 Rates');
console.log('==============================================');
