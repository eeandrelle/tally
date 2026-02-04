/**
 * Proactive Reminders Database Layer
 * 
 * SQLite operations for:
 * - Reminder storage and retrieval
 * - User preferences persistence
 * - Reminder history and analytics
 * - Notification delivery tracking
 * 
 * @module db-proactive-reminders
 */

import Database from '@tauri-apps/plugin-sql';
import type { 
  ProactiveReminder, 
  ReminderType, 
  ReminderPriority, 
  ReminderStatus,
  ReminderDisplayType,
  ReminderPreferences 
} from './proactive-reminders';
import { DEFAULT_REMINDER_PREFERENCES } from './proactive-reminders';

let db: Database | null = null;

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const PROACTIVE_REMINDERS_SCHEMA = `
-- Proactive reminders table
CREATE TABLE IF NOT EXISTS proactive_reminders (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('eofy_countdown', 'missing_document', 'expected_dividend', 'optimization_opportunity', 'deadline_approaching', 'receipt_upload')),
  priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'snoozed', 'dismissed', 'completed')),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  action_label TEXT,
  action_route TEXT,
  action_data TEXT, -- JSON
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TEXT NOT NULL,
  expires_at TEXT,
  snoozed_until TEXT,
  dismissed_at TEXT,
  completed_at TEXT,
  
  -- Source tracking
  source_id TEXT,
  source_type TEXT,
  
  -- Related entities
  related_ids TEXT, -- JSON array
  tags TEXT, -- JSON array
  
  -- User interaction
  acknowledged INTEGER NOT NULL DEFAULT 0, -- Boolean
  acknowledged_at TEXT,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TEXT,
  
  -- Display preferences
  display_types TEXT NOT NULL, -- JSON array
  batch_key TEXT,
  
  -- For deduplication
  dedup_hash TEXT
);

-- Reminder history (archived reminders)
CREATE TABLE IF NOT EXISTS reminder_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolution_type TEXT CHECK(resolution_type IN ('completed', 'dismissed', 'expired', 'superseded')),
  user_id TEXT
);

-- User reminder preferences
CREATE TABLE IF NOT EXISTS reminder_preferences (
  id INTEGER PRIMARY KEY CHECK(id = 1), -- Single row for global settings
  enabled INTEGER NOT NULL DEFAULT 1, -- Boolean
  quiet_hours_enabled INTEGER NOT NULL DEFAULT 0, -- Boolean
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  max_reminders_per_day INTEGER NOT NULL DEFAULT 10,
  batch_similar_reminders INTEGER NOT NULL DEFAULT 1, -- Boolean
  eofy_stages TEXT NOT NULL DEFAULT '[90,60,30,14,7]', -- JSON array
  channels TEXT NOT NULL DEFAULT '{"inApp":true,"email":false,"push":false}', -- JSON
  snooze_defaults TEXT NOT NULL DEFAULT '{"1hour":true,"4hours":true,"1day":true,"1week":false}', -- JSON
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Type-specific preferences
CREATE TABLE IF NOT EXISTS reminder_type_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_type TEXT NOT NULL UNIQUE CHECK(reminder_type IN ('eofy_countdown', 'missing_document', 'expected_dividend', 'optimization_opportunity', 'deadline_approaching', 'receipt_upload')),
  enabled INTEGER NOT NULL DEFAULT 1, -- Boolean
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('critical', 'high', 'medium', 'low')),
  advance_notice_days INTEGER NOT NULL DEFAULT 7,
  display_types TEXT NOT NULL, -- JSON array
  max_per_week INTEGER NOT NULL DEFAULT 5,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notification delivery log
CREATE TABLE IF NOT EXISTS reminder_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('app', 'email', 'push')),
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT,
  opened_at TEXT,
  clicked_at TEXT,
  error_message TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'))
);

-- Snooze history
CREATE TABLE IF NOT EXISTS reminder_snooze_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id TEXT NOT NULL,
  snoozed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  snoozed_until TEXT NOT NULL,
  duration_label TEXT NOT NULL, -- '1hour', '4hours', '1day', '1week'
  user_id TEXT
);

-- Reminder generation runs (for analytics)
CREATE TABLE IF NOT EXISTS reminder_generation_runs (
  id TEXT PRIMARY KEY,
  run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_generated INTEGER NOT NULL DEFAULT 0,
  deduplicated INTEGER NOT NULL DEFAULT 0,
  batched INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  by_type TEXT NOT NULL, -- JSON
  duration_ms INTEGER,
  error_log TEXT -- JSON array
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_type ON proactive_reminders(type);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON proactive_reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON proactive_reminders(priority);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON proactive_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_source ON proactive_reminders(source_id);
CREATE INDEX IF NOT EXISTS idx_reminders_batch ON proactive_reminders(batch_key);
CREATE INDEX IF NOT EXISTS idx_reminders_dedup ON proactive_reminders(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_reminder ON reminder_notifications(reminder_id);
CREATE INDEX IF NOT EXISTS idx_history_reminder ON reminder_history(reminder_id);
CREATE INDEX IF NOT EXISTS idx_snooze_reminder ON reminder_snooze_history(reminder_id);
`;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize the proactive reminders database tables
 */
