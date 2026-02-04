/**
 * Reminder Generation System
 * 
 * Generates reminders for missing documents and integrates with the Tax Calendar system.
 * Handles timing, scheduling, and notification delivery.
 * 
 * @module reminder-generator
 */

import type { 
  MissingDocument, 
  DocumentType,
  PatternConfidence,
  DocumentPattern 
} from './upload-patterns';
import { 
  getReminderSettings, 
  recordReminderSent, 
  getReminderCount,
  updateMissingDocumentStatus,
} from './db-upload-reminders';
import type { TaxDeadline, ReminderSettings as TaxCalendarReminderSettings } from './tax-calendar';

// ============================================================================
// TYPES
// ============================================================================

/** Generated reminder */
export interface DocumentReminder {
  id: string;
  missingDocumentId: string;
  documentType: DocumentType;
  source: string;
  reminderType: ReminderType;
  urgency: ReminderUrgency;
  message: ReminderMessage;
  actions: ReminderAction[];
  scheduledFor: string;
  expiresAt?: string;
}

/** Reminder types */
export type ReminderType = 'upcoming' | 'overdue' | 'follow_up' | 'final_notice';

/** Reminder urgency levels */
export type ReminderUrgency = 'low' | 'medium' | 'high' | 'critical';

/** Reminder message content */
export interface ReminderMessage {
  title: string;
  body: string;
  details?: string;
  hint?: string;
}

/** Reminder action */
export interface ReminderAction {
  id: string;
  label: string;
  type: 'upload' | 'dismiss' | 'snooze' | 'view';
  data?: Record<string, unknown>;
}

/** Reminder generation result */
export interface ReminderGenerationResult {
  reminders: DocumentReminder[];
  generatedAt: string;
  totalPending: number;
  totalReminders: number;
  byType: Record<ReminderType, number>;
  byUrgency: Record<ReminderUrgency, number>;
}

/** Reminder schedule configuration */
export interface ReminderSchedule {
  beforeDue: number[]; // Days before expected date to send reminders
  afterDue: number[]; // Days after expected date to send follow-ups
  maxReminders: number;
}

/** Integration with Tax Calendar */
export interface TaxCalendarIntegration {
  createDeadlineFromMissing?(
    missing: MissingDocument
  ): Promise<TaxDeadline | null>;
  linkReminderToDeadline?(
    reminderId: string, 
    deadlineId: string
  ): Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SCHEDULE: ReminderSchedule = {
  beforeDue: [7, 3, 1], // 1 week, 3 days, 1 day before
  afterDue: [1, 3, 7], // 1 day, 3 days, 1 week after
  maxReminders: 5,
};

const DOCUMENT_TYPE_SCHEDULES: Record<DocumentType, ReminderSchedule> = {
  bank_statement: {
    beforeDue: [3, 1],
    afterDue: [3, 7],
    maxReminders: 4,
  },
  dividend_statement: {
    beforeDue: [7, 3],
    afterDue: [7, 14],
    maxReminders: 4,
  },
  payg_summary: {
    beforeDue: [14, 7, 3],
    afterDue: [7, 14, 21],
    maxReminders: 6,
  },
  other: {
    beforeDue: [7, 3, 1],
    afterDue: [3, 7],
    maxReminders: 5,
  },
};

const URGENCY_THRESHOLDS = {
  upcoming: { days: 7, urgency: 'low' as ReminderUrgency },
  soon: { days: 3, urgency: 'medium' as ReminderUrgency },
  very_soon: { days: 1, urgency: 'high' as ReminderUrgency },
  overdue: { days: 0, urgency: 'critical' as ReminderUrgency },
};

// ============================================================================
// REMINDER GENERATION
// ============================================================================

/**
 * Generate reminders for missing documents
 */
export async function generateReminders(
  missingDocuments: MissingDocument[],
  options: {
    respectSettings?: boolean;
    taxCalendarIntegration?: TaxCalendarIntegration;
  } = {}
): Promise<ReminderGenerationResult> {
  const reminders: DocumentReminder[] = [];
  const byType: Record<ReminderType, number> = {
    upcoming: 0,
    overdue: 0,
    follow_up: 0,
    final_notice: 0,
  };
  const byUrgency: Record<ReminderUrgency, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const missing of missingDocuments) {
    // Check if we should generate a reminder based on settings
    if (options.respectSettings !== false) {
      const shouldRemind = await shouldGenerateReminder(missing);
      if (!shouldRemind) continue;
    }

    // Determine reminder type and urgency
    const reminderType = determineReminderType(missing);
    const urgency = determineUrgency(missing);

    // Generate the reminder
    const reminder = await createReminder(missing, reminderType, urgency);
    
    if (reminder) {
      reminders.push(reminder);
      byType[reminderType]++;
      byUrgency[urgency]++;

      // Integration with tax calendar if available
      if (options.taxCalendarIntegration?.createDeadlineFromMissing) {
        await options.taxCalendarIntegration.createDeadlineFromMissing(missing);
      }
    }
  }

