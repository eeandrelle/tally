/**
 * Missing Upload Reminders Database Layer
 * 
 * SQLite operations for:
 * - Document upload patterns
 * - Missing document tracking
 * - Reminder settings and history
 * 
 * @module db-upload-reminders
 */

import Database from '@tauri-apps/plugin-sql';
import type { DocumentPattern, MissingDocument, DocumentType, PatternFrequency, PatternConfidence } from './upload-patterns';

let db: Database | null = null;

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const UPLOAD_REMINDERS_SCHEMA = `
-- Document upload patterns table
CREATE TABLE IF NOT EXISTS document_upload_patterns (
  id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL CHECK(document_type IN ('bank_statement', 'dividend_statement', 'payg_summary', 'other')),
  source TEXT NOT NULL,
  source_id TEXT,
  frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'quarterly', 'half_yearly', 'yearly', 'irregular', 'unknown')),
  confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low', 'uncertain')),
  confidence_score INTEGER NOT NULL DEFAULT 0,
  expected_day_of_month INTEGER,
  expected_months TEXT, -- JSON array of month numbers
  analysis_date TEXT NOT NULL,
  uploads_analyzed INTEGER NOT NULL DEFAULT 0,
  date_range_start TEXT NOT NULL,
  date_range_end TEXT NOT NULL,
  pattern_stability TEXT CHECK(pattern_stability IN ('stable', 'changing', 'volatile')),
  next_expected_date TEXT,
  grace_period_days INTEGER NOT NULL DEFAULT 7,
  -- Statistics
  avg_interval INTEGER,
  interval_std_dev REAL,
  min_interval INTEGER,
  max_interval INTEGER,
  coefficient_of_variation REAL,
  consistency_score REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Pattern changes history
CREATE TABLE IF NOT EXISTS document_pattern_changes (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  change_date TEXT NOT NULL,
  from_frequency TEXT NOT NULL,
  to_frequency TEXT NOT NULL,
  reason TEXT,
  detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pattern_id) REFERENCES document_upload_patterns(id) ON DELETE CASCADE
);

-- Missing documents tracking
CREATE TABLE IF NOT EXISTS missing_documents (
  id TEXT PRIMARY KEY,
  pattern_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  source TEXT NOT NULL,
  expected_date TEXT NOT NULL,
  grace_period_end TEXT NOT NULL,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  is_missing INTEGER NOT NULL DEFAULT 0, -- Boolean
  confidence TEXT NOT NULL,
  last_upload_date TEXT,
  historical_uploads INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reminded', 'uploaded', 'dismissed')),
  detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (pattern_id) REFERENCES document_upload_patterns(id) ON DELETE CASCADE
);

-- Reminder settings per document type
CREATE TABLE IF NOT EXISTS upload_reminder_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT NOT NULL UNIQUE CHECK(document_type IN ('bank_statement', 'dividend_statement', 'payg_summary', 'other')),
  enabled INTEGER NOT NULL DEFAULT 1, -- Boolean
  reminder_days_before INTEGER NOT NULL DEFAULT 3,
  reminder_days_after INTEGER NOT NULL DEFAULT 7,
  email_notifications INTEGER NOT NULL DEFAULT 0, -- Boolean
  push_notifications INTEGER NOT NULL DEFAULT 1, -- Boolean
  max_reminders INTEGER NOT NULL DEFAULT 3,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Reminder history
CREATE TABLE IF NOT EXISTS upload_reminder_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  missing_document_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('before_due', 'after_due', 'follow_up')),
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sent_via TEXT NOT NULL CHECK(sent_via IN ('app', 'email', 'push')),
  acknowledged INTEGER NOT NULL DEFAULT 0, -- Boolean
  acknowledged_at TEXT,
  FOREIGN KEY (missing_document_id) REFERENCES missing_documents(id) ON DELETE CASCADE
);

-- Pattern analysis runs
CREATE TABLE IF NOT EXISTS upload_pattern_analysis_runs (
  id TEXT PRIMARY KEY,
  analysis_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_sources INTEGER DEFAULT 0,
  patterns_detected INTEGER DEFAULT 0,
  missing_detected INTEGER DEFAULT 0,
  analysis_duration_ms INTEGER,
  status TEXT DEFAULT 'completed',
  error_log TEXT -- JSON array of errors
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patterns_document_type ON document_upload_patterns(document_type);
CREATE INDEX IF NOT EXISTS idx_patterns_source ON document_upload_patterns(source);
CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON document_upload_patterns(frequency);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON document_upload_patterns(confidence);
CREATE INDEX IF NOT EXISTS idx_patterns_next_expected ON document_upload_patterns(next_expected_date);
CREATE INDEX IF NOT EXISTS idx_missing_pattern_id ON missing_documents(pattern_id);
CREATE INDEX IF NOT EXISTS idx_missing_status ON missing_documents(status);
CREATE INDEX IF NOT EXISTS idx_missing_expected_date ON missing_documents(expected_date);
CREATE INDEX IF NOT EXISTS idx_reminder_history_missing_id ON upload_reminder_history(missing_document_id);
`;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize the upload reminders database tables
 */
