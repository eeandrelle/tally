/**
 * Unit Tests for Upload Pattern Detection Engine
 * 
 * Tests pattern detection, missing document detection, and reminder generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectPattern,
  detectMissingDocuments,
  getExpectedDocuments,
  groupUploadsBySource,
  analyzeUploadPatterns,
  getFrequencyLabel,
  getDocumentTypeLabel,
  formatExpectedDate,
} from './upload-patterns';
import type { 
  DocumentUploadRecord, 
  DocumentType, 
  PatternFrequency,
  DocumentPattern 
} from '../upload-patterns';

// ============================================================================
// TEST DATA
// ============================================================================

const createUpload = (
  documentType: DocumentType,
  source: string,
  uploadDate: string,
  id = `upload-${Date.now()}-${Math.random()}`
): DocumentUploadRecord => ({
  id,
  documentType,
  source,
  uploadDate,
});

// Bank statement uploads - monthly pattern
const bankStatementUploads: DocumentUploadRecord[] = [
  createUpload('bank_statement', 'Commonwealth Bank', '2026-01-15'),
  createUpload('bank_statement', 'Commonwealth Bank', '2025-12-15'),
  createUpload('bank_statement', 'Commonwealth Bank', '2025-11-15'),
  createUpload('bank_statement', 'Commonwealth Bank', '2025-10-15'),
  createUpload('bank_statement', 'Commonwealth Bank', '2025-09-15'),
  createUpload('bank_statement', 'Commonwealth Bank', '2025-08-15'),
];

// Dividend uploads - quarterly pattern
const dividendUploads: DocumentUploadRecord[] = [
  createUpload('dividend_statement', 'Telstra', '2026-01-10'),
  createUpload('dividend_statement', 'Telstra', '2025-10-10'),
  createUpload('dividend_statement', 'Telstra', '2025-07-10'),
  createUpload('dividend_statement', 'Telstra', '2025-04-10'),
  createUpload('dividend_statement', 'Telstra', '2025-01-10'),
];

// PAYG uploads - yearly pattern
const paygUploads: DocumentUploadRecord[] = [
  createUpload('payg_summary', 'Company XYZ', '2025-07-15'),
  createUpload('payg_summary', 'Company XYZ', '2024-07-15'),
  createUpload('payg_summary', 'Company XYZ', '2023-07-15'),
];

// Irregular uploads
const irregularUploads: DocumentUploadRecord[] = [
  createUpload('other', 'Random Source', '2026-01-01'),
  createUpload('other', 'Random Source', '2025-11-15'),
  createUpload('other', 'Random Source', '2025-08-20'),
];

// ============================================================================
// PATTERN DETECTION TESTS
// ============================================================================

describe('Pattern Detection', () => {
  describe('detectPattern', () => {
    it('should detect monthly pattern for bank statements', () => {
      const pattern = detectPattern('bank_statement', 'Commonwealth Bank', bankStatementUploads);
      
      expect(pattern).not.toBeNull();
      expect(pattern?.frequency).toBe('monthly');
      expect(pattern?.confidence).toBe('high');
      expect(pattern?.confidenceScore).toBeGreaterThan(70);
      expect(pattern?.expectedDayOfMonth).toBe(15);
    });

    it('should detect quarterly pattern for dividends', () => {
      const pattern = detectPattern('dividend_statement', 'Telstra', dividendUploads);
      
      expect(pattern).not.toBeNull();
      expect(pattern?.frequency).toBe('quarterly');
      expect(pattern?.confidence).toBe('high');
    });

    it('should detect yearly pattern for PAYG summaries', () => {
      const pattern = detectPattern('payg_summary', 'Company XYZ', paygUploads);
      
      expect(pattern).not.toBeNull();
      expect(pattern?.frequency).toBe('yearly');
      expect(pattern?.confidence).toBe('high');
      expect(pattern?.expectedDayOfMonth).toBe(15);
    });

    it('should detect pattern for variable uploads', () => {
      const pattern = detectPattern('other', 'Random Source', irregularUploads);
      
      expect(pattern).not.toBeNull();
      // Pattern detection may classify as irregular or unknown based on variability
      expect(['irregular', 'unknown']).toContain(pattern?.frequency);
    });

    it('should return null for empty uploads', () => {
      const pattern = detectPattern('bank_statement', 'Empty Bank', []);
      
      expect(pattern).toBeNull();
    });

    it('should calculate correct statistics', () => {
      const pattern = detectPattern('bank_statement', 'Commonwealth Bank', bankStatementUploads);
      
      expect(pattern?.statistics.averageIntervalDays).toBeGreaterThan(25);
      expect(pattern?.statistics.averageIntervalDays).toBeLessThan(35);
      expect(pattern?.statistics.consistencyScore).toBeGreaterThan(0.8);
    });

    it('should predict next expected date for monthly pattern', () => {
      const pattern = detectPattern('bank_statement', 'Commonwealth Bank', bankStatementUploads);
      
      expect(pattern?.nextExpectedDate).toBeDefined();
      if (pattern?.nextExpectedDate) {
        const nextDate = new Date(pattern.nextExpectedDate);
        const lastUpload = new Date('2026-01-15');
        
        // Should be approximately one month after last upload
        const diffDays = (nextDate.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(25);
        expect(diffDays).toBeLessThan(35);
      }
    });

    it('should set appropriate grace period based on frequency', () => {
      const monthlyPattern = detectPattern('bank_statement', 'Bank', bankStatementUploads);
      const yearlyPattern = detectPattern('payg_summary', 'Company', paygUploads);
      
      expect(monthlyPattern?.gracePeriodDays).toBe(5); // Monthly grace period
      expect(yearlyPattern?.gracePeriodDays).toBe(21); // Yearly grace period
    });

    it('should detect pattern stability', () => {
      const stablePattern = detectPattern('bank_statement', 'Bank', bankStatementUploads);
      
      expect(stablePattern?.patternStability).toBe('stable');
    });
  });
});

// ============================================================================
// MISSING DOCUMENT DETECTION TESTS
// ============================================================================

describe('Missing Document Detection', () => {
  const mockPatterns: DocumentPattern[] = [
    {
      id: 'pattern-1',
      documentType: 'bank_statement',
      source: 'Test Bank',
      frequency: 'monthly',
      confidence: 'high',
      confidenceScore: 85,
      expectedDayOfMonth: 15,
      analysisDate: '2026-02-01T00:00:00Z',
      uploadsAnalyzed: 6,
      dateRange: {
        start: '2025-08-15',
        end: '2026-01-15',
      },
      patternStability: 'stable',
      patternChanges: [],
      statistics: {
        averageIntervalDays: 30,
        intervalStdDev: 1,
        minIntervalDays: 29,
        maxIntervalDays: 31,
        coefficientOfVariation: 0.03,
        consistencyScore: 0.95,
      },
      nextExpectedDate: '2026-02-15',
      gracePeriodDays: 5,
    },
  ];

  describe('detectMissingDocuments', () => {
    it('should detect missing documents past expected date', () => {
      const asOfDate = new Date('2026-02-28'); // Past expected date and grace period
      const recentUploads: DocumentUploadRecord[] = [];

      const missing = detectMissingDocuments(mockPatterns, recentUploads, asOfDate);

      expect(missing.length).toBeGreaterThan(0);
      // isMissing is true only when past grace period (expected + 5 days = Feb 20)
      expect(missing[0].daysOverdue).toBeGreaterThan(0);
    });

    it('should not flag documents within grace period', () => {
      const asOfDate = new Date('2026-02-17'); // Within 5-day grace period
      const recentUploads: DocumentUploadRecord[] = [];

      const missing = detectMissingDocuments(mockPatterns, recentUploads, asOfDate);

      expect(missing.length).toBeGreaterThan(0);
      expect(missing[0].isMissing).toBe(false); // Within grace period
    });

    it('should not flag documents that have been uploaded', () => {
      const asOfDate = new Date('2026-02-20');
      const recentUploads: DocumentUploadRecord[] = [
        createUpload('bank_statement', 'Test Bank', '2026-02-16'), // Uploaded after expected
      ];

      const missing = detectMissingDocuments(mockPatterns, recentUploads, asOfDate);

      expect(missing.length).toBe(0);
    });

    it('should skip low confidence patterns', () => {
      const lowConfidencePatterns: DocumentPattern[] = [{
        ...mockPatterns[0],
        confidence: 'uncertain',
        confidenceScore: 20,
      }];

      const asOfDate = new Date('2026-02-20');
      const missing = detectMissingDocuments(lowConfidencePatterns, [], asOfDate);

      expect(missing.length).toBe(0);
    });

    it('should sort missing documents by days overdue', () => {
      const patterns: DocumentPattern[] = [
        {
          ...mockPatterns[0],
          id: 'pattern-1',
          source: 'Bank A',
          nextExpectedDate: '2026-02-01',
        },
        {
          ...mockPatterns[0],
          id: 'pattern-2',
          source: 'Bank B',
          nextExpectedDate: '2026-02-10',
        },
      ];

      const asOfDate = new Date('2026-02-20');
      const missing = detectMissingDocuments(patterns, [], asOfDate);

      expect(missing[0].source).toBe('Bank A'); // 19 days overdue
      expect(missing[1].source).toBe('Bank B'); // 10 days overdue
    });
  });

  describe('getExpectedDocuments', () => {
    it('should return documents expected within the specified days', () => {
      const patterns: DocumentPattern[] = [{
        ...mockPatterns[0],
        nextExpectedDate: '2026-02-10', // 9 days from Feb 1
      }];

      const now = new Date('2026-02-01');
      // Mock Date to control "now"
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super('2026-02-01');
          } else {
            super(...args as [string]);
          }
        }
      } as DateConstructor;

      const expected = getExpectedDocuments(patterns, 30);
      
      global.Date = originalDate;

      expect(expected.length).toBeGreaterThan(0);
      expect(expected[0].daysUntilExpected).toBeGreaterThanOrEqual(0);
    });

    it('should sort by days until expected', () => {
      const patterns: DocumentPattern[] = [
        { ...mockPatterns[0], id: 'p1', nextExpectedDate: '2026-02-20' },
        { ...mockPatterns[0], id: 'p2', nextExpectedDate: '2026-02-10' },
        { ...mockPatterns[0], id: 'p3', nextExpectedDate: '2026-02-15' },
      ];

      // Mock current date
      const originalDate = global.Date;
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super('2026-02-01');
          } else {
            super(...args as [string]);
          }
        }
      } as DateConstructor;

      const expected = getExpectedDocuments(patterns, 30);
      
      global.Date = originalDate;

      expect(expected[0].daysUntilExpected).toBeLessThanOrEqual(expected[1].daysUntilExpected);
      expect(expected[1].daysUntilExpected).toBeLessThanOrEqual(expected[2].daysUntilExpected);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('groupUploadsBySource', () => {
    it('should group uploads by document type and source', () => {
      const uploads: DocumentUploadRecord[] = [
        createUpload('bank_statement', 'Bank A', '2026-01-01'),
        createUpload('bank_statement', 'Bank A', '2026-02-01'),
        createUpload('bank_statement', 'Bank B', '2026-01-01'),
        createUpload('dividend_statement', 'Company X', '2026-01-01'),
      ];

      const grouped = groupUploadsBySource(uploads);

      expect(Object.keys(grouped).length).toBe(3);
      expect(grouped['bank_statement:Bank A'].length).toBe(2);
      expect(grouped['bank_statement:Bank B'].length).toBe(1);
      expect(grouped['dividend_statement:Company X'].length).toBe(1);
    });

    it('should handle empty array', () => {
      const grouped = groupUploadsBySource([]);
      expect(Object.keys(grouped).length).toBe(0);
    });
  });

  describe('analyzeUploadPatterns', () => {
    it('should analyze patterns from grouped uploads', () => {
      const grouped = {
        'bank_statement:Test Bank': bankStatementUploads.slice(0, 4),
      };

      const result = analyzeUploadPatterns(grouped);

      expect(result.patterns.length).toBe(1);
      expect(result.patterns[0].frequency).toBe('monthly');
      expect(result.totalSources).toBe(1);
      expect(result.patternsDetected).toBe(1);
    });

    it('should handle errors gracefully', () => {
      const grouped = {
        'invalid': [], // Empty uploads will cause detectPattern to return null
      };

      const result = analyzeUploadPatterns(grouped);

      expect(result.patterns.length).toBe(0);
      expect(result.errors.length).toBe(0); // Empty uploads don't throw, just return null
    });
  });

  describe('getFrequencyLabel', () => {
    it('should return correct labels for all frequencies', () => {
      const frequencies: PatternFrequency[] = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'irregular', 'unknown'];
      const expectedLabels = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Irregular', 'Unknown'];

      frequencies.forEach((freq, i) => {
        expect(getFrequencyLabel(freq)).toBe(expectedLabels[i]);
      });
    });
  });

  describe('getDocumentTypeLabel', () => {
    it('should return correct labels for all document types', () => {
      expect(getDocumentTypeLabel('bank_statement')).toBe('Bank Statement');
      expect(getDocumentTypeLabel('dividend_statement')).toBe('Dividend Statement');
      expect(getDocumentTypeLabel('payg_summary')).toBe('PAYG Summary');
      expect(getDocumentTypeLabel('other')).toBe('Other');
    });
  });

  describe('formatExpectedDate', () => {
    it('should format today correctly', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(formatExpectedDate(today)).toBe('Today');
    });

    it('should format tomorrow correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatExpectedDate(tomorrow.toISOString().split('T')[0])).toBe('Tomorrow');
    });

    it('should format past dates correctly', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(formatExpectedDate(past.toISOString().split('T')[0])).toBe('5 days ago');
    });

    it('should format future dates correctly', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(formatExpectedDate(future.toISOString().split('T')[0])).toBe('In 5 days');
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle single upload', () => {
    const singleUpload = [createUpload('bank_statement', 'Bank', '2026-01-15')];
    const pattern = detectPattern('bank_statement', 'Bank', singleUpload);

    expect(pattern).not.toBeNull();
    expect(pattern?.uploadsAnalyzed).toBe(1);
  });

  it('should handle uploads with exact same dates', () => {
    const sameDateUploads = [
      createUpload('bank_statement', 'Bank', '2026-01-15', '1'),
      createUpload('bank_statement', 'Bank', '2026-01-15', '2'),
    ];
    const pattern = detectPattern('bank_statement', 'Bank', sameDateUploads);

    expect(pattern).not.toBeNull();
    expect(pattern?.patternStability).toBe('volatile');
  });

  it('should handle leap year February', () => {
    const leapYearUploads = [
      createUpload('bank_statement', 'Bank', '2024-02-29'), // Leap year
      createUpload('bank_statement', 'Bank', '2024-01-29'),
    ];
    const pattern = detectPattern('bank_statement', 'Bank', leapYearUploads);

    expect(pattern).not.toBeNull();
    expect(pattern?.expectedDayOfMonth).toBeDefined();
  });

  it('should handle very long intervals', () => {
    const longIntervalUploads = [
      createUpload('other', 'Source', '2026-01-01'),
      createUpload('other', 'Source', '2024-01-01'), // 2 years apart
    ];
    const pattern = detectPattern('other', 'Source', longIntervalUploads);

    expect(pattern).not.toBeNull();
  });

  it('should handle consecutive day uploads', () => {
    const consecutiveUploads = [
      createUpload('other', 'Source', '2026-01-01'),
      createUpload('other', 'Source', '2026-01-02'),
      createUpload('other', 'Source', '2026-01-03'),
    ];
    const pattern = detectPattern('other', 'Source', consecutiveUploads);

    expect(pattern).not.toBeNull();
  });
});

// ============================================================================
// CONFIDENCE SCORING TESTS
// ============================================================================

describe('Confidence Scoring', () => {
  it('should give high confidence for consistent monthly pattern', () => {
    const consistentUploads = Array.from({ length: 12 }, (_, i) =>
      createUpload('bank_statement', 'Bank', `2025-${String(i + 1).padStart(2, '0')}-15`)
    );

    const pattern = detectPattern('bank_statement', 'Bank', consistentUploads);

    expect(pattern?.confidence).toBe('high');
    expect(pattern?.confidenceScore).toBeGreaterThanOrEqual(80);
  });

  it('should give lower confidence for inconsistent pattern', () => {
    const inconsistentUploads = [
      createUpload('bank_statement', 'Bank', '2026-01-15'),
      createUpload('bank_statement', 'Bank', '2025-12-20'), // 5 day variance
      createUpload('bank_statement', 'Bank', '2025-11-10'), // 10 day variance
      createUpload('bank_statement', 'Bank', '2025-10-05'), // more variance
    ];

    const pattern = detectPattern('bank_statement', 'Bank', inconsistentUploads);

    // With high variability, confidence should be affected
    expect(pattern?.confidenceScore).toBeLessThan(90);
  });

  it('should give medium or lower confidence for very few uploads', () => {
    const fewUploads = [
      createUpload('bank_statement', 'Bank', '2026-01-15'),
      createUpload('bank_statement', 'Bank', '2025-12-15'),
    ];

    const pattern = detectPattern('bank_statement', 'Bank', fewUploads);

    // With only 2 uploads, confidence should not be high
    expect(['medium', 'low', 'uncertain']).toContain(pattern?.confidence);
    expect(pattern?.confidenceScore).toBeLessThan(80);
  });
});