export async function initProactiveRemindersDatabase(): Promise<void> {
  if (!db) {
    db = await Database.load('sqlite:tally.db');
  }

  const statements = PROACTIVE_REMINDERS_SCHEMA.split(';').filter(s => s.trim().length > 0);

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (error) {
      if (!(error as Error).message?.includes('already exists')) {
        console.error('Proactive reminders schema execution error:', error);
        throw error;
      }
    }
  }

  // Initialize default preferences
  await initializeDefaultPreferences();
}

/**
 * Get database instance
 */
export async function getProactiveRemindersDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:tally.db');
    await initProactiveRemindersDatabase();
  }
  return db;
}

/**
 * Initialize default reminder preferences
 */
async function initializeDefaultPreferences(): Promise<void> {
  const database = await getProactiveRemindersDb();

  // Initialize global preferences
  try {
    await database.execute(
      `INSERT OR IGNORE INTO reminder_preferences 
       (id, enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
        max_reminders_per_day, batch_similar_reminders, eofy_stages, channels, snooze_defaults)
       VALUES (1, 1, 0, '22:00', '08:00', 10, 1, '[90,60,30,14,7]', 
               '{"inApp":true,"email":false,"push":false}',
               '{"1hour":true,"4hours":true,"1day":true,"1week":false}')`
    );
  } catch (error) {
    console.error('Error initializing global preferences:', error);
  }

  // Initialize type-specific preferences
  const typeDefaults = [
    { type: 'eofy_countdown', priority: 'high', advanceDays: 90, displayTypes: '["card","banner"]', maxPerWeek: 1 },
    { type: 'missing_document', priority: 'high', advanceDays: 7, displayTypes: '["card","toast"]', maxPerWeek: 5 },
    { type: 'expected_dividend', priority: 'medium', advanceDays: 14, displayTypes: '["card"]', maxPerWeek: 3 },
    { type: 'optimization_opportunity', priority: 'medium', advanceDays: 30, displayTypes: '["card","banner"]', maxPerWeek: 2 },
    { type: 'deadline_approaching', priority: 'critical', advanceDays: 30, displayTypes: '["card","banner","toast"]', maxPerWeek: 10 },
    { type: 'receipt_upload', priority: 'low', advanceDays: 7, displayTypes: '["card"]', maxPerWeek: 3 },
  ];

  for (const defaults of typeDefaults) {
    try {
      await database.execute(
        `INSERT OR IGNORE INTO reminder_type_preferences 
         (reminder_type, enabled, priority, advance_notice_days, display_types, max_per_week)
         VALUES (?, 1, ?, ?, ?, ?)`,
        [defaults.type, defaults.priority, defaults.advanceDays, defaults.displayTypes, defaults.maxPerWeek]
      );
    } catch (error) {
      console.error(`Error initializing preferences for ${defaults.type}:`, error);
    }
  }
}

