/**
 * Dividend Patterns Database Layer
 * 
 * SQLite integration for storing and retrieving dividend pattern data
 * using Tauri SQL plugin
 * 
 * Tables:
 * - dividend_patterns: Stores detected patterns for each holding
 * - dividend_payment_history: Tracks all historical dividend payments
 * - dividend_pattern_changes: Records pattern changes over time
 * - dividend_pattern_analysis: Analysis run metadata
 * 
 * @module db-dividend-patterns
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  DividendPattern,
  PatternChange,
  PaymentFrequency,
  PatternConfidence,
  DividendPaymentRecord,
} from './dividend-patterns';

let db: Database | null = null;

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export const DIVIDEND_PATTERNS_SCHEMA = `
-- Dividend patterns table
CREATE TABLE IF NOT EXISTS dividend_patterns (
  id TEXT PRIMARY KEY,
  asx_code TEXT,
  company_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('monthly', 'quarterly', 'half-yearly', 'yearly', 'irregular', 'unknown')),
  confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low', 'uncertain')),
  confidence_score INTEGER NOT NULL DEFAULT 0,
  detected_pattern TEXT NOT NULL,
  seasonal_months TEXT, -- JSON array of month numbers
  seasonal_description TEXT,
  pattern_stability TEXT CHECK(pattern_stability IN ('stable', 'changing', 'volatile')),
  payments_analyzed INTEGER NOT NULL DEFAULT 0,
  date_range_start TEXT,
  date_range_end TEXT,
  analysis_date TEXT NOT NULL,
  next_expected_date TEXT,
  next_expected_amount REAL,
  next_expected_confidence TEXT CHECK(next_expected_confidence IN ('high', 'medium', 'low', 'uncertain')),
  -- Statistics
  avg_interval INTEGER,
  interval_std_dev REAL,
  min_interval INTEGER,
  max_interval INTEGER,
  coefficient_of_variation REAL,
  total_amount REAL,
  avg_amount REAL,
  amount_trend TEXT CHECK(amount_trend IN ('increasing', 'decreasing', 'stable', 'volatile')),
  seasonal_consistency REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Dividend payment history table
CREATE TABLE IF NOT EXISTS dividend_payment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holding_id TEXT NOT NULL,
  entry_id INTEGER, -- Reference to dividend_entries table if exists
  company_name TEXT NOT NULL,
  asx_code TEXT,
  dividend_amount REAL NOT NULL,
  franking_percentage REAL DEFAULT 0,
  franking_credit REAL DEFAULT 0,
  date_received TEXT NOT NULL,
  tax_year TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual', -- manual, pdf_import, bank_feed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (holding_id) REFERENCES dividend_patterns(id) ON DELETE CASCADE
);

-- Pattern changes history
CREATE TABLE IF NOT EXISTS dividend_pattern_changes (
  id TEXT PRIMARY KEY,
  holding_id TEXT NOT NULL,
  change_date TEXT NOT NULL,
  from_frequency TEXT NOT NULL,
  to_frequency TEXT NOT NULL,
  reason TEXT,
  detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (holding_id) REFERENCES dividend_patterns(id) ON DELETE CASCADE
);

-- Pattern analysis runs
CREATE TABLE IF NOT EXISTS dividend_pattern_analysis (
  id TEXT PRIMARY KEY,
  analysis_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_holdings INTEGER DEFAULT 0,
  patterns_detected INTEGER DEFAULT 0,
  analysis_duration_ms INTEGER,
  status TEXT DEFAULT 'completed',
  error_log TEXT, -- JSON array of errors
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patterns_asx_code ON dividend_patterns(asx_code);
CREATE INDEX IF NOT EXISTS idx_patterns_frequency ON dividend_patterns(frequency);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON dividend_patterns(confidence);
CREATE INDEX IF NOT EXISTS idx_patterns_next_expected ON dividend_patterns(next_expected_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_holding ON dividend_payment_history(holding_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON dividend_payment_history(date_received);
CREATE INDEX IF NOT EXISTS idx_pattern_changes_holding ON dividend_pattern_changes(holding_id);
`;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize the dividend patterns database tables
 */
