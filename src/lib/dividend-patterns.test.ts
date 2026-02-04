/**
 * Dividend Pattern Detection Tests
 * 
 * Tests for the ML-based pattern detection engine
 */

import { describe, it, expect } from 'vitest';
import {
  detectPattern,
  analyzePatterns,
  groupPaymentsByHolding,
  generateExpectedDividends,
  generateExpectedDividendCalendar,
  generateTestPayments,
  exportPatternsToJSON,
  exportPatternsToCSV,
  type DividendPaymentRecord,
} from './dividend-patterns';

describe('Dividend Pattern Detection', () => {
  describe('detectPattern', () => {
    it('should detect quarterly pattern for CBA', () => {
      const payments: DividendPaymentRecord[] = [
        { id: 1, companyName: 'Commonwealth Bank', asxCode: 'CBA', dividendAmount: 200, frankingPercentage: 100, dateReceived: '2023-03-15' },
        { id: 2, companyName: 'Commonwealth Bank', asxCode: 'CBA', dividendAmount: 220, frankingPercentage: 100, dateReceived: '2023-06-15' },
        { id: 3, companyName: 'Commonwealth Bank', asxCode: 'CBA', dividendAmount: 210, frankingPercentage: 100, dateReceived: '2023-09-15' },
        { id: 4, companyName: 'Commonwealth Bank', asxCode: 'CBA', dividendAmount: 230, frankingPercentage: 100, dateReceived: '2023-12-15' },
      ];

      const pattern = detectPattern(payments);

      expect(pattern).not.toBeNull();
      expect(pattern!.frequency).toBe('quarterly');
      expect(pattern!.confidenceScore).toBeGreaterThan(50);
      expect(pattern!.paymentsAnalyzed).toBe(4);
    });

    it('should detect monthly pattern', () => {
      const payments: DividendPaymentRecord[] = [
        { id: 1, companyName: 'Monthly REIT', dividendAmount: 100, frankingPercentage: 0, dateReceived: '2023-01-15' },
        { id: 2, companyName: 'Monthly REIT', dividendAmount: 105, frankingPercentage: 0, dateReceived: '2023-02-15' },
        { id: 3, companyName: 'Monthly REIT', dividendAmount: 102, frankingPercentage: 0, dateReceived: '2023-03-15' },
        { id: 4, companyName: 'Monthly REIT', dividendAmount: 108, frankingPercentage: 0, dateReceived: '2023-04-15' },
        { id: 5, companyName: 'Monthly REIT', dividendAmount: 110, frankingPercentage: 0, dateReceived: '2023-05-15' },
        { id: 6, companyName: 'Monthly REIT', dividendAmount: 115, frankingPercentage: 0, dateReceived: '2023-06-15' },
      ];

      const pattern = detectPattern(payments);

      expect(pattern).not.toBeNull();
      expect(pattern!.frequency).toBe('monthly');
      expect(pattern!.confidence).toBe('high');
    });

    it('should return null for empty payments', () => {
      const pattern = detectPattern([]);
      expect(pattern).toBeNull();
    });

    it('should calculate correct statistics', () => {
      const payments: DividendPaymentRecord[] = [
        { id: 1, companyName: 'Test Co', dividendAmount: 100, frankingPercentage: 100, dateReceived: '2023-01-01' },
        { id: 2, companyName: 'Test Co', dividendAmount: 150, frankingPercentage: 100, dateReceived: '2023-04-01' },
        { id: 3, companyName: 'Test Co', dividendAmount: 120, frankingPercentage: 100, dateReceived: '2023-07-01' },
        { id: 4, companyName: 'Test Co', dividendAmount: 180, frankingPercentage: 100, dateReceived: '2023-10-01' },
      ];

      const pattern = detectPattern(payments);

      expect(pattern).not.toBeNull();
      expect(pattern!.statistics.totalAmount).toBe(550);
      expect(pattern!.statistics.averageAmount).toBe(137.5);
      expect(pattern!.statistics.averageInterval).toBe(91); // ~quarterly
    });
  });

  describe('groupPaymentsByHolding', () => {
    it('should group payments by ASX code', () => {
      const payments: DividendPaymentRecord[] = [
        { id: 1, companyName: 'CBA', asxCode: 'CBA', dividendAmount: 200, frankingPercentage: 100, dateReceived: '2023-03-15' },
        { id: 2, companyName: 'NAB', asxCode: 'NAB', dividendAmount: 150, frankingPercentage: 100, dateReceived: '2023-03-20' },
        { id: 3, companyName: 'CBA', asxCode: 'CBA', dividendAmount: 220, frankingPercentage: 100, dateReceived: '2023-06-15' },
      ];

      const grouped = groupPaymentsByHolding(payments);

      expect(grouped.size).toBe(2);
      expect(grouped.get('CBA')?.length).toBe(2);
      expect(grouped.get('NAB')?.length).toBe(1);
    });

    it('should group by company name when no ASX code', () => {
      const payments: DividendPaymentRecord[] = [
        { id: 1, companyName: 'Some Company', dividendAmount: 100, frankingPercentage: 100, dateReceived: '2023-01-01' },
        { id: 2, companyName: 'Another Company', dividendAmount: 200, frankingPercentage: 100, dateReceived: '2023-02-01' },
        { id: 3, companyName: 'Some Company', dividendAmount: 150, frankingPercentage: 100, dateReceived: '2023-03-01' },
      ];

      const grouped = groupPaymentsByHolding(payments);

      expect(grouped.size).toBe(2);
      expect(grouped.get('SOME COMPANY')?.length).toBe(2);
    });
  });

  describe('analyzePatterns', () => {
    it('should analyze multiple holdings', () => {
      const holdings = new Map<string, DividendPaymentRecord[]>();
      
      holdings.set('CBA', [
        { id: 1, companyName: 'CBA', asxCode: 'CBA', dividendAmount: 200, frankingPercentage: 100, dateReceived: '2023-03-15' },
        { id: 2, companyName: 'CBA', asxCode: 'CBA', dividendAmount: 220, frankingPercentage: 100, dateReceived: '2023-06-15' },
        { id: 3, companyName: 'CBA', asxCode: 'CBA', dividendAmount: 210, frankingPercentage: 100, dateReceived: '2023-09-15' },
        { id: 4, companyName: 'CBA', asxCode: 'CBA', dividendAmount: 230, frankingPercentage: 100, dateReceived: '2023-12-15' },
      ]);
      
      holdings.set('BHP', [
        { id: 5, companyName: 'BHP', asxCode: 'BHP', dividendAmount: 300, frankingPercentage: 100, dateReceived: '2023-02-28' },
        { id: 6, companyName: 'BHP', asxCode: 'BHP', dividendAmount: 350, frankingPercentage: 100, dateReceived: '2023-08-28' },
      ]);

      const result = analyzePatterns(holdings);

      expect(result.patterns.length).toBe(2);
      expect(result.totalHoldings).toBe(2);
      expect(result.patternsDetected).toBe(2);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('generateExpectedDividends', () => {
    it('should generate expected dividends within lookahead window', () => {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      const patterns = [
        {
          id: 'CBA',
          companyName: 'CBA',
          asxCode: 'CBA',
          frequency: 'quarterly' as const,
          confidence: 'high' as const,
          confidenceScore: 85,
          detectedPattern: 'Quarterly (Mar/Jun/Sep/Dec)',
          analysisDate: new Date().toISOString(),
          paymentsAnalyzed: 4,
          dateRange: { start: '2023-01-01', end: '2023-12-31' },
          patternStability: 'stable' as const,
          patternChanges: [],
          statistics: {
            averageInterval: 91,
            intervalStdDev: 5,
            minInterval: 88,
            maxInterval: 94,
            coefficientOfVariation: 0.05,
            totalAmount: 860,
            averageAmount: 215,
            amountTrend: 'stable' as const,
            seasonalConsistency: 0.95,
          },
          nextExpectedPayment: {
            estimatedDate: nextMonth.toISOString().split('T')[0],
            estimatedAmount: 220,
            confidence: 'high' as const,
          },
        },
      ];

      const expected = generateExpectedDividends(patterns, 90);

      expect(expected.length).toBeGreaterThan(0);
      expect(expected[0].companyName).toBe('CBA');
    });
  });

  describe('export functions', () => {
    it('should export patterns to JSON', () => {
      const patterns = [
        {
          id: 'TEST',
          companyName: 'Test Co',
          frequency: 'quarterly' as const,
          confidence: 'high' as const,
          confidenceScore: 90,
          detectedPattern: 'Quarterly',
          analysisDate: new Date().toISOString(),
          paymentsAnalyzed: 4,
          dateRange: { start: '2023-01-01', end: '2023-12-31' },
          patternStability: 'stable' as const,
          patternChanges: [],
          statistics: {
            averageInterval: 91,
            intervalStdDev: 5,
            minInterval: 88,
            maxInterval: 94,
            coefficientOfVariation: 0.05,
            totalAmount: 400,
            averageAmount: 100,
            amountTrend: 'stable' as const,
            seasonalConsistency: 0.9,
          },
        },
      ];

      const json = exportPatternsToJSON(patterns);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].companyName).toBe('Test Co');
    });

    it('should export patterns to CSV', () => {
      const patterns = [
        {
          id: 'TEST',
          companyName: 'Test Co',
          frequency: 'quarterly' as const,
          confidence: 'high' as const,
          confidenceScore: 90,
          detectedPattern: 'Quarterly',
          analysisDate: new Date().toISOString(),
          paymentsAnalyzed: 4,
          dateRange: { start: '2023-01-01', end: '2023-12-31' },
          patternStability: 'stable' as const,
          patternChanges: [],
          statistics: {
            averageInterval: 91,
            intervalStdDev: 5,
            minInterval: 88,
            maxInterval: 94,
            coefficientOfVariation: 0.05,
            totalAmount: 400,
            averageAmount: 100,
            amountTrend: 'stable' as const,
            seasonalConsistency: 0.9,
          },
        },
      ];

      const csv = exportPatternsToCSV(patterns);

      expect(csv).toContain('Holding ID');
      expect(csv).toContain('Test Co');
      expect(csv).toContain('quarterly');
    });
  });

  describe('test data generation', () => {
    it('should generate test payments for quarterly frequency', () => {
      const payments = generateTestPayments('Test Co', 'TEST', 'quarterly', 4);

      expect(payments).toHaveLength(4);
      expect(payments[0].companyName).toBe('Test Co');
      expect(payments[0].asxCode).toBe('TEST');
    });
  });
});
