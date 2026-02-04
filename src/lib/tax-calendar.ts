/**
 * Tax Calendar Engine
 * 
 * Core functionality for managing ATO tax deadlines and reminders.
 * Handles quarterly BAS, PAYG summaries, tax returns, and custom deadlines.
 */

// ============= TYPES =============

export type DeadlineType = 'BAS' | 'PAYG' | 'TAX_RETURN' | 'CUSTOM';

export type DeadlineStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed' | 'dismissed';

export type ReminderAdvance = 7 | 14 | 30 | 60;

export interface TaxDeadline {
  id: string;
  type: DeadlineType;
  title: string;
  description: string;
  dueDate: Date;
  financialYear: number;
  quarter?: number; // 1-4 for BAS quarters
  status: DeadlineStatus;
  completedAt?: Date;
  remindersSent: ReminderAdvance[];
  metadata?: Record<string, unknown>;
}

export interface CustomDeadline {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  financialYear: number;
  status: DeadlineStatus;
  completedAt?: Date;
  remindersSent: ReminderAdvance[];
  createdAt: Date;
}

export interface ReminderSettings {
  id?: number;
  enabled: boolean;
  advanceDays: ReminderAdvance[];
  notifyBAS: boolean;
  notifyPAYG: boolean;
  notifyTaxReturn: boolean;
  notifyCustom: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  deadlines: TaxDeadline[];
  hasOverdue: boolean;
  hasDueSoon: boolean;
}

