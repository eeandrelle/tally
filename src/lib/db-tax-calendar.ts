/**
 * Database Layer for Tax Calendar
 * 
 * SQLite operations for tax calendar events, reminder settings,
 * completion tracking, and notification history.
 */

import Database from "@tauri-apps/plugin-sql";
import {
  type TaxDeadline,
  type ReminderSettings,
  type ReminderAdvance,
  type DeadlineType,
  type DeadlineStatus,
  getCurrentFinancialYear,
  generateAllDeadlinesForYear,
} from "./tax-calendar";

// ============= DATABASE SCHEMA =============

/**
 * Tax Calendar Events Table
 * Stores both standard ATO deadlines and custom deadlines
 */
interface CalendarEventRow {
  id: string;
  type: DeadlineType;
  title: string;
  description: string;
  due_date: string; // ISO date string
  financial_year: number;
  quarter: number | null;
  status: DeadlineStatus;
  completed_at: string | null;
  reminders_sent: string; // JSON array of ReminderAdvance
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Reminder Settings Table
 * Per-user notification preferences
 */
interface ReminderSettingsRow {
  id: number;
  enabled: boolean;
  advance_days: string; // JSON array
  notify_bas: boolean;
  notify_payg: boolean;
  notify_tax_return: boolean;
  notify_custom: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  updated_at: string;
}

/**
 * Notification History Table
 * Tracks sent notifications to avoid duplicates
 */
interface NotificationHistoryRow {
  id: number;
  event_id: string;
  reminder_advance: number;
  sent_at: string;
  notification_type: 'in_app' | 'email' | 'push';
  acknowledged: boolean;
}

// ============= DATABASE INITIALIZATION =============

let db: Database | null = null;

export async function initTaxCalendarDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load("sqlite:default.db");

  // Create calendar events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tax_calendar_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      financial_year INTEGER NOT NULL,
      quarter INTEGER,
      status TEXT DEFAULT 'upcoming',
      completed_at TEXT,
      reminders_sent TEXT DEFAULT '[]',
      is_custom BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create reminder settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tax_calendar_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled BOOLEAN DEFAULT 1,
      advance_days TEXT DEFAULT '[7,14,30]',
      notify_bas BOOLEAN DEFAULT 1,
      notify_payg BOOLEAN DEFAULT 1,
      notify_tax_return BOOLEAN DEFAULT 1,
      notify_custom BOOLEAN DEFAULT 1,
      email_notifications BOOLEAN DEFAULT 0,
      push_notifications BOOLEAN DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create notification history table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tax_calendar_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      reminder_advance INTEGER NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notification_type TEXT DEFAULT 'in_app',
      acknowledged BOOLEAN DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES tax_calendar_events(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_calendar_events_year 
    ON tax_calendar_events(financial_year)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_calendar_events_due_date 
    ON tax_calendar_events(due_date)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_calendar_events_status 
    ON tax_calendar_events(status)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_calendar_events_type 
    ON tax_calendar_events(type)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notifications_event 
    ON tax_calendar_notifications(event_id)
  `);

  // Insert default settings if not exists
  const settingsExists = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM tax_calendar_settings WHERE id = 1"
  );
  
  if (settingsExists[0].count === 0) {
    await db.execute(`
      INSERT INTO tax_calendar_settings (id, enabled, advance_days)
      VALUES (1, 1, '[7,14,30]')
    `);
  }

  // Seed deadlines for current and upcoming financial years
  await seedDefaultDeadlines();

  return db;
}

/**
 * Seed default ATO deadlines for current and next financial year
 */
async function seedDefaultDeadlines(): Promise<void> {
  const db = await initTaxCalendarDatabase();
  
  const currentFY = getCurrentFinancialYear();
  const years = [currentFY, currentFY + 1];

  for (const year of years) {
    const deadlines = generateAllDeadlinesForYear(year);
    
    for (const deadline of deadlines) {
      // Check if event already exists
      const existing = await db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM tax_calendar_events WHERE id = $1",
        [deadline.id]
      );
      
      if (existing[0].count === 0) {
        await db.execute(
          `INSERT INTO tax_calendar_events 
           (id, type, title, description, due_date, financial_year, quarter, status, reminders_sent, is_custom)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            deadline.id,
            deadline.type,
            deadline.title,
            deadline.description,
            deadline.dueDate.toISOString(),
            deadline.financialYear,
            deadline.quarter || null,
            deadline.status,
            JSON.stringify(deadline.remindersSent),
            false,
          ]
        );
      }
    }
  }
}

