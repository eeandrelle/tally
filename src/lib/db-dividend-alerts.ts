/**
 * Dividend Alerts Database Layer
 * 
 * SQLite integration for storing and retrieving dividend alerts
 * using Tauri SQL plugin
 * 
 * Tables:
 * - dividend_alerts: Stores generated alerts
 * - dividend_alert_settings: User alert configuration
 * - dividend_alert_history: Historical alert actions
 * 
 * @module db-dividend-alerts
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  DividendAlert,
  AlertSettings,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertFilterOptions,
} from './dividend-alerts';
import { DEFAULT_ALERT_SETTINGS } from './dividend-alerts';

let db: Database | null = null;

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const DIVIDEND_ALERTS_SCHEMA = `
-- Dividend alerts table
CREATE TABLE IF NOT EXISTS dividend_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('missed_payment', 'frequency_change', 'amount_anomaly', 'early_payment', 'late_payment', 'new_pattern', 'upcoming_payment', 'pattern_uncertain')),
  severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  
  -- Company/Holding info
  holding_id TEXT NOT NULL,
  asx_code TEXT,
  company_name TEXT NOT NULL,
  
  -- Alert details
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT, -- JSON object
  
  -- Dates
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  
  -- Expected vs actual
  expected_date TEXT,
  expected_amount REAL,
  actual_date TEXT,
  actual_amount REAL,
  
  -- Pattern info
  pattern_id TEXT,
  previous_pattern TEXT,
  current_pattern TEXT,
  
  -- Deviation metrics
  days_deviation INTEGER,
  amount_deviation REAL,
  amount_deviation_percent REAL,
  
  -- Related payment
  payment_id INTEGER,
  
  -- User actions
  acknowledged_by TEXT,
  notes TEXT
);

-- Alert settings table
CREATE TABLE IF NOT EXISTS dividend_alert_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN DEFAULT 1,
  missed_payment_threshold_days INTEGER DEFAULT 14,
  missed_payment_severity TEXT DEFAULT 'warning' CHECK(missed_payment_severity IN ('info', 'warning', 'critical')),
  detect_frequency_changes BOOLEAN DEFAULT 1,
  frequency_change_severity TEXT DEFAULT 'info' CHECK(frequency_change_severity IN ('info', 'warning', 'critical')),
  detect_amount_anomalies BOOLEAN DEFAULT 1,
  amount_anomaly_threshold INTEGER DEFAULT 30,
  amount_anomaly_severity TEXT DEFAULT 'warning' CHECK(amount_anomaly_severity IN ('info', 'warning', 'critical')),
  detect_timing_deviations BOOLEAN DEFAULT 1,
  timing_deviation_threshold_days INTEGER DEFAULT 7,
  timing_deviation_severity TEXT DEFAULT 'info' CHECK(timing_deviation_severity IN ('info', 'warning', 'critical')),
  upcoming_payment_reminders BOOLEAN DEFAULT 1,
  upcoming_payment_days INTEGER DEFAULT 7,
  alert_on_low_confidence BOOLEAN DEFAULT 0,
  quiet_hours_enabled BOOLEAN DEFAULT 0,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alert history (audit log)
CREATE TABLE IF NOT EXISTS dividend_alert_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id TEXT NOT NULL,
  action TEXT NOT NULL, -- created, acknowledged, resolved, dismissed, updated
  performed_by TEXT,
  performed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  previous_status TEXT,
  new_status TEXT,
  FOREIGN KEY (alert_id) REFERENCES dividend_alerts(id) ON DELETE CASCADE
);

-- Alert generation runs
CREATE TABLE IF NOT EXISTS dividend_alert_runs (
  id TEXT PRIMARY KEY,
  run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  alerts_generated INTEGER DEFAULT 0,
  alerts_by_severity TEXT, -- JSON object
  missed_payments_detected INTEGER DEFAULT 0,
  frequency_changes_detected INTEGER DEFAULT 0,
  anomalies_detected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'completed', -- completed, failed, running
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_holding ON dividend_alerts(holding_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON dividend_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON dividend_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON dividend_alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON dividend_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON dividend_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON dividend_alert_history(alert_id);
`;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize the dividend alerts database tables
 */