export interface UpcomingDeadline {
  deadline: TaxDeadline;
  daysUntil: number;
  isOverdue: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

// ============= ATO DEADLINE DEFINITIONS =============

/**
 * BAS Quarterly Deadlines (Australian Tax Office)
 * - Q1 (Jul-Sep): Due October 28
 * - Q2 (Oct-Dec): Due February 28
 * - Q3 (Jan-Mar): Due April 28
 * - Q4 (Apr-Jun): Due July 28
 */
export const BAS_QUARTERS = [
  { quarter: 1, name: 'Jul-Sep', month: 9, day: 28 },  // October 28
  { quarter: 2, name: 'Oct-Dec', month: 1, day: 28 },  // February 28
  { quarter: 3, name: 'Jan-Mar', month: 3, day: 28 },  // April 28
  { quarter: 4, name: 'Apr-Jun', month: 6, day: 28 },  // July 28
] as const;

/**
 * PAYG Payment Summary Deadline
 * - July 14 each year
 */
export const PAYG_DEADLINE = { month: 6, day: 14 }; // July 14

/**
 * Tax Return Deadline
 * - October 31 each year
 */
export const TAX_RETURN_DEADLINE = { month: 9, day: 31 }; // October 31

// ============= FINANCIAL YEAR HELPERS =============

/**
 * Get the current Australian financial year
 * Financial year runs July 1 - June 30
 */
export function getCurrentFinancialYear(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 6 ? year : year - 1;
}

/**
 * Get financial year dates
 */
export function getFinancialYearDates(financialYear: number): {
  startDate: Date;
  endDate: Date;
} {
  return {
    startDate: new Date(financialYear, 6, 1),    // July 1
    endDate: new Date(financialYear + 1, 5, 30), // June 30
  };
}

/**
 * Get the quarter (1-4) for a given date
 */
export function getQuarterForDate(date: Date): number {
  const month = date.getMonth();
  if (month >= 6 && month <= 8) return 1;  // Jul-Sep
  if (month >= 9 && month <= 11) return 2; // Oct-Dec
  if (month >= 0 && month <= 2) return 3;  // Jan-Mar
  return 4;                                 // Apr-Jun
}

/**
 * Get quarter name
 */
export function getQuarterName(quarter: number): string {
  const names = ['', 'Jul-Sep', 'Oct-Dec', 'Jan-Mar', 'Apr-Jun'];
  return names[quarter] || '';
}

// ============= DEADLINE GENERATION =============

/**
 * Generate BAS deadline for a specific quarter and financial year
 */
export function generateBASDeadline(
  quarter: number,
  financialYear: number
): TaxDeadline | null {
  const quarterDef = BAS_QUARTERS.find(q => q.quarter === quarter);
  if (!quarterDef) return null;

  // Determine the year for the deadline
  let deadlineYear: number;
  if (quarter <= 2) {
    // Q1 and Q2 deadlines are in the same calendar year as FY start
    deadlineYear = financialYear + 1;
  } else {
    // Q3 and Q4 deadlines are in the calendar year after FY start
    deadlineYear = financialYear + 1;
  }

  // Q2 is February - need special handling for leap years
  let day: number = quarterDef.day;
  if (quarter === 2) {
    // Check if it's a leap year
    const isLeapYear = (deadlineYear % 4 === 0 && deadlineYear % 100 !== 0) || (deadlineYear % 400 === 0);
    if (isLeapYear && day === 28) {
      day = 29; // February 29 in leap years
    }
  }

  const dueDate = new Date(deadlineYear, quarterDef.month, day);

  return {
    id: `bas-${financialYear}-q${quarter}`,
    type: 'BAS',
    title: `BAS Quarter ${quarter} (${quarterDef.name})`,
    description: `Business Activity Statement for ${quarterDef.name} ${financialYear}/${financialYear + 1}`,
    dueDate,
    financialYear,
    quarter,
    status: 'upcoming',
    remindersSent: [],
  };
}

/**
 * Generate all BAS deadlines for a financial year
 */
export function generateBASDeadlinesForYear(financialYear: number): TaxDeadline[] {
  return BAS_QUARTERS
    .map(q => generateBASDeadline(q.quarter, financialYear))
    .filter((d): d is TaxDeadline => d !== null);
}

/**
 * Generate PAYG payment summary deadline
 */
export function generatePAYGDeadline(financialYear: number): TaxDeadline {
  // PAYG deadline is July 14 of the year after the financial year ends
  const deadlineYear = financialYear + 1;
  const dueDate = new Date(deadlineYear, PAYG_DEADLINE.month, PAYG_DEADLINE.day);

  return {
    id: `payg-${financialYear}`,
    type: 'PAYG',
    title: 'PAYG Payment Summaries Due',
    description: `Submit PAYG payment summaries to ATO for FY ${financialYear}/${financialYear + 1}`,
    dueDate,
    financialYear,
    status: 'upcoming',
    remindersSent: [],
  };
}

/**
 * Generate Tax Return deadline
 */
export function generateTaxReturnDeadline(financialYear: number): TaxDeadline {
  // Tax return deadline is October 31 of the year after the financial year ends
  const deadlineYear = financialYear + 1;
  const dueDate = new Date(deadlineYear, TAX_RETURN_DEADLINE.month, TAX_RETURN_DEADLINE.day);

  return {
    id: `tax-return-${financialYear}`,
    type: 'TAX_RETURN',
    title: 'Tax Return Due',
    description: `Lodge tax return for FY ${financialYear}/${financialYear + 1}`,
    dueDate,
    financialYear,
    status: 'upcoming',
    remindersSent: [],
  };
}

/**
 * Generate all standard ATO deadlines for a financial year
 */
export function generateAllDeadlinesForYear(financialYear: number): TaxDeadline[] {
  return [
    ...generateBASDeadlinesForYear(financialYear),
    generatePAYGDeadline(financialYear),
    generateTaxReturnDeadline(financialYear),
  ];
}

// ============= STATUS CALCULATIONS =============

/**
 * Calculate deadline status based on current date
 */
export function calculateDeadlineStatus(
  dueDate: Date,
  completedAt?: Date,
  dismissed?: boolean
): DeadlineStatus {
  if (completedAt) return 'completed';
  if (dismissed) return 'dismissed';

  const now = new Date();
  const due = new Date(dueDate);
  
  // Reset time components for date-only comparison
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (now > due) return 'overdue';

  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 7) return 'due_soon';

  return 'upcoming';
}

/**
 * Calculate days until deadline
 */