export async function initUploadRemindersDatabase(): Promise<void> {
  if (!db) {
    db = await Database.load('sqlite:tally.db');
  }

  const statements = UPLOAD_REMINDERS_SCHEMA.split(';').filter(s => s.trim().length > 0);

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (error) {
      if (!(error as Error).message?.includes('already exists')) {
        console.error('Upload reminders schema execution error:', error);
        throw error;
      }
    }
  }

  // Initialize default reminder settings
  await initializeDefaultSettings();
}

/**
 * Get database instance
 */
export async function getUploadRemindersDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:tally.db');
    await initUploadRemindersDatabase();
  }
  return db;
}

/**
 * Initialize default reminder settings
 */
async function initializeDefaultSettings(): Promise<void> {
  const database = await getUploadRemindersDb();

  const defaultSettings = [
    { documentType: 'bank_statement', daysBefore: 3, daysAfter: 5 },
    { documentType: 'dividend_statement', daysBefore: 7, daysAfter: 14 },
    { documentType: 'payg_summary', daysBefore: 14, daysAfter: 21 },
    { documentType: 'other', daysBefore: 3, daysAfter: 7 },
  ];

  for (const setting of defaultSettings) {
    try {
      await database.execute(
        `INSERT OR IGNORE INTO upload_reminder_settings 
         (document_type, reminder_days_before, reminder_days_after)
         VALUES (?, ?, ?)`,
        [setting.documentType, setting.daysBefore, setting.daysAfter]
      );
    } catch (error) {
      console.error(`Error initializing settings for ${setting.documentType}:`, error);
    }
  }
}

// ============================================================================
// PATTERN CRUD OPERATIONS
// ============================================================================

/**
 * Save or update a document upload pattern
 */
export async function saveDocumentPattern(pattern: DocumentPattern): Promise<void> {
  const database = await getUploadRemindersDb();

  await database.execute(
    `INSERT INTO document_upload_patterns (
      id, document_type, source, source_id, frequency, confidence, confidence_score,
      expected_day_of_month, expected_months, analysis_date, uploads_analyzed,
      date_range_start, date_range_end, pattern_stability, next_expected_date,
      grace_period_days, avg_interval, interval_std_dev, min_interval, max_interval,
      coefficient_of_variation, consistency_score, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      frequency = excluded.frequency,
      confidence = excluded.confidence,
      confidence_score = excluded.confidence_score,
      expected_day_of_month = excluded.expected_day_of_month,
      expected_months = excluded.expected_months,
      analysis_date = excluded.analysis_date,
      uploads_analyzed = excluded.uploads_analyzed,
      date_range_start = excluded.date_range_start,
      date_range_end = excluded.date_range_end,
      pattern_stability = excluded.pattern_stability,
      next_expected_date = excluded.next_expected_date,
      grace_period_days = excluded.grace_period_days,
      avg_interval = excluded.avg_interval,
      interval_std_dev = excluded.interval_std_dev,
      min_interval = excluded.min_interval,
      max_interval = excluded.max_interval,
      coefficient_of_variation = excluded.coefficient_of_variation,
      consistency_score = excluded.consistency_score,
      updated_at = CURRENT_TIMESTAMP`,
    [
      pattern.id,
      pattern.documentType,
      pattern.source,
      pattern.sourceId || null,
      pattern.frequency,
      pattern.confidence,
      pattern.confidenceScore,
      pattern.expectedDayOfMonth || null,
      pattern.expectedMonths ? JSON.stringify(pattern.expectedMonths) : null,
      pattern.analysisDate,
      pattern.uploadsAnalyzed,
      pattern.dateRange.start,
      pattern.dateRange.end,
      pattern.patternStability,
      pattern.nextExpectedDate || null,
      pattern.gracePeriodDays,
      pattern.statistics.averageIntervalDays,
      pattern.statistics.intervalStdDev,
      pattern.statistics.minIntervalDays,
      pattern.statistics.maxIntervalDays,
      pattern.statistics.coefficientOfVariation,
      pattern.statistics.consistencyScore,
    ]
  );

  // Save pattern changes
  if (pattern.patternChanges.length > 0) {
    for (const change of pattern.patternChanges) {
      await savePatternChange(pattern.id, change);
    }
  }
}