// ============= CALENDAR EVENT CRUD =============

/**
 * Get all calendar events
 */
export async function getCalendarEvents(): Promise<TaxDeadline[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<CalendarEventRow[]>(
    "SELECT * FROM tax_calendar_events ORDER BY due_date ASC"
  );
  
  return rows.map(rowToTaxDeadline);
}

/**
 * Get events for a specific financial year
 */
export async function getCalendarEventsByYear(financialYear: number): Promise<TaxDeadline[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<CalendarEventRow[]>(
    "SELECT * FROM tax_calendar_events WHERE financial_year = $1 ORDER BY due_date ASC",
    [financialYear]
  );
  
  return rows.map(rowToTaxDeadline);
}

/**
 * Get events by status
 */
export async function getCalendarEventsByStatus(status: DeadlineStatus): Promise<TaxDeadline[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<CalendarEventRow[]>(
    "SELECT * FROM tax_calendar_events WHERE status = $1 ORDER BY due_date ASC",
    [status]
  );
  
  return rows.map(rowToTaxDeadline);
}

/**
 * Get events by type
 */
export async function getCalendarEventsByType(type: DeadlineType): Promise<TaxDeadline[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<CalendarEventRow[]>(
    "SELECT * FROM tax_calendar_events WHERE type = $1 ORDER BY due_date ASC",
    [type]
  );
  
  return rows.map(rowToTaxDeadline);
}

/**
 * Get upcoming events (not completed or dismissed)
 */
export async function getUpcomingEvents(): Promise<TaxDeadline[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<CalendarEventRow[]>(
    `SELECT * FROM tax_calendar_events 
     WHERE status NOT IN ('completed', 'dismissed')
     ORDER BY due_date ASC`
  );
  
  return rows.map(rowToTaxDeadline);
}

/**
 * Get a single event by ID
 */
export async function getCalendarEventById(id: string): Promise<TaxDeadline | null> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<CalendarEventRow[]>(
    "SELECT * FROM tax_calendar_events WHERE id = $1",
    [id]
  );
  
  return rows[0] ? rowToTaxDeadline(rows[0]) : null;
}

/**
 * Create a custom deadline
 */
export async function createCustomDeadline(
  title: string,
  description: string,
  dueDate: Date,
  financialYear: number
): Promise<string> {
  const db = await initTaxCalendarDatabase();
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await db.execute(
    `INSERT INTO tax_calendar_events 
     (id, type, title, description, due_date, financial_year, status, reminders_sent, is_custom)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      'CUSTOM',
      title,
      description,
      dueDate.toISOString(),
      financialYear,
      'upcoming',
      '[]',
      true,
    ]
  );
  
  return id;
}

/**
 * Update a custom deadline
 */
export async function updateCustomDeadline(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    dueDate: Date;
    financialYear: number;
  }>
): Promise<void> {
  const db = await initTaxCalendarDatabase();
  
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (updates.title !== undefined) {
    fields.push("title = $" + (fields.length + 1));
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push("description = $" + (fields.length + 1));
    values.push(updates.description);
  }
  if (updates.dueDate !== undefined) {
    fields.push("due_date = $" + (fields.length + 1));
    values.push(updates.dueDate.toISOString());
  }
  if (updates.financialYear !== undefined) {
    fields.push("financial_year = $" + (fields.length + 1));
    values.push(updates.financialYear);
  }
  
  if (fields.length === 0) return;
  
  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);
  
  await db.execute(
    `UPDATE tax_calendar_events SET ${fields.join(", ")} WHERE id = $${values.length} AND is_custom = 1`,
    values
  );
}

/**
 * Delete a custom deadline
 */
export async function deleteCustomDeadline(id: string): Promise<void> {
  const db = await initTaxCalendarDatabase();
  await db.execute(
    "DELETE FROM tax_calendar_events WHERE id = $1 AND is_custom = 1",
    [id]
  );
}

/**
 * Mark event as completed
 */
export async function markEventCompleted(id: string): Promise<void> {
  const db = await initTaxCalendarDatabase();
  await db.execute(
    `UPDATE tax_calendar_events 
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [id]
  );
}