// ============================================================================
// REMINDER CRUD OPERATIONS
// ============================================================================

/**
 * Save or update a reminder
 */
export async function saveReminder(reminder: ProactiveReminder): Promise<void> {
  const database = await getProactiveRemindersDb();

  await database.execute(
    `INSERT INTO proactive_reminders (
      id, type, priority, status, title, message, details, action_label, action_route, action_data,
      created_at, scheduled_for, expires_at, snoozed_until, dismissed_at, completed_at,
      source_id, source_type, related_ids, tags, acknowledged, acknowledged_at,
      interaction_count, last_interaction_at, display_types, batch_key, dedup_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      snoozed_until = excluded.snoozed_until,
      dismissed_at = excluded.dismissed_at,
      completed_at = excluded.completed_at,
      acknowledged = excluded.acknowledged,
      acknowledged_at = excluded.acknowledged_at,
      interaction_count = excluded.interaction_count,
      last_interaction_at = excluded.last_interaction_at`,
    [
      reminder.id,
      reminder.type,
      reminder.priority,
      reminder.status,
      reminder.title,
      reminder.message,
      reminder.details || null,
      reminder.actionLabel || null,
      reminder.actionRoute || null,
      reminder.actionData ? JSON.stringify(reminder.actionData) : null,
      reminder.createdAt,
      reminder.scheduledFor,
      reminder.expiresAt || null,
      reminder.snoozedUntil || null,
      reminder.dismissedAt || null,
      reminder.completedAt || null,
      reminder.sourceId || null,
      reminder.sourceType || null,
      reminder.relatedIds ? JSON.stringify(reminder.relatedIds) : null,
      reminder.tags ? JSON.stringify(reminder.tags) : null,
      reminder.acknowledged ? 1 : 0,
      reminder.acknowledgedAt || null,
      reminder.interactionCount,
      reminder.lastInteractionAt || null,
      JSON.stringify(reminder.displayTypes),
      reminder.batchKey || null,
      `${reminder.type}:${reminder.sourceId || reminder.id}`,
    ]
  );
}

/**
 * Get reminder by ID
 */
export async function getReminderById(id: string): Promise<ProactiveReminder | null> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    'SELECT * FROM proactive_reminders WHERE id = ?',
    [id]
  );

  if (result.length === 0) return null;

  return rowToReminder(result[0]);
}

/**
 * Get all active reminders
 */
export async function getActiveReminders(): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    `SELECT * FROM proactive_reminders 
     WHERE status IN ('active', 'snoozed')
     AND (expires_at IS NULL OR expires_at > datetime('now'))
     AND (snoozed_until IS NULL OR snoozed_until <= datetime('now'))
     ORDER BY 
       CASE priority 
         WHEN 'critical' THEN 4 
         WHEN 'high' THEN 3 
         WHEN 'medium' THEN 2 
         ELSE 1 
       END DESC,
       scheduled_for ASC`
  );

  return result.map(rowToReminder);
}

/**
 * Get reminders by type
 */
export async function getRemindersByType(type: ReminderType): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    `SELECT * FROM proactive_reminders 
     WHERE type = ? AND status IN ('active', 'snoozed')
     ORDER BY scheduled_for DESC`,
    [type]
  );

  return result.map(rowToReminder);
}

/**
 * Get reminders by status
 */
export async function getRemindersByStatus(status: ReminderStatus): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    'SELECT * FROM proactive_reminders WHERE status = ? ORDER BY scheduled_for DESC',
    [status]
  );

  return result.map(rowToReminder);
}

/**
 * Get reminders by priority
 */
