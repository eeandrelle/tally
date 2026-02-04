/**
 * Tax Calculator Engine Module
 * 
 * Core tax calculation engine for what-if scenarios, marginal tax rates,
 * and deduction method comparisons.
 * 
 * Tax Year: 2024-2025 (Australia)
 */

// ============= TYPES =============

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  baseTax: number;
}

export interface TaxScenario {
  id: string;
  name: string;
  taxableIncome: number;
  deductions: DeductionItem[];
  taxOffsets: number;
  medicareLevy: boolean;
  medicareLevySurcharge: boolean;
  privateHospitalCover: boolean;
}

export interface DeductionItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  method: 'immediate' | 'depreciation';
  depreciationYears?: number;
  depreciationRate?: number;
}

export interface DepreciationSchedule {
  year: number;
  openingValue: number;
  depreciationAmount: number;
  closingValue: number;
  taxSavings: number;
}

export interface MethodComparison {
  immediate: {
    totalDeduction: number;
    taxSavings: number;
    effectiveRate: number;
  };
  depreciation: {
    totalDeduction: number;
    taxSavings: number;
    effectiveRate: number;
    schedule: DepreciationSchedule[];
  };
  breakEvenYear: number | null;
  recommendation: 'immediate' | 'depreciation' | 'either';
  explanation: string;
}

export interface TaxCalculationResult {
  taxableIncome: number;
  taxPayable: number;
  marginalRate: number;
  effectiveRate: number;
  bracketIndex: number;
  taxBeforeOffsets: number;
  medicareLevy: number;
  medicareLevySurcharge: number;
  totalTax: number;
}

export interface SavingsBreakdown {
  federalTaxSavings: number;
  medicareLevySavings: number;
  mlsSavings: number;
  totalSavings: number;
  refundEstimate: number;
  effectiveDeductionRate: number;
}

export interface WhatIfComparison {
  baseline: TaxScenario;
  scenario: TaxScenario;
  baselineResult: TaxCalculationResult;
  scenarioResult: TaxCalculationResult;
  savingsBreakdown: SavingsBreakdown;
  deductionComparison: {
    baseline: number;
    scenario: number;
    difference: number;
  };
}

// ============= CONSTANTS =============

// 2024-2025 Australian Tax Brackets
export const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 0.16, baseTax: 0 },
  { min: 45001, max: 135000, rate: 0.30, baseTax: 4288 }, // 16% of (45000-18200)
  { min: 135001, max: 190000, rate: 0.37, baseTax: 31288 }, // 4288 + 30% of (135000-45000)
  { min: 190001, max: Infinity, rate: 0.45, baseTax: 51638 }, // 31288 + 37% of (190000-135000)
];

// Medicare Levy rates
const MEDICARE_LEVY_RATE = 0.02;

// Medicare Levy Surcharge thresholds (2024-2025)
const MLS_THRESHOLDS = {
  single: [
    { income: 0, max: 97000, rate: 0 },
    { income: 97001, max: 113000, rate: 0.01 },
    { income: 113001, max: 151000, rate: 0.0125 },
    { income: 151001, max: Infinity, rate: 0.015 },
  ],
  family: [
    { income: 0, max: 194000, rate: 0 },
    { income: 194001, max: 226000, rate: 0.01 },
    { income: 226001, max: 302000, rate: 0.0125 },
    { income: 302001, max: Infinity, rate: 0.015 },
  ],
};

// Low Value Pool depreciation rate
const LVP_RATE = 0.375; // 37.5% for first year, then 18.75%
const LVP_RATE_ONGOING = 0.1875;

// Diminishing Value depreciation method
const DV_RATE = 0.20; // 20% per year

// ============= CORE TAX CALCULATIONS =============

/**
 * Get the marginal tax rate for a given income level
 */
export function getMarginalTaxRate(income: number): number {
  for (const bracket of TAX_BRACKETS) {
    if (income >= bracket.min && income <= bracket.max) {
      return bracket.rate;
    }
  }
  return TAX_BRACKETS[TAX_BRACKETS.length - 1].rate;
}

/**
 * Get the tax bracket index for a given income level
 */
export function getTaxBracketIndex(income: number): number {
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (income >= TAX_BRACKETS[i].min && income <= TAX_BRACKETS[i].max) {
      return i;
    }
  }
  return TAX_BRACKETS.length - 1;
}

/**
 * Calculate tax payable for a given taxable income
 */