export async function initDividendAlertDatabase(): Promise<void> {
  if (!db) {
    db = await Database.load('sqlite:default.db');
  }

  const statements = DIVIDEND_ALERTS_SCHEMA.split(';').filter(s => s.trim().length > 0);

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (error) {
      // Ignore "already exists" errors
      if (!(error as Error).message?.includes('already exists')) {
        console.error('Dividend alerts schema execution error:', error);
        throw error;
      }
    }
  }

  // Initialize default settings if not exists
  await initializeDefaultSettings();
}

/**
 * Get database instance
 */
export async function getDividendAlertDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:default.db');
    await initDividendAlertDatabase();
  }
  return db;
}

/**
 * Initialize default alert settings
 */
async function initializeDefaultSettings(): Promise<void> {
  const database = await getDividendAlertDb();

  const existing = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM dividend_alert_settings WHERE id = 1'
  );

  if (existing[0]?.count === 0) {
    await database.execute(
      `INSERT INTO dividend_alert_settings (
        id, enabled, missed_payment_threshold_days, missed_payment_severity,
        detect_frequency_changes, frequency_change_severity,
        detect_amount_anomalies, amount_anomaly_threshold, amount_anomaly_severity,
        detect_timing_deviations, timing_deviation_threshold_days, timing_deviation_severity,
        upcoming_payment_reminders, upcoming_payment_days, alert_on_low_confidence,
        quiet_hours_enabled
      ) VALUES (1, 1, 14, 'warning', 1, 'info', 1, 30, 'warning', 1, 7, 'info', 1, 7, 0, 0)`
    );
  }
}

// ============================================================================
// ALERT CRUD OPERATIONS
// ============================================================================

/**
 * Save a dividend alert
 */
export async function saveDividendAlert(alert: DividendAlert): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute(
    `INSERT INTO dividend_alerts (
      id, type, severity, status, holding_id, asx_code, company_name,
      title, message, details, created_at, updated_at, resolved_at,
      expected_date, expected_amount, actual_date, actual_amount,
      pattern_id, previous_pattern, current_pattern,
      days_deviation, amount_deviation, amount_deviation_percent,
      payment_id, acknowledged_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      severity = excluded.severity,
      status = excluded.status,
      holding_id = excluded.holding_id,
      asx_code = excluded.asx_code,
      company_name = excluded.company_name,
      title = excluded.title,
      message = excluded.message,
      details = excluded.details,
      updated_at = excluded.updated_at,
      resolved_at = excluded.resolved_at,
      expected_date = excluded.expected_date,
      expected_amount = excluded.expected_amount,
      actual_date = excluded.actual_date,
      actual_amount = excluded.actual_amount,
      pattern_id = excluded.pattern_id,
      previous_pattern = excluded.previous_pattern,
      current_pattern = excluded.current_pattern,
      days_deviation = excluded.days_deviation,
      amount_deviation = excluded.amount_deviation,
      amount_deviation_percent = excluded.amount_deviation_percent,
      payment_id = excluded.payment_id,
      acknowledged_by = excluded.acknowledged_by,
      notes = excluded.notes`,
    [
      alert.id,
      alert.type,
      alert.severity,
      alert.status,
      alert.holdingId,
      alert.asxCode || null,
      alert.companyName,
      alert.title,
      alert.message,
      alert.details ? JSON.stringify(alert.details) : null,
      alert.createdAt,
      alert.updatedAt,
      alert.resolvedAt || null,
      alert.expectedDate || null,
      alert.expectedAmount || null,
      alert.actualDate || null,
      alert.actualAmount || null,
      alert.patternId || null,
      alert.previousPattern || null,
      alert.currentPattern || null,
      alert.daysDeviation || null,
      alert.amountDeviation || null,
      alert.amountDeviationPercent || null,
      alert.paymentId || null,
      alert.acknowledgedBy || null,
      alert.notes || null,
    ]
  );
}