/**
 * Save a pattern change record
 */
async function savePatternChange(patternId: string, change: {
  id: string;
  changeDate: string;
  fromFrequency: PatternFrequency;
  toFrequency: PatternFrequency;
  reason?: string;
}): Promise<void> {
  const database = await getUploadRemindersDb();

  await database.execute(
    `INSERT OR IGNORE INTO document_pattern_changes 
     (id, pattern_id, change_date, from_frequency, to_frequency, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [change.id, patternId, change.changeDate, change.fromFrequency, change.toFrequency, change.reason || null]
  );
}

/**
 * Get pattern by ID
 */
export async function getPatternById(id: string): Promise<DocumentPattern | null> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: string;
    document_type: DocumentType;
    source: string;
    source_id: string | null;
    frequency: PatternFrequency;
    confidence: PatternConfidence;
    confidence_score: number;
    expected_day_of_month: number | null;
    expected_months: string | null;
    analysis_date: string;
    uploads_analyzed: number;
    date_range_start: string;
    date_range_end: string;
    pattern_stability: 'stable' | 'changing' | 'volatile';
    next_expected_date: string | null;
    grace_period_days: number;
    avg_interval: number;
    interval_std_dev: number;
    min_interval: number;
    max_interval: number;
    coefficient_of_variation: number;
    consistency_score: number;
  }[]>(
    'SELECT * FROM document_upload_patterns WHERE id = ?',
    [id]
  );

  if (result.length === 0) return null;

  const row = result[0];
  const changes = await getPatternChanges(id);

  return {
    id: row.id,
    documentType: row.document_type,
    source: row.source,
    sourceId: row.source_id || undefined,
    frequency: row.frequency,
    confidence: row.confidence,
    confidenceScore: row.confidence_score,
    expectedDayOfMonth: row.expected_day_of_month || undefined,
    expectedMonths: row.expected_months ? JSON.parse(row.expected_months) : undefined,
    analysisDate: row.analysis_date,
    uploadsAnalyzed: row.uploads_analyzed,
    dateRange: {
      start: row.date_range_start,
      end: row.date_range_end,
    },
    patternStability: row.pattern_stability,
    patternChanges: changes,
    statistics: {
      averageIntervalDays: row.avg_interval,
      intervalStdDev: row.interval_std_dev,
      minIntervalDays: row.min_interval,
      maxIntervalDays: row.max_interval,
      coefficientOfVariation: row.coefficient_of_variation,
      consistencyScore: row.consistency_score,
    },
    nextExpectedDate: row.next_expected_date || undefined,
    gracePeriodDays: row.grace_period_days,
  };
}

/**
 * Get pattern changes for a pattern
 */
async function getPatternChanges(patternId: string): Promise<Array<{
  id: string;
  changeDate: string;
  fromFrequency: PatternFrequency;
  toFrequency: PatternFrequency;
  reason?: string;
}>> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: string;
    change_date: string;
    from_frequency: PatternFrequency;
    to_frequency: PatternFrequency;
    reason: string | null;
  }[]>(
    'SELECT * FROM document_pattern_changes WHERE pattern_id = ? ORDER BY change_date DESC',
    [patternId]
  );

  return result.map(row => ({
    id: row.id,
    changeDate: row.change_date,
    fromFrequency: row.from_frequency,
    toFrequency: row.to_frequency,
    reason: row.reason || undefined,
  }));
}

/**
 * Get all patterns
 */
export async function getAllPatterns(): Promise<DocumentPattern[]> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{ id: string }[]>(
    'SELECT id FROM document_upload_patterns ORDER BY source'
  );

  const patterns: DocumentPattern[] = [];
  for (const row of result) {
    const pattern = await getPatternById(row.id);
    if (pattern) patterns.push(pattern);
  }

  return patterns;
}

/**
 * Get patterns by document type
 */
export async function getPatternsByDocumentType(documentType: DocumentType): Promise<DocumentPattern[]> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{ id: string }[]>(
    'SELECT id FROM document_upload_patterns WHERE document_type = ? ORDER BY source',
    [documentType]
  );

  const patterns: DocumentPattern[] = [];
  for (const row of result) {
    const pattern = await getPatternById(row.id);
    if (pattern) patterns.push(pattern);
  }

  return patterns;
}

/**
 * Get patterns by source
 */
export async function getPatternsBySource(source: string): Promise<DocumentPattern[]> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{ id: string }[]>(
    'SELECT id FROM document_upload_patterns WHERE source = ? ORDER BY document_type',
    [source]
  );

  const patterns: DocumentPattern[] = [];
  for (const row of result) {
    const pattern = await getPatternById(row.id);
    if (pattern) patterns.push(pattern);
  }

  return patterns;
}

/**
 * Delete a pattern
 */
export async function deletePattern(id: string): Promise<void> {
  const database = await getUploadRemindersDb();
  await database.execute('DELETE FROM document_upload_patterns WHERE id = ?', [id]);
}

// ============================================================================
// MISSING DOCUMENT OPERATIONS
// ============================================================================

/**
 * Save a missing document record
 */
export async function saveMissingDocument(missing: MissingDocument): Promise<void> {
  const database = await getUploadRemindersDb();

  await database.execute(
    `INSERT INTO missing_documents (
      id, pattern_id, document_type, source, expected_date, grace_period_end,
      days_overdue, is_missing, confidence, last_upload_date, historical_uploads, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      days_overdue = excluded.days_overdue,
      is_missing = excluded.is_missing,
      status = excluded.status,
      resolved_at = CASE WHEN excluded.status IN ('uploaded', 'dismissed') THEN CURRENT_TIMESTAMP ELSE resolved_at END`,
    [
      missing.id,
      missing.patternId,
      missing.documentType,
      missing.source,
      missing.expectedDate,
      missing.gracePeriodEnd,
      missing.daysOverdue,
      missing.isMissing ? 1 : 0,
      missing.confidence,
      missing.lastUploadDate || null,
      missing.historicalUploads,
      missing.isMissing ? 'pending' : 'pending',
    ]
  );
}

/**
 * Get missing document by ID
 */
export async function getMissingDocumentById(id: string): Promise<MissingDocument | null> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: string;
    pattern_id: string;
    document_type: DocumentType;
    source: string;
    expected_date: string;
    grace_period_end: string;
    days_overdue: number;
    is_missing: number;
    confidence: PatternConfidence;
    last_upload_date: string | null;
    historical_uploads: number;
  }[]>(
    'SELECT * FROM missing_documents WHERE id = ?',
    [id]
  );

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    patternId: row.pattern_id,
    documentType: row.document_type,
    source: row.source,
    expectedDate: row.expected_date,
    gracePeriodEnd: row.grace_period_end,
    daysOverdue: row.days_overdue,
    isMissing: row.is_missing === 1,
    confidence: row.confidence,
    lastUploadDate: row.last_upload_date || undefined,
    historicalUploads: row.historical_uploads,
  };
}

/**
 * Get all pending missing documents
 */
export async function getPendingMissingDocuments(): Promise<MissingDocument[]> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: string;
    pattern_id: string;
    document_type: DocumentType;
    source: string;
    expected_date: string;
    grace_period_end: string;
    days_overdue: number;
    is_missing: number;
    confidence: PatternConfidence;
    last_upload_date: string | null;
    historical_uploads: number;
  }[]>(
    `SELECT * FROM missing_documents 
     WHERE status = 'pending' OR status = 'reminded'
     ORDER BY days_overdue DESC, expected_date ASC`
  );

  return result.map(row => ({
    id: row.id,
    patternId: row.pattern_id,
    documentType: row.document_type,
    source: row.source,
    expectedDate: row.expected_date,
    gracePeriodEnd: row.grace_period_end,
    daysOverdue: row.days_overdue,
    isMissing: row.is_missing === 1,
    confidence: row.confidence,
    lastUploadDate: row.last_upload_date || undefined,
    historicalUploads: row.historical_uploads,
  }));
}

/**
 * Get missing documents by status
 */
export async function getMissingDocumentsByStatus(
  status: 'pending' | 'reminded' | 'uploaded' | 'dismissed'
): Promise<MissingDocument[]> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: string;
    pattern_id: string;
    document_type: DocumentType;
    source: string;
    expected_date: string;
    grace_period_end: string;
    days_overdue: number;
    is_missing: number;
    confidence: PatternConfidence;
    last_upload_date: string | null;
    historical_uploads: number;
  }[]>(
    'SELECT * FROM missing_documents WHERE status = ? ORDER BY days_overdue DESC',
    [status]
  );

  return result.map(row => ({
    id: row.id,
    patternId: row.pattern_id,
    documentType: row.document_type,
    source: row.source,
    expectedDate: row.expected_date,
    gracePeriodEnd: row.grace_period_end,
    daysOverdue: row.days_overdue,
    isMissing: row.is_missing === 1,
    confidence: row.confidence,
    lastUploadDate: row.last_upload_date || undefined,
    historicalUploads: row.historical_uploads,
  }));
}

/**
 * Update missing document status
 */
export async function updateMissingDocumentStatus(
  id: string,
  status: 'pending' | 'reminded' | 'uploaded' | 'dismissed'
): Promise<void> {
  const database = await getUploadRemindersDb();

  const resolvedAt = status === 'uploaded' || status === 'dismissed' 
    ? new Date().toISOString() 
    : null;

  await database.execute(
    `UPDATE missing_documents 
     SET status = ?, resolved_at = ?
     WHERE id = ?`,
    [status, resolvedAt, id]
  );
}

/**
 * Mark missing document as uploaded (when user uploads the document)
 */
export async function markMissingDocumentUploaded(id: string): Promise<void> {
  await updateMissingDocumentStatus(id, 'uploaded');
}

/**
 * Dismiss a missing document reminder
 */
export async function dismissMissingDocument(id: string): Promise<void> {
  await updateMissingDocumentStatus(id, 'dismissed');
}

// ============================================================================
// REMINDER SETTINGS OPERATIONS
// ============================================================================

/**
 * Get reminder settings for a document type
 */
export async function getReminderSettings(documentType: DocumentType): Promise<{
  documentType: DocumentType;
  enabled: boolean;
  reminderDaysBefore: number;
  reminderDaysAfter: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  maxReminders: number;
}> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    document_type: DocumentType;
    enabled: number;
    reminder_days_before: number;
    reminder_days_after: number;
    email_notifications: number;
    push_notifications: number;
    max_reminders: number;
  }[]>(
    'SELECT * FROM upload_reminder_settings WHERE document_type = ?',
    [documentType]
  );

  if (result.length === 0) {
    // Return defaults
    return {
      documentType,
      enabled: true,
      reminderDaysBefore: 3,
      reminderDaysAfter: 7,
      emailNotifications: false,
      pushNotifications: true,
      maxReminders: 3,
    };
  }

  const row = result[0];
  return {
    documentType: row.document_type,
    enabled: row.enabled === 1,
    reminderDaysBefore: row.reminder_days_before,
    reminderDaysAfter: row.reminder_days_after,
    emailNotifications: row.email_notifications === 1,
    pushNotifications: row.push_notifications === 1,
    maxReminders: row.max_reminders,
  };
}

/**
 * Get all reminder settings
 */
export async function getAllReminderSettings(): Promise<Array<{
  documentType: DocumentType;
  enabled: boolean;
  reminderDaysBefore: number;
  reminderDaysAfter: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  maxReminders: number;
}>> {
  const documentTypes: DocumentType[] = ['bank_statement', 'dividend_statement', 'payg_summary', 'other'];
  
  const settings = [];
  for (const type of documentTypes) {
    settings.push(await getReminderSettings(type));
  }
  
  return settings;
}

/**
 * Update reminder settings
 */
export async function updateReminderSettings(
  documentType: DocumentType,
  settings: Partial<{
    enabled: boolean;
    reminderDaysBefore: number;
    reminderDaysAfter: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    maxReminders: number;
  }>
): Promise<void> {
  const database = await getUploadRemindersDb();

  const current = await getReminderSettings(documentType);
  const updated = { ...current, ...settings };

  await database.execute(
    `INSERT INTO upload_reminder_settings 
     (document_type, enabled, reminder_days_before, reminder_days_after, 
      email_notifications, push_notifications, max_reminders, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(document_type) DO UPDATE SET
      enabled = excluded.enabled,
      reminder_days_before = excluded.reminder_days_before,
      reminder_days_after = excluded.reminder_days_after,
      email_notifications = excluded.email_notifications,
      push_notifications = excluded.push_notifications,
      max_reminders = excluded.max_reminders,
      updated_at = CURRENT_TIMESTAMP`,
    [
      documentType,
      updated.enabled ? 1 : 0,
      updated.reminderDaysBefore,
      updated.reminderDaysAfter,
      updated.emailNotifications ? 1 : 0,
      updated.pushNotifications ? 1 : 0,
      updated.maxReminders,
    ]
  );
}

// ============================================================================
// REMINDER HISTORY OPERATIONS
// ============================================================================

/**
 * Record a sent reminder
 */
export async function recordReminderSent(
  missingDocumentId: string,
  reminderType: 'before_due' | 'after_due' | 'follow_up',
  sentVia: 'app' | 'email' | 'push'
): Promise<number> {
  const database = await getUploadRemindersDb();

  const result = await database.execute(
    `INSERT INTO upload_reminder_history 
     (missing_document_id, reminder_type, sent_via)
     VALUES (?, ?, ?)`,
    [missingDocumentId, reminderType, sentVia]
  );

  return result.lastInsertId;
}

/**
 * Get reminder count for a missing document
 */
export async function getReminderCount(missingDocumentId: string): Promise<number> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM upload_reminder_history WHERE missing_document_id = ?',
    [missingDocumentId]
  );

  return result[0]?.count || 0;
}

/**
 * Get reminders sent for a missing document
 */
export async function getRemindersForMissingDocument(missingDocumentId: string): Promise<Array<{
  id: number;
  reminderType: 'before_due' | 'after_due' | 'follow_up';
  sentAt: string;
  sentVia: 'app' | 'email' | 'push';
  acknowledged: boolean;
}>> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: number;
    reminder_type: 'before_due' | 'after_due' | 'follow_up';
    sent_at: string;
    sent_via: 'app' | 'email' | 'push';
    acknowledged: number;
  }[]>(
    'SELECT * FROM upload_reminder_history WHERE missing_document_id = ? ORDER BY sent_at DESC',
    [missingDocumentId]
  );

  return result.map(row => ({
    id: row.id,
    reminderType: row.reminder_type,
    sentAt: row.sent_at,
    sentVia: row.sent_via,
    acknowledged: row.acknowledged === 1,
  }));
}

// ============================================================================
// ANALYSIS RUN OPERATIONS
// ============================================================================

/**
 * Record an analysis run
 */
export async function recordAnalysisRun(
  id: string,
  totalSources: number,
  patternsDetected: number,
  missingDetected: number,
  durationMs: number,
  errors: string[] = []
): Promise<void> {
  const database = await getUploadRemindersDb();

  await database.execute(
    `INSERT INTO upload_pattern_analysis_runs 
     (id, total_sources, patterns_detected, missing_detected, analysis_duration_ms, error_log)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, totalSources, patternsDetected, missingDetected, durationMs, JSON.stringify(errors)]
  );
}

/**
 * Get latest analysis run
 */
export async function getLatestAnalysisRun(): Promise<{
  id: string;
  analysisDate: string;
  totalSources: number;
  patternsDetected: number;
  missingDetected: number;
  durationMs: number;
} | null> {
  const database = await getUploadRemindersDb();

  const result = await database.select<{
    id: string;
    analysis_date: string;
    total_sources: number;
    patterns_detected: number;
    missing_detected: number;
    analysis_duration_ms: number;
  }[]>(
    'SELECT * FROM upload_pattern_analysis_runs ORDER BY analysis_date DESC LIMIT 1'
  );

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    analysisDate: row.analysis_date,
    totalSources: row.total_sources,
    patternsDetected: row.patterns_detected,
    missingDetected: row.missing_detected,
    durationMs: row.analysis_duration_ms,
  };
}