export async function getRemindersByPriority(priority: ReminderPriority): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    `SELECT * FROM proactive_reminders 
     WHERE priority = ? AND status IN ('active', 'snoozed')
     ORDER BY scheduled_for DESC`,
    [priority]
  );

  return result.map(rowToReminder);
}

/**
 * Get reminders scheduled for a date range
 */
export async function getRemindersForDateRange(
  startDate: string,
  endDate: string
): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    `SELECT * FROM proactive_reminders 
     WHERE scheduled_for >= ? AND scheduled_for <= ?
     ORDER BY scheduled_for ASC`,
    [startDate, endDate]
  );

  return result.map(rowToReminder);
}

/**
 * Get reminders by batch key
 */
export async function getRemindersByBatchKey(batchKey: string): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    `SELECT * FROM proactive_reminders 
     WHERE batch_key = ? AND status IN ('active', 'snoozed')
     ORDER BY priority DESC, scheduled_for ASC`,
    [batchKey]
  );

  return result.map(rowToReminder);
}

/**
 * Get all batch keys with active reminders
 */
export async function getActiveBatchKeys(): Promise<string[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<{ batch_key: string }[]>(
    `SELECT DISTINCT batch_key FROM proactive_reminders 
     WHERE batch_key IS NOT NULL 
     AND status IN ('active', 'snoozed')
     ORDER BY batch_key`
  );

  return result.map(r => r.batch_key).filter(Boolean);
}

/**
 * Update reminder status
 */
export async function updateReminderStatus(
  id: string,
  status: ReminderStatus,
  timestamp?: string
): Promise<void> {
  const database = await getProactiveRemindersDb();

  const now = timestamp || new Date().toISOString();

  let updateField = '';
  switch (status) {
    case 'dismissed':
      updateField = ', dismissed_at = ?';
      break;
    case 'completed':
      updateField = ', completed_at = ?';
      break;
    case 'snoozed':
      updateField = '';
      break;
    default:
      updateField = '';
  }

  await database.execute(
    `UPDATE proactive_reminders 
     SET status = ?, last_interaction_at = ?${updateField ? updateField : ''}
     WHERE id = ?`,
    updateField ? [status, now, now, id] : [status, now, id]
  );
}

/**
 * Snooze a reminder
 */
export async function snoozeReminderDb(
  id: string,
  snoozedUntil: string,
  durationLabel: string,
  userId?: string
): Promise<void> {
  const database = await getProactiveRemindersDb();
  const now = new Date().toISOString();

  await database.execute(
    `UPDATE proactive_reminders 
     SET status = 'snoozed', snoozed_until = ?, last_interaction_at = ?, interaction_count = interaction_count + 1
     WHERE id = ?`,
    [snoozedUntil, now, id]
  );

  // Record in snooze history
  await database.execute(
    `INSERT INTO reminder_snooze_history (reminder_id, snoozed_until, duration_label, user_id)
     VALUES (?, ?, ?, ?)`,
    [id, snoozedUntil, durationLabel, userId || null]
  );
}

/**
 * Dismiss a reminder
 */
export async function dismissReminderDb(id: string): Promise<void> {
  await updateReminderStatus(id, 'dismissed');
}

/**
 * Complete a reminder
 */
export async function completeReminderDb(id: string): Promise<void> {
  await updateReminderStatus(id, 'completed');
}

/**
 * Acknowledge a reminder
 */
export async function acknowledgeReminderDb(id: string): Promise<void> {
  const database = await getProactiveRemindersDb();
  const now = new Date().toISOString();

  await database.execute(
    `UPDATE proactive_reminders 
     SET acknowledged = 1, acknowledged_at = ?, last_interaction_at = ?, interaction_count = interaction_count + 1
     WHERE id = ?`,
    [now, now, id]
  );
}

/**
 * Delete a reminder (hard delete)
 */