export async function initDividendPatternDatabase(): Promise<void> {
  if (!db) {
    db = await Database.load('sqlite:default.db');
  }

  const statements = DIVIDEND_PATTERNS_SCHEMA.split(';').filter(s => s.trim().length > 0);

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (error) {
      // Ignore "already exists" errors
      if (!(error as Error).message?.includes('already exists')) {
        console.error('Dividend pattern schema execution error:', error);
        throw error;
      }
    }
  }
}

/**
 * Get database instance
 */
export async function getDividendPatternDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:default.db');
    await initDividendPatternDatabase();
  }
  return db;
}

// ============================================================================
// PATTERN CRUD OPERATIONS
// ============================================================================

/**
 * Save or update a dividend pattern
 */
export async function saveDividendPattern(pattern: DividendPattern): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute(
    `INSERT INTO dividend_patterns (
      id, asx_code, company_name, frequency, confidence, confidence_score,
      detected_pattern, seasonal_months, seasonal_description, pattern_stability,
      payments_analyzed, date_range_start, date_range_end, analysis_date,
      next_expected_date, next_expected_amount, next_expected_confidence,
      avg_interval, interval_std_dev, min_interval, max_interval,
      coefficient_of_variation, total_amount, avg_amount, amount_trend, seasonal_consistency,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      asx_code = excluded.asx_code,
      company_name = excluded.company_name,
      frequency = excluded.frequency,
      confidence = excluded.confidence,
      confidence_score = excluded.confidence_score,
      detected_pattern = excluded.detected_pattern,
      seasonal_months = excluded.seasonal_months,
      seasonal_description = excluded.seasonal_description,
      pattern_stability = excluded.pattern_stability,
      payments_analyzed = excluded.payments_analyzed,
      date_range_start = excluded.date_range_start,
      date_range_end = excluded.date_range_end,
      analysis_date = excluded.analysis_date,
      next_expected_date = excluded.next_expected_date,
      next_expected_amount = excluded.next_expected_amount,
      next_expected_confidence = excluded.next_expected_confidence,
      avg_interval = excluded.avg_interval,
      interval_std_dev = excluded.interval_std_dev,
      min_interval = excluded.min_interval,
      max_interval = excluded.max_interval,
      coefficient_of_variation = excluded.coefficient_of_variation,
      total_amount = excluded.total_amount,
      avg_amount = excluded.avg_amount,
      amount_trend = excluded.amount_trend,
      seasonal_consistency = excluded.seasonal_consistency,
      updated_at = CURRENT_TIMESTAMP`,
    [
      pattern.id,
      pattern.asxCode || null,
      pattern.companyName,
      pattern.frequency,
      pattern.confidence,
      pattern.confidenceScore,
      pattern.detectedPattern,
      pattern.seasonalPattern ? JSON.stringify(pattern.seasonalPattern.months) : null,
      pattern.seasonalPattern?.description || null,
      pattern.patternStability,
      pattern.paymentsAnalyzed,
      pattern.dateRange.start,
      pattern.dateRange.end,
      pattern.analysisDate,
      pattern.nextExpectedPayment?.estimatedDate || null,
      pattern.nextExpectedPayment?.estimatedAmount || null,
      pattern.nextExpectedPayment?.confidence || null,
      pattern.statistics.averageInterval,
      pattern.statistics.intervalStdDev,
      pattern.statistics.minInterval,
      pattern.statistics.maxInterval,
      pattern.statistics.coefficientOfVariation,
      pattern.statistics.totalAmount,
      pattern.statistics.averageAmount,
      pattern.statistics.amountTrend,
      pattern.statistics.seasonalConsistency,
    ]
  );
}

/**
 * Get a dividend pattern by holding ID
 */
export async function getDividendPattern(holdingId: string): Promise<DividendPattern | null> {
  const database = await getDividendPatternDb();

  const result = await database.select<DividendPatternRow[]>(
    'SELECT * FROM dividend_patterns WHERE id = ?',
    [holdingId]
  );

  if (!result[0]) return null;

  return rowToPattern(result[0]);
}

