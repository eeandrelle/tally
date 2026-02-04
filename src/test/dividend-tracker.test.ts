/**
 * Dividend Tracker Tests
 * 
 * Comprehensive test suite for dividend tracker functionality:
 * - Data aggregation and calculations
 * - Company summary generation
 * - Chart data generation
 * - Tax summary calculations
 * - Export functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { DividendPayment, CompanyDividendSummary, AnnualDividendSummary } from '@/lib/dividend-tracker';
import {
  aggregateCompanies,
  generateMonthlyBreakdown,
  generateChartData,
  calculateOverview,
  generateAnnualSummary,
  filterDividends,
  exportDividendsToCSV,
  formatCurrency,
  detectPaymentFrequency,
  calculateYearOverYearGrowth,
  groupPaymentsByCompany,
} from '@/lib/dividend-tracker';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockDividendPayments: DividendPayment[] = [
  {
    id: 1,
    companyName: 'Commonwealth Bank',
    asxCode: 'CBA',
    dividendAmount: 2500,
    frankingPercentage: 100,
    frankingCredit: 1071.43,
    grossedUpDividend: 3571.43,
    dateReceived: '2024-02-15',
    taxYear: '2023-2024',
    sharesHeld: 100,
    dividendPerShare: 25.00,
    source: 'manual',
  },
  {
    id: 2,
    companyName: 'Commonwealth Bank',
    asxCode: 'CBA',
    dividendAmount: 2500,
    frankingPercentage: 100,
    frankingCredit: 1071.43,
    grossedUpDividend: 3571.43,
    dateReceived: '2024-08-15',
    taxYear: '2023-2024',
    sharesHeld: 100,
    dividendPerShare: 25.00,
    source: 'manual',
  },
  {
    id: 3,
    companyName: 'BHP Group',
    asxCode: 'BHP',
    dividendAmount: 1800,
    frankingPercentage: 100,
    frankingCredit: 771.43,
    grossedUpDividend: 2571.43,
    dateReceived: '2024-03-20',
    taxYear: '2023-2024',
    sharesHeld: 50,
    dividendPerShare: 36.00,
    source: 'manual',
  },
  {
    id: 4,
    companyName: 'BHP Group',
    asxCode: 'BHP',
    dividendAmount: 1500,
    frankingPercentage: 100,
    frankingCredit: 642.86,
    grossedUpDividend: 2142.86,
    dateReceived: '2024-09-20',
    taxYear: '2023-2024',
    sharesHeld: 50,
    dividendPerShare: 30.00,
    source: 'manual',
  },
  {
    id: 5,
    companyName: 'Wesfarmers',
    asxCode: 'WES',
    dividendAmount: 800,
    frankingPercentage: 0,
    frankingCredit: 0,
    grossedUpDividend: 800,
    dateReceived: '2024-04-10',
    taxYear: '2023-2024',
    sharesHeld: 40,
    dividendPerShare: 20.00,
    source: 'manual',
  },
  {
    id: 6,
    companyName: 'Wesfarmers',
    asxCode: 'WES',
    dividendAmount: 900,
    frankingPercentage: 50,
    frankingCredit: 192.86,
    grossedUpDividend: 1092.86,
    dateReceived: '2024-10-10',
    taxYear: '2023-2024',
    sharesHeld: 40,
    dividendPerShare: 22.50,
    source: 'manual',
  },
  // Previous year payments for YoY comparison
  {
    id: 7,
    companyName: 'Commonwealth Bank',
    asxCode: 'CBA',
    dividendAmount: 2200,
    frankingPercentage: 100,
    frankingCredit: 942.86,
    grossedUpDividend: 3142.86,
    dateReceived: '2023-02-15',
    taxYear: '2022-2023',
    sharesHeld: 90,
    dividendPerShare: 24.44,
    source: 'manual',
  },
  {
    id: 8,
    companyName: 'Commonwealth Bank',
    asxCode: 'CBA',
    dividendAmount: 2200,
    frankingPercentage: 100,
    frankingCredit: 942.86,
    grossedUpDividend: 3142.86,
    dateReceived: '2023-08-15',
    taxYear: '2022-2023',
    sharesHeld: 90,
    dividendPerShare: 24.44,
    source: 'manual',
  },
];

// ============================================================================
// FORMAT CURRENCY TESTS
// ============================================================================

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1500.50)).toBe('$1,500.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-1000)).toBe('-$1,000.00');
    expect(formatCurrency(-500.25)).toBe('-$500.25');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
  });

  it('should handle small numbers', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
    expect(formatCurrency(0.99)).toBe('$0.99');
  });
});

// ============================================================================
// COMPANY AGGREGATION TESTS
// ============================================================================

describe('aggregateCompanies', () => {
  it('should aggregate payments by company', () => {
    const companies = aggregateCompanies(mockDividendPayments);
    
    expect(companies).toHaveLength(3);
    
    const cba = companies.find(c => c.asxCode === 'CBA');
    expect(cba).toBeDefined();
    expect(cba?.totalDividends).toBe(9400); // 2500+2500+2200+2200 across both years
    expect(cba?.dividendCount).toBe(4);
  });

  it('should calculate franking credits correctly', () => {
    const companies = aggregateCompanies(mockDividendPayments);
    
    const cba = companies.find(c => c.asxCode === 'CBA');
    expect(cba?.totalFrankingCredits).toBeCloseTo(4028.58, 2);
    expect(cba?.totalFrankedAmount).toBe(9400);
    expect(cba?.totalUnfrankedAmount).toBe(0);
  });

  it('should detect payment frequency', () => {
    const companies = aggregateCompanies(mockDividendPayments);
    
    const cba = companies.find(c => c.asxCode === 'CBA');
    expect(cba?.paymentFrequency).toBe('half-yearly');
    
    const bhp = companies.find(c => c.asxCode === 'BHP');
    expect(bhp?.paymentFrequency).toBe('half-yearly');
  });

  it('should calculate average dividend correctly', () => {
    const companies = aggregateCompanies(mockDividendPayments);
    
    const wes = companies.find(c => c.asxCode === 'WES');
    expect(wes?.averageDividend).toBe(850); // (800 + 900) / 2
  });

  it('should identify first and last payment dates', () => {
    const companies = aggregateCompanies(mockDividendPayments);
    
    const cba = companies.find(c => c.asxCode === 'CBA');
    expect(cba?.firstPaymentDate).toBe('2023-02-15');
    expect(cba?.lastPaymentDate).toBe('2024-08-15');
  });
});

// ============================================================================
// MONTHLY BREAKDOWN TESTS
// ============================================================================

describe('generateMonthlyBreakdown', () => {
  it('should group payments by month', () => {
    const fy2024Payments = mockDividendPayments.filter(p => p.taxYear === '2023-2024');
    const breakdown = generateMonthlyBreakdown(fy2024Payments, '2023-2024');
    
    // Check that we have 12 months
    expect(breakdown).toHaveLength(12);
    
    // Check February has CBA payment
    const feb = breakdown.find(b => b.month === '2024-02');
    expect(feb?.totalDividends).toBe(2500);
    expect(feb?.payments).toHaveLength(1);
  });

  it('should calculate monthly franking credits', () => {
    const fy2024Payments = mockDividendPayments.filter(p => p.taxYear === '2023-2024');
    const breakdown = generateMonthlyBreakdown(fy2024Payments, '2023-2024');
    
    const feb = breakdown.find(b => b.month === '2024-02');
    expect(feb?.frankingCredits).toBeCloseTo(1071.43, 2);
  });

  it('should handle months with no payments', () => {
    const fy2024Payments = mockDividendPayments.filter(p => p.taxYear === '2023-2024');
    const breakdown = generateMonthlyBreakdown(fy2024Payments, '2023-2024');
    
    const jan = breakdown.find(b => b.month === '2024-01');
    expect(jan?.totalDividends).toBe(0);
    expect(jan?.payments).toHaveLength(0);
  });
});

// ============================================================================
// CHART DATA TESTS
// ============================================================================

describe('generateChartData', () => {
  it('should generate annual data', () => {
    const chartData = generateChartData(mockDividendPayments, '2023-2024');
    
    expect(chartData.annualData).toBeDefined();
    expect(chartData.annualData.length).toBeGreaterThanOrEqual(2);
    
    const fy2024 = chartData.annualData.find(a => a.financialYear === '2023-2024');
    expect(fy2024?.dividends).toBe(10000); // Sum of all FY2024 payments
    expect(fy2024?.companyCount).toBe(3);
  });

  it('should generate company distribution', () => {
    const chartData = generateChartData(mockDividendPayments, '2023-2024');
    
    expect(chartData.companyDistribution).toBeDefined();
    expect(chartData.companyDistribution.length).toBe(3);
    
    const cba = chartData.companyDistribution.find(c => c.asxCode === 'CBA');
    expect(cba?.amount).toBe(5000); // FY2024 only: 2500 + 2500
  });

  it('should generate franking breakdown', () => {
    const chartData = generateChartData(mockDividendPayments, '2023-2024');
    
    expect(chartData.frankingBreakdown).toBeDefined();
    expect(chartData.frankingBreakdown.franked).toBeGreaterThan(0);
    expect(chartData.frankingBreakdown.unfranked).toBeGreaterThanOrEqual(0);
  });

  it('should calculate percentages correctly', () => {
    const chartData = generateChartData(mockDividendPayments, '2023-2024');
    
    const total = chartData.companyDistribution.reduce((sum, c) => sum + c.amount, 0);
    const cba = chartData.companyDistribution.find(c => c.asxCode === 'CBA');
    
    if (cba && total > 0) {
      expect(cba.percentage).toBeCloseTo((cba.amount / total) * 100, 1);
    }
  });
});

// ============================================================================
// OVERVIEW CALCULATION TESTS
// ============================================================================

describe('calculateOverview', () => {
  it('should calculate current FY totals', () => {
    const overview = calculateOverview(mockDividendPayments, '2023-2024');
    
    expect(overview.totalDividends).toBe(10000);
    expect(overview.dividendPayingHoldings).toBe(3);
    expect(overview.currentFinancialYear).toBe('2023-2024');
  });

  it('should calculate franking credits', () => {
    const overview = calculateOverview(mockDividendPayments, '2023-2024');
    
    // Sum of all franking credits in FY2024
    expect(overview.totalFrankingCredits).toBeGreaterThan(0);
  });

  it('should calculate grossed-up dividends', () => {
    const overview = calculateOverview(mockDividendPayments, '2023-2024');
    
    expect(overview.totalGrossedUpDividends).toBe(
      overview.totalDividends + overview.totalFrankingCredits
    );
  });

  it('should calculate YoY growth', () => {
    const overview = calculateOverview(mockDividendPayments, '2023-2024');
    
    expect(overview.yearOverYearGrowth).toBeGreaterThan(0); // FY2024 > FY2023
    expect(overview.previousYearDividends).toBe(4400); // 2200 + 2200
  });

  it('should calculate all-time totals', () => {
    const overview = calculateOverview(mockDividendPayments, '2023-2024');
    
    expect(overview.allTimeTotalDividends).toBe(14400); // Sum of all payments
    expect(overview.totalCompanies).toBe(3);
  });
});

// ============================================================================
// ANNUAL SUMMARY TESTS
// ============================================================================

describe('generateAnnualSummary', () => {
  it('should generate complete annual summary', () => {
    const summary = generateAnnualSummary(mockDividendPayments, '2023-2024');
    
    expect(summary.financialYear).toBe('2023-2024');
    expect(summary.totalDividends).toBe(10000);
    expect(summary.companyCount).toBe(3);
    expect(summary.paymentCount).toBe(6); // FY2024 payments only
  });

  it('should include monthly breakdown', () => {
    const summary = generateAnnualSummary(mockDividendPayments, '2023-2024');
    
    expect(summary.monthlyBreakdown).toHaveLength(12);
  });

  it('should include company summaries', () => {
    const summary = generateAnnualSummary(mockDividendPayments, '2023-2024');
    
    expect(summary.companySummaries).toHaveLength(3);
    
    const cba = summary.companySummaries.find(c => c.asxCode === 'CBA');
    expect(cba?.totalDividends).toBe(5000); // FY2024 only
  });

  it('should include previous year comparison', () => {
    const fy2024Payments = mockDividendPayments.filter(p => p.taxYear === '2023-2024');
    const fy2023Payments = mockDividendPayments.filter(p => p.taxYear === '2022-2023');
    
    const summary = generateAnnualSummary(fy2024Payments, '2023-2024', fy2023Payments);
    
    expect(summary.previousYear).toBeDefined();
    expect(summary.previousYear?.financialYear).toBe('2022-2023');
    expect(summary.previousYear?.totalDividends).toBe(4400);
    expect(summary.previousYear?.growthRate).toBeGreaterThan(0);
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

describe('filterDividends', () => {
  it('should filter by company id (ASX code)', () => {
    const filtered = filterDividends(mockDividendPayments, { companyId: 'CBA' });
    
    expect(filtered).toHaveLength(4); // All CBA payments
    expect(filtered.every(p => p.asxCode === 'CBA')).toBe(true);
  });

  it('should filter by company id (name)', () => {
    const filtered = filterDividends(mockDividendPayments, { companyId: 'Commonwealth Bank' });
    
    expect(filtered).toHaveLength(4); // All CBA payments
    expect(filtered.every(p => p.companyName === 'Commonwealth Bank')).toBe(true);
  });

  it('should filter by date range', () => {
    const filtered = filterDividends(mockDividendPayments, {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
    });
    
    expect(filtered.every(p => {
      const date = new Date(p.dateReceived);
      return date >= new Date('2024-01-01') && date <= new Date('2024-06-30');
    })).toBe(true);
  });

  it('should filter by franking status', () => {
    const filtered = filterDividends(mockDividendPayments, { frankedOnly: true });
    
    expect(filtered.every(p => p.frankingPercentage > 0)).toBe(true);
  });

  it('should filter by minimum amount', () => {
    const filtered = filterDividends(mockDividendPayments, { minAmount: 2000 });
    
    expect(filtered.every(p => p.dividendAmount >= 2000)).toBe(true);
  });

  it('should combine multiple filters', () => {
    const filtered = filterDividends(mockDividendPayments, {
      companyId: 'CBA',
      frankedOnly: true,
      financialYear: '2023-2024',
    });
    
    expect(filtered).toHaveLength(2); // Only FY2024 CBA payments
  });
});

// ============================================================================
// EXPORT TESTS
// ============================================================================

describe('exportDividendsToCSV', () => {
  it('should generate CSV header', () => {
    const csv = exportDividendsToCSV(mockDividendPayments);
    
    expect(csv).toContain('Date');
    expect(csv).toContain('Company');
    expect(csv).toContain('ASX Code');
    expect(csv).toContain('Dividend Amount');
    expect(csv).toContain('Franking %');
    expect(csv).toContain('Franking Credits');
  });

  it('should include all payment data', () => {
    const csv = exportDividendsToCSV(mockDividendPayments);
    
    expect(csv).toContain('Commonwealth Bank');
    expect(csv).toContain('CBA');
    expect(csv).toContain('2500');
  });

  it('should handle empty data', () => {
    const csv = exportDividendsToCSV([]);
    
    expect(csv).toContain('Date'); // Header still present
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    expect(lines.length).toBe(1); // Header only
  });
});

// ============================================================================
// PAYMENT FREQUENCY TESTS
// ============================================================================

describe('detectPaymentFrequency', () => {
  it('should detect half-yearly pattern', () => {
    const dates = ['2024-02-15', '2024-08-15', '2023-02-15', '2023-08-15'];
    const frequency = detectPaymentFrequency(dates);
    
    expect(frequency).toBe('half-yearly');
  });

  it('should detect quarterly pattern', () => {
    const dates = ['2024-01-15', '2024-04-15', '2024-07-15', '2024-10-15'];
    const frequency = detectPaymentFrequency(dates);
    
    expect(frequency).toBe('quarterly');
  });

  it('should detect annual pattern', () => {
    const dates = ['2022-08-15', '2023-08-15', '2024-08-15'];
    const frequency = detectPaymentFrequency(dates);
    
    expect(frequency).toBe('yearly');
  });

  it('should return irregular for inconsistent dates', () => {
    const dates = ['2024-01-15', '2024-03-20', '2024-08-10'];
    const frequency = detectPaymentFrequency(dates);
    
    expect(frequency).toBe('irregular');
  });

  it('should return irregular for single payment', () => {
    const dates = ['2024-08-15'];
    const frequency = detectPaymentFrequency(dates);
    
    expect(frequency).toBe('irregular');
  });
});

// ============================================================================
// YoY GROWTH TESTS
// ============================================================================

describe('calculateYearOverYearGrowth', () => {
  it('should calculate positive growth', () => {
    const growth = calculateYearOverYearGrowth(10000, 8000);
    
    expect(growth).toBe(25); // (10000 - 8000) / 8000 * 100
  });

  it('should calculate negative growth', () => {
    const growth = calculateYearOverYearGrowth(8000, 10000);
    
    expect(growth).toBe(-20); // (8000 - 10000) / 10000 * 100
  });

  it('should handle zero previous year', () => {
    const growth = calculateYearOverYearGrowth(10000, 0);
    
    expect(growth).toBe(0); // Cannot calculate growth
  });

  it('should handle same values', () => {
    const growth = calculateYearOverYearGrowth(10000, 10000);
    
    expect(growth).toBe(0);
  });
});

// ============================================================================
// GROUP BY COMPANY TESTS
// ============================================================================

describe('groupPaymentsByCompany', () => {
  it('should group payments by company name', () => {
    const grouped = groupPaymentsByCompany(mockDividendPayments);
    
    expect(Object.keys(grouped)).toHaveLength(3);
    expect(grouped['Commonwealth Bank']).toHaveLength(4);
    expect(grouped['BHP Group']).toHaveLength(2);
    expect(grouped['Wesfarmers']).toHaveLength(2);
  });

  it('should maintain payment data integrity', () => {
    const grouped = groupPaymentsByCompany(mockDividendPayments);
    
    const cbaPayments = grouped['Commonwealth Bank'];
    expect(cbaPayments[0].asxCode).toBe('CBA');
    expect(cbaPayments.every(p => p.companyName === 'Commonwealth Bank')).toBe(true);
  });
});