export async function deleteReminder(id: string): Promise<void> {
  const database = await getProactiveRemindersDb();
  await database.execute('DELETE FROM proactive_reminders WHERE id = ?', [id]);
}

/**
 * Archive a reminder to history
 */
export async function archiveReminder(
  reminder: ProactiveReminder,
  resolutionType: 'completed' | 'dismissed' | 'expired' | 'superseded',
  userId?: string
): Promise<void> {
  const database = await getProactiveRemindersDb();

  await database.execute(
    `INSERT INTO reminder_history 
     (reminder_id, type, priority, title, message, status, created_at, resolved_at, resolution_type, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
    [
      reminder.id,
      reminder.type,
      reminder.priority,
      reminder.title,
      reminder.message,
      reminder.status,
      reminder.createdAt,
      resolutionType,
      userId || null,
    ]
  );

  // Delete from active reminders
  await deleteReminder(reminder.id);
}

/**
 * Clean up expired reminders
 */
export async function cleanupExpiredReminders(): Promise<number> {
  const database = await getProactiveRemindersDb();

  // Get expired reminders
  const expired = await database.select<ReminderRow[]>(
    `SELECT * FROM proactive_reminders 
     WHERE expires_at IS NOT NULL 
     AND expires_at < datetime('now')
     AND status IN ('active', 'snoozed')`
  );

  // Archive them
  for (const row of expired) {
    await archiveReminder(rowToReminder(row), 'expired');
  }

  return expired.length;
}

// ============================================================================
// PREFERENCES OPERATIONS
// ============================================================================

/**
 * Get global reminder preferences
 */
export async function getReminderPreferences(): Promise<ReminderPreferences> {
  const database = await getProactiveRemindersDb();

  const globalResult = await database.select<{
    enabled: number;
    quiet_hours_enabled: number;
    quiet_hours_start: string;
    quiet_hours_end: string;
    max_reminders_per_day: number;
    batch_similar_reminders: number;
    eofy_stages: string;
    channels: string;
    snooze_defaults: string;
  }[]>('SELECT * FROM reminder_preferences WHERE id = 1');

  if (globalResult.length === 0) {
    return DEFAULT_REMINDER_PREFERENCES;
  }

  const global = globalResult[0];

  // Get type-specific preferences
  const typeResult = await database.select<{
    reminder_type: ReminderType;
    enabled: number;
    priority: ReminderPriority;
    advance_notice_days: number;
    display_types: string;
    max_per_week: number;
  }[]>('SELECT * FROM reminder_type_preferences');

  const types: ReminderPreferences['types'] = { ...DEFAULT_REMINDER_PREFERENCES.types };

  for (const row of typeResult) {
    types[row.reminder_type] = {
      enabled: row.enabled === 1,
      priority: row.priority,
      advanceNoticeDays: row.advance_notice_days,
      displayTypes: JSON.parse(row.display_types) as ReminderDisplayType[],
      maxPerWeek: row.max_per_week,
    };
  }

  return {
    enabled: global.enabled === 1,
    quietHoursEnabled: global.quiet_hours_enabled === 1,
    quietHoursStart: global.quiet_hours_start,
    quietHoursEnd: global.quiet_hours_end,
    maxRemindersPerDay: global.max_reminders_per_day,
    batchSimilarReminders: global.batch_similar_reminders === 1,
    types,
    eofyStages: JSON.parse(global.eofy_stages),
    channels: JSON.parse(global.channels),
    snoozeDefaults: JSON.parse(global.snooze_defaults),
  };
}

/**
 * Update global reminder preferences
 */
export async function updateReminderPreferences(
  preferences: Partial<Omit<ReminderPreferences, 'types'>>
): Promise<void> {
  const database = await getProactiveRemindersDb();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (preferences.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(preferences.enabled ? 1 : 0);
  }
  if (preferences.quietHoursEnabled !== undefined) {
    updates.push('quiet_hours_enabled = ?');
    values.push(preferences.quietHoursEnabled ? 1 : 0);
  }
  if (preferences.quietHoursStart !== undefined) {
    updates.push('quiet_hours_start = ?');
    values.push(preferences.quietHoursStart);
  }
  if (preferences.quietHoursEnd !== undefined) {
    updates.push('quiet_hours_end = ?');
    values.push(preferences.quietHoursEnd);
  }
  if (preferences.maxRemindersPerDay !== undefined) {
    updates.push('max_reminders_per_day = ?');
    values.push(preferences.maxRemindersPerDay);
  }
  if (preferences.batchSimilarReminders !== undefined) {
    updates.push('batch_similar_reminders = ?');
    values.push(preferences.batchSimilarReminders ? 1 : 0);
  }
  if (preferences.eofyStages !== undefined) {
    updates.push('eofy_stages = ?');
    values.push(JSON.stringify(preferences.eofyStages));
  }
  if (preferences.channels !== undefined) {
    updates.push('channels = ?');
    values.push(JSON.stringify(preferences.channels));
  }
  if (preferences.snoozeDefaults !== undefined) {
    updates.push('snooze_defaults = ?');
    values.push(JSON.stringify(preferences.snoozeDefaults));
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    await database.execute(
      `UPDATE reminder_preferences SET ${updates.join(', ')} WHERE id = 1`,
      values
    );
  }
}

/**
 * Update type-specific preferences
 */
export async function updateTypePreferences(
  type: ReminderType,
  settings: Partial<ReminderPreferences['types'][ReminderType]>
): Promise<void> {
  const database = await getProactiveRemindersDb();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (settings.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(settings.enabled ? 1 : 0);
  }
  if (settings.priority !== undefined) {
    updates.push('priority = ?');
    values.push(settings.priority);
  }
  if (settings.advanceNoticeDays !== undefined) {
    updates.push('advance_notice_days = ?');
    values.push(settings.advanceNoticeDays);
  }
  if (settings.displayTypes !== undefined) {
    updates.push('display_types = ?');
    values.push(JSON.stringify(settings.displayTypes));
  }
  if (settings.maxPerWeek !== undefined) {
    updates.push('max_per_week = ?');
    values.push(settings.maxPerWeek);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(type);
    await database.execute(
      `UPDATE reminder_type_preferences SET ${updates.join(', ')} WHERE reminder_type = ?`,
      values
    );
  }
}

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Record a notification being sent
 */
export async function recordNotificationSent(
  reminderId: string,
  channel: 'app' | 'email' | 'push'
): Promise<number> {
  const database = await getProactiveRemindersDb();

  const result = await database.execute(
    `INSERT INTO reminder_notifications (reminder_id, channel)
     VALUES (?, ?)`,
    [reminderId, channel]
  );

  return result.lastInsertId;
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  notificationId: number,
  status: 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced',
  errorMessage?: string
): Promise<void> {
  const database = await getProactiveRemindersDb();

  const fieldMap: Record<string, string> = {
    delivered: 'delivered_at',
    opened: 'opened_at',
    clicked: 'clicked_at',
    failed: 'delivered_at',
    bounced: 'delivered_at',
  };

  const timestamp = new Date().toISOString();

  await database.execute(
    `UPDATE reminder_notifications 
     SET status = ?, ${fieldMap[status]} = ?, error_message = ?
     WHERE id = ?`,
    [status, timestamp, errorMessage || null, notificationId]
  );
}

/**
 * Get notification history for a reminder
 */
export async function getNotificationHistory(
  reminderId: string
): Promise<Array<{
  id: number;
  channel: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  status: string;
}>> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<{
    id: number;
    channel: string;
    sent_at: string;
    delivered_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    status: string;
  }[]>(
    'SELECT * FROM reminder_notifications WHERE reminder_id = ? ORDER BY sent_at DESC',
    [reminderId]
  );

  return result.map(row => ({
    id: row.id,
    channel: row.channel,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at || undefined,
    openedAt: row.opened_at || undefined,
    clickedAt: row.clicked_at || undefined,
    status: row.status,
  }));
}

// ============================================================================
// ANALYTICS OPERATIONS
// ============================================================================

/**
 * Record a reminder generation run
 */
export async function recordGenerationRun(
  runId: string,
  stats: {
    totalGenerated: number;
    deduplicated: number;
    batched: number;
    skipped: number;
    byType: Record<string, number>;
    durationMs?: number;
    errors?: string[];
  }
): Promise<void> {
  const database = await getProactiveRemindersDb();

  await database.execute(
    `INSERT INTO reminder_generation_runs 
     (id, total_generated, deduplicated, batched, skipped, by_type, duration_ms, error_log)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      runId,
      stats.totalGenerated,
      stats.deduplicated,
      stats.batched,
      stats.skipped,
      JSON.stringify(stats.byType),
      stats.durationMs || null,
      stats.errors ? JSON.stringify(stats.errors) : null,
    ]
  );
}