/**
 * Get all dividend patterns
 */
export async function getAllDividendPatterns(): Promise<DividendPattern[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<DividendPatternRow[]>(
    'SELECT * FROM dividend_patterns ORDER BY company_name'
  );

  return results.map(rowToPattern);
}

/**
 * Get patterns by frequency
 */
export async function getDividendPatternsByFrequency(frequency: PaymentFrequency): Promise<DividendPattern[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<DividendPatternRow[]>(
    'SELECT * FROM dividend_patterns WHERE frequency = ? ORDER BY company_name',
    [frequency]
  );

  return results.map(rowToPattern);
}

/**
 * Get patterns with upcoming payments
 */
export async function getPatternsWithUpcomingPayments(days: number = 90): Promise<DividendPattern[]> {
  const database = await getDividendPatternDb();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const results = await database.select<DividendPatternRow[]>(
    `SELECT * FROM dividend_patterns 
     WHERE next_expected_date IS NOT NULL 
     AND next_expected_date <= ?
     AND next_expected_date >= date('now')
     ORDER BY next_expected_date`,
    [futureDate.toISOString().split('T')[0]]
  );

  return results.map(rowToPattern);
}

/**
 * Delete a dividend pattern
 */
export async function deleteDividendPattern(holdingId: string): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute(
    'DELETE FROM dividend_patterns WHERE id = ?',
    [holdingId]
  );
}

/**
 * Delete all dividend patterns
 */
export async function deleteAllDividendPatterns(): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute('DELETE FROM dividend_patterns');
  await database.execute('DELETE FROM dividend_payment_history');
  await database.execute('DELETE FROM dividend_pattern_changes');
}

// ============================================================================
// PAYMENT HISTORY OPERATIONS
// ============================================================================

/**
 * Save a dividend payment record
 */
export async function saveDividendPayment(
  holdingId: string,
  payment: DividendPaymentRecord,
  source: 'manual' | 'pdf_import' | 'bank_feed' = 'manual'
): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute(
    `INSERT INTO dividend_payment_history (
      holding_id, entry_id, company_name, asx_code, dividend_amount,
      franking_percentage, date_received, tax_year, notes, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING`,
    [
      holdingId,
      payment.id || null,
      payment.companyName,
      payment.asxCode || null,
      payment.dividendAmount,
      payment.frankingPercentage,
      payment.dateReceived,
      payment.taxYear || null,
      null, // notes - extracted from entry if needed
      source,
    ]
  );
}

/**
 * Get payment history for a holding
 */
export async function getDividendPaymentHistory(holdingId: string): Promise<DividendPaymentRecord[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<DividendPaymentHistoryRow[]>(
    `SELECT * FROM dividend_payment_history 
     WHERE holding_id = ? 
     ORDER BY date_received ASC`,
    [holdingId]
  );

  return results.map(rowToPaymentRecord);
}

/**
 * Get all payment history
 */
export async function getAllDividendPaymentHistory(): Promise<DividendPaymentRecord[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<DividendPaymentHistoryRow[]>(
    'SELECT * FROM dividend_payment_history ORDER BY date_received DESC'
  );

  return results.map(rowToPaymentRecord);
}

/**
 * Get payment history by ASX code
 */
export async function getDividendPaymentHistoryByAsxCode(asxCode: string): Promise<DividendPaymentRecord[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<DividendPaymentHistoryRow[]>(
    'SELECT * FROM dividend_payment_history WHERE asx_code = ? ORDER BY date_received ASC',
    [asxCode]
  );

  return results.map(rowToPaymentRecord);
}

/**
 * Delete payment history for a holding
 */
export async function deleteDividendPaymentHistory(holdingId: string): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute(
    'DELETE FROM dividend_payment_history WHERE holding_id = ?',
    [holdingId]
  );
}

// ============================================================================
// PATTERN CHANGES OPERATIONS
// ============================================================================

