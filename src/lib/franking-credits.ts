/**
 * Franking Credit Calculation Engine
 * 
 * Implements Australian Taxation Office (ATO) franking credit calculations:
 * - Calculates franking credits from franked dividend amounts
 * - Supports partially franked dividends
 * - Calculates grossed-up dividend amounts
 * - Shows tax impact at different marginal rates
 * 
 * Tax Year: 2024-2025 (30% company tax rate)
 */

// ============= CONSTANTS =============

/** Company tax rate for 2024-2025 financial year */
export const COMPANY_TAX_RATE_2025 = 0.30;

/** Franking credit multiplier: (tax rate) / (1 - tax rate) = 0.3 / 0.7 */
export const FRANKING_MULTIPLIER_2025 = COMPANY_TAX_RATE_2025 / (1 - COMPANY_TAX_RATE_2025); // ≈ 0.428571

/** Financial year string format */
export type FinancialYear = '2023-2024' | '2024-2025' | '2025-2026';

// ============= TYPES =============

export interface DividendEntry {
  id?: number;
  companyName: string;
  dividendAmount: number; // Cash dividend received
  frankingPercentage: number; // 0-100%
  frankingCredit: number; // Calculated
  grossedUpDividend: number; // Calculated: dividend + franking credit
  dateReceived: string; // ISO date string
  notes?: string;
  taxYear: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FrankingCreditCalculation {
  dividendAmount: number;
  frankingPercentage: number;
  frankedAmount: number;
  unfrankedAmount: number;
  frankingCredit: number;
  grossedUpDividend: number;
}

export interface TaxImpactResult {
  marginalRate: number;
  taxOnGrossedUp: number;
  frankingCreditOffset: number;
  netTaxPosition: number; // Positive = tax payable, Negative = refund due
  effectiveTaxRate: number;
}

export interface AnnualFrankingSummary {
  taxYear: string;
  totalDividends: number;
  totalFrankingCredits: number;
  totalGrossedUpDividends: number;
  entries: DividendEntry[];
  taxImpactAtRates: TaxImpactResult[];
}

export interface MarginalTaxRate {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  baseTax: number;
  description: string;
}

// ============= 2024-2025 AUSTRALIAN MARGINAL TAX RATES =============

export const MARGINAL_TAX_RATES_2025: MarginalTaxRate[] = [
  { minIncome: 0, maxIncome: 18200, rate: 0, baseTax: 0, description: 'Tax-free threshold' },
  { minIncome: 18201, maxIncome: 45000, rate: 0.16, baseTax: 0, description: '16% bracket' },
  { minIncome: 45001, maxIncome: 135000, rate: 0.30, baseTax: 4288, description: '30% bracket' },
  { minIncome: 135001, maxIncome: 190000, rate: 0.37, baseTax: 31288, description: '37% bracket' },
  { minIncome: 190001, maxIncome: null, rate: 0.45, baseTax: 51638, description: '45% bracket' },
];

// ============= CALCULATION FUNCTIONS =============

/**
 * Calculate franking credit from franked dividend amount
 * ATO Formula: Franking Credit = (Dividend Amount × Company Tax Rate) / (1 - Company Tax Rate)
 * For 30% rate: Franking Credit = Dividend Amount × 0.3 / 0.7 = Dividend Amount × 0.428571...
 * 
 * @param frankedAmount - The franked portion of the dividend
 * @param companyTaxRate - Company tax rate (default 30% for 2024-2025)
 * @returns The franking credit amount
 */
export function calculateFrankingCredit(
  frankedAmount: number,
  companyTaxRate: number = COMPANY_TAX_RATE_2025
): number {
  if (frankedAmount <= 0) return 0;
  const multiplier = companyTaxRate / (1 - companyTaxRate);
  return Math.round(frankedAmount * multiplier * 100) / 100;
}

/**
 * Calculate franking credit from total dividend and franking percentage
 * 
 * @param dividendAmount - Total cash dividend received
 * @param frankingPercentage - Franking percentage (0-100)
 * @param companyTaxRate - Company tax rate (default 30%)
 * @returns Object containing all calculated values
 */
export function calculateFrankingFromDividend(
  dividendAmount: number,
  frankingPercentage: number,
  companyTaxRate: number = COMPANY_TAX_RATE_2025
): FrankingCreditCalculation {
  // Validate inputs
  const validDividend = Math.max(0, dividendAmount);
  const validPercentage = Math.min(100, Math.max(0, frankingPercentage));
  
  // Calculate franked and unfranked portions
  const frankedAmount = Math.round(validDividend * (validPercentage / 100) * 100) / 100;
  const unfrankedAmount = Math.round((validDividend - frankedAmount) * 100) / 100;
  
  // Calculate franking credit using ATO formula
  const frankingCredit = calculateFrankingCredit(frankedAmount, companyTaxRate);
  
  // Calculate grossed-up dividend (dividend + franking credit)
  const grossedUpDividend = Math.round((validDividend + frankingCredit) * 100) / 100;
  
  return {
    dividendAmount: validDividend,
    frankingPercentage: validPercentage,
    frankedAmount,
    unfrankedAmount,
    frankingCredit,
    grossedUpDividend,
  };
}

/**
 * Calculate grossed-up dividend amount
 * 
 * @param dividendAmount - Cash dividend received
 * @param frankingCredit - Associated franking credit
 * @returns Grossed-up dividend amount
 */
export function calculateGrossedUpDividend(
  dividendAmount: number,
  frankingCredit: number
): number {
  return Math.round((dividendAmount + frankingCredit) * 100) / 100;
}

/**
 * Determine marginal tax rate based on taxable income
 * 
 * @param taxableIncome - Annual taxable income
 * @returns The applicable marginal tax rate bracket
 */
export function getMarginalTaxRate(taxableIncome: number): MarginalTaxRate {
  for (const bracket of MARGINAL_TAX_RATES_2025) {
    if (bracket.maxIncome === null || taxableIncome <= bracket.maxIncome) {
      return bracket;
    }
  }
  return MARGINAL_TAX_RATES_2025[MARGINAL_TAX_RATES_2025.length - 1];
}

/**
 * Calculate tax impact of franked dividends at a given marginal rate
 * 
 * @param grossedUpDividend - Grossed-up dividend amount
 * @param frankingCredit - Franking credit amount
 * @param marginalRate - Marginal tax rate (e.g., 0.30 for 30%)
 * @returns Tax impact details
 */
export function calculateTaxImpact(
  grossedUpDividend: number,
  frankingCredit: number,
  marginalRate: number
): TaxImpactResult {
  const taxOnGrossedUp = Math.round(grossedUpDividend * marginalRate * 100) / 100;
  const netTaxPosition = Math.round((taxOnGrossedUp - frankingCredit) * 100) / 100;
  const effectiveTaxRate = grossedUpDividend > 0 
    ? Math.round((netTaxPosition / grossedUpDividend) * 10000) / 100 
    : 0;
  
  return {
    marginalRate,
    taxOnGrossedUp,
    frankingCreditOffset: frankingCredit,
    netTaxPosition,
    effectiveTaxRate,
  };
}

/**
 * Calculate tax impact at multiple marginal rates for comparison
 * 
 * @param grossedUpDividend - Grossed-up dividend amount
 * @param frankingCredit - Franking credit amount
 * @returns Array of tax impacts at different rates
 */
export function calculateTaxImpactAtAllRates(
  grossedUpDividend: number,
  frankingCredit: number
): TaxImpactResult[] {
  const uniqueRates = [...new Set(MARGINAL_TAX_RATES_2025.map(r => r.rate))];
  return uniqueRates.map(rate => calculateTaxImpact(grossedUpDividend, frankingCredit, rate));
}

/**
 * Calculate tax impact based on user's taxable income
 * 
 * @param grossedUpDividend - Grossed-up dividend amount
 * @param frankingCredit - Franking credit amount
 * @param taxableIncome - User's taxable income
 * @returns Tax impact at user's marginal rate
 */
export function calculateTaxImpactForIncome(
  grossedUpDividend: number,
  frankingCredit: number,
  taxableIncome: number
): TaxImpactResult {
  const marginalRate = getMarginalTaxRate(taxableIncome).rate;
  return calculateTaxImpact(grossedUpDividend, frankingCredit, marginalRate);
}

// ============= AGGREGATION FUNCTIONS =============

/**
 * Calculate annual summary of franking credits
 * 
 * @param entries - Array of dividend entries
 * @param taxYear - Financial year string
 * @returns Annual summary
 */
export function calculateAnnualSummary(
  entries: DividendEntry[],
  taxYear: string
): AnnualFrankingSummary {
  const validEntries = entries.filter(e => e.taxYear === taxYear);
  
  const totalDividends = Math.round(
    validEntries.reduce((sum, e) => sum + e.dividendAmount, 0) * 100
  ) / 100;
  
  const totalFrankingCredits = Math.round(
    validEntries.reduce((sum, e) => sum + e.frankingCredit, 0) * 100
  ) / 100;
  
  const totalGrossedUpDividends = Math.round(
    validEntries.reduce((sum, e) => sum + e.grossedUpDividend, 0) * 100
  ) / 100;
  
  const taxImpactAtRates = calculateTaxImpactAtAllRates(
    totalGrossedUpDividends,
    totalFrankingCredits
  );
  
  return {
    taxYear,
    totalDividends,
    totalFrankingCredits,
    totalGrossedUpDividends,
    entries: validEntries,
    taxImpactAtRates,
  };
}

// ============= UTILITY FUNCTIONS =============

/**
 * Format currency for display
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 * 
 * @param value - Percentage value (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get current financial year based on date
 * 
 * @param date - Date to check (defaults to now)
 * @returns Financial year string (e.g., '2024-2025')
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  
  // Australian financial year runs July 1 - June 30
  if (month >= 6) { // July onwards
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Validate dividend entry
 * 
 * @param entry - Dividend entry to validate
 * @returns Validation result
 */
export function validateDividendEntry(
  entry: Partial<DividendEntry>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entry.companyName || entry.companyName.trim() === '') {
    errors.push('Company name is required');
  }
  
