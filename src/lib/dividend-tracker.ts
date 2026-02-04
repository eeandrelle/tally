/**
 * Dividend Tracker Data Models and Calculations
 * 
 * Provides comprehensive tracking of dividend income across all holdings
 * with payment pattern detection, company aggregation, and tax summaries.
 * 
 * @module dividend-tracker
 */

import type { ParsedDividend } from './dividend-pdf-parser';
import type { DividendEntry } from './franking-credits';
import { calculateFrankingFromDividend, getFinancialYear } from './franking-credits';
import type { DividendPattern, PatternConfidence } from './dividend-patterns';
import { detectPattern, generateExpectedDividends, PaymentFrequency } from './dividend-patterns';

// ============================================================================
// TYPES
// ============================================================================

/** Payment frequency patterns */
export type PaymentFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'irregular' | 'unknown';

/** Company dividend summary */
export interface CompanyDividendSummary {
  id: string; // ASX code or generated ID
  asxCode?: string;
  companyName: string;
  logoUrl?: string;
  
  // Aggregated totals
  totalDividends: number;
  totalFrankingCredits: number;
  totalFrankedAmount: number;
  totalUnfrankedAmount: number;
  
  // Payment pattern
  paymentFrequency: PaymentFrequency;
  paymentPattern: string; // e.g., "Interim + Final", "Quarterly"
  estimatedAnnualDividends: number;
  
  // Dividend history
  dividendCount: number;
  firstPaymentDate: string;
  lastPaymentDate: string;
  averageDividend: number;
  
  // Holdings
  currentSharesHeld: number;
  averageDividendPerShare: number;
  