/**
 * Save multiple dividend alerts (batch insert)
 */
export async function saveDividendAlerts(alerts: DividendAlert[]): Promise<void> {
  const database = await getDividendAlertDb();

  for (const alert of alerts) {
    await saveDividendAlert(alert);
  }
}

/**
 * Get a dividend alert by ID
 */
export async function getDividendAlert(alertId: string): Promise<DividendAlert | null> {
  const database = await getDividendAlertDb();

  const result = await database.select<DividendAlertRow[]>(
    'SELECT * FROM dividend_alerts WHERE id = ?',
    [alertId]
  );

  if (!result[0]) return null;

  return rowToAlert(result[0]);
}

/**
 * Get all dividend alerts
 */
export async function getAllDividendAlerts(): Promise<DividendAlert[]> {
  const database = await getDividendAlertDb();

  const results = await database.select<DividendAlertRow[]>(
    'SELECT * FROM dividend_alerts ORDER BY created_at DESC'
  );

  return results.map(rowToAlert);
}

/**
 * Get alerts with filters
 */
export async function getDividendAlerts(filters?: AlertFilterOptions): Promise<DividendAlert[]> {
  const database = await getDividendAlertDb();

  let query = 'SELECT * FROM dividend_alerts WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.severity?.length) {
    query += ` AND severity IN (${filters.severity.map(() => '?').join(',')})`;
    params.push(...filters.severity);
  }

  if (filters?.type?.length) {
    query += ` AND type IN (${filters.type.map(() => '?').join(',')})`;
    params.push(...filters.type);
  }

  if (filters?.status?.length) {
    query += ` AND status IN (${filters.status.map(() => '?').join(',')})`;
    params.push(...filters.status);
  }

  if (filters?.holdingId) {
    query += ' AND holding_id = ?';
    params.push(filters.holdingId);
  }

  if (filters?.dateFrom) {
    query += ' AND created_at >= ?';
    params.push(filters.dateFrom);
  }

  if (filters?.dateTo) {
    query += ' AND created_at <= ?';
    params.push(filters.dateTo);
  }

  if (filters?.searchQuery) {
    query += ' AND (company_name LIKE ? OR title LIKE ? OR message LIKE ?)';
    const likeParam = `%${filters.searchQuery}%`;
    params.push(likeParam, likeParam, likeParam);
  }

  query += ' ORDER BY created_at DESC';

  const results = await database.select<DividendAlertRow[]>(query, params);
  return results.map(rowToAlert);
}

/**
 * Get active alerts only
 */
export async function getActiveAlerts(): Promise<DividendAlert[]> {
  const database = await getDividendAlertDb();

  const results = await database.select<DividendAlertRow[]>(
    `SELECT * FROM dividend_alerts 
     WHERE status IN ('active', 'acknowledged') 
     ORDER BY 
       CASE severity 
         WHEN 'critical' THEN 1 
         WHEN 'warning' THEN 2 
         WHEN 'info' THEN 3 
       END,
       created_at DESC`
  );

  return results.map(rowToAlert);
}

/**
 * Get alerts by holding
 */
export async function getAlertsByHolding(holdingId: string): Promise<DividendAlert[]> {
  const database = await getDividendAlertDb();

  const results = await database.select<DividendAlertRow[]>(
    'SELECT * FROM dividend_alerts WHERE holding_id = ? ORDER BY created_at DESC',
    [holdingId]
  );

  return results.map(rowToAlert);
}

/**
 * Get alerts by severity
 */