  if (entry.dividendAmount === undefined || entry.dividendAmount < 0) {
    errors.push('Dividend amount must be 0 or greater');
  }
  
  if (entry.frankingPercentage === undefined || 
      entry.frankingPercentage < 0 || 
      entry.frankingPercentage > 100) {
    errors.push('Franking percentage must be between 0 and 100');
  }
  
  if (!entry.dateReceived) {
    errors.push('Date received is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export entries to CSV format
 * 
 * @param entries - Dividend entries to export
 * @returns CSV string
 */
export function exportToCSV(entries: DividendEntry[]): string {
  const headers = [
    'Company Name',
    'Dividend Amount',
    'Franking %',
    'Franking Credit',
    'Grossed-Up Dividend',
    'Date Received',
    'Tax Year',
    'Notes',
  ];
  
  const rows = entries.map(e => [
    e.companyName,
    e.dividendAmount.toFixed(2),
    e.frankingPercentage.toFixed(1),
    e.frankingCredit.toFixed(2),
    e.grossedUpDividend.toFixed(2),
    e.dateReceived,
    e.taxYear,
    e.notes || '',
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export entries to JSON format
 * 
 * @param entries - Dividend entries to export
 * @returns JSON string
 */
export function exportToJSON(entries: DividendEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

// ============= SCHEMA FOR DATABASE =============

export const FRANKING_CREDIT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS dividend_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    dividend_amount REAL NOT NULL,
    franking_percentage REAL NOT NULL DEFAULT 100,
    franking_credit REAL NOT NULL,
    grossed_up_dividend REAL NOT NULL,
    date_received TEXT NOT NULL,
    notes TEXT,
    tax_year TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_dividend_tax_year ON dividend_entries(tax_year);
  CREATE INDEX IF NOT EXISTS idx_dividend_date ON dividend_entries(date_received);

  CREATE VIEW IF NOT EXISTS franking_credit_summary AS
  SELECT 
    tax_year,
    COUNT(*) as entry_count,
    SUM(dividend_amount) as total_dividends,
    SUM(franking_credit) as total_franking_credits,
    SUM(grossed_up_dividend) as total_grossed_up_dividends,
    AVG(franking_percentage) as avg_franking_percentage
  FROM dividend_entries
  GROUP BY tax_year;
`;