export function getDaysUntilDeadline(dueDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency level based on days until deadline
 */
export function getUrgencyLevel(daysUntil: number, isOverdue: boolean): UpcomingDeadline['urgency'] {
  if (isOverdue) return 'critical';
  if (daysUntil <= 3) return 'critical';
  if (daysUntil <= 7) return 'high';
  if (daysUntil <= 14) return 'medium';
  return 'low';
}

/**
 * Calculate upcoming deadline with urgency
 */
export function calculateUpcomingDeadline(deadline: TaxDeadline): UpcomingDeadline {
  const daysUntil = getDaysUntilDeadline(deadline.dueDate);
  const isOverdue = daysUntil < 0;
  const urgency = getUrgencyLevel(daysUntil, isOverdue);

  return {
    deadline,
    daysUntil: Math.abs(daysUntil),
    isOverdue,
    urgency,
  };
}

// ============= FILTERING & SORTING =============

/**
 * Filter deadlines by status
 */
export function filterDeadlinesByStatus(
  deadlines: TaxDeadline[],
  statuses: DeadlineStatus[]
): TaxDeadline[] {
  return deadlines.filter(d => statuses.includes(d.status));
}

/**
 * Filter deadlines by type
 */
export function filterDeadlinesByType(
  deadlines: TaxDeadline[],
  types: DeadlineType[]
): TaxDeadline[] {
  return deadlines.filter(d => types.includes(d.type));
}

/**
 * Filter deadlines by financial year
 */
export function filterDeadlinesByYear(
  deadlines: TaxDeadline[],
  financialYear: number
): TaxDeadline[] {
  return deadlines.filter(d => d.financialYear === financialYear);
}

/**
 * Get deadlines within a date range
 */
export function getDeadlinesInRange(
  deadlines: TaxDeadline[],
  startDate: Date,
  endDate: Date
): TaxDeadline[] {
  return deadlines.filter(d => {
    const due = new Date(d.dueDate);
    return due >= startDate && due <= endDate;
  });
}

/**
 * Sort deadlines by due date
 */
export function sortDeadlinesByDate(
  deadlines: TaxDeadline[],
  ascending: boolean = true
): TaxDeadline[] {
  return [...deadlines].sort((a, b) => {
    const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return ascending ? diff : -diff;
  });
}

/**
 * Sort upcoming deadlines by urgency
 */
export function sortUpcomingByUrgency(upcoming: UpcomingDeadline[]): UpcomingDeadline[] {
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...upcoming].sort((a, b) => {
    // First sort by urgency
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    
    // Then by days until (overdue first)
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    
    // Then by actual days
    return a.daysUntil - b.daysUntil;
  });
}

/**
 * Get upcoming deadlines sorted by urgency
 */
export function getUpcomingDeadlines(
  deadlines: TaxDeadline[],
  limit?: number,
  includeCompleted: boolean = false
): UpcomingDeadline[] {
  let filtered = deadlines;
  
  if (!includeCompleted) {
    filtered = deadlines.filter(d => d.status !== 'completed' && d.status !== 'dismissed');
  }

  const upcoming = filtered.map(calculateUpcomingDeadline);
  const sorted = sortUpcomingByUrgency(upcoming);
  
  return limit ? sorted.slice(0, limit) : sorted;
}

// ============= CALENDAR VIEW HELPERS =============

/**
 * Get deadlines for a specific month
 */
export function getDeadlinesForMonth(
  deadlines: TaxDeadline[],
  year: number,
  month: number
): TaxDeadline[] {
  return deadlines.filter(d => {
    const due = new Date(d.dueDate);
    return due.getFullYear() === year && due.getMonth() === month;
  });
}

/**
 * Check if a month has overdue deadlines
 */
export function monthHasOverdue(deadlines: TaxDeadline[]): boolean {
  return deadlines.some(d => d.status === 'overdue');
}

/**
 * Check if a month has deadlines due soon
 */
export function monthHasDueSoon(deadlines: TaxDeadline[]): boolean {
  return deadlines.some(d => d.status === 'due_soon');
}

/**
 * Generate calendar month data
 */
export function generateCalendarMonth(
  deadlines: TaxDeadline[],
  year: number,
  month: number
): CalendarMonth {
  const monthDeadlines = getDeadlinesForMonth(deadlines, year, month);
  
  return {
    year,
    month,
    deadlines: monthDeadlines,
    hasOverdue: monthHasOverdue(monthDeadlines),
    hasDueSoon: monthHasDueSoon(monthDeadlines),
  };
}

// ============= REMINDER LOGIC =============

/**
 * Default reminder settings
 */
export function getDefaultReminderSettings(): ReminderSettings {
  return {
    enabled: true,
    advanceDays: [7, 14, 30],
    notifyBAS: true,
    notifyPAYG: true,
    notifyTaxReturn: true,
    notifyCustom: true,
    emailNotifications: false,
    pushNotifications: true,
  };
}

/**
 * Check if a reminder should be sent
 */
export function shouldSendReminder(
  deadline: TaxDeadline,
  advanceDays: ReminderAdvance,
  settings: ReminderSettings
): boolean {
  if (!settings.enabled) return false;
  if (deadline.status === 'completed' || deadline.status === 'dismissed') return false;
  
  // Check if this reminder has already been sent
  if (deadline.remindersSent.includes(advanceDays)) return false;
  
  // Check if deadline type is enabled
  if (deadline.type === 'BAS' && !settings.notifyBAS) return false;
  if (deadline.type === 'PAYG' && !settings.notifyPAYG) return false;
  if (deadline.type === 'TAX_RETURN' && !settings.notifyTaxReturn) return false;
  if (deadline.type === 'CUSTOM' && !settings.notifyCustom) return false;
  
  // Check if we're within the reminder window
  const daysUntil = getDaysUntilDeadline(deadline.dueDate);
  return daysUntil <= advanceDays && daysUntil >= 0;
}

