/**
 * Franking Credit Database Integration
 * 
 * SQLite integration for storing and retrieving dividend entries
 * using Tauri SQL plugin
 */

import Database from '@tauri-apps/plugin-sql';
import type { DividendEntry, AnnualFrankingSummary } from './franking-credits';
import {
  calculateFrankingFromDividend,
  calculateAnnualSummary,
  getFinancialYear,
  validateDividendEntry,
  FRANKING_CREDIT_SCHEMA,
} from './franking-credits';

let db: Database | null = null;

/**
 * Initialize the franking credit database tables
 */
export async function initFrankingCreditDatabase(): Promise<void> {
  if (!db) {
    db = await Database.load('sqlite:default.db');
  }
  
  // Execute schema creation
  const statements = FRANKING_CREDIT_SCHEMA.split(';').filter(s => s.trim().length > 0);
  
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (error) {
      // Ignore "already exists" errors
      if (!(error as Error).message?.includes('already exists')) {
        console.error('Schema execution error:', error);
        throw error;
      }
    }
  }
}

/**
 * Get database instance
 */
export async function getFrankingCreditDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:default.db');
    await initFrankingCreditDatabase();
  }
  return db;
}

// ============= CRUD OPERATIONS =============

/**
 * Create a new dividend entry with automatic calculation
 */