  return {
    reminders,
    generatedAt: new Date().toISOString(),
    totalPending: missingDocuments.length,
    totalReminders: reminders.length,
    byType,
    byUrgency,
  };
}

/**
 * Check if we should generate a reminder based on settings
 */
async function shouldGenerateReminder(missing: MissingDocument): Promise<boolean> {
  // Get settings for this document type
  const settings = await getReminderSettings(missing.documentType);
  
  if (!settings.enabled) {
    return false;
  }

  // Check how many reminders we've already sent
  const reminderCount = await getReminderCount(missing.id);
  if (reminderCount >= settings.maxReminders) {
    return false;
  }

  return true;
}

/**
 * Determine the reminder type based on missing document state
 */
function determineReminderType(missing: MissingDocument): ReminderType {
  if (!missing.isMissing) {
    return 'upcoming';
  }

  if (missing.daysOverdue <= 7) {
    return 'overdue';
  }

  if (missing.daysOverdue <= 14) {
    return 'follow_up';
  }

  return 'final_notice';
}

/**
 * Determine urgency level
 */
function determineUrgency(missing: MissingDocument): ReminderUrgency {
  if (missing.isMissing) {
    if (missing.daysOverdue > 14) return 'critical';
    if (missing.daysOverdue > 7) return 'high';
    return 'high';
  }

  const daysUntil = Math.ceil(
    (new Date(missing.expectedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil <= 1) return 'high';
  if (daysUntil <= 3) return 'medium';
  return 'low';
}

/**
 * Create a reminder for a missing document
 */
async function createReminder(
  missing: MissingDocument,
  reminderType: ReminderType,
  urgency: ReminderUrgency
): Promise<DocumentReminder | null> {
  const message = generateReminderMessage(missing, reminderType, urgency);
  const actions = generateReminderActions(missing, reminderType);
  
  // Calculate scheduled time based on settings
  const settings = await getReminderSettings(missing.documentType);
  const scheduledFor = calculateScheduledTime(missing, reminderType, settings);

  return {
    id: generateReminderId(missing.id),
    missingDocumentId: missing.id,
    documentType: missing.documentType,
    source: missing.source,
    reminderType,
    urgency,
    message,
    actions,
    scheduledFor,
  };
}

/**
 * Generate reminder message content
 */
function generateReminderMessage(
  missing: MissingDocument,
  reminderType: ReminderType,
  urgency: ReminderUrgency
): ReminderMessage {
  const docTypeLabel = getDocumentTypeLabel(missing.documentType);
  const source = missing.source;

  switch (reminderType) {
    case 'upcoming':
      return {
        title: `${docTypeLabel} Expected Soon`,
        body: `Your ${source} ${docTypeLabel.toLowerCase()} is expected around ${formatDate(missing.expectedDate)}.`,
        details: `Based on your upload history, we expect this document to arrive soon.`,
        hint: `You'll be reminded again if it doesn't arrive on time.`,
      };

    case 'overdue':
      return {
        title: `${docTypeLabel} Overdue`,
        body: `Your ${source} ${docTypeLabel.toLowerCase()} was expected on ${formatDate(missing.expectedDate)}.`,
        details: `It's been ${missing.daysOverdue} day${missing.daysOverdue === 1 ? '' : 's'} since we expected this document.`,
        hint: `Please upload it when available or dismiss this reminder if not applicable.`,
      };

    case 'follow_up':
      return {
        title: `Reminder: ${docTypeLabel} Still Missing`,
        body: `Your ${source} ${docTypeLabel.toLowerCase()} is still overdue (${missing.daysOverdue} days).`,
        details: `This document is important for your tax preparation.`,
        hint: `If you don't have this document, you may need to contact ${source} directly.`,
      };

    case 'final_notice':
      return {
        title: `Final Notice: ${docTypeLabel} Required`,
        body: `Your ${source} ${docTypeLabel.toLowerCase()} is significantly overdue (${missing.daysOverdue} days).`,
        details: `Without this document, your tax return may be incomplete.`,
        hint: `Please upload immediately or contact your tax agent for assistance.`,
      };

    default:
      return {
        title: `Document Reminder`,
        body: `Reminder for ${source} ${docTypeLabel.toLowerCase()}.`,
      };
  }
}

/**
 * Generate reminder actions
 */
function generateReminderActions(
  missing: MissingDocument,
  reminderType: ReminderType
): ReminderAction[] {
  const actions: ReminderAction[] = [
    {
      id: 'upload',
      label: 'Upload Now',
      type: 'upload',
      data: { 
        documentType: missing.documentType, 
        source: missing.source,
        missingDocumentId: missing.id,
      },
    },
    {
      id: 'view',
      label: 'View Details',
      type: 'view',
      data: { missingDocumentId: missing.id },
    },
  ];

  if (reminderType !== 'upcoming') {
    actions.push({
      id: 'snooze',
      label: 'Remind Later',
      type: 'snooze',
      data: { missingDocumentId: missing.id, days: 3 },
    });

    actions.push({
      id: 'dismiss',
      label: 'Dismiss',
      type: 'dismiss',
      data: { missingDocumentId: missing.id },
    });
  }

  return actions;
}

/**
 * Calculate when the reminder should be sent
 */
function calculateScheduledTime(
  missing: MissingDocument,
  reminderType: ReminderType,
  settings: { reminderDaysBefore: number; reminderDaysAfter: number }
): string {
  const expectedDate = new Date(missing.expectedDate);
  const now = new Date();

  if (reminderType === 'upcoming') {
    // Schedule before the expected date
    const scheduled = new Date(expectedDate);
    scheduled.setDate(scheduled.getDate() - settings.reminderDaysBefore);
    
    // If that time has passed, send now
    if (scheduled < now) {
      return now.toISOString();
    }
    return scheduled.toISOString();
  }

  // For overdue reminders, schedule based on days after
  const scheduled = new Date(expectedDate);
  scheduled.setDate(scheduled.getDate() + settings.reminderDaysAfter);
  
  if (scheduled < now) {
    return now.toISOString();
  }
  return scheduled.toISOString();
}

// ============================================================================
// REMINDER DELIVERY
// ============================================================================

/**
 * Send a reminder through the specified channel
 */
export async function sendReminder(
  reminder: DocumentReminder,
  channel: 'app' | 'email' | 'push'
): Promise<boolean> {
  try {
    // Record that we're sending this reminder
    const reminderType = reminder.reminderType === 'upcoming' ? 'before_due' : 
                         reminder.reminderType === 'overdue' ? 'after_due' : 'follow_up';
    
    await recordReminderSent(reminder.missingDocumentId, reminderType, channel);

    // Update missing document status to reminded
    await updateMissingDocumentStatus(reminder.missingDocumentId, 'reminded');

    // In a real implementation, this would integrate with notification services
    console.log(`[Reminder] Sent ${reminder.reminderType} reminder to ${channel}:`, {
      title: reminder.message.title,
      source: reminder.source,
      documentType: reminder.documentType,
    });

    return true;
  } catch (error) {
    console.error('Error sending reminder:', error);
    return false;
  }
}

/**
 * Process all pending reminders that are due
 */
export async function processDueReminders(
  reminders: DocumentReminder[],
  options: {
    channels?: ('app' | 'email' | 'push')[];
  } = {}
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  byChannel: Record<string, number>;
}> {
  const now = new Date();
  const channels = options.channels || ['app'];
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  const byChannel: Record<string, number> = { app: 0, email: 0, push: 0 };

  for (const reminder of reminders) {
    const scheduledTime = new Date(reminder.scheduledFor);
    
    // Only process reminders that are due
    if (scheduledTime > now) continue;

    processed++;

    // Send through all specified channels
    for (const channel of channels) {
      const success = await sendReminder(reminder, channel);
      
      if (success) {
        sent++;
        byChannel[channel]++;
      } else {
        failed++;
      }
    }
  }

  return { processed, sent, failed, byChannel };
}

// ============================================================================
// TAX CALENDAR INTEGRATION
// ============================================================================

/**
 * Create a tax calendar deadline from a missing document
 */
export function createTaxDeadlineFromMissing(
  missing: MissingDocument
): {
  type: 'CUSTOM';
  title: string;
  description: string;
  dueDate: Date;
  metadata: {
    source: string;
    documentType: DocumentType;
    patternId: string;
    missingDocumentId: string;
    isUploadReminder: boolean;
  };
} | null {
  // Only create deadlines for high/medium confidence patterns
  if (missing.confidence === 'low' || missing.confidence === 'uncertain') {
    return null;
  }

  const docTypeLabel = getDocumentTypeLabel(missing.documentType);
  
  return {
    type: 'CUSTOM',
    title: `Upload ${docTypeLabel}`,
    description: `Expected ${docTypeLabel.toLowerCase()} from ${missing.source} based on historical pattern.`,
    dueDate: new Date(missing.expectedDate),
    metadata: {
      source: missing.source,
      documentType: missing.documentType,
      patternId: missing.patternId,
      missingDocumentId: missing.id,
      isUploadReminder: true,
    },
  };
}

/**
 * Check if a deadline is an upload reminder
 */
export function isUploadReminderDeadline(deadline: { metadata?: Record<string, unknown> }): boolean {
  return deadline.metadata?.isUploadReminder === true;
}

// ============================================================================
// SCHEDULING HELPERS
// ============================================================================

/**
 * Get the reminder schedule for a document type
 */
export function getReminderSchedule(documentType: DocumentType): ReminderSchedule {
  return DOCUMENT_TYPE_SCHEDULES[documentType] || DEFAULT_SCHEDULE;
}

/**
 * Calculate next reminder date for a missing document
 */
export function calculateNextReminderDate(
  missing: MissingDocument,
  reminderCount: number
): Date | null {
  const schedule = getReminderSchedule(missing.documentType);
  
  if (reminderCount >= schedule.maxReminders) {
    return null;
  }

  const expectedDate = new Date(missing.expectedDate);
  const now = new Date();

  // If not yet overdue, use beforeDue schedule
  if (!missing.isMissing) {
    const daysBefore = schedule.beforeDue[reminderCount];
    if (daysBefore === undefined) return null;
    
    const nextDate = new Date(expectedDate);
    nextDate.setDate(nextDate.getDate() - daysBefore);
    return nextDate > now ? nextDate : now;
  }

  // If overdue, use afterDue schedule
  const daysAfter = schedule.afterDue[reminderCount - schedule.beforeDue.length];
  if (daysAfter === undefined) return null;
  
  const nextDate = new Date(expectedDate);
  nextDate.setDate(nextDate.getDate() + daysAfter);
  return nextDate > now ? nextDate : now;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique reminder ID
 */
function generateReminderId(missingDocumentId: string): string {
  return `reminder-${missingDocumentId}-${Date.now()}`;
}

/**
 * Get document type label
 */
function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    bank_statement: 'Bank Statement',
    dividend_statement: 'Dividend Statement',
    payg_summary: 'PAYG Summary',
    other: 'Document',
  };
  return labels[type];
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get reminders grouped by urgency
 */
export function groupRemindersByUrgency(
  reminders: DocumentReminder[]
): Record<ReminderUrgency, DocumentReminder[]> {
  return reminders.reduce((groups, reminder) => {
    if (!groups[reminder.urgency]) {
      groups[reminder.urgency] = [];
    }
    groups[reminder.urgency].push(reminder);
    return groups;
  }, {} as Record<ReminderUrgency, DocumentReminder[]>);
}

/**
 * Get reminders grouped by document type
 */
export function groupRemindersByType(
  reminders: DocumentReminder[]
): Record<DocumentType, DocumentReminder[]> {
  return reminders.reduce((groups, reminder) => {
    if (!groups[reminder.documentType]) {
      groups[reminder.documentType] = [];
    }
    groups[reminder.documentType].push(reminder);
    return groups;
  }, {} as Record<DocumentType, DocumentReminder[]>);
}