/**
 * Get reminder statistics
 */
export async function getReminderStatistics(): Promise<{
  totalActive: number;
  totalSnoozed: number;
  totalDismissed: number;
  totalCompleted: number;
  byType: Record<ReminderType, number>;
  byPriority: Record<ReminderPriority, number>;
  averageAcknowledgmentTime?: number;
}> {
  const database = await getProactiveRemindersDb();

  const statusResult = await database.select<{ status: ReminderStatus; count: number }[]>(
    'SELECT status, COUNT(*) as count FROM proactive_reminders GROUP BY status'
  );

  const typeResult = await database.select<{ type: ReminderType; count: number }[]>(
    `SELECT type, COUNT(*) as count FROM proactive_reminders 
     WHERE status IN ('active', 'snoozed') GROUP BY type`
  );

  const priorityResult = await database.select<{ priority: ReminderPriority; count: number }[]>(
    `SELECT priority, COUNT(*) as count FROM proactive_reminders 
     WHERE status IN ('active', 'snoozed') GROUP BY priority`
  );

  const byType: Record<ReminderType, number> = {
    eofy_countdown: 0,
    missing_document: 0,
    expected_dividend: 0,
    optimization_opportunity: 0,
    deadline_approaching: 0,
    receipt_upload: 0,
  };

  for (const row of typeResult) {
    byType[row.type] = row.count;
  }

  const byPriority: Record<ReminderPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const row of priorityResult) {
    byPriority[row.priority] = row.count;
  }

  const stats = {
    totalActive: 0,
    totalSnoozed: 0,
    totalDismissed: 0,
    totalCompleted: 0,
    byType,
    byPriority,
  };

  for (const row of statusResult) {
    switch (row.status) {
      case 'active':
        stats.totalActive = row.count;
        break;
      case 'snoozed':
        stats.totalSnoozed = row.count;
        break;
      case 'dismissed':
        stats.totalDismissed = row.count;
        break;
      case 'completed':
        stats.totalCompleted = row.count;
        break;
    }
  }

  return stats;
}