export async function createDividendEntry(
  entry: Omit<DividendEntry, 'id' | 'frankingCredit' | 'grossedUpDividend' | 'createdAt' | 'updatedAt'>
): Promise<DividendEntry> {
  const database = await getFrankingCreditDb();
  
  // Validate input
  const validation = validateDividendEntry(entry);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Calculate franking credit and grossed-up amount
  const calculation = calculateFrankingFromDividend(
    entry.dividendAmount,
    entry.frankingPercentage
  );
  
  const taxYear = entry.taxYear || getFinancialYear(new Date(entry.dateReceived));
  
  const result = await database.execute(
    `INSERT INTO dividend_entries 
     (company_name, dividend_amount, franking_percentage, franking_credit, 
      grossed_up_dividend, date_received, notes, tax_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.companyName,
      calculation.dividendAmount,
      calculation.frankingPercentage,
      calculation.frankingCredit,
      calculation.grossedUpDividend,
      entry.dateReceived,
      entry.notes || null,
      taxYear,
    ]
  );
  
  return {
    id: Number(result.lastInsertId),
    companyName: entry.companyName,
    dividendAmount: calculation.dividendAmount,
    frankingPercentage: calculation.frankingPercentage,
    frankingCredit: calculation.frankingCredit,
    grossedUpDividend: calculation.grossedUpDividend,
    dateReceived: entry.dateReceived,
    notes: entry.notes,
    taxYear,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get a single dividend entry by ID
 */
export async function getDividendEntry(id: number): Promise<DividendEntry | null> {
  const database = await getFrankingCreditDb();
  
  const result = await database.select<DividendEntry[]>(
    'SELECT * FROM dividend_entries WHERE id = ?',
    [id]
  );
  
  return result[0] || null;
}

/**
 * Get all dividend entries for a tax year
 */
export async function getDividendEntriesByTaxYear(taxYear: string): Promise<DividendEntry[]> {
  const database = await getFrankingCreditDb();
  
  return await database.select<DividendEntry[]>(
    'SELECT * FROM dividend_entries WHERE tax_year = ? ORDER BY date_received DESC',
    [taxYear]
  );
}

/**
 * Get all dividend entries
 */
export async function getAllDividendEntries(): Promise<DividendEntry[]> {
  const database = await getFrankingCreditDb();
  
  return await database.select<DividendEntry[]>(
    'SELECT * FROM dividend_entries ORDER BY date_received DESC'
  );
}

/**
 * Update a dividend entry
 */
export async function updateDividendEntry(
  id: number,
  updates: Partial<Omit<DividendEntry, 'id' | 'frankingCredit' | 'grossedUpDividend' | 'createdAt'>>
): Promise<DividendEntry> {
  const database = await getFrankingCreditDb();
  
  // Get existing entry
  const existing = await getDividendEntry(id);
  if (!existing) {
    throw new Error(`Dividend entry with id ${id} not found`);
  }
  
  // Merge updates
  const merged = {
    ...existing,
    ...updates,
  };
  
  // Validate
  const validation = validateDividendEntry(merged);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Recalculate if dividend or percentage changed
  const calculation = calculateFrankingFromDividend(
    merged.dividendAmount,
    merged.frankingPercentage
  );
  
  const taxYear = merged.taxYear || getFinancialYear(new Date(merged.dateReceived));
  
  await database.execute(
    `UPDATE dividend_entries 
     SET company_name = ?, dividend_amount = ?, franking_percentage = ?,
         franking_credit = ?, grossed_up_dividend = ?, date_received = ?,
         notes = ?, tax_year = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      merged.companyName,
      calculation.dividendAmount,
      calculation.frankingPercentage,
      calculation.frankingCredit,
      calculation.grossedUpDividend,
      merged.dateReceived,
      merged.notes || null,
      taxYear,
      id,
    ]
  );
  
  return {
    ...merged,
    frankingCredit: calculation.frankingCredit,
    grossedUpDividend: calculation.grossedUpDividend,
    taxYear,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Delete a dividend entry
 */
export async function deleteDividendEntry(id: number): Promise<void> {
  const database = await getFrankingCreditDb();
  
  await database.execute(
    'DELETE FROM dividend_entries WHERE id = ?',
    [id]
  );
}

/**
 * Delete multiple dividend entries
 */
export async function deleteDividendEntries(ids: number[]): Promise<void> {
  const database = await getFrankingCreditDb();
  
  if (ids.length === 0) return;
  
  const placeholders = ids.map(() => '?').join(',');
  await database.execute(
    `DELETE FROM dividend_entries WHERE id IN (${placeholders})`,
    ids
  );
}

// ============= SUMMARY & AGGREGATION =============

/**
 * Get annual summary for a tax year
 */
export async function getAnnualFrankingSummary(
  taxYear: string
): Promise<AnnualFrankingSummary> {
  const entries = await getDividendEntriesByTaxYear(taxYear);
  return calculateAnnualSummary(entries, taxYear);
}

/**
 * Get franking credit summary from database view
 */
export interface FrankingCreditSummaryRow {
  tax_year: string;
  entry_count: number;
  total_dividends: number;
  total_franking_credits: number;
  total_grossed_up_dividends: number;
  avg_franking_percentage: number;
}

export async function getFrankingCreditSummaries(): Promise<FrankingCreditSummaryRow[]> {
  const database = await getFrankingCreditDb();
  
  return await database.select<FrankingCreditSummaryRow[]>(
    'SELECT * FROM franking_credit_summary ORDER BY tax_year DESC'
  );
}

/**
 * Get summary for a specific tax year
 */
export async function getFrankingCreditSummaryByYear(
  taxYear: string
): Promise<FrankingCreditSummaryRow | null> {
  const database = await getFrankingCreditDb();
  
  const result = await database.select<FrankingCreditSummaryRow[]>(
    'SELECT * FROM franking_credit_summary WHERE tax_year = ?',
    [taxYear]
  );
  
  return result[0] || null;
}

// ============= EXPORT FUNCTIONS =============

/**
 * Export entries for a tax year to CSV
 */
export async function exportDividendEntriesToCSV(taxYear: string): Promise<string> {
  const entries = await getDividendEntriesByTaxYear(taxYear);
  
  const headers = [
    'Company Name',
    'Dividend Amount ($)',
    'Franking %',
    'Franking Credit ($)',
    'Grossed-Up Dividend ($)',
    'Date Received',
    'Tax Year',
    'Notes',
  ];
  
  const rows = entries.map(e => [
    `"${e.companyName}"`,
    e.dividendAmount.toFixed(2),
    e.frankingPercentage.toFixed(1),
    e.frankingCredit.toFixed(2),
    e.grossedUpDividend.toFixed(2),
    e.dateReceived,
    e.taxYear,
    `"${e.notes || ''}"`,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export entries for a tax year to JSON
 */
export async function exportDividendEntriesToJSON(taxYear: string): Promise<string> {
  const entries = await getDividendEntriesByTaxYear(taxYear);
  return JSON.stringify(entries, null, 2);
}

/**
 * Export all entries to CSV
 */
export async function exportAllDividendEntriesToCSV(): Promise<string> {
  const entries = await getAllDividendEntries();
  
  const headers = [
    'ID',
    'Company Name',
    'Dividend Amount ($)',
    'Franking %',
    'Franking Credit ($)',
    'Grossed-Up Dividend ($)',
    'Date Received',
    'Tax Year',
    'Notes',
    'Created At',
  ];
  
  const rows = entries.map(e => [
    e.id,
    `"${e.companyName}"`,
    e.dividendAmount.toFixed(2),
    e.frankingPercentage.toFixed(1),
    e.frankingCredit.toFixed(2),
    e.grossedUpDividend.toFixed(2),
    e.dateReceived,
    e.taxYear,
    `"${e.notes || ''}"`,
    e.createdAt,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ============= BULK OPERATIONS =============

/**
 * Bulk insert dividend entries
 */
export async function bulkCreateDividendEntries(
  entries: Omit<DividendEntry, 'id' | 'frankingCredit' | 'grossedUpDividend' | 'createdAt' | 'updatedAt'>[]
): Promise<DividendEntry[]> {
  const results: DividendEntry[] = [];
  
  for (const entry of entries) {
    try {
      const created = await createDividendEntry(entry);
      results.push(created);
    } catch (error) {
      console.error('Failed to create entry:', error);
      throw error;
    }
  }
  
  return results;
}

// ============= SEARCH & FILTER =============

/**
 * Search dividend entries by company name
 */
export async function searchDividendEntries(
  query: string,
  taxYear?: string
): Promise<DividendEntry[]> {
  const database = await getFrankingCreditDb();
  
  let sql = 'SELECT * FROM dividend_entries WHERE company_name LIKE ?';
  const params: (string | number)[] = [`%${query}%`];
  
  if (taxYear) {
    sql += ' AND tax_year = ?';
    params.push(taxYear);
  }
  
  sql += ' ORDER BY date_received DESC';
  
  return await database.select<DividendEntry[]>(sql, params);
}

/**
 * Get entries by date range
 */
export async function getDividendEntriesByDateRange(
  startDate: string,
  endDate: string
): Promise<DividendEntry[]> {
  const database = await getFrankingCreditDb();
  
  return await database.select<DividendEntry[]>(
    'SELECT * FROM dividend_entries WHERE date_received >= ? AND date_received <= ? ORDER BY date_received DESC',
    [startDate, endDate]
  );
}

/**
 * Get available tax years
 */
export async function getAvailableTaxYears(): Promise<string[]> {
  const database = await getFrankingCreditDb();
  
  const result = await database.select<{ tax_year: string }[]>(
    'SELECT DISTINCT tax_year FROM dividend_entries ORDER BY tax_year DESC'
  );
  
  return result.map(r => r.tax_year);
}
