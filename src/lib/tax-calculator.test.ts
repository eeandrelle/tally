/**
 * Tax Calculator Engine Tests
 * 
 * Comprehensive test suite for the Tax Calculator Engine.
 * Tests all tax calculations, deductions, method comparisons, and scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  // Tax calculations
  getMarginalTaxRate,
  getTaxBracketIndex,
  calculateTaxPayable,
  calculateTaxSavings,
  
  // Depreciation
  generateDepreciationSchedule,
  compareDeductionMethods,
  
  // Scenarios
  createTaxScenario,
  calculateTotalDeductions,
  compareScenarios,
  
  // Bracket visualization
  getTaxBracketData,
  getRemainingInBracket,
  calculateDeductionImpact,
  
  // Utilities
  formatCurrency,
  formatPercent,
  generateDeductionId,
  validateDeduction,
  getTaxYearDates,
  
  // Constants
  TAX_BRACKETS,
  type TaxScenario,
  type DeductionItem,
} from './tax-calculator';

// ============= TEST DATA =============

const createDeduction = (overrides: Partial<DeductionItem> = {}): DeductionItem => ({
  id: 'test-deduction',
  description: 'Test Deduction',
  amount: 1000,
  category: 'work-from-home',
  method: 'immediate',
  ...overrides,
});

// ============= TESTS: MARGINAL TAX RATE =============

describe('getMarginalTaxRate', () => {
  it('should return 0% for income up to $18,200', () => {
    expect(getMarginalTaxRate(0)).toBe(0);
    expect(getMarginalTaxRate(18200)).toBe(0);
    expect(getMarginalTaxRate(10000)).toBe(0);
  });

  it('should return 16% for income between $18,201 and $45,000', () => {
    expect(getMarginalTaxRate(18201)).toBe(0.16);
    expect(getMarginalTaxRate(30000)).toBe(0.16);
    expect(getMarginalTaxRate(45000)).toBe(0.16);
  });

  it('should return 30% for income between $45,001 and $135,000', () => {
    expect(getMarginalTaxRate(45001)).toBe(0.30);
    expect(getMarginalTaxRate(75000)).toBe(0.30);
    expect(getMarginalTaxRate(135000)).toBe(0.30);
  });

  it('should return 37% for income between $135,001 and $190,000', () => {
    expect(getMarginalTaxRate(135001)).toBe(0.37);
    expect(getMarginalTaxRate(150000)).toBe(0.37);
    expect(getMarginalTaxRate(190000)).toBe(0.37);
  });

  it('should return 45% for income over $190,000', () => {
    expect(getMarginalTaxRate(190001)).toBe(0.45);
    expect(getMarginalTaxRate(250000)).toBe(0.45);
    expect(getMarginalTaxRate(500000)).toBe(0.45);
  });
});

// ============= TESTS: TAX BRACKET INDEX =============

describe('getTaxBracketIndex', () => {
  it('should return 0 for income in first bracket', () => {
    expect(getTaxBracketIndex(0)).toBe(0);
    expect(getTaxBracketIndex(18200)).toBe(0);
  });

  it('should return 1 for income in second bracket', () => {
    expect(getTaxBracketIndex(18201)).toBe(1);
    expect(getTaxBracketIndex(45000)).toBe(1);
  });

  it('should return 2 for income in third bracket', () => {
    expect(getTaxBracketIndex(45001)).toBe(2);
    expect(getTaxBracketIndex(135000)).toBe(2);
  });

  it('should return 3 for income in fourth bracket', () => {
    expect(getTaxBracketIndex(135001)).toBe(3);
    expect(getTaxBracketIndex(190000)).toBe(3);
  });

  it('should return 4 for income in top bracket', () => {
    expect(getTaxBracketIndex(190001)).toBe(4);
    expect(getTaxBracketIndex(1000000)).toBe(4);
  });
});

// ============= TESTS: TAX PAYABLE CALCULATION =============

describe('calculateTaxPayable', () => {
  it('should calculate tax correctly for income in first bracket', () => {
    const result = calculateTaxPayable(18000);
    expect(result.taxPayable).toBe(0);
    expect(result.marginalRate).toBe(0);
    expect(result.totalTax).toBe(360); // Medicare levy only
  });

  it('should calculate tax correctly for income in second bracket', () => {
    const result = calculateTaxPayable(30000);
    // Tax: 16% of (30000 - 18200) = 1888
    expect(result.taxPayable).toBeCloseTo(1888, 0);
    expect(result.marginalRate).toBe(0.16);
  });

  it('should calculate tax correctly for income in third bracket', () => {
    const result = calculateTaxPayable(75000);
    // Tax: 4288 + 30% of (75000 - 45000) = 4288 + 9000 = 13288
    expect(result.taxPayable).toBeCloseTo(13288, 0);
    expect(result.marginalRate).toBe(0.30);
  });

  it('should calculate tax correctly for income in fourth bracket', () => {
    const result = calculateTaxPayable(150000);
    // Tax: 31288 + 37% of (150000 - 135000) = 31288 + 5550 = 36838
    expect(result.taxPayable).toBeCloseTo(36838, 0);
    expect(result.marginalRate).toBe(0.37);
  });

  it('should calculate tax correctly for income in top bracket', () => {
    const result = calculateTaxPayable(200000);
    // Tax: 51638 + 45% of (200000 - 190000) = 51638 + 4500 = 56138
    expect(result.taxPayable).toBeCloseTo(56138, 0);
    expect(result.marginalRate).toBe(0.45);
  });

  it('should include Medicare Levy when enabled', () => {
    const result = calculateTaxPayable(75000, true);
    // Medicare levy: 2% of 75000 = 1500
    expect(result.medicareLevy).toBe(1500);
  });

  it('should exclude Medicare Levy when disabled', () => {
    const result = calculateTaxPayable(75000, false);
    expect(result.medicareLevy).toBe(0);
  });

  it('should calculate MLS for high income without private cover', () => {
    const result = calculateTaxPayable(150000, true, false);
    // MLS for $150k: 1.25%
    expect(result.medicareLevySurcharge).toBeGreaterThan(0);
  });

  it('should not calculate MLS with private hospital cover', () => {
    const result = calculateTaxPayable(150000, true, true);
    expect(result.medicareLevySurcharge).toBe(0);
  });

  it('should handle zero income', () => {
    const result = calculateTaxPayable(0);
    expect(result.taxPayable).toBe(0);
    expect(result.medicareLevy).toBe(0);
    expect(result.totalTax).toBe(0);
  });
});

// ============= TESTS: TAX SAVINGS CALCULATION =============

describe('calculateTaxSavings', () => {
  it('should calculate savings at 30% marginal rate', () => {
    const savings = calculateTaxSavings(1000, 75000);
    // 30% federal tax + 2% Medicare
    expect(savings.federalTaxSavings).toBe(300);
    expect(savings.medicareLevySavings).toBe(20);
    expect(savings.totalSavings).toBe(320);
  });

  it('should calculate savings at 16% marginal rate', () => {
    const savings = calculateTaxSavings(1000, 30000);
    expect(savings.federalTaxSavings).toBe(160);
    expect(savings.medicareLevySavings).toBe(20);
  });

  it('should calculate savings at 45% marginal rate', () => {
    const savings = calculateTaxSavings(1000, 200000);
    expect(savings.federalTaxSavings).toBe(450);
    expect(savings.medicareLevySavings).toBe(20);
  });

  it('should return zero savings for zero deduction', () => {
    const savings = calculateTaxSavings(0, 75000);
    expect(savings.totalSavings).toBe(0);
  });

  it('should calculate effective rate correctly', () => {
    const savings = calculateTaxSavings(1000, 75000);
    expect(savings.effectiveDeductionRate).toBe(0.32); // 320/1000
  });

  it('should handle MLS savings', () => {
    // Income near MLS threshold
    const savings = calculateTaxSavings(10000, 100000, true);
    expect(savings.mlsSavings).toBeGreaterThanOrEqual(0);
  });
});

// ============= TESTS: DEPRECIATION SCHEDULE =============

describe('generateDepreciationSchedule', () => {
  it('should generate correct number of years', () => {
    const schedule = generateDepreciationSchedule(5000, 5);
    expect(schedule.length).toBe(5);
  });

  it('should calculate diminishing value correctly', () => {
    const schedule = generateDepreciationSchedule(5000, 5);
    // Year 1: 20% of 5000 = 1000
    expect(schedule[0].depreciationAmount).toBe(1000);
    expect(schedule[0].closingValue).toBe(4000);
    // Year 2: 20% of 4000 = 800
    expect(schedule[1].depreciationAmount).toBe(800);
    expect(schedule[1].closingValue).toBe(3200);
  });

  it('should use prime cost method when specified', () => {
    const schedule = generateDepreciationSchedule(5000, 5, 'prime-cost');
    // Each year: 5000 / 5 = 1000
    expect(schedule[0].depreciationAmount).toBe(1000);
    expect(schedule[1].depreciationAmount).toBe(1000);
    expect(schedule[4].closingValue).toBe(1); // Never goes below $1
  });

  it('should not depreciate below $1', () => {
    const schedule = generateDepreciationSchedule(100, 10);
    const lastYear = schedule[schedule.length - 1];
    expect(lastYear.closingValue).toBeGreaterThanOrEqual(1);
  });
});

// ============= TESTS: DEDUCTION METHOD COMPARISON =============

describe('compareDeductionMethods', () => {
  it('should recommend immediate deduction for high marginal rate', () => {
    const comparison = compareDeductionMethods(5000, 'Laptop', 200000);
    expect(comparison.recommendation).toBe('immediate');
  });

  it('should return valid immediate deduction values', () => {
    const comparison = compareDeductionMethods(5000, 'Laptop', 75000);
    expect(comparison.immediate.totalDeduction).toBe(5000);
    expect(comparison.immediate.taxSavings).toBeGreaterThan(0);
    expect(comparison.immediate.effectiveRate).toBeGreaterThan(0);
  });

  it('should return valid depreciation values', () => {
    const comparison = compareDeductionMethods(5000, 'Laptop', 75000, 5);
    expect(comparison.depreciation.schedule.length).toBe(5);
    expect(comparison.depreciation.totalDeduction).toBeGreaterThan(0);
  });

  it('should calculate break-even year when applicable', () => {
    const comparison = compareDeductionMethods(10000, 'Equipment', 75000, 5);
    // Should either have a break-even year or null if never breaks even
    expect(comparison.breakEvenYear === null || comparison.breakEvenYear > 0).toBe(true);
  });

  it('should include explanation', () => {
    const comparison = compareDeductionMethods(5000, 'Laptop', 75000);
    expect(comparison.explanation).toBeTruthy();
    expect(comparison.explanation.length).toBeGreaterThan(0);
  });
});

// ============= TESTS: TAX SCENARIOS =============

describe('createTaxScenario', () => {
  it('should create scenario with correct defaults', () => {
    const scenario = createTaxScenario('Test', 75000);
    expect(scenario.name).toBe('Test');
    expect(scenario.taxableIncome).toBe(75000);
    expect(scenario.deductions).toEqual([]);
    expect(scenario.medicareLevy).toBe(true);
    expect(scenario.privateHospitalCover).toBe(false);
  });

  it('should generate unique IDs', () => {
    const scenario1 = createTaxScenario('Test 1', 75000);
    const scenario2 = createTaxScenario('Test 2', 75000);
    expect(scenario1.id).not.toBe(scenario2.id);
  });

  it('should apply overrides correctly', () => {
    const scenario = createTaxScenario('Test', 75000, [], {
      medicareLevy: false,
      privateHospitalCover: true,
    });
    expect(scenario.medicareLevy).toBe(false);
    expect(scenario.privateHospitalCover).toBe(true);
  });
});

describe('calculateTotalDeductions', () => {
  it('should sum immediate deductions only', () => {
    const deductions: DeductionItem[] = [
      createDeduction({ amount: 1000, method: 'immediate' }),
      createDeduction({ amount: 2000, method: 'immediate' }),
      createDeduction({ amount: 3000, method: 'depreciation' }),
    ];
    expect(calculateTotalDeductions(deductions)).toBe(3000);
  });

  it('should return 0 for empty deductions array', () => {
    expect(calculateTotalDeductions([])).toBe(0);
  });

  it('should return 0 when all deductions are depreciation', () => {
    const deductions: DeductionItem[] = [
      createDeduction({ amount: 1000, method: 'depreciation' }),
      createDeduction({ amount: 2000, method: 'depreciation' }),
    ];
    expect(calculateTotalDeductions(deductions)).toBe(0);
  });
});

describe('compareScenarios', () => {
  it('should calculate savings correctly', () => {
    const baseline = createTaxScenario('Baseline', 75000);
    const scenario = createTaxScenario('With Deductions', 75000, [
      createDeduction({ amount: 5000, method: 'immediate' }),
    ]);
    
    const comparison = compareScenarios(baseline, scenario);
    expect(comparison.deductionComparison.difference).toBe(5000);
    expect(comparison.savingsBreakdown.totalSavings).toBeGreaterThan(0);
  });

  it('should show lower tax for scenario with deductions', () => {
    const baseline = createTaxScenario('Baseline', 75000);
    const scenario = createTaxScenario('With Deductions', 75000, [
      createDeduction({ amount: 5000, method: 'immediate' }),
    ]);
    
    const comparison = compareScenarios(baseline, scenario);
    expect(comparison.scenarioResult.totalTax).toBeLessThan(comparison.baselineResult.totalTax);
  });

  it('should handle scenarios with same deductions', () => {
    const baseline = createTaxScenario('Baseline', 75000, [
      createDeduction({ amount: 2000, method: 'immediate' }),
    ]);
    const scenario = createTaxScenario('Same', 75000, [
      createDeduction({ amount: 2000, method: 'immediate' }),
    ]);
    
    const comparison = compareScenarios(baseline, scenario);
    expect(comparison.deductionComparison.difference).toBe(0);
    expect(comparison.savingsBreakdown.totalSavings).toBe(0);
  });
});

// ============= TESTS: TAX BRACKET DATA =============

describe('getTaxBracketData', () => {
  it('should return data for all brackets up to income', () => {
    const data = getTaxBracketData(75000);
    expect(data.length).toBe(3); // Brackets 0, 1, 2
  });

  it('should calculate amount in each bracket correctly', () => {
    const data = getTaxBracketData(75000);
    // Bracket 0: $0 to $18,200 (18,201 possible values)
    expect(data[0].amountInBracket).toBe(18201);
    // Bracket 1: $18,201 to $45,000 (26,800 possible values)
    expect(data[1].amountInBracket).toBe(26800);
    // Bracket 2: $45,001 to $75,000 (30,000 possible values)
    expect(data[2].amountInBracket).toBe(30000);
  });

  it('should calculate cumulative tax correctly', () => {
    const data = getTaxBracketData(75000);
    expect(data[0].cumulativeTax).toBe(0);
    expect(data[1].cumulativeTax).toBeCloseTo(4288, 0);
    expect(data[2].cumulativeTax).toBeCloseTo(13288, 0);
  });

  it('should handle income in top bracket', () => {
    const data = getTaxBracketData(200000);
    expect(data.length).toBe(5);
  });
});

describe('getRemainingInBracket', () => {
  it('should return correct remaining amount', () => {
    const result = getRemainingInBracket(75000);
    expect(result.remaining).toBe(60000); // 135000 - 75000
    expect(result.nextBracketRate).toBe(0.37);
  });

  it('should return Infinity for top bracket', () => {
    const result = getRemainingInBracket(200000);
    expect(result.remaining).toBe(Infinity);
    expect(result.nextBracketRate).toBeNull();
  });

  it('should return correct next bracket info', () => {
    const result = getRemainingInBracket(30000);
    expect(result.nextBracketMin).toBe(45001);
    expect(result.nextBracketRate).toBe(0.30);
  });
});

describe('calculateDeductionImpact', () => {
  it('should calculate correct tax savings', () => {
    const result = calculateDeductionImpact(75000, 5000);
    expect(result.newTaxableIncome).toBe(70000);
    expect(result.taxSavings).toBeGreaterThan(0);
    expect(result.marginalRateApplied).toBe(0.30);
  });

  it('should not go below zero taxable income', () => {
    const result = calculateDeductionImpact(10000, 15000);
    expect(result.newTaxableIncome).toBe(0);
  });

  it('should calculate effective rate', () => {
    const result = calculateDeductionImpact(75000, 5000);
    expect(result.effectiveRate).toBeGreaterThan(0);
    expect(result.effectiveRate).toBeLessThanOrEqual(1);
  });

  it('should return zero for zero deduction', () => {
    const result = calculateDeductionImpact(75000, 0);
    expect(result.taxSavings).toBe(0);
    expect(result.newTaxableIncome).toBe(75000);
  });
});

// ============= TESTS: UTILITIES =============

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-1000)).toBe('-$1,000');
  });
});

describe('formatPercent', () => {
  it('should format percentages correctly', () => {
    expect(formatPercent(0.16)).toBe('16.0%');
    expect(formatPercent(0.30)).toBe('30.0%');
  });

  it('should respect decimal parameter', () => {
    expect(formatPercent(0.165, 2)).toBe('16.50%');
    expect(formatPercent(0.165, 0)).toBe('17%');
  });

  it('should format zero correctly', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('generateDeductionId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateDeductionId();
    const id2 = generateDeductionId();
    expect(id1).not.toBe(id2);
  });

  it('should start with ded-', () => {
    const id = generateDeductionId();
    expect(id.startsWith('ded-')).toBe(true);
  });
});

describe('validateDeduction', () => {
  it('should validate valid deduction', () => {
    const result = validateDeduction({
      description: 'Test',
      amount: 1000,
      category: 'work-from-home',
      method: 'immediate',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require description', () => {
    const result = validateDeduction({
      description: '',
      amount: 1000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Description is required');
  });

  it('should require positive amount', () => {
    const result = validateDeduction({
      description: 'Test',
      amount: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Amount must be greater than 0');
  });

  it('should flag unusually high amounts', () => {
    const result = validateDeduction({
      description: 'Test',
      amount: 2000000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Amount seems unusually high');
  });

  it('should require depreciation years for depreciation method', () => {
    const result = validateDeduction({
      description: 'Test',
      amount: 1000,
      method: 'depreciation',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Depreciation years must be at least 1');
  });
});

describe('getTaxYearDates', () => {
  it('should return correct dates for 2024-2025', () => {
    const dates = getTaxYearDates(2025);
    expect(dates.startDate).toEqual(new Date(2024, 6, 1));
    expect(dates.endDate).toEqual(new Date(2025, 5, 30));
  });

  it('should return correct dates for 2023-2024', () => {
    const dates = getTaxYearDates(2024);
    expect(dates.startDate).toEqual(new Date(2023, 6, 1));
    expect(dates.endDate).toEqual(new Date(2024, 5, 30));
  });
});

// ============= TESTS: EDGE CASES =============

describe('Edge Cases', () => {
  it('should handle very small incomes', () => {
    const result = calculateTaxPayable(1);
    expect(result.taxPayable).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it('should handle exact bracket boundaries', () => {
    const result18200 = calculateTaxPayable(18200);
    const result18300 = calculateTaxPayable(18300);
    expect(result18200.taxPayable).toBe(0);
    // At $18,300, tax should be 16% of ($18,300 - $18,200) = $16
    expect(result18300.taxPayable).toBeGreaterThan(0);
  });

  it('should handle maximum safe integer', () => {
    const result = calculateTaxPayable(Number.MAX_SAFE_INTEGER);
    expect(result.marginalRate).toBe(0.45);
    expect(result.totalTax).toBeGreaterThan(0);
  });

  it('should handle negative deductions gracefully', () => {
    const scenario = createTaxScenario('Test', 75000, [
      createDeduction({ amount: -1000, method: 'immediate' }),
    ]);
    // Should not affect calculation (validation should catch this)
    expect(() => calculateTotalDeductions(scenario.deductions)).not.toThrow();
  });

  it('should handle empty strings in validation', () => {
    const result = validateDeduction({
      description: '   ',
      amount: 1000,
    });
    expect(result.valid).toBe(false);
  });
});

// ============= TESTS: INTEGRATION =============

describe('Integration Tests', () => {
  it('should calculate end-to-end scenario correctly', () => {
    // Create a realistic scenario
    const scenario = createTaxScenario('My Tax Return', 95000, [
      createDeduction({ description: 'Home Office', amount: 1500, category: 'work-from-home' }),
      createDeduction({ description: 'Vehicle', amount: 3500, category: 'vehicle' }),
      createDeduction({ description: 'Education', amount: 2000, category: 'self-education' }),
    ]);

    const totalDeductions = calculateTotalDeductions(scenario.deductions);
    expect(totalDeductions).toBe(7000);

    const taxableIncome = Math.max(0, scenario.taxableIncome - totalDeductions);
    expect(taxableIncome).toBe(88000);

    const taxResult = calculateTaxPayable(taxableIncome, scenario.medicareLevy);
    expect(taxResult.marginalRate).toBe(0.30);
    expect(taxResult.totalTax).toBeGreaterThan(0);

    const savings = calculateTaxSavings(totalDeductions, scenario.taxableIncome);
    expect(savings.totalSavings).toBeGreaterThan(0);
  });

  it('should compare depreciation vs immediate correctly', () => {
    const income = 120000;
    const assetValue = 10000;

    const immediateSavings = calculateTaxSavings(assetValue, income);
    const comparison = compareDeductionMethods(assetValue, 'Equipment', income, 5);

    expect(comparison.immediate.taxSavings).toBe(immediateSavings.totalSavings);
    expect(comparison.immediate.totalDeduction).toBe(assetValue);
    expect(comparison.depreciation.totalDeduction).toBeLessThanOrEqual(assetValue);
  });

  it('should maintain consistency across calculations', () => {
    const income = 80000;
    const marginalRate = getMarginalTaxRate(income);
    const taxResult = calculateTaxPayable(income);
    const bracketData = getTaxBracketData(income);

    expect(taxResult.marginalRate).toBe(marginalRate);
    expect(bracketData[bracketData.length - 1].bracket.rate).toBe(marginalRate);
  });
});