/**
 * Get historical statistics for a date range
 */
export async function getHistoricalStatistics(
  startDate: string,
  endDate: string
): Promise<{
  generated: number;
  acknowledged: number;
  dismissed: number;
  completed: number;
  byType: Record<ReminderType, number>;
}> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<{
    type: ReminderType;
    resolution_type: string;
    count: number;
  }[]>(
    `SELECT type, resolution_type, COUNT(*) as count FROM reminder_history
     WHERE resolved_at >= ? AND resolved_at <= ?
     GROUP BY type, resolution_type`,
    [startDate, endDate]
  );

  const byType: Record<ReminderType, number> = {
    eofy_countdown: 0,
    missing_document: 0,
    expected_dividend: 0,
    optimization_opportunity: 0,
    deadline_approaching: 0,
    receipt_upload: 0,
  };

  let generated = 0;
  let acknowledged = 0;
  let dismissed = 0;
  let completed = 0;

  for (const row of result) {
    byType[row.type] += row.count;
    generated += row.count;

    switch (row.resolution_type) {
      case 'completed':
        completed += row.count;
        break;
      case 'dismissed':
        dismissed += row.count;
        break;
      case 'expired':
        acknowledged += row.count;
        break;
    }
  }

  return {
    generated,
    acknowledged,
    dismissed,
    completed,
    byType,
  };
}