export function calculateTaxPayable(
  taxableIncome: number,
  includeMedicareLevy: boolean = true,
  hasPrivateHospitalCover: boolean = false,
  isFamily: boolean = false
): TaxCalculationResult {
  // Find the applicable tax bracket
  let taxBeforeOffsets = 0;
  let bracketIndex = 0;

  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const bracket = TAX_BRACKETS[i];
    // Use > instead of >= for lower bound to handle exact boundary
    if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
      bracketIndex = i;
      if (i === 0) {
        taxBeforeOffsets = 0;
      } else {
        // Calculate tax: base tax + rate * (income - bracket min)
        taxBeforeOffsets = Math.round(bracket.baseTax + bracket.rate * (taxableIncome - bracket.min));
      }
      break;
    }
    // Handle exact boundary case where income equals bracket.min
    if (taxableIncome === bracket.min && i > 0) {
      bracketIndex = i;
      taxBeforeOffsets = bracket.baseTax;
      break;
    }
  }

  // If income exceeds highest bracket
  if (taxableIncome > TAX_BRACKETS[TAX_BRACKETS.length - 1].max) {
    const highestBracket = TAX_BRACKETS[TAX_BRACKETS.length - 1];
    bracketIndex = TAX_BRACKETS.length - 1;
    taxBeforeOffsets = Math.round(highestBracket.baseTax + highestBracket.rate * (taxableIncome - highestBracket.min));
  }
  
  // Handle exact boundary at top bracket min
  if (taxableIncome === TAX_BRACKETS[TAX_BRACKETS.length - 1].min) {
    bracketIndex = TAX_BRACKETS.length - 1;
    taxBeforeOffsets = TAX_BRACKETS[TAX_BRACKETS.length - 1].baseTax;
  }

  const marginalRate = TAX_BRACKETS[bracketIndex].rate;
  const effectiveRate = taxableIncome > 0 ? taxBeforeOffsets / taxableIncome : 0;

  // Calculate Medicare Levy
  let medicareLevy = 0;
  if (includeMedicareLevy && taxableIncome > 0) {
    medicareLevy = Math.round(taxableIncome * MEDICARE_LEVY_RATE);
  }

  // Calculate Medicare Levy Surcharge
  let medicareLevySurcharge = 0;
  if (!hasPrivateHospitalCover && includeMedicareLevy) {
    const thresholds = isFamily ? MLS_THRESHOLDS.family : MLS_THRESHOLDS.single;
    for (const threshold of thresholds) {
      if (taxableIncome >= threshold.income && taxableIncome <= threshold.max) {
        medicareLevySurcharge = Math.round(taxableIncome * threshold.rate);
        break;
      }
    }
  }

  const totalTax = taxBeforeOffsets + medicareLevy + medicareLevySurcharge;

  return {
    taxableIncome,
    taxPayable: taxBeforeOffsets,
    marginalRate,
    effectiveRate,
    bracketIndex,
    taxBeforeOffsets,
    medicareLevy,
    medicareLevySurcharge,
    totalTax,
  };
}

/**
 * Calculate tax savings from a deduction
 */
export function calculateTaxSavings(
  deductionAmount: number,
  taxableIncome: number,
  includeMedicareLevy: boolean = true
): SavingsBreakdown {
  const marginalRate = getMarginalTaxRate(taxableIncome);
  
  // Federal tax savings
  const federalTaxSavings = Math.round(deductionAmount * marginalRate);
  
  // Medicare Levy savings (deduction reduces income subject to MLS)
  const medicareLevySavings = includeMedicareLevy 
    ? Math.round(deductionAmount * MEDICARE_LEVY_RATE)
    : 0;
  
  // Calculate potential MLS savings
  const preDeductionMLS = calculateTaxPayable(taxableIncome, includeMedicareLevy, false).medicareLevySurcharge;
  const postDeductionMLS = calculateTaxPayable(
    Math.max(0, taxableIncome - deductionAmount),
    includeMedicareLevy,
    false
  ).medicareLevySurcharge;
  const mlsSavings = preDeductionMLS - postDeductionMLS;
  
  const totalSavings = federalTaxSavings + medicareLevySavings + mlsSavings;
  const effectiveDeductionRate = deductionAmount > 0 ? totalSavings / deductionAmount : 0;
  
  // Refund estimate (simplified - assumes no other offsets)
  const refundEstimate = totalSavings;

  return {
    federalTaxSavings,
    medicareLevySavings,
    mlsSavings,
    totalSavings,
    refundEstimate,
    effectiveDeductionRate,
  };
}

