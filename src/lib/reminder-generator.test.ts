/**
 * Unit Tests for Reminder Generation System
 * 
 * Tests reminder creation, scheduling, and tax calendar integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateReminders,
  sendReminder,
  processDueReminders,
  createTaxDeadlineFromMissing,
  getReminderSchedule,
  calculateNextReminderDate,
  groupRemindersByUrgency,
  groupRemindersByType,
} from './reminder-generator';
import type { MissingDocument, DocumentType, PatternConfidence } from './upload-patterns';
import type { DocumentReminder, ReminderType, ReminderUrgency } from './reminder-generator';

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockMissing = (
  overrides: Partial<MissingDocument> = {}
): MissingDocument => ({
  id: `missing-${Date.now()}`,
  documentType: 'bank_statement',
  source: 'Test Bank',
  patternId: 'pattern-1',
  expectedDate: '2026-02-15',
  gracePeriodEnd: '2026-02-20',
  daysOverdue: 0,
  isMissing: false,
  confidence: 'high' as PatternConfidence,
  lastUploadDate: '2026-01-15',
  historicalUploads: 6,
  ...overrides,
});

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('./db-upload-reminders', () => ({
  getReminderSettings: vi.fn(async (documentType: DocumentType) => ({
    documentType,
    enabled: true,
    reminderDaysBefore: 3,
    reminderDaysAfter: 7,
    emailNotifications: false,
    pushNotifications: true,
    maxReminders: 3,
  })),
  recordReminderSent: vi.fn(async () => {}),
  getReminderCount: vi.fn(async () => 0),
  updateMissingDocumentStatus: vi.fn(async () => {}),
}));

// ============================================================================
// REMINDER GENERATION TESTS
// ============================================================================

describe('Reminder Generation', () => {
  describe('generateReminders', () => {
    it('should generate reminders for missing documents', async () => {
      const missingDocs = [
        createMockMissing({ id: '1', source: 'Bank A' }),
        createMockMissing({ id: '2', source: 'Bank B', documentType: 'dividend_statement' }),
      ];

      const result = await generateReminders(missingDocs);

      expect(result.reminders.length).toBe(2);
      expect(result.totalPending).toBe(2);
      expect(result.totalReminders).toBe(2);
    });

    it('should respect disabled settings', async () => {
      const { getReminderSettings } = await import('./db-upload-reminders');
      vi.mocked(getReminderSettings).mockResolvedValueOnce({
        documentType: 'bank_statement',
        enabled: false,
        reminderDaysBefore: 3,
        reminderDaysAfter: 7,
        emailNotifications: false,
        pushNotifications: true,
        maxReminders: 3,
      });

      const missingDocs = [createMockMissing()];
      const result = await generateReminders(missingDocs, { respectSettings: true });

      expect(result.reminders.length).toBe(0);
    });

    it('should not exceed max reminders', async () => {
      const { getReminderSettings, getReminderCount } = await import('./db-upload-reminders');
      vi.mocked(getReminderSettings).mockResolvedValueOnce({
        documentType: 'bank_statement',
        enabled: true,
        reminderDaysBefore: 3,
        reminderDaysAfter: 7,
        emailNotifications: false,
        pushNotifications: true,
        maxReminders: 3,
      });
      vi.mocked(getReminderCount).mockResolvedValueOnce(3); // Already sent max

      const missingDocs = [createMockMissing()];
      const result = await generateReminders(missingDocs, { respectSettings: true });

      expect(result.reminders.length).toBe(0);
    });

    it('should categorize reminders by type and urgency', async () => {
      const missingDocs = [
        createMockMissing({ id: '1', isMissing: false }), // upcoming
        createMockMissing({ id: '2', isMissing: true, daysOverdue: 5 }), // overdue
        createMockMissing({ id: '3', isMissing: true, daysOverdue: 10 }), // follow_up
      ];

      const result = await generateReminders(missingDocs);

      expect(result.byType.upcoming).toBeGreaterThanOrEqual(0);
      expect(result.byType.overdue + result.byType.follow_up).toBeGreaterThan(0);
      expect(result.byUrgency.high + result.byUrgency.critical).toBeGreaterThan(0);
    });

    it('should include correct actions in reminders', async () => {
      const missingDocs = [createMockMissing({ isMissing: true, daysOverdue: 5 })];
      
      const result = await generateReminders(missingDocs);

      expect(result.reminders[0].actions.length).toBeGreaterThan(0);
      expect(result.reminders[0].actions.some(a => a.type === 'upload')).toBe(true);
      expect(result.reminders[0].actions.some(a => a.type === 'dismiss')).toBe(true);
    });

    it('should generate appropriate messages based on urgency', async () => {
      const criticalDoc = createMockMissing({ 
        isMissing: true, 
        daysOverdue: 20,
        source: 'Critical Bank'
      });
      
      const result = await generateReminders([criticalDoc]);
      
      expect(result.reminders[0].message.title).toContain('Final Notice');
      expect(result.reminders[0].message.body).toContain('significantly overdue');
    });
  });
});

// ============================================================================
// REMINDER TYPE TESTS
// ============================================================================

describe('Reminder Type Determination', () => {
  it('should classify upcoming documents correctly', async () => {
    const upcoming = createMockMissing({ isMissing: false });
    const result = await generateReminders([upcoming]);

    expect(result.reminders[0].reminderType).toBe('upcoming');
    expect(result.reminders[0].urgency).toBe('low');
  });

  it('should classify overdue documents correctly', async () => {
    const overdue = createMockMissing({ isMissing: true, daysOverdue: 5 });
    const result = await generateReminders([overdue]);

    expect(result.reminders[0].reminderType).toBe('overdue');
    expect(result.reminders[0].urgency).toBe('high');
  });

  it('should classify follow-up documents correctly', async () => {
    const followUp = createMockMissing({ isMissing: true, daysOverdue: 10 });
    const result = await generateReminders([followUp]);

    expect(result.reminders[0].reminderType).toBe('follow_up');
  });

  it('should classify final notice documents correctly', async () => {
    const finalNotice = createMockMissing({ isMissing: true, daysOverdue: 15 });
    const result = await generateReminders([finalNotice]);

    expect(result.reminders[0].reminderType).toBe('final_notice');
    expect(result.reminders[0].urgency).toBe('critical');
  });
});

// ============================================================================
// TAX CALENDAR INTEGRATION TESTS
// ============================================================================

describe('Tax Calendar Integration', () => {
  describe('createTaxDeadlineFromMissing', () => {
    it('should create deadline for high confidence missing document', () => {
      const missing = createMockMissing({ confidence: 'high' });
      const deadline = createTaxDeadlineFromMissing(missing);

      expect(deadline).not.toBeNull();
      expect(deadline?.type).toBe('CUSTOM');
      expect(deadline?.title).toContain('Bank Statement');
      expect(deadline?.metadata.isUploadReminder).toBe(true);
      expect(deadline?.metadata.missingDocumentId).toBe(missing.id);
    });

    it('should create deadline for medium confidence missing document', () => {
      const missing = createMockMissing({ confidence: 'medium' });
      const deadline = createTaxDeadlineFromMissing(missing);

      expect(deadline).not.toBeNull();
    });

    it('should not create deadline for low confidence missing document', () => {
      const missing = createMockMissing({ confidence: 'low' });
      const deadline = createTaxDeadlineFromMissing(missing);

      expect(deadline).toBeNull();
    });

    it('should not create deadline for uncertain confidence missing document', () => {
      const missing = createMockMissing({ confidence: 'uncertain' });
      const deadline = createTaxDeadlineFromMissing(missing);

      expect(deadline).toBeNull();
    });

    it('should include correct metadata', () => {
      const missing = createMockMissing({
        documentType: 'dividend_statement',
        source: 'Telstra',
        patternId: 'pattern-123',
      });
      const deadline = createTaxDeadlineFromMissing(missing);

      expect(deadline?.metadata.source).toBe('Telstra');
      expect(deadline?.metadata.documentType).toBe('dividend_statement');
      expect(deadline?.metadata.patternId).toBe('pattern-123');
    });
  });
});

// ============================================================================
// SCHEDULING TESTS
// ============================================================================

describe('Reminder Scheduling', () => {
  describe('getReminderSchedule', () => {
    it('should return appropriate schedule for bank statements', () => {
      const schedule = getReminderSchedule('bank_statement');

      expect(schedule.beforeDue).toContain(3);
      expect(schedule.afterDue).toContain(3);
      expect(schedule.maxReminders).toBe(4);
    });

    it('should return appropriate schedule for PAYG summaries', () => {
      const schedule = getReminderSchedule('payg_summary');

      expect(schedule.beforeDue).toContain(14);
      expect(schedule.afterDue).toContain(21);
      expect(schedule.maxReminders).toBe(6);
    });

    it('should return default schedule for unknown types', () => {
      const schedule = getReminderSchedule('other');

      expect(schedule.beforeDue.length).toBeGreaterThan(0);
      expect(schedule.afterDue.length).toBeGreaterThan(0);
    });
  });

  describe('calculateNextReminderDate', () => {
    it('should calculate next reminder before expected date', () => {
      const missing = createMockMissing({
        expectedDate: '2026-02-15',
        isMissing: false,
      });

      // Mock current date to be before expected
      const originalDate = Date;
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super('2026-02-01');
          } else {
            super(...args as [string]);
          }
        }
      } as DateConstructor;

      const nextDate = calculateNextReminderDate(missing, 0);
      
      global.Date = originalDate;

      expect(nextDate).not.toBeNull();
      if (nextDate) {
        expect(nextDate.getTime()).toBeLessThan(new Date('2026-02-15').getTime());
      }
    });

    it('should calculate next reminder after expected date for overdue', () => {
      const missing = createMockMissing({
        expectedDate: '2026-02-01',
        isMissing: true,
        daysOverdue: 10,
      });

      const nextDate = calculateNextReminderDate(missing, 3); // Already sent 3 reminders

      expect(nextDate).not.toBeNull();
      if (nextDate) {
        expect(nextDate.getTime()).toBeGreaterThan(new Date('2026-02-01').getTime());
      }
    });

    it('should return null when max reminders reached', () => {
      const missing = createMockMissing({
        documentType: 'bank_statement',
      });

      const nextDate = calculateNextReminderDate(missing, 10); // Way over max

      expect(nextDate).toBeNull();
    });
  });
});

// ============================================================================
// GROUPING TESTS
// ============================================================================

describe('Reminder Grouping', () => {
  const mockReminders: DocumentReminder[] = [
    {
      id: '1',
      missingDocumentId: 'm1',
      documentType: 'bank_statement',
      source: 'Bank A',
      reminderType: 'upcoming',
      urgency: 'low',
      message: { title: 'Test', body: 'Test' },
      actions: [],
      scheduledFor: new Date().toISOString(),
    },
    {
      id: '2',
      missingDocumentId: 'm2',
      documentType: 'bank_statement',
      source: 'Bank B',
      reminderType: 'overdue',
      urgency: 'high',
      message: { title: 'Test', body: 'Test' },
      actions: [],
      scheduledFor: new Date().toISOString(),
    },
    {
      id: '3',
      missingDocumentId: 'm3',
      documentType: 'dividend_statement',
      source: 'Company X',
      reminderType: 'overdue',
      urgency: 'critical',
      message: { title: 'Test', body: 'Test' },
      actions: [],
      scheduledFor: new Date().toISOString(),
    },
  ];

  describe('groupRemindersByUrgency', () => {
    it('should group reminders by urgency level', () => {
      const grouped = groupRemindersByUrgency(mockReminders);

      expect(grouped.low?.length).toBe(1);
      expect(grouped.high?.length).toBe(1);
      expect(grouped.critical?.length).toBe(1);
      expect(grouped.medium?.length || 0).toBe(0);
    });
  });

  describe('groupRemindersByType', () => {
    it('should group reminders by document type', () => {
      const grouped = groupRemindersByType(mockReminders);

      expect(grouped.bank_statement.length).toBe(2);
      expect(grouped.dividend_statement.length).toBe(1);
    });
  });
});

// ============================================================================
// MESSAGE GENERATION TESTS
// ============================================================================

describe('Reminder Message Generation', () => {
  it('should generate different messages for different reminder types', async () => {
    const reminders = [
      createMockMissing({ isMissing: false, source: 'Upcoming Bank' }),
      createMockMissing({ isMissing: true, daysOverdue: 5, source: 'Overdue Bank' }),
      createMockMissing({ isMissing: true, daysOverdue: 20, source: 'Critical Bank' }),
    ];

    const result = await generateReminders(reminders);

    const upcomingMessage = result.reminders.find(r => r.reminderType === 'upcoming')?.message;
    const overdueMessage = result.reminders.find(r => r.reminderType === 'overdue')?.message;
    const finalMessage = result.reminders.find(r => r.reminderType === 'final_notice')?.message;

    expect(upcomingMessage?.title).toContain('Expected');
    expect(overdueMessage?.title).toContain('Overdue');
    expect(finalMessage?.title).toContain('Final Notice');
  });

  it('should include source name in messages', async () => {
    const missing = createMockMissing({ source: 'Specific Bank Name' });
    const result = await generateReminders([missing]);

    expect(result.reminders[0].message.body).toContain('Specific Bank Name');
  });

  it('should include days information in reminder details', async () => {
    const missing = createMockMissing({ 
      isMissing: true, 
      daysOverdue: 7,
      source: 'Test Bank'
    });
    const result = await generateReminders([missing]);

    // For overdue reminders, days are in the details field
    const overdueReminder = result.reminders.find(r => r.reminderType === 'overdue');
    expect(overdueReminder?.message.details).toContain('7');
  });
});