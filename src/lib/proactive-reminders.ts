/**
 * Proactive Reminder Engine
 * 
 * Intelligent notification system for Tally that monitors:
 * - EOFY approaching alerts
 * - Missing document detection
 * - Dividend expectations
 * - Optimization opportunities
 * - Tax deadline reminders
 * 
 * @module proactive-reminders
 */

import { format, addDays, differenceInDays, isBefore, startOfDay } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

/** Legacy reminder type - for backward compatibility */
export type ReminderType = 
  | 'eofy_approaching'
  | 'missing_document'
  | 'dividend_expected'
  | 'optimization_opportunity'
  | 'tax_deadline'
  | 'document_pattern'
  | 'review_suggested';

/** New unified reminder types for database storage */
export type ProactiveReminderType = 
  | 'eofy_countdown'
  | 'missing_document'
  | 'expected_dividend'
  | 'optimization_opportunity'
  | 'deadline_approaching'
  | 'receipt_upload';

export type ReminderPriority = 'critical' | 'high' | 'medium' | 'low';

export type ReminderStatus = 'active' | 'dismissed' | 'completed' | 'snoozed';

export type ReminderDisplayType = 'card' | 'banner' | 'toast' | 'badge';

/** Legacy Reminder interface - for backward compatibility */
export interface Reminder {
  id: string;
  type: ReminderType;
  priority: ReminderPriority;
  title: string;
  message: string;
  context?: Record<string, unknown> | EOFYContext | MissingDocumentContext | DividendExpectedContext | OptimizationOpportunityContext;
  actionLabel?: string;
  actionRoute?: string;
  dismissedAt?: string;
  completedAt?: string;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

/** Enhanced ProactiveReminder for database storage */
export interface ProactiveReminder {
  id: string;
  type: ProactiveReminderType;
  priority: ReminderPriority;
  status: ReminderStatus;
  title: string;
  message: string;
  details?: string;
  actionLabel?: string;
  actionRoute?: string;
  actionData?: Record<string, unknown>;
  createdAt: string;
  scheduledFor: string;
  expiresAt?: string;
  snoozedUntil?: string;
  dismissedAt?: string;
  completedAt?: string;
  sourceId?: string;
  sourceType?: string;
  relatedIds?: string[];
  tags?: string[];
  acknowledged: boolean;
  acknowledgedAt?: string;
  interactionCount: number;
  lastInteractionAt?: string;
  displayTypes: ReminderDisplayType[];
  batchKey?: string;
}

/** User preferences for reminders */
export interface ReminderPreferences {
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxRemindersPerDay: number;
  batchSimilarReminders: boolean;
  eofyStages: number[];
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  snoozeDefaults: {
    '1hour': boolean;
    '4hours': boolean;
    '1day': boolean;
    '1week': boolean;
  };
  types: Record<ProactiveReminderType, {
    enabled: boolean;
    priority: ReminderPriority;
    advanceNoticeDays: number;
    displayTypes: ReminderDisplayType[];
    maxPerWeek: number;
  }>;
}

export interface ReminderConfig {
  eofyWarningDays: number[];
  missingDocumentThresholdDays: number;
  dividendGracePeriodDays: number;
  optimizationReviewIntervalDays: number;
  quietHoursStart: number; // 0-23
  quietHoursEnd: number; // 0-23
  maxActiveReminders: number;
}

export interface EOFYContext {
  financialYear: number;
  daysUntilEOFY: number;
  documentsUploaded: number;
  estimatedDocumentsNeeded: number;
  completionPercentage: number;
}

export interface MissingDocumentContext {
  documentType: string;
  lastUploadDate: string;
  expectedFrequency: 'monthly' | 'quarterly' | 'yearly';
  missingMonths: string[];
  confidence: number;
}

export interface DividendExpectedContext {
  companyName: string;
  asxCode: string;
  expectedAmount: number;
  expectedDate: string;
  patternConfidence: number;
  lastPaymentDate: string;
}

export interface OptimizationOpportunityContext {
  opportunityType: string;
  estimatedTaxSavings: number;
  categoryCode?: string;
  actionItems: string[];
  deadline?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  eofyWarningDays: [90, 60, 30, 14, 7, 1],
  missingDocumentThresholdDays: 45,
  dividendGracePeriodDays: 14,
  optimizationReviewIntervalDays: 30,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8,    // 8 AM
  maxActiveReminders: 10,
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  maxRemindersPerDay: 10,
  batchSimilarReminders: true,
  eofyStages: [90, 60, 30, 14, 7],
  channels: {
    inApp: true,
    email: false,
    push: false,
  },
  snoozeDefaults: {
    '1hour': true,
    '4hours': true,
    '1day': true,
    '1week': false,
  },
  types: {
    eofy_countdown: {
      enabled: true,
      priority: 'high',
      advanceNoticeDays: 90,
      displayTypes: ['card', 'banner'],
      maxPerWeek: 1,
    },
    missing_document: {
      enabled: true,
      priority: 'high',
      advanceNoticeDays: 7,
      displayTypes: ['card', 'toast'],
      maxPerWeek: 5,
    },
    expected_dividend: {
      enabled: true,
      priority: 'medium',
      advanceNoticeDays: 14,
      displayTypes: ['card'],
      maxPerWeek: 3,
    },
    optimization_opportunity: {
      enabled: true,
      priority: 'medium',
      advanceNoticeDays: 30,
      displayTypes: ['card', 'banner'],
      maxPerWeek: 2,
    },
    deadline_approaching: {
      enabled: true,
      priority: 'critical',
      advanceNoticeDays: 30,
      displayTypes: ['card', 'banner', 'toast'],
      maxPerWeek: 10,
    },
    receipt_upload: {
      enabled: true,
      priority: 'low',
      advanceNoticeDays: 7,
      displayTypes: ['card'],
      maxPerWeek: 3,
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function generateReminderId(type: ReminderType | ProactiveReminderType, context: string): string {
  return `${type}_${context}_${Date.now()}`;
}

export function getFinancialYear(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  // In Australia, FY runs July 1 - June 30
  return month >= 6 ? year + 1 : year;
}

export function getEOFYDate(financialYear: number): Date {
  // EOFY is June 30 of the financial year
  // FY 2026 ends on June 30, 2026
  return new Date(financialYear, 5, 30, 0, 0, 0, 0);
}

export function isInQuietHours(config: ReminderConfig, date: Date = new Date()): boolean {
  const hour = date.getHours();
  if (config.quietHoursStart > config.quietHoursEnd) {
    // Overnight quiet hours (e.g., 22:00 - 08:00)
    return hour >= config.quietHoursStart || hour < config.quietHoursEnd;
  }
  return hour >= config.quietHoursStart && hour < config.quietHoursEnd;
}

/**
 * Format a reminder for display
 */
export function formatReminder(reminder: ProactiveReminder): {
  formattedDate: string;
  formattedTime: string;
  relativeTime: string;
  priorityLabel: string;
  typeLabel: string;
} {
  const scheduledDate = new Date(reminder.scheduledFor);
  const now = new Date();
  const daysDiff = differenceInDays(scheduledDate, now);

  let relativeTime: string;
  if (daysDiff === 0) {
    relativeTime = 'Today';
  } else if (daysDiff === 1) {
    relativeTime = 'Tomorrow';
  } else if (daysDiff === -1) {
    relativeTime = 'Yesterday';
  } else if (daysDiff > 0) {
    relativeTime = `In ${daysDiff} days`;
  } else {
    relativeTime = `${Math.abs(daysDiff)} days ago`;
  }

  const priorityLabels: Record<ReminderPriority, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const typeLabels: Record<ProactiveReminderType, string> = {
    eofy_countdown: 'EOFY Countdown',
    missing_document: 'Missing Document',
    expected_dividend: 'Expected Dividend',
    optimization_opportunity: 'Optimization Opportunity',
    deadline_approaching: 'Deadline Approaching',
    receipt_upload: 'Receipt Upload',
  };

  return {
    formattedDate: format(scheduledDate, 'MMM d, yyyy'),
    formattedTime: format(scheduledDate, 'h:mm a'),
    relativeTime,
    priorityLabel: priorityLabels[reminder.priority],
    typeLabel: typeLabels[reminder.type],
  };
}

/**
 * Convert legacy Reminder to ProactiveReminder
 */
export function toProactiveReminder(reminder: Reminder): ProactiveReminder {
  const typeMap: Record<ReminderType, ProactiveReminderType> = {
    eofy_approaching: 'eofy_countdown',
    missing_document: 'missing_document',
    dividend_expected: 'expected_dividend',
    optimization_opportunity: 'optimization_opportunity',
    tax_deadline: 'deadline_approaching',
    document_pattern: 'receipt_upload',
    review_suggested: 'receipt_upload',
  };

  return {
    id: reminder.id,
    type: typeMap[reminder.type],
    priority: reminder.priority,
    status: reminder.dismissedAt ? 'dismissed' : reminder.completedAt ? 'completed' : reminder.snoozedUntil ? 'snoozed' : 'active',
    title: reminder.title,
    message: reminder.message,
    details: reminder.context ? JSON.stringify(reminder.context) : undefined,
    actionLabel: reminder.actionLabel,
    actionRoute: reminder.actionRoute,
    createdAt: reminder.createdAt,
    scheduledFor: reminder.createdAt,
    snoozedUntil: reminder.snoozedUntil,
    dismissedAt: reminder.dismissedAt,
    completedAt: reminder.completedAt,
    acknowledged: false,
    interactionCount: 0,
    displayTypes: ['card'],
  };
}

/**
 * Convert ProactiveReminder to legacy Reminder
 */
export function toLegacyReminder(reminder: ProactiveReminder): Reminder {
  const typeMap: Record<ProactiveReminderType, ReminderType> = {
    eofy_countdown: 'eofy_approaching',
    missing_document: 'missing_document',
    expected_dividend: 'dividend_expected',
    optimization_opportunity: 'optimization_opportunity',
    deadline_approaching: 'tax_deadline',
    receipt_upload: 'document_pattern',
  };

  return {
    id: reminder.id,
    type: typeMap[reminder.type],
    priority: reminder.priority,
    title: reminder.title,
    message: reminder.message,
    context: reminder.actionData,
    actionLabel: reminder.actionLabel,
    actionRoute: reminder.actionRoute,
    dismissedAt: reminder.dismissedAt,
    completedAt: reminder.completedAt,
    snoozedUntil: reminder.snoozedUntil,
    createdAt: reminder.createdAt,
    updatedAt: reminder.lastInteractionAt || reminder.createdAt,
  };
}

// ============================================================================
// Reminder Generation Rules
// ============================================================================

/**
 * Generate EOFY approaching reminders
 */
export function generateEOFYReminders(
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = [];
  const fy = getFinancialYear(currentDate);
  const eofyDate = getEOFYDate(fy);
  
  // Normalize dates to start of day for accurate comparison
  const normalizedCurrent = startOfDay(currentDate);
  const normalizedEOFY = startOfDay(eofyDate);
  const daysUntil = differenceInDays(normalizedEOFY, normalizedCurrent);

  // Check if we're at or within a warning threshold
  // Handle EOFY day (daysUntil = 0) as a special case
  const isEOFYDay = daysUntil === 0;
  const triggeredThreshold = config.eofyWarningDays.find(days => daysUntil <= days && daysUntil > days - 1);
  
  if ((triggeredThreshold !== undefined || isEOFYDay) && daysUntil >= 0) {
    const urgency: ReminderPriority = daysUntil <= 7 ? 'critical' : daysUntil <= 30 ? 'high' : 'medium';
    
    reminders.push({
      id: generateReminderId('eofy_approaching', `fy${fy}_${daysUntil}days`),
      type: 'eofy_approaching',
      priority: urgency,
      title: daysUntil === 0 
        ? '📅 EOFY is TODAY!' 
        : `📅 EOFY in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      message: daysUntil <= 7
        ? `End of financial year ${fy} is approaching fast. Finalize your tax documents now to avoid last-minute stress.`
        : `End of financial year ${fy} is on June 30. Start organizing your receipts and documents for a smoother tax time.`,
      context: {
        financialYear: fy,
        daysUntilEOFY: daysUntil,
      } as EOFYContext,
      actionLabel: 'View Documents',
      actionRoute: '/documents',
      createdAt: currentDate.toISOString(),
      updatedAt: currentDate.toISOString(),
    });
  }

  return reminders;
}

/**
 * Generate missing document reminders based on upload patterns
 */
export function generateMissingDocumentReminders(
  uploadHistory: Array<{ date: string; type: string }>,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = [];
  
  // Group uploads by type and find patterns
  const uploadsByType = uploadHistory.reduce((acc, upload) => {
    if (!acc[upload.type]) acc[upload.type] = [];
    acc[upload.type].push(new Date(upload.date));
    return acc;
  }, {} as Record<string, Date[]>);

  for (const [docType, dates] of Object.entries(uploadsByType)) {
    if (dates.length < 2) continue; // Need at least 2 uploads to detect pattern

    dates.sort((a, b) => b.getTime() - a.getTime());
    const lastUpload = dates[0];
    const daysSinceUpload = differenceInDays(currentDate, lastUpload);

    // Calculate average gap between uploads
    const gaps: number[] = [];
    for (let i = 0; i < dates.length - 1; i++) {
      gaps.push(differenceInDays(dates[i], dates[i + 1]));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // If it's been longer than expected, create reminder
    if (daysSinceUpload > avgGap * 1.5 && daysSinceUpload > config.missingDocumentThresholdDays) {
      const confidence = Math.min(0.95, daysSinceUpload / (avgGap * 2));
      
      reminders.push({
        id: generateReminderId('missing_document', `${docType}_${lastUpload.toISOString()}`),
        type: 'missing_document',
        priority: confidence > 0.8 ? 'high' : 'medium',
        title: `📄 Missing ${docType} documents?`,
        message: `It's been ${daysSinceUpload} days since your last ${docType} upload. Based on your pattern, you might have new documents to add.`,
        context: {
          documentType: docType,
          lastUploadDate: lastUpload.toISOString(),
          expectedFrequency: avgGap <= 35 ? 'monthly' : avgGap <= 100 ? 'quarterly' : 'yearly',
          confidence,
        } as MissingDocumentContext,
        actionLabel: 'Upload Documents',
        actionRoute: '/upload',
        createdAt: currentDate.toISOString(),
        updatedAt: currentDate.toISOString(),
      });
    }
  }

  return reminders;
}

/**
 * Generate dividend expectation reminders based on payment patterns
 */
export function generateDividendExpectedReminders(
  holdings: Array<{
    companyName: string;
    asxCode: string;
    paymentHistory: Array<{ date: string; amount: number }>;
  }>,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = [];

  for (const holding of holdings) {
    if (holding.paymentHistory.length < 2) continue;

    // Sort by date descending
    const sorted = [...holding.paymentHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastPayment = sorted[0];
    const lastDate = new Date(lastPayment.date);
    
    // Calculate average gap between payments
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      gaps.push(differenceInDays(
        new Date(sorted[i].date),
        new Date(sorted[i + 1].date)
      ));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    
    // Predict next payment date
    const expectedNextDate = addDays(lastDate, Math.round(avgGap));
    const daysUntilExpected = differenceInDays(expectedNextDate, currentDate);
    
    // If we're within the grace period before expected date
    if (daysUntilExpected >= -config.dividendGracePeriodDays && daysUntilExpected <= config.dividendGracePeriodDays) {
      const avgAmount = sorted.reduce((sum, p) => sum + p.amount, 0) / sorted.length;
      
      reminders.push({
        id: generateReminderId('dividend_expected', `${holding.asxCode}_${expectedNextDate.toISOString()}`),
        type: 'dividend_expected',
        priority: daysUntilExpected < 0 ? 'high' : 'medium',
        title: `💰 Dividend from ${holding.companyName} expected`,
        message: daysUntilExpected < 0
          ? `${holding.companyName} (${holding.asxCode}) dividend was expected ${Math.abs(daysUntilExpected)} days ago. Check your bank account and upload the statement when ready.`
          : `${holding.companyName} (${holding.asxCode}) dividend expected around ${format(expectedNextDate, 'MMM d')}. Keep an eye out for the payment.`,
        context: {
          companyName: holding.companyName,
          asxCode: holding.asxCode,
          expectedAmount: avgAmount,
          expectedDate: expectedNextDate.toISOString(),
          patternConfidence: Math.min(0.95, sorted.length / 10),
          lastPaymentDate: lastPayment.date,
        } as DividendExpectedContext,
        actionLabel: 'View Dividends',
        actionRoute: '/dividends',
        createdAt: currentDate.toISOString(),
        updatedAt: currentDate.toISOString(),
      });
    }
  }

  return reminders;
}

/**
 * Generate optimization opportunity reminders
 */
export function generateOptimizationReminders(
  opportunities: Array<{
    type: string;
    estimatedSavings: number;
    categoryCode?: string;
    actionItems: string[];
    discoveredAt: string;
  }>,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = [];

  for (const opp of opportunities) {
    const discovered = new Date(opp.discoveredAt);
    const daysSinceDiscovery = differenceInDays(currentDate, discovered);

    // Only remind if not recently reminded
    if (daysSinceDiscovery % config.optimizationReviewIntervalDays === 0) {
      const priority: ReminderPriority = opp.estimatedSavings > 500 ? 'high' : 
                                        opp.estimatedSavings > 100 ? 'medium' : 'low';

      reminders.push({
        id: generateReminderId('optimization_opportunity', `${opp.type}_${discovered.toISOString()}`),
        type: 'optimization_opportunity',
        priority,
        title: `💡 Save $${opp.estimatedSavings.toFixed(0)} on your tax`,
        message: `We found a potential tax optimization: ${opp.type}. Taking action could save you approximately $${opp.estimatedSavings.toFixed(0)}.`,
        context: {
          opportunityType: opp.type,
          estimatedTaxSavings: opp.estimatedSavings,
          categoryCode: opp.categoryCode,
          actionItems: opp.actionItems,
        } as OptimizationOpportunityContext,
        actionLabel: 'View Opportunity',
        actionRoute: '/optimization',
        createdAt: currentDate.toISOString(),
        updatedAt: currentDate.toISOString(),
      });
    }
  }

  return reminders;
}

/**
 * Generate tax deadline reminders
 */
export function generateTaxDeadlineReminders(
  deadlines: Array<{
    type: string;
    date: string;
    description: string;
  }>,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  const reminders: Reminder[] = [];

  for (const deadline of deadlines) {
    const deadlineDate = new Date(deadline.date);
    const daysUntil = differenceInDays(deadlineDate, currentDate);

    // Remind at 30, 14, 7, and 1 day(s) before
    if ([30, 14, 7, 1].includes(daysUntil) && daysUntil >= 0) {
      reminders.push({
        id: generateReminderId('tax_deadline', `${deadline.type}_${deadline.date}`),
        type: 'tax_deadline',
        priority: daysUntil <= 7 ? 'critical' : 'high',
        title: daysUntil === 1 ? '⚠️ Tax deadline TOMORROW' : `⏰ Tax deadline in ${daysUntil} days`,
        message: `${deadline.description} is due on ${format(deadlineDate, 'MMMM d, yyyy')}. Don't miss this important ATO deadline.`,
        context: {
          deadlineType: deadline.type,
          deadlineDate: deadline.date,
          daysUntil,
        },
        actionLabel: 'View Calendar',
        actionRoute: '/tax-calendar',
        createdAt: currentDate.toISOString(),
        updatedAt: currentDate.toISOString(),
      });
    }
  }

  return reminders;
}

// ============================================================================
// Reminder Engine Core
// ============================================================================

export interface ReminderEngineInput {
  uploadHistory?: Array<{ date: string; type: string }>;
  holdings?: Array<{
    companyName: string;
    asxCode: string;
    paymentHistory: Array<{ date: string; amount: number }>;
  }>;
  opportunities?: Array<{
    type: string;
    estimatedSavings: number;
    categoryCode?: string;
    actionItems: string[];
    discoveredAt: string;
  }>;
  deadlines?: Array<{
    type: string;
    date: string;
    description: string;
  }>;
  existingReminders?: Reminder[];
}

/**
 * Main reminder engine - generates all reminders based on input data
 */
export function generateReminders(
  input: ReminderEngineInput,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  const allReminders: Reminder[] = [];

  // EOFY reminders
  allReminders.push(...generateEOFYReminders(config, currentDate));

  // Missing document reminders
  if (input.uploadHistory && input.uploadHistory.length > 0) {
    allReminders.push(...generateMissingDocumentReminders(input.uploadHistory, config, currentDate));
  }

  // Dividend expected reminders
  if (input.holdings && input.holdings.length > 0) {
    allReminders.push(...generateDividendExpectedReminders(input.holdings, config, currentDate));
  }

  // Optimization opportunity reminders
  if (input.opportunities && input.opportunities.length > 0) {
    allReminders.push(...generateOptimizationReminders(input.opportunities, config, currentDate));
  }

  // Tax deadline reminders
  if (input.deadlines && input.deadlines.length > 0) {
    allReminders.push(...generateTaxDeadlineReminders(input.deadlines, config, currentDate));
  }

  // Filter out duplicates and existing reminders
  const existingIds = new Set(input.existingReminders?.map(r => r.id) || []);
  const newReminders = allReminders.filter(r => !existingIds.has(r.id));

  // Sort by priority and limit
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  newReminders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return newReminders.slice(0, config.maxActiveReminders);
}

/**
 * Check if a reminder should be shown (not snoozed, not in quiet hours)
 */
export function shouldShowReminder(
  reminder: Reminder,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): boolean {
  // Check if dismissed or completed
  if (reminder.dismissedAt || reminder.completedAt) return false;

  // Check if snoozed
  if (reminder.snoozedUntil && isBefore(currentDate, new Date(reminder.snoozedUntil))) {
    return false;
  }

  // Check quiet hours (skip for critical reminders)
  if (reminder.priority !== 'critical' && isInQuietHours(config, currentDate)) {
    return false;
  }

  return true;
}

/**
 * Get active reminders that should be displayed
 */
export function getActiveReminders(
  reminders: Reminder[],
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  currentDate: Date = new Date()
): Reminder[] {
  return reminders
    .filter(r => shouldShowReminder(r, config, currentDate))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

// ============================================================================
// Reminder Actions
// ============================================================================

export function dismissReminder(reminder: Reminder, currentDate: Date = new Date()): Reminder {
  return {
    ...reminder,
    dismissedAt: currentDate.toISOString(),
    updatedAt: currentDate.toISOString(),
  };
}

export function completeReminder(reminder: Reminder, currentDate: Date = new Date()): Reminder {
  return {
    ...reminder,
    completedAt: currentDate.toISOString(),
    updatedAt: currentDate.toISOString(),
  };
}

export function snoozeReminder(
  reminder: Reminder, 
  days: number, 
  currentDate: Date = new Date()
): Reminder {
  const snoozedUntil = addDays(currentDate, days);
  return {
    ...reminder,
    snoozedUntil: snoozedUntil.toISOString(),
    updatedAt: currentDate.toISOString(),
  };
}

// ============================================================================
// Stats and Analytics
// ============================================================================

export interface ReminderStats {
  totalReminders: number;
  activeCount: number;
  dismissedCount: number;
  completedCount: number;
  snoozedCount: number;
  byType: Record<ReminderType, number>;
  byPriority: Record<ReminderPriority, number>;
  completionRate: number;
  averageResponseTimeHours?: number;
}

export function calculateReminderStats(reminders: Reminder[]): ReminderStats {
  const activeCount = reminders.filter(r => !r.dismissedAt && !r.completedAt).length;
  const dismissedCount = reminders.filter(r => r.dismissedAt).length;
  const completedCount = reminders.filter(r => r.completedAt).length;
  const snoozedCount = reminders.filter(r => r.snoozedUntil && !r.dismissedAt && !r.completedAt).length;

  const byType = reminders.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<ReminderType, number>);

  const byPriority = reminders.reduce((acc, r) => {
    acc[r.priority] = (acc[r.priority] || 0) + 1;
    return acc;
  }, {} as Record<ReminderPriority, number>);

  const respondedCount = dismissedCount + completedCount;
  const completionRate = reminders.length > 0 ? (completedCount / reminders.length) * 100 : 0;

  return {
    totalReminders: reminders.length,
    activeCount,
    dismissedCount,
    completedCount,
    snoozedCount,
    byType,
    byPriority,
    completionRate: Math.round(completionRate * 100) / 100,
  };
}

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Create a ProactiveReminder for database storage
 */
export function createProactiveReminder(
  type: ProactiveReminderType,
  priority: ReminderPriority,
  title: string,
  message: string,
  options: {
    details?: string;
    actionLabel?: string;
    actionRoute?: string;
    actionData?: Record<string, unknown>;
    sourceId?: string;
    sourceType?: string;
    tags?: string[];
    scheduledFor?: Date;
    expiresAt?: Date;
  } = {}
): ProactiveReminder {
  const now = new Date();
  const id = generateReminderId(type, `${options.sourceId || 'manual'}_${now.getTime()}`);

  return {
    id,
    type,
    priority,
    status: 'active',
    title,
    message,
    details: options.details,
    actionLabel: options.actionLabel,
    actionRoute: options.actionRoute,
    actionData: options.actionData,
    createdAt: now.toISOString(),
    scheduledFor: (options.scheduledFor || now).toISOString(),
    expiresAt: options.expiresAt?.toISOString(),
    sourceId: options.sourceId,
    sourceType: options.sourceType,
    tags: options.tags,
    acknowledged: false,
    interactionCount: 0,
    displayTypes: ['card'],
  };
}

/**
 * Snooze duration helpers
 */
export const SNOOZE_DURATION_MINUTES: Record<'1hour' | '4hours' | '1day' | '1week', number> = {
  '1hour': 60,
  '4hours': 240,
  '1day': 1440,
  '1week': 10080,
};

/**
 * Calculate snooze until date from duration label
 */
export function calculateSnoozeUntil(duration: '1hour' | '4hours' | '1day' | '1week', from: Date = new Date()): Date {
  const minutes = SNOOZE_DURATION_MINUTES[duration];
  return addDays(from, minutes / 1440);
}