// ============= DEDUCTION METHOD COMPARISON =============

/**
 * Generate depreciation schedule using diminishing value method
 */
export function generateDepreciationSchedule(
  assetValue: number,
  years: number,
  method: 'diminishing-value' | 'prime-cost' = 'diminishing-value'
): DepreciationSchedule[] {
  const schedule: DepreciationSchedule[] = [];
  let openingValue = assetValue;
  
  for (let year = 1; year <= years; year++) {
    let depreciationAmount: number;
    
    if (method === 'diminishing-value') {
      depreciationAmount = Math.round(openingValue * DV_RATE);
    } else {
      // Prime cost (straight line)
      depreciationAmount = Math.round(assetValue / years);
    }
    
    // Don't depreciate below $1
    if (openingValue - depreciationAmount < 1) {
      depreciationAmount = openingValue - 1;
    }
    
    const closingValue = openingValue - depreciationAmount;
    
    schedule.push({
      year,
      openingValue,
      depreciationAmount,
      closingValue,
      taxSavings: 0, // Will be calculated separately
    });
    
    openingValue = closingValue;
    if (openingValue <= 1) break;
  }
  
  return schedule;
}

/**
 * Compare immediate deduction vs depreciation methods
 */
export function compareDeductionMethods(
  assetValue: number,
  assetName: string,
  currentTaxableIncome: number,
  yearsToCompare: number = 5,
  includeMedicareLevy: boolean = true
): MethodComparison {
  // Immediate deduction calculation
  const immediateSavings = calculateTaxSavings(assetValue, currentTaxableIncome, includeMedicareLevy);
  
  // Depreciation calculation
  const schedule = generateDepreciationSchedule(assetValue, yearsToCompare);
  let totalDepreciationTaxSavings = 0;
  let totalDepreciation = 0;
  
  // Calculate tax savings for each year of depreciation
  let projectedIncome = currentTaxableIncome;
  const detailedSchedule = schedule.map((yearData) => {
    const yearSavings = calculateTaxSavings(
      yearData.depreciationAmount,
      projectedIncome,
      includeMedicareLevy
    );
    totalDepreciationTaxSavings += yearSavings.totalSavings;
    totalDepreciation += yearData.depreciationAmount;
    
    // Update projected income for next year (assume 3% growth)
    projectedIncome = Math.round(projectedIncome * 1.03);
    
    return {
      ...yearData,
      taxSavings: yearSavings.totalSavings,
    };
  });
  
  // Calculate effective rates
  const immediateEffectiveRate = assetValue > 0 ? immediateSavings.totalSavings / assetValue : 0;
  const depreciationEffectiveRate = assetValue > 0 ? totalDepreciationTaxSavings / assetValue : 0;
  
  // Find break-even year (when cumulative depreciation savings exceed immediate)
  let cumulativeSavings = 0;
  let breakEvenYear: number | null = null;
  
  for (const year of detailedSchedule) {
    cumulativeSavings += year.taxSavings;
    if (breakEvenYear === null && cumulativeSavings >= immediateSavings.totalSavings) {
      breakEvenYear = year.year;
    }
  }
  
  // Determine recommendation
  let recommendation: 'immediate' | 'depreciation' | 'either';
  let explanation: string;
  
  const marginalRate = getMarginalTaxRate(currentTaxableIncome);
  
  if (marginalRate >= 0.37) {
    recommendation = 'immediate';
    explanation = `With your ${(marginalRate * 100).toFixed(0)}% marginal tax rate, claiming the immediate deduction provides significant tax savings now rather than spreading them over future years.`;
  } else if (breakEvenYear && breakEvenYear <= 2) {
    recommendation = 'either';
    explanation = `Both methods provide similar total benefits. The break-even point is in year ${breakEvenYear}, so choose based on your cash flow needs.`;
  } else if (immediateSavings.totalSavings > totalDepreciationTaxSavings * 0.9) {
    recommendation = 'immediate';
    explanation = 'The immediate deduction provides nearly the same total benefit with the advantage of receiving the tax savings now.';
  } else {
    recommendation = 'depreciation';
    explanation = `Spreading the deduction over ${yearsToCompare} years may help if you expect to be in a higher tax bracket in future years.`;
  }
  
  return {
    immediate: {
      totalDeduction: assetValue,
      taxSavings: immediateSavings.totalSavings,
      effectiveRate: immediateEffectiveRate,
    },
    depreciation: {
      totalDeduction: totalDepreciation,
      taxSavings: totalDepreciationTaxSavings,
      effectiveRate: depreciationEffectiveRate,
      schedule: detailedSchedule,
    },
    breakEvenYear,
    recommendation,
    explanation,
  };
}