export async function getAlertsBySeverity(severity: AlertSeverity): Promise<DividendAlert[]> {
  const database = await getDividendAlertDb();

  const results = await database.select<DividendAlertRow[]>(
    'SELECT * FROM dividend_alerts WHERE severity = ? ORDER BY created_at DESC',
    [severity]
  );

  return results.map(rowToAlert);
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
  alertId: string,
  status: AlertStatus,
  notes?: string,
  performedBy?: string
): Promise<void> {
  const database = await getDividendAlertDb();

  const now = new Date().toISOString();

  await database.execute(
    `UPDATE dividend_alerts 
     SET status = ?, updated_at = ?, notes = COALESCE(?, notes), resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE resolved_at END
     WHERE id = ?`,
    [status, now, notes || null, status, now, alertId]
  );

  // Log to history
  await database.execute(
    `INSERT INTO dividend_alert_history (alert_id, action, performed_by, notes, new_status)
     VALUES (?, 'status_change', ?, ?, ?)`,
    [alertId, performedBy || null, notes || null, status]
  );
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy?: string
): Promise<void> {
  await updateAlertStatus(alertId, 'acknowledged', undefined, acknowledgedBy);
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, notes?: string, resolvedBy?: string): Promise<void> {
  await updateAlertStatus(alertId, 'resolved', notes, resolvedBy);
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId: string, notes?: string, dismissedBy?: string): Promise<void> {
  await updateAlertStatus(alertId, 'dismissed', notes, dismissedBy);
}

/**
 * Reactivate a dismissed or resolved alert
 */
export async function reactivateAlert(alertId: string, notes?: string): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute(
    `UPDATE dividend_alerts 
     SET status = 'active', updated_at = ?, resolved_at = NULL, notes = COALESCE(?, notes)
     WHERE id = ?`,
    [new Date().toISOString(), notes || null, alertId]
  );
}

/**
 * Delete an alert
 */
export async function deleteDividendAlert(alertId: string): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute(
    'DELETE FROM dividend_alerts WHERE id = ?',
    [alertId]
  );
}

/**
 * Delete all alerts for a holding
 */
export async function deleteAlertsByHolding(holdingId: string): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute(
    'DELETE FROM dividend_alerts WHERE holding_id = ?',
    [holdingId]
  );
}

/**
 * Delete all alerts
 */
export async function deleteAllAlerts(): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute('DELETE FROM dividend_alerts');
  await database.execute('DELETE FROM dividend_alert_history');
}

// ============================================================================
// ALERT SETTINGS
// ============================================================================

/**
 * Get alert settings
 */
export async function getAlertSettings(): Promise<AlertSettings> {
  const database = await getDividendAlertDb();

  const result = await database.select<AlertSettingsRow[]>(
    'SELECT * FROM dividend_alert_settings WHERE id = 1'
  );

  if (!result[0]) {
    return DEFAULT_ALERT_SETTINGS;
  }

  return rowToSettings(result[0]);
}

/**
 * Update alert settings
 */