// ============================================================================
// TYPE DEFINITIONS FOR DATABASE ROWS
// ============================================================================

interface ReminderRow {
  id: string;
  type: ReminderType;
  priority: ReminderPriority;
  status: ReminderStatus;
  title: string;
  message: string;
  details: string | null;
  action_label: string | null;
  action_route: string | null;
  action_data: string | null;
  created_at: string;
  scheduled_for: string;
  expires_at: string | null;
  snoozed_until: string | null;
  dismissed_at: string | null;
  completed_at: string | null;
  source_id: string | null;
  source_type: string | null;
  related_ids: string | null;
  tags: string | null;
  acknowledged: number;
  acknowledged_at: string | null;
  interaction_count: number;
  last_interaction_at: string | null;
  display_types: string;
  batch_key: string | null;
}

// ============================================================================
// ROW TO MODEL CONVERSION
// ============================================================================

function rowToReminder(row: ReminderRow): ProactiveReminder {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    status: row.status,
    title: row.title,
    message: row.message,
    details: row.details || undefined,
    actionLabel: row.action_label || undefined,
    actionRoute: row.action_route || undefined,
    actionData: row.action_data ? JSON.parse(row.action_data) : undefined,
    createdAt: row.created_at,
    scheduledFor: row.scheduled_for,
    expiresAt: row.expires_at || undefined,
    snoozedUntil: row.snoozed_until || undefined,
    dismissedAt: row.dismissed_at || undefined,
    completedAt: row.completed_at || undefined,
    sourceId: row.source_id || undefined,
    sourceType: row.source_type || undefined,
    relatedIds: row.related_ids ? JSON.parse(row.related_ids) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    acknowledged: row.acknowledged === 1,
    acknowledgedAt: row.acknowledged_at || undefined,
    interactionCount: row.interaction_count,
    lastInteractionAt: row.last_interaction_at || undefined,
    displayTypes: JSON.parse(row.display_types) as ReminderDisplayType[],
    batchKey: row.batch_key || undefined,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Save multiple reminders in a batch
 */
export async function saveRemindersBatch(reminders: ProactiveReminder[]): Promise<void> {
  const database = await getProactiveRemindersDb();

  // Use a transaction for better performance
  await database.execute('BEGIN TRANSACTION');

  try {
    for (const reminder of reminders) {
      await saveReminder(reminder);
    }
    await database.execute('COMMIT');
  } catch (error) {
    await database.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Delete old reminders (cleanup)
 */
export async function deleteOldReminders(olderThanDays: number): Promise<number> {
  const database = await getProactiveRemindersDb();

  const result = await database.execute(
    `DELETE FROM proactive_reminders 
     WHERE created_at < datetime('now', '-${olderThanDays} days')
     AND status IN ('dismissed', 'completed')`
  );

  return result.rowsAffected;
}

/**
 * Get all reminders (for export/backup)
 */
export async function getAllReminders(): Promise<ProactiveReminder[]> {
  const database = await getProactiveRemindersDb();

  const result = await database.select<ReminderRow[]>(
    'SELECT * FROM proactive_reminders ORDER BY created_at DESC'
  );

  return result.map(rowToReminder);
}

/**
 * Export reminders to JSON
 */
export async function exportRemindersToJSON(): Promise<string> {
  const reminders = await getAllReminders();
  return JSON.stringify(reminders, null, 2);
}