// ============= WHAT-IF SCENARIO CALCULATOR =============

/**
 * Calculate total deductions for a scenario
 */
export function calculateTotalDeductions(deductions: DeductionItem[]): number {
  return deductions
    .filter((d) => d.method === 'immediate')
    .reduce((sum, d) => sum + d.amount, 0);
}

/**
 * Create a new tax scenario
 */
export function createTaxScenario(
  name: string,
  taxableIncome: number,
  deductions: DeductionItem[] = [],
  overrides: Partial<TaxScenario> = {}
): TaxScenario {
  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    taxableIncome,
    deductions,
    taxOffsets: 0,
    medicareLevy: true,
    medicareLevySurcharge: false,
    privateHospitalCover: false,
    ...overrides,
  };
}

/**
 * Compare baseline scenario with what-if scenario
 */
export function compareScenarios(
  baseline: TaxScenario,
  scenario: TaxScenario,
  includeMedicareLevy: boolean = true,
  isFamily: boolean = false
): WhatIfComparison {
  const baselineDeductions = calculateTotalDeductions(baseline.deductions);
  const scenarioDeductions = calculateTotalDeductions(scenario.deductions);
  
  const baselineTaxableIncome = Math.max(0, baseline.taxableIncome - baselineDeductions);
  const scenarioTaxableIncome = Math.max(0, scenario.taxableIncome - scenarioDeductions);
  
  const baselineResult = calculateTaxPayable(
    baselineTaxableIncome,
    includeMedicareLevy && baseline.medicareLevy,
    baseline.privateHospitalCover,
    isFamily
  );
  
  const scenarioResult = calculateTaxPayable(
    scenarioTaxableIncome,
    includeMedicareLevy && scenario.medicareLevy,
    scenario.privateHospitalCover,
    isFamily
  );
  
  const deductionDifference = scenarioDeductions - baselineDeductions;
  const savingsBreakdown = calculateTaxSavings(
    deductionDifference,
    baseline.taxableIncome,
    includeMedicareLevy
  );
  
  return {
    baseline,
    scenario,
    baselineResult,
    scenarioResult,
    savingsBreakdown,
    deductionComparison: {
      baseline: baselineDeductions,
      scenario: scenarioDeductions,
      difference: deductionDifference,
    },
  };
}

// ============= TAX BRACKET VISUALIZATION =============

/**
 * Get tax bracket data for visualization
 */
export function getTaxBracketData(income: number): {
  bracket: TaxBracket;
  index: number;
  amountInBracket: number;
  taxInBracket: number;
  cumulativeTax: number;
}[] {
  const data: {
    bracket: TaxBracket;
    index: number;
    amountInBracket: number;
    taxInBracket: number;
    cumulativeTax: number;
  }[] = [];
  
  let cumulativeTax = 0;
  
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const bracket = TAX_BRACKETS[i];
    
    if (income < bracket.min) {
      break;
    }
    
    // Calculate amount in this bracket
    const bracketMax = bracket.max === Infinity ? income : bracket.max;
    const amountInBracket = Math.max(0, Math.min(income, bracketMax) - bracket.min + 1);
    const taxInBracket = Math.round(amountInBracket * bracket.rate);
    cumulativeTax += taxInBracket;
    
    data.push({
      bracket,
      index: i,
      amountInBracket: income >= bracketMax ? bracketMax - bracket.min + 1 : amountInBracket,
      taxInBracket,
      cumulativeTax,
    });
    
    if (income <= bracket.max) {
      break;
    }
  }
  
  return data;
}

/**
 * Calculate how much additional income would push to next bracket
 */
export function getRemainingInBracket(income: number): {
  remaining: number;
  nextBracketRate: number | null;
  nextBracketMin: number | null;
} {
  const currentBracketIndex = getTaxBracketIndex(income);
  const currentBracket = TAX_BRACKETS[currentBracketIndex];
  
  if (currentBracketIndex >= TAX_BRACKETS.length - 1) {
    return {
      remaining: Infinity,
      nextBracketRate: null,
      nextBracketMin: null,
    };
  }
  
  const nextBracket = TAX_BRACKETS[currentBracketIndex + 1];
  
  return {
    remaining: currentBracket.max - income,
    nextBracketRate: nextBracket.rate,
    nextBracketMin: nextBracket.min,
  };
}