  // Next payment estimate
  nextExpectedPayment?: {
    estimatedDate: string;
    estimatedAmount: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

/** Dividend payment with full details */
export interface DividendPayment extends DividendEntry {
  // Extended fields for tracker
  asxCode?: string;
  sharesHeld: number;
  dividendPerShare: number;
  dividendType?: 'interim' | 'final' | 'special' | 'ordinary';
  drpParticipated?: boolean;
  drpSharesIssued?: number;
  source: 'manual' | 'pdf_import' | 'bank_feed';
  parsedFrom?: ParsedDividend;
}

/** Annual dividend summary by financial year */
export interface AnnualDividendSummary {
  financialYear: string;
  totalDividends: number;
  totalFrankingCredits: number;
  totalGrossedUpDividends: number;
  totalFrankedAmount: number;
  totalUnfrankedAmount: number;
  companyCount: number;
  paymentCount: number;
  
  // Monthly breakdown for current year
  monthlyBreakdown: MonthlyDividend[];
  
  // Company breakdown
  companySummaries: CompanyDividendSummary[];
  
  // Year-over-year comparison
  previousYear?: {
    financialYear: string;
    totalDividends: number;
    growthRate: number;
  };
}

/** Monthly dividend data for timeline charts */
export interface MonthlyDividend {
  month: string; // YYYY-MM format
  monthName: string;
  totalDividends: number;
  frankingCredits: number;
  companyCount: number;
  payments: DividendPayment[];
}

/** Dividend tracker overview stats */
export interface DividendTrackerOverview {
  currentFinancialYear: string;
  
  // Current FY totals
  totalDividends: number;
  totalFrankingCredits: number;
  totalGrossedUpDividends: number;
  
  // Holdings
  dividendPayingHoldings: number;
  averageDividendPerHolding: number;
  
  // Year-over-year
  yearOverYearGrowth: number;
  previousYearDividends: number;
  
  // All-time stats
  allTimeTotalDividends: number;
  allTimeTotalFrankingCredits: number;
  totalCompanies: number;
}

/** Chart data types */
export interface DividendChartData {
  // Annual bar chart
  annualData: {
    financialYear: string;
    dividends: number;
    frankingCredits: number;
    companyCount: number;
  }[];
  
  // Pie chart by company
  companyDistribution: {
    companyName: string;
    asxCode?: string;
    amount: number;
    percentage: number;
  }[];
  
  // Franking vs Unfranked
  frankingBreakdown: {
    franked: number;
    unfranked: number;
    frankingCredits: number;
  };
  
  // Monthly timeline
  monthlyTimeline: MonthlyDividend[];
  
  // Cumulative growth
  cumulativeGrowth: {
    date: string;
    cumulativeAmount: number;
  }[];
}

/** Upcoming dividend estimate */
export interface UpcomingDividend {
  companyId: string;
  companyName: string;
  asxCode?: string;
  estimatedPaymentDate: string;
  estimatedAmount: number;
  estimatedFrankingCredits: number;
  estimatedFrankingPercentage: number;
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  basedOn: {
    lastPaymentDate: string;
    lastAmount: number;
    frequency: PaymentFrequency;
  };
}

/** Tax summary for a financial year */
export interface DividendTaxSummary {
  financialYear: string;
  totalDividends: number;
  totalFrankingCredits: number;
  totalGrossedUpDividends: number;
  
  // Tax impact at different rates
  taxImpactAtRates: {
    rate: number;
    taxOnGrossedUp: number;
    frankingCreditOffset: number;
    netTaxPosition: number;
    effectiveTaxRate: number;
  }[];
  
  // User's marginal rate impact (if taxable income provided)
  userTaxImpact?: {
    taxableIncome: number;
    marginalRate: number;
    taxOnGrossedUp: number;
    frankingCreditOffset: number;
    netTaxPosition: number;
    refundOrPayable: 'refund' | 'payable' | 'neutral';
    amount: number;
  };
}

/** Filter options for dividend queries */
export interface DividendFilterOptions {
  financialYear?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  frankedOnly?: boolean;
  searchQuery?: string;
}

// ============================================================================
// PAYMENT FREQUENCY DETECTION
// ============================================================================

/**
 * Detect payment frequency from a series of dividend dates
 * Uses statistical analysis of intervals between payments
 */
export function detectPaymentFrequency(dates: string[]): PaymentFrequency {
  if (dates.length < 2) return 'irregular';
  
  // Sort dates chronologically
  const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  
  // Calculate intervals in days
  const intervals: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const days = Math.round((sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }
  
  if (intervals.length === 0) return 'irregular';
  
  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  
  // High variance indicates irregular payments
  if (stdDev > avgInterval * 0.3) return 'irregular';
  
  // Classify by average interval
  if (avgInterval < 40) return 'monthly';
  if (avgInterval < 100) return 'quarterly';
  if (avgInterval < 200) return 'half-yearly';
  return 'yearly';
}

/**
 * Get payment pattern description based on frequency and history
 */
export function getPaymentPatternDescription(frequency: PaymentFrequency, paymentCount: number): string {
  const patterns: Record<PaymentFrequency, string> = {
    monthly: 'Monthly Distribution',
    quarterly: 'Quarterly Distribution',
    'half-yearly': 'Interim + Final',
    yearly: 'Annual Distribution',
    irregular: 'Irregular Distribution',
  };
  
  if (paymentCount === 1) return 'One-time Payment';
  if (paymentCount === 2) return 'Semi-annual Distribution';
  return patterns[frequency];
}

/**
 * Estimate next payment date based on frequency and last payment
 */
export function estimateNextPayment(
  lastPaymentDate: string,
  frequency: PaymentFrequency,
  paymentHistory: string[]
): { date: string; confidence: 'high' | 'medium' | 'low' } {
  const lastDate = new Date(lastPaymentDate);
  let nextDate = new Date(lastDate);
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(lastDate.getMonth() + 1);
      confidence = paymentHistory.length >= 6 ? 'high' : 'medium';
      break;
    case 'quarterly':
      nextDate.setMonth(lastDate.getMonth() + 3);
      confidence = paymentHistory.length >= 4 ? 'high' : 'medium';
      break;
    case 'half-yearly':
      nextDate.setMonth(lastDate.getMonth() + 6);
      confidence = paymentHistory.length >= 2 ? 'high' : 'medium';
      break;
    case 'yearly':
      nextDate.setFullYear(lastDate.getFullYear() + 1);
      confidence = paymentHistory.length >= 2 ? 'high' : 'low';
      break;
    default:
      // For irregular, use average interval if we have enough data
      if (paymentHistory.length >= 3) {
        const sorted = paymentHistory.map(d => new Date(d).getTime()).sort((a, b) => a - b);
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          intervals.push(sorted[i] - sorted[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        nextDate = new Date(lastDate.getTime() + avgInterval);
        confidence = 'low';
      } else {
        return { date: '', confidence: 'low' };
      }
  }
  
  return { date: nextDate.toISOString().split('T')[0], confidence };
}

// ============================================================================
// COMPANY AGGREGATION
// ============================================================================

/**
 * Aggregate dividend payments by company
 */
export function aggregateCompanies(payments: DividendPayment[]): CompanyDividendSummary[] {
  const companyMap = new Map<string, DividendPayment[]>();
  
  // Group payments by company
  for (const payment of payments) {
    const key = payment.asxCode || payment.companyName;
    if (!companyMap.has(key)) {
      companyMap.set(key, []);
    }
    companyMap.get(key)!.push(payment);
  }
  
  // Create summaries
  const summaries: CompanyDividendSummary[] = [];
  
  for (const [key, companyPayments] of companyMap) {
    const sorted = companyPayments.sort((a, b) => 
      new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
    );
    
    const dates = sorted.map(p => p.dateReceived);
    const frequency = detectPaymentFrequency(dates);
    const pattern = getPaymentPatternDescription(frequency, sorted.length);
    
    const totalDividends = sorted.reduce((sum, p) => sum + p.dividendAmount, 0);
    const totalFrankingCredits = sorted.reduce((sum, p) => sum + p.frankingCredit, 0);
    
    // Calculate franked/unfranked amounts
    const frankedAmounts = sorted.map(p => {
      const calc = calculateFrankingFromDividend(p.dividendAmount, p.frankingPercentage);
      return calc.frankedAmount;
    });
    const totalFrankedAmount = frankedAmounts.reduce((a, b) => a + b, 0);
    const totalUnfrankedAmount = totalDividends - totalFrankedAmount;
    
    // Get most recent share count
    const currentSharesHeld = sorted[sorted.length - 1]?.sharesHeld || 0;
    
    // Calculate next expected payment
    const lastPayment = sorted[sorted.length - 1];
    const nextEstimate = estimateNextPayment(lastPayment.dateReceived, frequency, dates);
    
    // Estimate annual dividends based on pattern
    let estimatedAnnual = totalDividends;
    if (sorted.length >= 1) {
      const avgPayment = totalDividends / sorted.length;
      const multipliers: Record<PaymentFrequency, number> = {
        monthly: 12,
        quarterly: 4,
        'half-yearly': 2,
        yearly: 1,
        irregular: sorted.length,
      };
      estimatedAnnual = avgPayment * multipliers[frequency];
    }
    
    summaries.push({
      id: key,
      asxCode: sorted[0].asxCode,
      companyName: sorted[0].companyName,
      totalDividends,
      totalFrankingCredits,
      totalFrankedAmount,
      totalUnfrankedAmount,
      paymentFrequency: frequency,
      paymentPattern: pattern,
      estimatedAnnualDividends: estimatedAnnual,
      dividendCount: sorted.length,
      firstPaymentDate: sorted[0].dateReceived,
      lastPaymentDate: lastPayment.dateReceived,
      averageDividend: sorted.length > 0 ? totalDividends / sorted.length : 0,
      currentSharesHeld,
      averageDividendPerShare: currentSharesHeld > 0 
        ? totalDividends / currentSharesHeld / sorted.length 
        : 0,
      nextExpectedPayment: nextEstimate.date ? {
        estimatedDate: nextEstimate.date,
        estimatedAmount: totalDividends / sorted.length,
        confidence: nextEstimate.confidence,
      } : undefined,
    });
  }
  
  // Sort by total dividends descending
  return summaries.sort((a, b) => b.totalDividends - a.totalDividends);
}

// ============================================================================
// MONTHLY BREAKDOWN
// ============================================================================

/**
 * Generate monthly breakdown of dividends
 */
export function generateMonthlyBreakdown(
  payments: DividendPayment[],
  financialYear: string
): MonthlyDividend[] {
  const [startYear] = financialYear.split('-').map(Number);
  const fyStart = new Date(`${startYear}-07-01`);
  const fyEnd = new Date(`${startYear + 1}-06-30`);
  
  // Initialize all months in the financial year
  const months: MonthlyDividend[] = [];
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(fyStart);
    monthDate.setMonth(fyStart.getMonth() + i);
    const monthStr = monthDate.toISOString().slice(0, 7);
    months.push({
      month: monthStr,
      monthName: monthDate.toLocaleString('en-AU', { month: 'short', year: '2-digit' }),
      totalDividends: 0,
      frankingCredits: 0,
      companyCount: 0,
      payments: [],
    });
  }
  
  // Distribute payments into months
  for (const payment of payments) {
    const paymentDate = new Date(payment.dateReceived);
    if (paymentDate < fyStart || paymentDate > fyEnd) continue;
    
    const monthStr = payment.dateReceived.slice(0, 7);
    const month = months.find(m => m.month === monthStr);
    
    if (month) {
      month.totalDividends += payment.dividendAmount;
      month.frankingCredits += payment.frankingCredit;
      month.payments.push(payment);
    }
  }
  
  // Calculate unique company counts per month
  for (const month of months) {
    const uniqueCompanies = new Set(month.payments.map(p => p.asxCode || p.companyName));
    month.companyCount = uniqueCompanies.size;
  }
  
  return months;
}

// ============================================================================
// CHART DATA GENERATION
// ============================================================================

/**
 * Generate comprehensive chart data from dividend payments
 */
export function generateChartData(
  allPayments: DividendPayment[],
  currentFinancialYear: string
): DividendChartData {
  // Group by financial year
  const byYear = new Map<string, DividendPayment[]>();
  for (const payment of allPayments) {
    const fy = payment.taxYear || getFinancialYear(new Date(payment.dateReceived));
    if (!byYear.has(fy)) {
      byYear.set(fy, []);
    }
    byYear.get(fy)!.push(payment);
  }
  
  // Annual data
  const annualData = Array.from(byYear.entries())
    .map(([fy, payments]) => {
      const companies = new Set(payments.map(p => p.asxCode || p.companyName));
      return {
        financialYear: fy,
        dividends: payments.reduce((sum, p) => sum + p.dividendAmount, 0),
        frankingCredits: payments.reduce((sum, p) => sum + p.frankingCredit, 0),
        companyCount: companies.size,
      };
    })
    .sort((a, b) => a.financialYear.localeCompare(b.financialYear));
  
  // Company distribution for current FY
  const currentFyPayments = byYear.get(currentFinancialYear) || [];
  const companyTotals = new Map<string, { name: string; asxCode?: string; amount: number }>();
  
  for (const payment of currentFyPayments) {
    const key = payment.asxCode || payment.companyName;
    const existing = companyTotals.get(key);
    if (existing) {
      existing.amount += payment.dividendAmount;
    } else {
      companyTotals.set(key, {
        name: payment.companyName,
        asxCode: payment.asxCode,
        amount: payment.dividendAmount,
      });
    }
  }
  
  const totalDividends = currentFyPayments.reduce((sum, p) => sum + p.dividendAmount, 0);
  const companyDistribution = Array.from(companyTotals.values())
    .map(c => ({
      companyName: c.name,
      asxCode: c.asxCode,
      amount: c.amount,
      percentage: totalDividends > 0 ? Math.round((c.amount / totalDividends) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // Franking breakdown
  const frankedAmount = currentFyPayments.reduce((sum, p) => {
    const calc = calculateFrankingFromDividend(p.dividendAmount, p.frankingPercentage);
    return sum + calc.frankedAmount;
  }, 0);
  
  const frankingBreakdown = {
    franked: frankedAmount,
    unfranked: totalDividends - frankedAmount,
    frankingCredits: currentFyPayments.reduce((sum, p) => sum + p.frankingCredit, 0),
  };
  
  // Monthly timeline
  const monthlyTimeline = generateMonthlyBreakdown(currentFyPayments, currentFinancialYear);
  
  // Cumulative growth
  const sortedPayments = [...allPayments].sort((a, b) => 
    new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
  );
  
  const cumulativeGrowth: { date: string; cumulativeAmount: number }[] = [];
  let cumulative = 0;
  for (const payment of sortedPayments) {
    cumulative += payment.dividendAmount;
    cumulativeGrowth.push({
      date: payment.dateReceived,
      cumulativeAmount: Math.round(cumulative * 100) / 100,
    });
  }
  
  return {
    annualData,
    companyDistribution,
    frankingBreakdown,
    monthlyTimeline,
    cumulativeGrowth,
  };
}

// ============================================================================
// UPCOMING DIVIDENDS
// ============================================================================

/**
 * Generate list of upcoming expected dividend payments
 */
export function generateUpcomingDividends(
  companies: CompanyDividendSummary[],
  lookAheadDays: number = 90
): UpcomingDividend[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + lookAheadDays);
  
  const upcoming: UpcomingDividend[] = [];
  
  for (const company of companies) {
    if (!company.nextExpectedPayment) continue;
    
    const nextDate = new Date(company.nextExpectedPayment.estimatedDate);
    if (nextDate >= today && nextDate <= futureDate) {
      const frankingPct = company.totalFrankingCredits > 0 
        ? Math.round((company.totalFrankingCredits / (company.totalDividends * 0.3 / 0.7)) * 100) 
        : 0;
      
      upcoming.push({
        companyId: company.id,
        companyName: company.companyName,
        asxCode: company.asxCode,
        estimatedPaymentDate: company.nextExpectedPayment.estimatedDate,
        estimatedAmount: company.nextExpectedPayment.estimatedAmount,
        estimatedFrankingCredits: Math.round(company.nextExpectedPayment.estimatedAmount * frankingPct / 100 * 0.3 / 0.7 * 100) / 100,
        estimatedFrankingPercentage: frankingPct,
        confidence: company.nextExpectedPayment.confidence,
        basedOn: {
          lastPaymentDate: company.lastPaymentDate,
          lastAmount: company.averageDividend,
          frequency: company.paymentFrequency,
        },
      });
    }
  }
  
  return upcoming.sort((a, b) => 
    new Date(a.estimatedPaymentDate).getTime() - new Date(b.estimatedPaymentDate).getTime()
  );
}

// ============================================================================
// OVERVIEW CALCULATION
// ============================================================================

/**
 * Calculate dividend tracker overview statistics
 */
export function calculateOverview(
  allPayments: DividendPayment[],
  currentFinancialYear: string
): DividendTrackerOverview {
  // Current FY payments
  const currentFyPayments = allPayments.filter(p => 
    (p.taxYear || getFinancialYear(new Date(p.dateReceived))) === currentFinancialYear
  );
  
  // Previous FY payments
  const [startYearStr] = currentFinancialYear.split('-');
  const startYear = parseInt(startYearStr);
  const previousFinancialYear = `${startYear - 1}-${startYear}`;
  const previousFyPayments = allPayments.filter(p => 
    (p.taxYear || getFinancialYear(new Date(p.dateReceived))) === previousFinancialYear
  );
  
  const totalDividends = currentFyPayments.reduce((sum, p) => sum + p.dividendAmount, 0);
  const totalFrankingCredits = currentFyPayments.reduce((sum, p) => sum + p.frankingCredit, 0);
  const previousYearDividends = previousFyPayments.reduce((sum, p) => sum + p.dividendAmount, 0);
  
  // Unique companies in current FY
  const currentCompanies = new Set(currentFyPayments.map(p => p.asxCode || p.companyName));
  const allCompanies = new Set(allPayments.map(p => p.asxCode || p.companyName));
  
  // Calculate YoY growth
  let yearOverYearGrowth = 0;
  if (previousYearDividends > 0) {
    yearOverYearGrowth = Math.round(((totalDividends - previousYearDividends) / previousYearDividends) * 1000) / 10;
  }
  
  return {
    currentFinancialYear,
    totalDividends,
    totalFrankingCredits,
    totalGrossedUpDividends: totalDividends + totalFrankingCredits,
    dividendPayingHoldings: currentCompanies.size,
    averageDividendPerHolding: currentCompanies.size > 0 ? totalDividends / currentCompanies.size : 0,
    yearOverYearGrowth,
    previousYearDividends,
    allTimeTotalDividends: allPayments.reduce((sum, p) => sum + p.dividendAmount, 0),
    allTimeTotalFrankingCredits: allPayments.reduce((sum, p) => sum + p.frankingCredit, 0),
    totalCompanies: allCompanies.size,
  };
}

// ============================================================================
// ANNUAL SUMMARY
// ============================================================================

/**
 * Generate comprehensive annual summary
 */
export function generateAnnualSummary(
  payments: DividendPayment[],
  financialYear: string,
  previousYearPayments?: DividendPayment[]
): AnnualDividendSummary {
  const fyPayments = payments.filter(p => 
    (p.taxYear || getFinancialYear(new Date(p.dateReceived))) === financialYear
  );
  
  const totalDividends = fyPayments.reduce((sum, p) => sum + p.dividendAmount, 0);
  const totalFrankingCredits = fyPayments.reduce((sum, p) => sum + p.frankingCredit, 0);
  
  // Calculate franked/unfranked
  const frankedAmount = fyPayments.reduce((sum, p) => {
    const calc = calculateFrankingFromDividend(p.dividendAmount, p.frankingPercentage);
    return sum + calc.frankedAmount;
  }, 0);
  
  const companies = aggregateCompanies(fyPayments);
  const monthlyBreakdown = generateMonthlyBreakdown(fyPayments, financialYear);
  
  let previousYear: AnnualDividendSummary['previousYear'] = undefined;
  if (previousYearPayments) {
    const prevTotal = previousYearPayments.reduce((sum, p) => sum + p.dividendAmount, 0);
    const growthRate = prevTotal > 0 ? ((totalDividends - prevTotal) / prevTotal) * 100 : 0;
    
    const [startYearStr] = financialYear.split('-');
    const startYear = parseInt(startYearStr);
    
    previousYear = {
      financialYear: `${startYear - 1}-${startYear}`,
      totalDividends: prevTotal,
      growthRate: Math.round(growthRate * 10) / 10,
    };
  }
  
  return {
    financialYear,
    totalDividends,
    totalFrankingCredits,
    totalGrossedUpDividends: totalDividends + totalFrankingCredits,
    totalFrankedAmount: frankedAmount,
    totalUnfrankedAmount: totalDividends - frankedAmount,
    companyCount: companies.length,
    paymentCount: fyPayments.length,
    monthlyBreakdown,
    companySummaries: companies,
    previousYear,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export dividend data to CSV format
 */
export function exportDividendsToCSV(
  payments: DividendPayment[],
  includeHeaders: boolean = true
): string {
  const headers = [
    'Date',
    'Company',
    'ASX Code',
    'Dividend Amount',
    'Franking %',
    'Franking Credits',
    'Grossed-Up Amount',
    'Shares Held',
    'DPS',
    'Financial Year',
    'Source',
  ];
  
  const rows = payments.map(p => [
    p.dateReceived,
    `"${p.companyName}"`,
    p.asxCode || '',
    p.dividendAmount.toFixed(2),
    p.frankingPercentage.toFixed(1),
    p.frankingCredit.toFixed(2),
    p.grossedUpDividend.toFixed(2),
    p.sharesHeld,
    p.dividendPerShare.toFixed(4),
    p.taxYear,
    p.source,
  ]);
  
  if (includeHeaders) {
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
  return rows.map(r => r.join(',')).join('\n');
}

/**
 * Export annual summary for tax filing
 */
export function exportAnnualSummaryForTax(summary: AnnualDividendSummary): string {
  const lines = [
    `Dividend Income Summary - Financial Year ${summary.financialYear}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    'SUMMARY',
    `Total Dividends Received:,${summary.totalDividends.toFixed(2)}`,
    `Total Franking Credits:,${summary.totalFrankingCredits.toFixed(2)}`,
    `Total Grossed-Up Dividends:,${summary.totalGrossedUpDividends.toFixed(2)}`,
    `Total Franked Amount:,${summary.totalFrankedAmount.toFixed(2)}`,
    `Total Unfranked Amount:,${summary.totalUnfrankedAmount.toFixed(2)}`,
    '',
    'COMPANY BREAKDOWN',
    'Company,ASX Code,Total Dividends,Franking Credits,Payment Pattern',
    ...summary.companySummaries.map(c => 
      `"${c.companyName}",${c.asxCode || ''},${c.totalDividends.toFixed(2)},${c.totalFrankingCredits.toFixed(2)},"${c.paymentPattern}"`
    ),
    '',
    'MONTHLY BREAKDOWN',
    'Month,Total Dividends,Franking Credits,Payments',
    ...summary.monthlyBreakdown.map(m => 
      `${m.monthName},${m.totalDividends.toFixed(2)},${m.frankingCredits.toFixed(2)},${m.payments.length}`
    ),
  ];
  
  return lines.join('\n');
}

// ============================================================================
// PATTERN DETECTION INTEGRATION
// ============================================================================

/**
 * Detect patterns for all companies from dividend payments
 * Uses the ML-based pattern detection engine
 */
export function detectCompanyPatterns(payments: DividendPayment[]): Map<string, DividendPattern> {
  const patterns = new Map<string, DividendPattern>();
  
  // Group payments by company
  const companyPayments = new Map<string, DividendPayment[]>();
  
  for (const payment of payments) {
    const key = payment.asxCode || payment.companyName.toUpperCase().trim();
    if (!companyPayments.has(key)) {
      companyPayments.set(key, []);
    }
    companyPayments.get(key)!.push(payment);
  }
  
  // Detect patterns for each company
  for (const [key, companyPaymentsList] of companyPayments) {
    if (companyPaymentsList.length < 2) continue;
    
    const paymentRecords = companyPaymentsList.map(p => ({
      id: p.id || 0,
      companyName: p.companyName,
      asxCode: p.asxCode,
      dividendAmount: p.dividendAmount,
      frankingPercentage: p.frankingPercentage,
      dateReceived: p.dateReceived,
      taxYear: p.taxYear,
    }));
    
    const pattern = detectPattern(paymentRecords);
    if (pattern) {
      patterns.set(key, pattern);
    }
  }
  
  return patterns;
}

/**
 * Enhance company summaries with pattern data
 */
export function enhanceWithPatterns(
  summaries: CompanyDividendSummary[],
  patterns: Map<string, DividendPattern>
): CompanyDividendSummary[] {
  return summaries.map(summary => {
    const key = summary.asxCode || summary.companyName.toUpperCase().trim();
    const pattern = patterns.get(key);
    
    if (pattern) {
      return {
        ...summary,
        paymentFrequency: pattern.frequency as PaymentFrequency,
        paymentPattern: pattern.detectedPattern,
        nextExpectedPayment: pattern.nextExpectedPayment ? {
          estimatedDate: pattern.nextExpectedPayment.estimatedDate,
          estimatedAmount: pattern.nextExpectedPayment.estimatedAmount,
          confidence: pattern.nextExpectedPayment.confidence as 'high' | 'medium' | 'low',
        } : summary.nextExpectedPayment,
      };
    }
    
    return summary;
  });
}

/**
 * Export pattern data for alerts (TAL-142 integration)
 */
export function exportPatternDataForAlerts(patterns: DividendPattern[]): {
  holdingId: string;
  asxCode?: string;
  companyName: string;
  frequency: PaymentFrequency;
  nextExpectedDate?: string;
  nextExpectedAmount?: number;
  confidence: PatternConfidence;
}[] {
  return patterns.map(pattern => ({
    holdingId: pattern.id,
    asxCode: pattern.asxCode,
    companyName: pattern.companyName,
    frequency: pattern.frequency as PaymentFrequency,
    nextExpectedDate: pattern.nextExpectedPayment?.estimatedDate,
    nextExpectedAmount: pattern.nextExpectedPayment?.estimatedAmount,
    confidence: pattern.confidence,
  }));
}

/**
 * Get pattern summary for dashboard
 */
export function getPatternSummary(patterns: DividendPattern[]): {
  totalPatterns: number;
  byFrequency: Record<PaymentFrequency, number>;
  byConfidence: Record<PatternConfidence, number>;
  averageConfidence: number;
  highConfidencePatterns: DividendPattern[];
  upcomingPayments: number;
} {
  const byFrequency: Record<PaymentFrequency, number> = {
    monthly: 0,
    quarterly: 0,
    'half-yearly': 0,
    yearly: 0,
    irregular: 0,
    unknown: 0,
  };
  
  const byConfidence: Record<PatternConfidence, number> = {
    high: 0,
    medium: 0,
    low: 0,
    uncertain: 0,
  };
  
  let totalConfidence = 0;
  let upcomingPayments = 0;
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 90);
  
  for (const pattern of patterns) {
    byFrequency[pattern.frequency as PaymentFrequency]++;
    byConfidence[pattern.confidence]++;
    totalConfidence += pattern.confidenceScore;
    
    if (pattern.nextExpectedPayment) {
      const nextDate = new Date(pattern.nextExpectedPayment.estimatedDate);
      if (nextDate >= today && nextDate <= futureDate) {
        upcomingPayments++;
      }
    }
  }
  
  return {
    totalPatterns: patterns.length,
    byFrequency,
    byConfidence,
    averageConfidence: patterns.length > 0 ? Math.round(totalConfidence / patterns.length) : 0,
    highConfidencePatterns: patterns.filter(p => p.confidence === 'high'),
    upcomingPayments,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Filter dividend payments based on criteria
 */
export function filterDividends(
  payments: DividendPayment[],
  filters: DividendFilterOptions
): DividendPayment[] {
  return payments.filter(p => {
    if (filters.financialYear && p.taxYear !== filters.financialYear) return false;
    if (filters.companyId && p.asxCode !== filters.companyId && p.companyName !== filters.companyId) return false;
    if (filters.startDate && p.dateReceived < filters.startDate) return false;
    if (filters.endDate && p.dateReceived > filters.endDate) return false;
    if (filters.minAmount && p.dividendAmount < filters.minAmount) return false;
    if (filters.maxAmount && p.dividendAmount > filters.maxAmount) return false;
    if (filters.frankedOnly && p.frankingPercentage <= 0) return false;
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchable = `${p.companyName} ${p.asxCode || ''}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });
}

/**
 * Format currency for display
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
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get frequency badge color
 */
export function getFrequencyColor(frequency: PaymentFrequency): string {
  const colors: Record<PaymentFrequency, string> = {
    monthly: 'bg-blue-500',
    quarterly: 'bg-green-500',
    'half-yearly': 'bg-amber-500',
    yearly: 'bg-purple-500',
    irregular: 'bg-gray-500',
    unknown: 'bg-gray-400',
  };
  return colors[frequency];
}

/**
 * Get frequency label
 */
export function getFrequencyLabel(frequency: PaymentFrequency): string {
  const labels: Record<PaymentFrequency, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    'half-yearly': 'Half-Yearly',
    yearly: 'Yearly',
    irregular: 'Irregular',
    unknown: 'Unknown',
  };
  return labels[frequency];
}

/**
 * Calculate year-over-year growth rate
 * @param currentYearAmount Current year dividend total
 * @param previousYearAmount Previous year dividend total
 * @returns Growth rate as a percentage (e.g., 25 for 25% growth)
 */
export function calculateYearOverYearGrowth(
  currentYearAmount: number,
  previousYearAmount: number
): number {
  if (previousYearAmount <= 0) return 0;
  return ((currentYearAmount - previousYearAmount) / previousYearAmount) * 100;
}

/**
 * Group dividend payments by company name
 * @param payments Array of dividend payments
 * @returns Object with company names as keys and arrays of payments as values
 */
export function groupPaymentsByCompany(
  payments: DividendPayment[]
): Record<string, DividendPayment[]> {
  const grouped: Record<string, DividendPayment[]> = {};

  for (const payment of payments) {
    const key = payment.companyName;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(payment);
  }

  return grouped;
}