export async function updateAlertSettings(settings: Partial<AlertSettings>): Promise<void> {
  const database = await getDividendAlertDb();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (settings.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(settings.enabled ? 1 : 0);
  }
  if (settings.missedPaymentThresholdDays !== undefined) {
    fields.push('missed_payment_threshold_days = ?');
    values.push(settings.missedPaymentThresholdDays);
  }
  if (settings.missedPaymentSeverity !== undefined) {
    fields.push('missed_payment_severity = ?');
    values.push(settings.missedPaymentSeverity);
  }
  if (settings.detectFrequencyChanges !== undefined) {
    fields.push('detect_frequency_changes = ?');
    values.push(settings.detectFrequencyChanges ? 1 : 0);
  }
  if (settings.frequencyChangeSeverity !== undefined) {
    fields.push('frequency_change_severity = ?');
    values.push(settings.frequencyChangeSeverity);
  }
  if (settings.detectAmountAnomalies !== undefined) {
    fields.push('detect_amount_anomalies = ?');
    values.push(settings.detectAmountAnomalies ? 1 : 0);
  }
  if (settings.amountAnomalyThreshold !== undefined) {
    fields.push('amount_anomaly_threshold = ?');
    values.push(settings.amountAnomalyThreshold);
  }
  if (settings.amountAnomalySeverity !== undefined) {
    fields.push('amount_anomaly_severity = ?');
    values.push(settings.amountAnomalySeverity);
  }
  if (settings.detectTimingDeviations !== undefined) {
    fields.push('detect_timing_deviations = ?');
    values.push(settings.detectTimingDeviations ? 1 : 0);
  }
  if (settings.timingDeviationThresholdDays !== undefined) {
    fields.push('timing_deviation_threshold_days = ?');
    values.push(settings.timingDeviationThresholdDays);
  }
  if (settings.timingDeviationSeverity !== undefined) {
    fields.push('timing_deviation_severity = ?');
    values.push(settings.timingDeviationSeverity);
  }
  if (settings.upcomingPaymentReminders !== undefined) {
    fields.push('upcoming_payment_reminders = ?');
    values.push(settings.upcomingPaymentReminders ? 1 : 0);
  }
  if (settings.upcomingPaymentDays !== undefined) {
    fields.push('upcoming_payment_days = ?');
    values.push(settings.upcomingPaymentDays);
  }
  if (settings.alertOnLowConfidence !== undefined) {
    fields.push('alert_on_low_confidence = ?');
    values.push(settings.alertOnLowConfidence ? 1 : 0);
  }
  if (settings.quietHoursEnabled !== undefined) {
    fields.push('quiet_hours_enabled = ?');
    values.push(settings.quietHoursEnabled ? 1 : 0);
  }
  if (settings.quietHoursStart !== undefined) {
    fields.push('quiet_hours_start = ?');
    values.push(settings.quietHoursStart);
  }
  if (settings.quietHoursEnd !== undefined) {
    fields.push('quiet_hours_end = ?');
    values.push(settings.quietHoursEnd);
  }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1); // id = 1

    await database.execute(
      `UPDATE dividend_alert_settings SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
}

/**
 * Reset alert settings to defaults
 */
export async function resetAlertSettings(): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute('DELETE FROM dividend_alert_settings WHERE id = 1');
  await initializeDefaultSettings();
}

// ============================================================================
// ALERT STATISTICS
// ============================================================================

/**
 * Get alert statistics
 */
export async function getAlertStatistics(): Promise<{
  totalAlerts: number;
  activeAlerts: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<string, number>;
  byStatus: Record<AlertStatus, number>;
}> {
  const database = await getDividendAlertDb();

  const totalResult = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM dividend_alerts'
  );

  const activeResult = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM dividend_alerts WHERE status IN ('active', 'acknowledged')"
  );

  const severityResults = await database.select<{ severity: AlertSeverity; count: number }[]>(
    'SELECT severity, COUNT(*) as count FROM dividend_alerts GROUP BY severity'
  );

  const typeResults = await database.select<{ type: string; count: number }[]>(
    'SELECT type, COUNT(*) as count FROM dividend_alerts GROUP BY type'
  );

  const statusResults = await database.select<{ status: AlertStatus; count: number }[]>(
    'SELECT status, COUNT(*) as count FROM dividend_alerts GROUP BY status'
  );

  const bySeverity: Record<AlertSeverity, number> = { info: 0, warning: 0, critical: 0 };
  for (const row of severityResults) {
    bySeverity[row.severity] = row.count;
  }

  const byType: Record<string, number> = {};
  for (const row of typeResults) {
    byType[row.type] = row.count;
  }

  const byStatus: Record<AlertStatus, number> = { active: 0, acknowledged: 0, resolved: 0, dismissed: 0 };
  for (const row of statusResults) {
    byStatus[row.status] = row.count;
  }

  return {
    totalAlerts: totalResult[0]?.count || 0,
    activeAlerts: activeResult[0]?.count || 0,
    bySeverity,
    byType,
    byStatus,
  };
}

/**
 * Get active alert count (for badge display)
 */
export async function getActiveAlertCount(): Promise<number> {
  const database = await getDividendAlertDb();

  const result = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM dividend_alerts WHERE status = 'active'"
  );

  return result[0]?.count || 0;
}

/**
 * Get critical alert count
 */
export async function getCriticalAlertCount(): Promise<number> {
  const database = await getDividendAlertDb();

  const result = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM dividend_alerts WHERE severity = 'critical' AND status IN ('active', 'acknowledged')"
  );

  return result[0]?.count || 0;
}

// ============================================================================
// ALERT RUNS
// ============================================================================

/**
 * Start an alert generation run
 */
export async function startAlertRun(): Promise<string> {
  const database = await getDividendAlertDb();

  const id = `alert-run-${Date.now()}`;

  await database.execute(
    `INSERT INTO dividend_alert_runs (id, run_at, status) VALUES (?, CURRENT_TIMESTAMP, 'running')`,
    [id]
  );

  return id;
}

/**
 * Complete an alert generation run
 */
export async function completeAlertRun(
  runId: string,
  alertsGenerated: number,
  bySeverity: Record<AlertSeverity, number>,
  missedPayments: number,
  frequencyChanges: number,
  anomalies: number,
  durationMs: number
): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute(
    `UPDATE dividend_alert_runs 
     SET alerts_generated = ?, alerts_by_severity = ?, missed_payments_detected = ?,
         frequency_changes_detected = ?, anomalies_detected = ?, duration_ms = ?, status = 'completed'
     WHERE id = ?`,
    [
      alertsGenerated,
      JSON.stringify(bySeverity),
      missedPayments,
      frequencyChanges,
      anomalies,
      durationMs,
      runId,
    ]
  );
}

/**
 * Log alert run failure
 */
export async function failAlertRun(runId: string, errorMessage: string): Promise<void> {
  const database = await getDividendAlertDb();

  await database.execute(
    `UPDATE dividend_alert_runs SET status = 'failed', error_message = ? WHERE id = ?`,
    [errorMessage, runId]
  );
}

/**
 * Get alert run history
 */
export async function getAlertRunHistory(limit: number = 10): Promise<AlertRunRow[]> {
  const database = await getDividendAlertDb();

  return await database.select<AlertRunRow[]>(
    `SELECT * FROM dividend_alert_runs ORDER BY run_at DESC LIMIT ?`,
    [limit]
  );
}

// ============================================================================
// TYPE DEFINITIONS FOR DATABASE ROWS
// ============================================================================

interface DividendAlertRow {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  holding_id: string;
  asx_code: string | null;
  company_name: string;
  title: string;
  message: string;
  details: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  expected_date: string | null;
  expected_amount: number | null;
  actual_date: string | null;
  actual_amount: number | null;
  pattern_id: string | null;
  previous_pattern: string | null;
  current_pattern: string | null;
  days_deviation: number | null;
  amount_deviation: number | null;
  amount_deviation_percent: number | null;
  payment_id: number | null;
  acknowledged_by: string | null;
  notes: string | null;
}

interface AlertSettingsRow {
  id: number;
  enabled: number;
  missed_payment_threshold_days: number;
  missed_payment_severity: AlertSeverity;
  detect_frequency_changes: number;
  frequency_change_severity: AlertSeverity;
  detect_amount_anomalies: number;
  amount_anomaly_threshold: number;
  amount_anomaly_severity: AlertSeverity;
  detect_timing_deviations: number;
  timing_deviation_threshold_days: number;
  timing_deviation_severity: AlertSeverity;
  upcoming_payment_reminders: number;
  upcoming_payment_days: number;
  alert_on_low_confidence: number;
  quiet_hours_enabled: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  updated_at: string;
}

interface AlertRunRow {
  id: string;
  run_at: string;
  alerts_generated: number;
  alerts_by_severity: string;
  missed_payments_detected: number;
  frequency_changes_detected: number;
  anomalies_detected: number;
  duration_ms: number;
  status: string;
  error_message: string | null;
}

// ============================================================================
// ROW TO MODEL CONVERSION
// ============================================================================

function rowToAlert(row: DividendAlertRow): DividendAlert {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    status: row.status,
    holdingId: row.holding_id,
    asxCode: row.asx_code || undefined,
    companyName: row.company_name,
    title: row.title,
    message: row.message,
    details: row.details ? JSON.parse(row.details) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || undefined,
    expectedDate: row.expected_date || undefined,
    expectedAmount: row.expected_amount || undefined,
    actualDate: row.actual_date || undefined,
    actualAmount: row.actual_amount || undefined,
    patternId: row.pattern_id || undefined,
    previousPattern: row.previous_pattern as PaymentFrequency | undefined,
    currentPattern: row.current_pattern as PaymentFrequency | undefined,
    daysDeviation: row.days_deviation || undefined,
    amountDeviation: row.amount_deviation || undefined,
    amountDeviationPercent: row.amount_deviation_percent || undefined,
    paymentId: row.payment_id || undefined,
    acknowledgedBy: row.acknowledged_by || undefined,
    notes: row.notes || undefined,
  };
}

function rowToSettings(row: AlertSettingsRow): AlertSettings {
  return {
    enabled: Boolean(row.enabled),
    missedPaymentThresholdDays: row.missed_payment_threshold_days,
    missedPaymentSeverity: row.missed_payment_severity,
    detectFrequencyChanges: Boolean(row.detect_frequency_changes),
    frequencyChangeSeverity: row.frequency_change_severity,
    detectAmountAnomalies: Boolean(row.detect_amount_anomalies),
    amountAnomalyThreshold: row.amount_anomaly_threshold,
    amountAnomalySeverity: row.amount_anomaly_severity,
    detectTimingDeviations: Boolean(row.detect_timing_deviations),
    timingDeviationThresholdDays: row.timing_deviation_threshold_days,
    timingDeviationSeverity: row.timing_deviation_severity,
    upcomingPaymentReminders: Boolean(row.upcoming_payment_reminders),
    upcomingPaymentDays: row.upcoming_payment_days,
    alertOnLowConfidence: Boolean(row.alert_on_low_confidence),
    quietHoursEnabled: Boolean(row.quiet_hours_enabled),
    quietHoursStart: row.quiet_hours_start || undefined,
    quietHoursEnd: row.quiet_hours_end || undefined,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export all alerts to JSON
 */
export async function exportAlertsToJSON(): Promise<string> {
  const alerts = await getAllDividendAlerts();
  return JSON.stringify(alerts, null, 2);
}

/**
 * Export alerts to CSV
 */
export async function exportAlertsToCSV(): Promise<string> {
  const alerts = await getAllDividendAlerts();

  const headers = [
    'ID',
    'Type',
    'Severity',
    'Status',
    'Company',
    'ASX Code',
    'Title',
    'Message',
    'Created At',
    'Resolved At',
    'Expected Amount',
    'Actual Amount',
  ];

  const rows = alerts.map(a => [
    a.id,
    a.type,
    a.severity,
    a.status,
    a.companyName,
    a.asxCode || '',
    a.title,
    a.message,
    a.createdAt,
    a.resolvedAt || '',
    a.expectedAmount?.toString() || '',
    a.actualAmount?.toString() || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Get dashboard alert summary (for quick overview)
 */
export async function getAlertDashboardSummary(): Promise<{
  totalActive: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  recentAlerts: DividendAlert[];
}> {
  const [activeAlerts, criticalCount, warningCount, infoCount] = await Promise.all([
    getActiveAlerts(),
    getAlertsBySeverity('critical').then(a => a.filter(al => al.status !== 'resolved' && al.status !== 'dismissed').length),
    getAlertsBySeverity('warning').then(a => a.filter(al => al.status !== 'resolved' && al.status !== 'dismissed').length),
    getAlertsBySeverity('info').then(a => a.filter(al => al.status !== 'resolved' && al.status !== 'dismissed').length),
  ]);

  return {
    totalActive: activeAlerts.length,
    criticalCount,
    warningCount,
    infoCount,
    recentAlerts: activeAlerts.slice(0, 5),
  };
}