/**
 * Save a pattern change record
 */
export async function savePatternChange(holdingId: string, change: PatternChange): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute(
    `INSERT INTO dividend_pattern_changes (
      id, holding_id, change_date, from_frequency, to_frequency, reason, detected_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      change_date = excluded.change_date,
      from_frequency = excluded.from_frequency,
      to_frequency = excluded.to_frequency,
      reason = excluded.reason`,
    [
      change.id,
      holdingId,
      change.changeDate,
      change.fromFrequency,
      change.toFrequency,
      change.reason,
      change.detectedAt,
    ]
  );
}

/**
 * Get pattern changes for a holding
 */
export async function getPatternChanges(holdingId: string): Promise<PatternChange[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<PatternChangeRow[]>(
    `SELECT * FROM dividend_pattern_changes 
     WHERE holding_id = ? 
     ORDER BY change_date DESC`,
    [holdingId]
  );

  return results.map(rowToPatternChange);
}

/**
 * Get all pattern changes
 */
export async function getAllPatternChanges(): Promise<PatternChange[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<PatternChangeRow[]>(
    'SELECT * FROM dividend_pattern_changes ORDER BY change_date DESC'
  );

  return results.map(rowToPatternChange);
}

// ============================================================================
// ANALYSIS RUN OPERATIONS
// ============================================================================

/**
 * Start a new pattern analysis run
 */
export async function startPatternAnalysis(): Promise<string> {
  const database = await getDividendPatternDb();

  const id = `analysis-${Date.now()}`;
  
  await database.execute(
    `INSERT INTO dividend_pattern_analysis (id, analysis_date, status) VALUES (?, CURRENT_TIMESTAMP, 'running')`,
    [id]
  );

  return id;
}

/**
 * Complete a pattern analysis run
 */
export async function completePatternAnalysis(
  analysisId: string,
  totalHoldings: number,
  patternsDetected: number,
  durationMs: number,
  errors: string[] = []
): Promise<void> {
  const database = await getDividendPatternDb();

  await database.execute(
    `UPDATE dividend_pattern_analysis 
     SET total_holdings = ?, 
         patterns_detected = ?, 
         analysis_duration_ms = ?, 
         status = 'completed',
         error_log = ?
     WHERE id = ?`,
    [totalHoldings, patternsDetected, durationMs, JSON.stringify(errors), analysisId]
  );
}

/**
 * Get analysis history
 */