/**
 * Mark event as dismissed
 */
export async function markEventDismissed(id: string): Promise<void> {
  const db = await initTaxCalendarDatabase();
  await db.execute(
    `UPDATE tax_calendar_events 
     SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [id]
  );
}

/**
 * Reopen a completed/dismissed event
 */
export async function reopenEvent(id: string): Promise<void> {
  const db = await initTaxCalendarDatabase();
  await db.execute(
    `UPDATE tax_calendar_events 
     SET status = 'upcoming', completed_at = NULL, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [id]
  );
}

/**
 * Update event status
 */
export async function updateEventStatus(id: string, status: DeadlineStatus): Promise<void> {
  const db = await initTaxCalendarDatabase();
  await db.execute(
    `UPDATE tax_calendar_events 
     SET status = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [status, id]
  );
}

/**
 * Record that a reminder was sent
 */
export async function recordReminderSent(
  eventId: string,
  advanceDays: ReminderAdvance,
  notificationType: 'in_app' | 'email' | 'push' = 'in_app'
): Promise<void> {
  const db = await initTaxCalendarDatabase();
  
  // Get current reminders sent
  const rows = await db.select<{ reminders_sent: string }[]>(
    "SELECT reminders_sent FROM tax_calendar_events WHERE id = $1",
    [eventId]
  );
  
  if (rows.length === 0) return;
  
  const reminders = JSON.parse(rows[0].reminders_sent) as ReminderAdvance[];
  if (!reminders.includes(advanceDays)) {
    reminders.push(advanceDays);
    
    await db.execute(
      `UPDATE tax_calendar_events 
       SET reminders_sent = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(reminders), eventId]
    );
  }
  
  // Add to notification history
  await db.execute(
    `INSERT INTO tax_calendar_notifications 
     (event_id, reminder_advance, notification_type)
     VALUES ($1, $2, $3)`,
    [eventId, advanceDays, notificationType]
  );
}

// ============= REMINDER SETTINGS =============

/**
 * Get reminder settings
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<ReminderSettingsRow[]>(
    "SELECT * FROM tax_calendar_settings WHERE id = 1"
  );
  
  if (rows.length === 0) {
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
  
  const row = rows[0];
  return {
    id: row.id,
    enabled: row.enabled,
    advanceDays: JSON.parse(row.advance_days) as ReminderAdvance[],
    notifyBAS: row.notify_bas,
    notifyPAYG: row.notify_payg,
    notifyTaxReturn: row.notify_tax_return,
    notifyCustom: row.notify_custom,
    emailNotifications: row.email_notifications,
    pushNotifications: row.push_notifications,
  };
}

/**
 * Update reminder settings
 */
