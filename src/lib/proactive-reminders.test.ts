/**
 * Proactive Reminders Tests
 * 
 * Comprehensive test suite for the reminder engine.
 * 
 * @module test/proactive-reminders
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateEOFYReminders,
  generateMissingDocumentReminders,
  generateDividendExpectedReminders,
  generateOptimizationReminders,
  generateTaxDeadlineReminders,
  generateReminders,
  getActiveReminders,
  dismissReminder,
  completeReminder,
  snoozeReminder,
  calculateReminderStats,
  getFinancialYear,
  getEOFYDate,
  shouldShowReminder,
  DEFAULT_REMINDER_CONFIG,
  Reminder,
  ReminderConfig,
} from '@/lib/proactive-reminders';
import { addDays, subDays, format } from 'date-fns';

// ============================================================================
// Helper Functions
// ============================================================================

function createTestDate(month: number, day: number, year?: number): Date {
  const currentYear = year || new Date().getFullYear();
  return new Date(currentYear, month - 1, day);
}

// ============================================================================
// Financial Year Tests
// ============================================================================

describe('Financial Year Helpers', () => {
  describe('getFinancialYear', () => {
    it('returns current year + 1 for dates in second half of year', () => {
      const julyDate = createTestDate(7, 15);
      expect(getFinancialYear(julyDate)).toBe(julyDate.getFullYear() + 1);
    });

    it('returns current year for dates in first half of year', () => {
      const janDate = createTestDate(1, 15);
      expect(getFinancialYear(janDate)).toBe(janDate.getFullYear());
    });

    it('handles June 30 correctly', () => {
      const june30 = createTestDate(6, 30);
      expect(getFinancialYear(june30)).toBe(june30.getFullYear());
    });

    it('handles July 1 correctly', () => {
      const july1 = createTestDate(7, 1);
      expect(getFinancialYear(july1)).toBe(july1.getFullYear() + 1);
    });
  });

  describe('getEOFYDate', () => {
    it('returns June 30 for the given financial year', () => {
      const eofy2026 = getEOFYDate(2026);
      expect(eofy2026.getMonth()).toBe(5); // June (0-indexed)
      expect(eofy2026.getDate()).toBe(30);
      expect(eofy2026.getFullYear()).toBe(2026);
    });
  });
});

// ============================================================================
// EOFY Reminder Tests
// ============================================================================

describe('EOFY Reminders', () => {
  it('generates reminder at 90 days before EOFY', () => {
    // EOFY is June 30, so 90 days before is April 1
    const april1 = createTestDate(4, 1, 2026);
    
    const reminders = generateEOFYReminders(DEFAULT_REMINDER_CONFIG, april1);
    
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('eofy_approaching');
    expect(reminders[0].priority).toBe('medium');
    expect(reminders[0].title).toContain('90 days');
  });

  it('generates critical reminder at 7 days before EOFY', () => {
    // 7 days before June 30 is June 23
    const june23 = createTestDate(6, 23, 2026);
    
    const reminders = generateEOFYReminders(DEFAULT_REMINDER_CONFIG, june23);
    
    expect(reminders).toHaveLength(1);
    expect(reminders[0].priority).toBe('critical');
  });

  it('generates critical reminder on EOFY day', () => {
    const june30 = createTestDate(6, 30, 2026);
    
    const reminders = generateEOFYReminders(DEFAULT_REMINDER_CONFIG, june30);
    
    expect(reminders).toHaveLength(1);
    expect(reminders[0].priority).toBe('critical');
    expect(reminders[0].title).toContain('TODAY');
  });

  it('does not generate reminders on non-threshold days', () => {
    const june30 = createTestDate(6, 30, 2026);
    const randomDate = subDays(june30, 45); // 45 days before
    
    const reminders = generateEOFYReminders(DEFAULT_REMINDER_CONFIG, randomDate);
    
    expect(reminders).toHaveLength(0);
  });
});

// ============================================================================
// Missing Document Reminder Tests
// ============================================================================

describe('Missing Document Reminders', () => {
  const config: ReminderConfig = {
    ...DEFAULT_REMINDER_CONFIG,
    missingDocumentThresholdDays: 30,
  };

  it('generates reminder when upload pattern is broken', () => {
    // Current date is May 15, last upload was Feb 15 (3 months ago, ~89 days)
    // Pattern detected: 30 day average gap, but it's been 89 days
    const currentDate = createTestDate(5, 15, 2026);
    const uploadHistory = [
      { date: '2026-01-15', type: 'bank_statement' },
      { date: '2026-02-15', type: 'bank_statement' },
      // Missing March, April, May - way overdue
    ];
    
    const reminders = generateMissingDocumentReminders(uploadHistory, config, currentDate);
    
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].type).toBe('missing_document');
    expect(reminders[0].context?.documentType).toBe('bank_statement');
  });

  it('does not generate reminder when uploads are on schedule', () => {
    const currentDate = createTestDate(2, 20, 2026);
    const uploadHistory = [
      { date: '2026-01-15', type: 'bank_statement' },
      { date: '2026-02-15', type: 'bank_statement' },
    ];
    
    const reminders = generateMissingDocumentReminders(uploadHistory, config, currentDate);
    
    expect(reminders).toHaveLength(0);
  });

  it('requires at least 2 uploads to detect pattern', () => {
    const currentDate = createTestDate(3, 15, 2026);
    const uploadHistory = [
      { date: '2026-02-15', type: 'bank_statement' },
    ];
    
    const reminders = generateMissingDocumentReminders(uploadHistory, config, currentDate);
    
    expect(reminders).toHaveLength(0);
  });
});

// ============================================================================
// Dividend Expected Reminder Tests
// ============================================================================

describe('Dividend Expected Reminders', () => {
  const config: ReminderConfig = {
    ...DEFAULT_REMINDER_CONFIG,
    dividendGracePeriodDays: 14,
  };

  it('generates reminder when dividend is expected soon', () => {
    // History: Aug 15, Nov 15 (91 days apart)
    // Next expected: ~Feb 14 (91 days from Nov 15)
    // Current date: Feb 10 (4 days before expected, within 14 day grace period)
    const currentDate = new Date('2026-02-10');
    const holdings = [
      {
        companyName: 'Test Corp',
        asxCode: 'TST',
        paymentHistory: [
          { date: '2025-08-15', amount: 100 },
          { date: '2025-11-15', amount: 100 },
        ],
      },
    ];
    
    const reminders = generateDividendExpectedReminders(holdings, config, currentDate);
    
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].type).toBe('dividend_expected');
    expect(reminders[0].context?.asxCode).toBe('TST');
  });

  it('generates high priority reminder for overdue dividend', () => {
    const currentDate = createTestDate(3, 1, 2026);
    const holdings = [
      {
        companyName: 'Test Corp',
        asxCode: 'TST',
        paymentHistory: [
          { date: '2025-08-15', amount: 100 },
          { date: '2025-11-15', amount: 100 },
          // Expected around Feb 15, now overdue
        ],
      },
    ];
    
    const reminders = generateDividendExpectedReminders(holdings, config, currentDate);
    
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].priority).toBe('high');
  });
});

// ============================================================================
// Optimization Reminder Tests
// ============================================================================

describe('Optimization Reminders', () => {
  const config: ReminderConfig = {
    ...DEFAULT_REMINDER_CONFIG,
    optimizationReviewIntervalDays: 30,
  };

  it('generates reminder at review interval', () => {
    const currentDate = createTestDate(2, 1, 2026);
    const opportunities = [
      {
        type: 'WFH Deduction',
        estimatedSavings: 500,
        categoryCode: 'D5',
        actionItems: ['Complete workpaper'],
        discoveredAt: '2026-01-01', // 31 days ago
      },
    ];
    
    const reminders = generateOptimizationReminders(opportunities, config, currentDate);
    
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('optimization_opportunity');
  });

  it('sets priority based on estimated savings', () => {
    const currentDate = createTestDate(2, 1, 2026);
    const opportunities = [
      {
        type: 'Big Savings',
        estimatedSavings: 600, // > 500
        actionItems: ['Action 1'],
        discoveredAt: '2026-01-01',
      },
      {
        type: 'Small Savings',
        estimatedSavings: 50, // < 100
        actionItems: ['Action 1'],
        discoveredAt: '2026-01-01',
      },
    ];
    
    const reminders = generateOptimizationReminders(opportunities, config, currentDate);
    
    expect(reminders[0].priority).toBe('high');
    expect(reminders[1].priority).toBe('low');
  });
});

// ============================================================================
// Tax Deadline Reminder Tests
// ============================================================================

describe('Tax Deadline Reminders', () => {
  it('generates reminders at threshold days', () => {
    const deadline = createTestDate(10, 31, 2026);
    const thirtyDaysBefore = subDays(deadline, 30);
    
    const deadlines = [
      {
        type: 'tax_return',
        date: format(deadline, 'yyyy-MM-dd'),
        description: 'Tax return lodgment',
      },
    ];
    
    const reminders = generateTaxDeadlineReminders(deadlines, DEFAULT_REMINDER_CONFIG, thirtyDaysBefore);
    
    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe('tax_deadline');
  });

  it('sets critical priority for deadlines within 7 days', () => {
    const deadline = createTestDate(10, 31, 2026);
    const sevenDaysBefore = subDays(deadline, 7);
    
    const deadlines = [
      {
        type: 'tax_return',
        date: format(deadline, 'yyyy-MM-dd'),
        description: 'Tax return lodgment',
      },
    ];
    
    const reminders = generateTaxDeadlineReminders(deadlines, DEFAULT_REMINDER_CONFIG, sevenDaysBefore);
    
    expect(reminders[0].priority).toBe('critical');
  });
});

// ============================================================================
// Main Engine Tests
// ============================================================================

describe('Main Reminder Engine', () => {
  it('generates combined reminders from all sources', () => {
    // Use April 1, 2026 which is exactly 90 days before EOFY (June 30)
    const currentDate = createTestDate(4, 1, 2026);
    const input = {
      uploadHistory: [
        { date: '2026-01-15', type: 'receipt' },
        { date: '2026-02-15', type: 'receipt' },
      ],
      holdings: [],
      opportunities: [],
      deadlines: [],
    };
    
    const reminders = generateReminders(input, DEFAULT_REMINDER_CONFIG, currentDate);
    
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].type).toBe('eofy_approaching');
  });

  it('avoids duplicate reminders', () => {
    const currentDate = createTestDate(3, 31, 2026);
    const input = {
      existingReminders: [
        {
          id: 'eofy_approaching_fy2026_91days_1234567890',
          type: 'eofy_approaching' as const,
          priority: 'medium' as const,
          title: 'Test',
          message: 'Test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    
    const reminders = generateReminders(input, DEFAULT_REMINDER_CONFIG, currentDate);
    
    const duplicateIds = reminders.filter(r => 
      input.existingReminders!.some(er => er.id === r.id)
    );
    expect(duplicateIds).toHaveLength(0);
  });

  it('respects maxActiveReminders limit', () => {
    const config: ReminderConfig = {
      ...DEFAULT_REMINDER_CONFIG,
      maxActiveReminders: 2,
    };
    
    const currentDate = createTestDate(6, 23, 2026); // 7 days before EOFY
    const input = {
      uploadHistory: [
        { date: '2026-01-15', type: 'receipt' },
        { date: '2026-02-15', type: 'receipt' },
        { date: '2026-03-15', type: 'receipt' },
      ],
      holdings: [],
      opportunities: [],
      deadlines: [],
    };
    
    const reminders = generateReminders(input, config, currentDate);
    
    expect(reminders.length).toBeLessThanOrEqual(config.maxActiveReminders);
  });
});

// ============================================================================
// Active Reminder Filter Tests
// ============================================================================

describe('Active Reminder Filtering', () => {
  it('filters out dismissed reminders', () => {
    const reminders: Reminder[] = [
      {
        id: '1',
        type: 'eofy_approaching',
        priority: 'high',
        title: 'Test',
        message: 'Test',
        dismissedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'tax_deadline',
        priority: 'critical',
        title: 'Test 2',
        message: 'Test 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    const active = getActiveReminders(reminders);
    
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('2');
  });

  it('filters out snoozed reminders', () => {
    const futureDate = addDays(new Date(), 7);
    const reminders: Reminder[] = [
      {
        id: '1',
        type: 'eofy_approaching',
        priority: 'high',
        title: 'Test',
        message: 'Test',
        snoozedUntil: futureDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    const active = getActiveReminders(reminders);
    
    expect(active).toHaveLength(0);
  });
});

// ============================================================================
// Reminder Action Tests
// ============================================================================

describe('Reminder Actions', () => {
  const baseReminder: Reminder = {
    id: '1',
    type: 'eofy_approaching',
    priority: 'high',
    title: 'Test',
    message: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('dismisses a reminder', () => {
    const dismissed = dismissReminder(baseReminder);
    
    expect(dismissed.dismissedAt).toBeDefined();
    expect(dismissed.updatedAt).not.toBe(baseReminder.updatedAt);
  });

  it('completes a reminder', () => {
    const completed = completeReminder(baseReminder);
    
    expect(completed.completedAt).toBeDefined();
    expect(completed.updatedAt).not.toBe(baseReminder.updatedAt);
  });

  it('snoozes a reminder', () => {
    const snoozed = snoozeReminder(baseReminder, 7);
    
    expect(snoozed.snoozedUntil).toBeDefined();
    expect(snoozed.updatedAt).not.toBe(baseReminder.updatedAt);
  });
});

// ============================================================================
// Stats Calculation Tests
// ============================================================================

describe('Stats Calculation', () => {
  it('calculates correct counts', () => {
    const reminders: Reminder[] = [
      { ...baseReminder, id: '1' },
      { ...baseReminder, id: '2', dismissedAt: new Date().toISOString() },
      { ...baseReminder, id: '3', completedAt: new Date().toISOString() },
      { 
        ...baseReminder, 
        id: '4', 
        snoozedUntil: addDays(new Date(), 7).toISOString() 
      },
    ];
    
    const stats = calculateReminderStats(reminders);
    
    expect(stats.totalReminders).toBe(4);
    expect(stats.activeCount).toBe(2); // 1 active + 1 snoozed
    expect(stats.dismissedCount).toBe(1);
    expect(stats.completedCount).toBe(1);
    expect(stats.snoozedCount).toBe(1);
  });

  it('calculates completion rate', () => {
    const reminders: Reminder[] = [
      { ...baseReminder, id: '1' },
      { ...baseReminder, id: '2' },
      { ...baseReminder, id: '3', completedAt: new Date().toISOString() },
    ];
    
    const stats = calculateReminderStats(reminders);
    
    expect(stats.completionRate).toBe(33.33); // 1/3 = 33.33%
  });

  it('groups by type', () => {
    const reminders: Reminder[] = [
      { ...baseReminder, id: '1', type: 'eofy_approaching' },
      { ...baseReminder, id: '2', type: 'eofy_approaching' },
      { ...baseReminder, id: '3', type: 'tax_deadline' },
    ];
    
    const stats = calculateReminderStats(reminders);
    
    expect(stats.byType.eofy_approaching).toBe(2);
    expect(stats.byType.tax_deadline).toBe(1);
  });
});

// Test helper
const baseReminder: Reminder = {
  id: 'test',
  type: 'eofy_approaching',
  priority: 'high',
  title: 'Test',
  message: 'Test',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