export async function getPatternAnalysisHistory(limit: number = 10): Promise<PatternAnalysisRun[]> {
  const database = await getDividendPatternDb();

  const results = await database.select<PatternAnalysisRow[]>(
    `SELECT * FROM dividend_pattern_analysis 
     ORDER BY analysis_date DESC 
     LIMIT ?`,
    [limit]
  );

  return results.map(row => ({
    id: row.id,
    analysisDate: row.analysis_date,
    totalHoldings: row.total_holdings,
    patternsDetected: row.patterns_detected,
    analysisDurationMs: row.analysis_duration_ms,
    status: row.status as 'completed' | 'running' | 'failed',
    errorLog: row.error_log ? JSON.parse(row.error_log) : [],
    notes: row.notes,
  }));
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync patterns from dividend entries
 * This takes data from the dividend_entries table and creates pattern records
 */
export async function syncPatternsFromDividendEntries(): Promise<{ 
  patternsCreated: number; 
  paymentsSynced: number;
  errors: string[];
}> {
  const database = await getDividendPatternDb();

  // Get all dividend entries
  const entries = await database.select<{
    id: number;
    company_name: string;
    dividend_amount: number;
    franking_percentage: number;
    franking_credit: number;
    date_received: string;
    tax_year: string;
    notes?: string;
  }[]>(
    `SELECT id, company_name, dividend_amount, franking_percentage, 
            franking_credit, date_received, tax_year, notes
     FROM dividend_entries
     ORDER BY company_name, date_received`
  );

  const patternsCreated = new Set<string>();
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      const holdingId = entry.company_name.toUpperCase().trim().replace(/\s+/g, '_');

      // Save payment history
      await database.execute(
        `INSERT OR IGNORE INTO dividend_payment_history (
          holding_id, entry_id, company_name, dividend_amount,
          franking_percentage, franking_credit, date_received, tax_year, notes, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          holdingId,
          entry.id,
          entry.company_name,
          entry.dividend_amount,
          entry.franking_percentage,
          entry.franking_credit,
          entry.date_received,
          entry.tax_year,
          entry.notes || null,
          'manual',
        ]
      );

      patternsCreated.add(holdingId);
    } catch (error) {
      errors.push(`Error syncing entry ${entry.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    patternsCreated: patternsCreated.size,
    paymentsSynced: entries.length,
    errors,
  };
}

// ============================================================================
// STATISTICS & AGGREGATION
// ============================================================================

/**
 * Get pattern statistics summary
 */
export async function getPatternStatistics(): Promise<{
  totalHoldings: number;
  byFrequency: Record<PaymentFrequency, number>;
  byConfidence: Record<PatternConfidence, number>;
  averageConfidence: number;
  upcomingPaymentsCount: number;
}> {
  const database = await getDividendPatternDb();

  const totalResult = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM dividend_patterns'
  );

  const frequencyResults = await database.select<{ frequency: PaymentFrequency; count: number }[]>(
    'SELECT frequency, COUNT(*) as count FROM dividend_patterns GROUP BY frequency'
  );

  const confidenceResults = await database.select<{ confidence: PatternConfidence; count: number }[]>(
    'SELECT confidence, COUNT(*) as count FROM dividend_patterns GROUP BY confidence'
  );

  const avgConfidenceResult = await database.select<{ avg: number }[]>(
    'SELECT AVG(confidence_score) as avg FROM dividend_patterns'
  );

  const upcomingResult = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM dividend_patterns 
     WHERE next_expected_date >= date('now') 
     AND next_expected_date <= date('now', '+90 days')`
  );

  const byFrequency: Record<PaymentFrequency, number> = {
    monthly: 0,
    quarterly: 0,
    'half-yearly': 0,
    yearly: 0,
    irregular: 0,
    unknown: 0,
  };

  for (const row of frequencyResults) {
    byFrequency[row.frequency] = row.count;
  }

  const byConfidence: Record<PatternConfidence, number> = {
    high: 0,
    medium: 0,
    low: 0,
    uncertain: 0,
  };

  for (const row of confidenceResults) {
    byConfidence[row.confidence] = row.count;
  }

  return {
    totalHoldings: totalResult[0]?.count || 0,
    byFrequency,
    byConfidence,
    averageConfidence: Math.round(avgConfidenceResult[0]?.avg || 0),
    upcomingPaymentsCount: upcomingResult[0]?.count || 0,
  };
}

// ============================================================================
// TYPE DEFINITIONS FOR DATABASE ROWS
// ============================================================================

interface DividendPatternRow {
  id: string;
  asx_code: string | null;
  company_name: string;
  frequency: PaymentFrequency;
  confidence: PatternConfidence;
  confidence_score: number;
  detected_pattern: string;
  seasonal_months: string | null;
  seasonal_description: string | null;
  pattern_stability: 'stable' | 'changing' | 'volatile';
  payments_analyzed: number;
  date_range_start: string;
  date_range_end: string;
  analysis_date: string;
  next_expected_date: string | null;
  next_expected_amount: number | null;
  next_expected_confidence: PatternConfidence | null;
  avg_interval: number;
  interval_std_dev: number;
  min_interval: number;
  max_interval: number;
  coefficient_of_variation: number;
  total_amount: number;
  avg_amount: number;
  amount_trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonal_consistency: number;
}

interface DividendPaymentHistoryRow {
  id: number;
  holding_id: string;
  entry_id: number | null;
  company_name: string;
  asx_code: string | null;
  dividend_amount: number;
  franking_percentage: number;
  franking_credit: number;
  date_received: string;
  tax_year: string | null;
  notes: string | null;
  source: string;
}

interface PatternChangeRow {
  id: string;
  holding_id: string;
  change_date: string;
  from_frequency: PaymentFrequency;
  to_frequency: PaymentFrequency;
  reason: string;
  detected_at: string;
}

interface PatternAnalysisRow {
  id: string;
  analysis_date: string;
  total_holdings: number;
  patterns_detected: number;
  analysis_duration_ms: number;
  status: string;
  error_log: string | null;
  notes: string | null;
}

interface PatternAnalysisRun {
  id: string;
  analysisDate: string;
  totalHoldings: number;
  patternsDetected: number;
  analysisDurationMs: number;
  status: 'completed' | 'running' | 'failed';
  errorLog: string[];
  notes: string | null;
}

// ============================================================================
// ROW TO MODEL CONVERSION
// ============================================================================

function rowToPattern(row: DividendPatternRow): DividendPattern {
  return {
    id: row.id,
    asxCode: row.asx_code || undefined,
    companyName: row.company_name,
    frequency: row.frequency,
    confidence: row.confidence,
    confidenceScore: row.confidence_score,
    detectedPattern: row.detected_pattern,
    seasonalPattern: row.seasonal_months ? {
      months: JSON.parse(row.seasonal_months),
      description: row.seasonal_description || '',
    } : undefined,
    analysisDate: row.analysis_date,
    paymentsAnalyzed: row.payments_analyzed,
    dateRange: {
      start: row.date_range_start,
      end: row.date_range_end,
    },
    patternStability: row.pattern_stability,
    patternChanges: [], // Loaded separately
    nextExpectedPayment: row.next_expected_date ? {
      estimatedDate: row.next_expected_date,
      estimatedAmount: row.next_expected_amount || 0,
      confidence: row.next_expected_confidence || 'low',
    } : undefined,
    statistics: {
      averageInterval: row.avg_interval,
      intervalStdDev: row.interval_std_dev,
      minInterval: row.min_interval,
      maxInterval: row.max_interval,
      coefficientOfVariation: row.coefficient_of_variation,
      totalAmount: row.total_amount,
      averageAmount: row.avg_amount,
      amountTrend: row.amount_trend,
      seasonalConsistency: row.seasonal_consistency,
    },
  };
}

function rowToPaymentRecord(row: DividendPaymentHistoryRow): DividendPaymentRecord {
  return {
    id: row.id,
    companyName: row.company_name,
    asxCode: row.asx_code || undefined,
    dividendAmount: row.dividend_amount,
    frankingPercentage: row.franking_percentage,
    dateReceived: row.date_received,
    taxYear: row.tax_year || undefined,
  };
}

function rowToPatternChange(row: PatternChangeRow): PatternChange {
  return {
    id: row.id,
    changeDate: row.change_date,
    fromFrequency: row.from_frequency,
    toFrequency: row.to_frequency,
    reason: row.reason,
    detectedAt: row.detected_at,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export all patterns to JSON
 */
export async function exportAllPatternsToJSON(): Promise<string> {
  const patterns = await getAllDividendPatterns();
  return JSON.stringify(patterns, null, 2);
}

/**
 * Export patterns to CSV
 */
export async function exportPatternsToCSV(): Promise<string> {
  const patterns = await getAllDividendPatterns();

  const headers = [
    'Holding ID',
    'ASX Code',
    'Company Name',
    'Frequency',
    'Confidence',
    'Confidence Score',
    'Pattern',
    'Payments Analyzed',
    'Next Expected Date',
    'Next Expected Amount',
    'Pattern Stability',
  ];

  const rows = patterns.map(p => [
    p.id,
    p.asxCode || '',
    p.companyName,
    p.frequency,
    p.confidence,
    p.confidenceScore.toString(),
    p.detectedPattern,
    p.paymentsAnalyzed.toString(),
    p.nextExpectedPayment?.estimatedDate || '',
    p.nextExpectedPayment?.estimatedAmount.toFixed(2) || '',
    p.patternStability,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