/**
 * Get pending reminders
 */
export function getPendingReminders(
  deadlines: TaxDeadline[],
  settings: ReminderSettings
): { deadline: TaxDeadline; advanceDays: ReminderAdvance }[] {
  const pending: { deadline: TaxDeadline; advanceDays: ReminderAdvance }[] = [];
  
  for (const deadline of deadlines) {
    for (const advanceDays of settings.advanceDays) {
      if (shouldSendReminder(deadline, advanceDays, settings)) {
        pending.push({ deadline, advanceDays });
      }
    }
  }
  
  return pending;
}

// ============= CUSTOM DEADLINES =============

let customDeadlineIdCounter = 0;

/**
 * Generate unique ID for custom deadline
 */
export function generateCustomDeadlineId(): string {
  return `custom-${Date.now()}-${++customDeadlineIdCounter}`;
}

/**
 * Create a custom deadline
 */
export function createCustomDeadline(
  title: string,
  description: string,
  dueDate: Date,
  financialYear: number
): CustomDeadline {
  return {
    id: generateCustomDeadlineId(),
    title,
    description,
    dueDate,
    financialYear,
    status: 'upcoming',
    remindersSent: [],
    createdAt: new Date(),
  };
}

/**
 * Convert custom deadline to tax deadline format
 */
export function customToTaxDeadline(custom: CustomDeadline): TaxDeadline {
  return {
    id: custom.id,
    type: 'CUSTOM',
    title: custom.title,
    description: custom.description,
    dueDate: custom.dueDate,
    financialYear: custom.financialYear,
    status: custom.status,
    completedAt: custom.completedAt,
    remindersSent: custom.remindersSent,
  };
}

// ============= UTILITY FUNCTIONS =============

/**
 * Format date for display
 */
export function formatDeadlineDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date as relative time
 */
export function formatRelativeDeadline(daysUntil: number, isOverdue: boolean): string {
  if (isOverdue) {
    return daysUntil === 1 ? '1 day overdue' : `${daysUntil} days overdue`;
  }
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  return `Due in ${daysUntil} days`;
}

/**
 * Get deadline type label
 */
export function getDeadlineTypeLabel(type: DeadlineType): string {
  const labels: Record<DeadlineType, string> = {
    BAS: 'BAS',
    PAYG: 'PAYG',
    TAX_RETURN: 'Tax Return',
    CUSTOM: 'Custom',
  };
  return labels[type];
}

/**
 * Get status label
 */
export function getStatusLabel(status: DeadlineStatus): string {
  const labels: Record<DeadlineStatus, string> = {
    upcoming: 'Upcoming',
    due_soon: 'Due Soon',
    overdue: 'Overdue',
    completed: 'Completed',
    dismissed: 'Dismissed',
  };
  return labels[status];
}

/**
 * Get status color
 */
export function getStatusColor(status: DeadlineStatus): string {
  const colors: Record<DeadlineStatus, string> = {
    upcoming: '#6b7280',    // gray-500
    due_soon: '#f59e0b',    // amber-500
    overdue: '#ef4444',     // red-500
    completed: '#22c55e',   // green-500
    dismissed: '#9ca3af',   // gray-400
  };
  return colors[status];
}

/**
 * Get urgency color
 */
export function getUrgencyColor(urgency: UpcomingDeadline['urgency']): string {
  const colors = {
    low: '#6b7280',      // gray-500
    medium: '#3b82f6',   // blue-500
    high: '#f59e0b',     // amber-500
    critical: '#ef4444', // red-500
  };
  return colors[urgency];
}

/**
 * Validate custom deadline
 */
export function validateCustomDeadline(
  title: string,
  dueDate: Date,
  financialYear: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (title && title.length > 100) {
    errors.push('Title must be 100 characters or less');
  }
  
  if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
    errors.push('Valid due date is required');
  }
  
  if (financialYear < 2000 || financialYear > 2100) {
    errors.push('Financial year must be between 2000 and 2100');
  }
  
  return { valid: errors.length === 0, errors };
}