export async function updateReminderSettings(settings: Partial<ReminderSettings>): Promise<void> {
  const db = await initTaxCalendarDatabase();
  
  const fields: string[] = [];
  const values: (string | number | boolean)[] = [];
  
  if (settings.enabled !== undefined) {
    fields.push("enabled = $" + (fields.length + 1));
    values.push(settings.enabled ? 1 : 0);
  }
  if (settings.advanceDays !== undefined) {
    fields.push("advance_days = $" + (fields.length + 1));
    values.push(JSON.stringify(settings.advanceDays));
  }
  if (settings.notifyBAS !== undefined) {
    fields.push("notify_bas = $" + (fields.length + 1));
    values.push(settings.notifyBAS ? 1 : 0);
  }
  if (settings.notifyPAYG !== undefined) {
    fields.push("notify_payg = $" + (fields.length + 1));
    values.push(settings.notifyPAYG ? 1 : 0);
  }
  if (settings.notifyTaxReturn !== undefined) {
    fields.push("notify_tax_return = $" + (fields.length + 1));
    values.push(settings.notifyTaxReturn ? 1 : 0);
  }
  if (settings.notifyCustom !== undefined) {
    fields.push("notify_custom = $" + (fields.length + 1));
    values.push(settings.notifyCustom ? 1 : 0);
  }
  if (settings.emailNotifications !== undefined) {
    fields.push("email_notifications = $" + (fields.length + 1));
    values.push(settings.emailNotifications ? 1 : 0);
  }
  if (settings.pushNotifications !== undefined) {
    fields.push("push_notifications = $" + (fields.length + 1));
    values.push(settings.pushNotifications ? 1 : 0);
  }
  
  if (fields.length === 0) return;
  
  fields.push("updated_at = CURRENT_TIMESTAMP");
  
  await db.execute(
    `UPDATE tax_calendar_settings SET ${fields.join(", ")} WHERE id = 1`,
    values
  );
}

// ============= NOTIFICATION HISTORY =============

/**
 * Get notification history for an event
 */
export async function getNotificationHistory(eventId: string): Promise<{
  id: number;
  reminderAdvance: number;
  sentAt: Date;
  notificationType: string;
  acknowledged: boolean;
}[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<NotificationHistoryRow[]>(
    "SELECT * FROM tax_calendar_notifications WHERE event_id = $1 ORDER BY sent_at DESC",
    [eventId]
  );
  
  return rows.map(row => ({
    id: row.id,
    reminderAdvance: row.reminder_advance,
    sentAt: new Date(row.sent_at),
    notificationType: row.notification_type,
    acknowledged: row.acknowledged,
  }));
}

/**
 * Get all unacknowledged notifications
 */
export async function getUnacknowledgedNotifications(): Promise<{
  id: number;
  eventId: string;
  reminderAdvance: number;
  sentAt: Date;
  notificationType: string;
}[]> {
  const db = await initTaxCalendarDatabase();
  const rows = await db.select<NotificationHistoryRow[]>(
    `SELECT * FROM tax_calendar_notifications 
     WHERE acknowledged = 0 
     ORDER BY sent_at DESC`
  );
  
  return rows.map(row => ({
    id: row.id,
    eventId: row.event_id,
    reminderAdvance: row.reminder_advance,
    sentAt: new Date(row.sent_at),
    notificationType: row.notification_type,
  }));
}

/**
 * Acknowledge a notification
 */
export async function acknowledgeNotification(id: number): Promise<void> {
  const db = await initTaxCalendarDatabase();
  await db.execute(
    "UPDATE tax_calendar_notifications SET acknowledged = 1 WHERE id = $1",
    [id]
  );
}

/**
 * Clear old notification history
 */
export async function clearOldNotifications(daysToKeep: number = 90): Promise<number> {
  const db = await initTaxCalendarDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await db.execute(
    "DELETE FROM tax_calendar_notifications WHERE sent_at < $1",
    [cutoffDate.toISOString()]
  );
  
  return result.rowsAffected ?? 0;
}

// ============= STATISTICS & SUMMARY =============

/**
 * Get calendar statistics
 */