/**
 * Calculate the impact of additional deductions
 */
export function calculateDeductionImpact(
  currentIncome: number,
  additionalDeduction: number
): {
  newTaxableIncome: number;
  currentTax: number;
  newTax: number;
  taxSavings: number;
  marginalRateApplied: number;
  effectiveRate: number;
} {
  const currentTax = calculateTaxPayable(currentIncome).totalTax;
  const newTaxableIncome = Math.max(0, currentIncome - additionalDeduction);
  const newTax = calculateTaxPayable(newTaxableIncome).totalTax;
  const taxSavings = currentTax - newTax;
  
  const marginalRateApplied = getMarginalTaxRate(currentIncome);
  const effectiveRate = additionalDeduction > 0 ? taxSavings / additionalDeduction : 0;
  
  return {
    newTaxableIncome,
    currentTax,
    newTax,
    taxSavings,
    marginalRateApplied,
    effectiveRate,
  };
}

// ============= UTILITY FUNCTIONS =============

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Generate a unique ID for deductions
 */
export function generateDeductionId(): string {
  return `ded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate a deduction item
 */
export function validateDeduction(deduction: Partial<DeductionItem>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!deduction.description || deduction.description.trim().length === 0) {
    errors.push('Description is required');
  }
  
  if (deduction.amount === undefined || deduction.amount === null) {
    errors.push('Amount is required');
  } else if (deduction.amount <= 0) {
    errors.push('Amount must be greater than 0');
  } else if (deduction.amount > 1000000) {
    errors.push('Amount seems unusually high');
  }
  
  if (deduction.method === 'depreciation') {
    if (!deduction.depreciationYears || deduction.depreciationYears < 1) {
      errors.push('Depreciation years must be at least 1');
    }
    if (!deduction.depreciationRate || deduction.depreciationRate <= 0) {
      errors.push('Depreciation rate must be greater than 0');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get tax year dates
 */
export function getTaxYearDates(taxYear: number): {
  startDate: Date;
  endDate: Date;
} {
  return {
    startDate: new Date(taxYear - 1, 6, 1), // July 1
    endDate: new Date(taxYear, 5, 30), // June 30
  };
}

/**
 * Export scenario comparison to CSV
 */
export function exportComparisonToCSV(comparison: WhatIfComparison): string {
  const lines: string[] = [];
  
  lines.push('Tax Scenario Comparison');
  lines.push('');
  lines.push(`Baseline:,${comparison.baseline.name}`);
  lines.push(`Scenario:,${comparison.scenario.name}`);
  lines.push('');
  lines.push('Metric,Baseline,Scenario,Difference');
  lines.push(`Taxable Income,${comparison.baselineResult.taxableIncome},${comparison.scenarioResult.taxableIncome},${comparison.baselineResult.taxableIncome - comparison.scenarioResult.taxableIncome}`);
  lines.push(`Tax Payable,${comparison.baselineResult.taxPayable},${comparison.scenarioResult.taxPayable},${comparison.baselineResult.taxPayable - comparison.scenarioResult.taxPayable}`);
  lines.push(`Medicare Levy,${comparison.baselineResult.medicareLevy},${comparison.scenarioResult.medicareLevy},${comparison.baselineResult.medicareLevy - comparison.scenarioResult.medicareLevy}`);
  lines.push(`Total Tax,${comparison.baselineResult.totalTax},${comparison.scenarioResult.totalTax},${comparison.baselineResult.totalTax - comparison.scenarioResult.totalTax}`);
  lines.push('');
  lines.push('Savings Breakdown');
  lines.push(`Federal Tax Savings:,${comparison.savingsBreakdown.federalTaxSavings}`);
  lines.push(`Medicare Levy Savings:,${comparison.savingsBreakdown.medicareLevySavings}`);
  lines.push(`MLS Savings:,${comparison.savingsBreakdown.mlsSavings}`);
  lines.push(`Total Savings:,${comparison.savingsBreakdown.totalSavings}`);
  lines.push(`Estimated Refund:,${comparison.savingsBreakdown.refundEstimate}`);
  
  return lines.join('\n');
}