export async function getCalendarStats(): Promise<{
  total: number;
  upcoming: number;
  dueSoon: number;
  overdue: number;
  completed: number;
  dismissed: number;
}> {
  const db = await initTaxCalendarDatabase();
  
  const rows = await db.select<{ status: DeadlineStatus; count: number }[]>(
    `SELECT status, COUNT(*) as count FROM tax_calendar_events GROUP BY status`
  );
  
  const stats = {
    total: 0,
    upcoming: 0,
    dueSoon: 0,
    overdue: 0,
    completed: 0,
    dismissed: 0,
  };
  
  for (const row of rows) {
    stats.total += row.count;
    switch (row.status) {
      case 'upcoming':
        stats.upcoming = row.count;
        break;
      case 'due_soon':
        stats.dueSoon = row.count;
        break;
      case 'overdue':
        stats.overdue = row.count;
        break;
      case 'completed':
        stats.completed = row.count;
        break;
      case 'dismissed':
        stats.dismissed = row.count;
        break;
    }
  }
  
  return stats;
}

/**
 * Get events needing status update (recalculate based on current date)
 */
export async function getEventsNeedingStatusUpdate(): Promise<TaxDeadline[]> {
  const db = await initTaxCalendarDatabase();
  const now = new Date().toISOString();
  
  // Get events that might need status updates
  const rows = await db.select<CalendarEventRow[]>(
    `SELECT * FROM tax_calendar_events 
     WHERE status NOT IN ('completed', 'dismissed')
     AND due_date < $1`,
    [now]
  );
  
  return rows.map(rowToTaxDeadline);
}

// ============= HELPER FUNCTIONS =============

function rowToTaxDeadline(row: CalendarEventRow): TaxDeadline {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    dueDate: new Date(row.due_date),
    financialYear: row.financial_year,
    quarter: row.quarter || undefined,
    status: row.status,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    remindersSent: JSON.parse(row.reminders_sent) as ReminderAdvance[],
  };
}

// ============= MIGRATION HELPERS =============

/**
 * Sync standard ATO deadlines with database
 * Call this periodically to ensure new deadlines are added
 */
export async function syncStandardDeadlines(): Promise<{
  added: number;
  updated: number;
}> {
  const db = await initTaxCalendarDatabase();
  const currentFY = getCurrentFinancialYear();
  const years = [currentFY - 1, currentFY, currentFY + 1, currentFY + 2];
  
  let added = 0;
  let updated = 0;
  
  for (const year of years) {
    const deadlines = generateAllDeadlinesForYear(year);
    
    for (const deadline of deadlines) {
      const existing = await db.select<CalendarEventRow[]>(
        "SELECT * FROM tax_calendar_events WHERE id = $1",
        [deadline.id]
      );
      
      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO tax_calendar_events 
           (id, type, title, description, due_date, financial_year, quarter, status, reminders_sent, is_custom)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            deadline.id,
            deadline.type,
            deadline.title,
            deadline.description,
            deadline.dueDate.toISOString(),
            deadline.financialYear,
            deadline.quarter || null,
            deadline.status,
            JSON.stringify(deadline.remindersSent),
            false,
          ]
        );
        added++;
      } else {
        // Update if needed (e.g., title/description changes)
        const row = existing[0];
        if (row.title !== deadline.title || row.description !== deadline.description) {
          await db.execute(
            `UPDATE tax_calendar_events 
             SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [deadline.title, deadline.description, deadline.id]
          );
          updated++;
        }
      }
    }
  }
  
  return { added, updated };
}

/**
 * Delete old events (custom deadlines only)
 */
export async function deleteOldCustomDeadlines(yearsToKeep: number = 2): Promise<number> {
  const db = await initTaxCalendarDatabase();
  const cutoffYear = getCurrentFinancialYear() - yearsToKeep;
  
  const result = await db.execute(
    `DELETE FROM tax_calendar_events 
     WHERE is_custom = 1 AND financial_year < $1`,
    [cutoffYear]
  );
  
  return result.rowsAffected ?? 0;
}
