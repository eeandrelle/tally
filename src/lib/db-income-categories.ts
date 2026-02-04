/**
 * Income Categories Database Integration
 * 
 * Database functions for income category settings, preferences, and tracking.
 * Integrates with the SQLite database for Tauri desktop app.
 */

import Database from "@tauri-apps/plugin-sql";
import { 
  IncomeCategoryCode, 
  incomeCategories, 
  getIncomeCategoryByCode,
  getSubcategoryByCode 
} from "./income-categories";

// Income Category Settings (user preferences)
export interface IncomeCategorySetting {
  id?: number;
  code: IncomeCategoryCode;
  is_enabled: boolean;
  is_visible: boolean;
  custom_name?: string;
  notes?: string;
  display_order?: number;
  total_reported_fy?: number;
  created_at?: string;
  updated_at?: string;
}

// Income Entry - recorded income transaction
export interface IncomeEntry {
  id?: number;
  category_code: IncomeCategoryCode;
  subcategory_code?: string;
  source: string;
  description?: string;
  amount: number;
  tax_withheld?: number;
  tax_year: number;
  date_received: string;
  is_prefilled: boolean;
  is_reviewed: boolean;
  workpaper_id?: number;
  document_ids?: string; // JSON array of linked document IDs
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Income Summary for a tax year
export interface IncomeSummary {
  tax_year: number;
  category_code: IncomeCategoryCode;
  category_name: string;
  total_amount: number;
  total_tax_withheld: number;
  entry_count: number;
  last_updated?: string;
}

let db: Database | null = null;

/**
 * Initialize income category tables in database
 */
export async function initIncomeCategoryTables(database: Database): Promise<void> {
  // Income Category Settings table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS income_category_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      is_enabled BOOLEAN DEFAULT 1,
      is_visible BOOLEAN DEFAULT 1,
      custom_name TEXT,
      notes TEXT,
      display_order INTEGER DEFAULT 0,
      total_reported_fy REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Income Entries table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS income_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_code TEXT NOT NULL,
      subcategory_code TEXT,
      source TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      tax_withheld REAL DEFAULT 0,
      tax_year INTEGER NOT NULL,
      date_received TEXT NOT NULL,
      is_prefilled BOOLEAN DEFAULT 0,
      is_reviewed BOOLEAN DEFAULT 0,
      workpaper_id INTEGER,
      document_ids TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_code) REFERENCES income_category_settings(code)
    )
  `);

  // Create index for faster queries
  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_income_entries_category 
    ON income_entries(category_code, tax_year)
  `);
  
  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_income_entries_date 
    ON income_entries(date_received)
  `);

  // Populate default settings if empty
  await populateDefaultIncomeCategorySettings(database);
}

/**
 * Populate default income category settings
 */
async function populateDefaultIncomeCategorySettings(database: Database): Promise<void> {
  const existing = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM income_category_settings"
  );
  
  if (existing[0].count > 0) {
    return; // Already populated
  }

  // Insert default settings for all categories
  const insertQuery = `
    INSERT INTO income_category_settings (code, is_enabled, is_visible, display_order)
    VALUES (?, ?, ?, ?)
  `;

  for (let i = 0; i < incomeCategories.length; i++) {
    const cat = incomeCategories[i];
    await database.execute(insertQuery, [
      cat.code,
      1, // enabled
      1, // visible
      i  // display order
    ]);
  }
}

/**
 * Get all income category settings
 */
export async function getIncomeCategorySettings(
  database: Database
): Promise<IncomeCategorySetting[]> {
  return await database.select<IncomeCategorySetting[]>(`
    SELECT * FROM income_category_settings 
    ORDER BY display_order ASC, code ASC
  `);
}

/**
 * Get visible income category settings
 */
export async function getVisibleIncomeCategorySettings(
  database: Database
): Promise<(IncomeCategorySetting & { category_name: string; priority: string })[]> {
  const settings = await database.select<(IncomeCategorySetting & { category_name: string; priority: string })[]>(`
    SELECT ics.*, 
           ic.name as category_name,
           ic.priority
    FROM income_category_settings ics
    JOIN (
      SELECT 'SALARY' as code, 'Salary and Wages' as name, 'high' as priority
      UNION SELECT 'ALLOWANCES', 'Allowances', 'high'
      UNION SELECT 'DIVIDENDS', 'Dividends', 'high'
      UNION SELECT 'INTEREST', 'Interest', 'high'
      UNION SELECT 'RENTAL', 'Rental Income', 'high'
      UNION SELECT 'CAPITAL_GAINS', 'Capital Gains', 'high'
      UNION SELECT 'FREELANCE', 'Freelance / Sole Trader', 'medium'
      UNION SELECT 'TRUST_DISTRIBUTIONS', 'Trust Distributions', 'medium'
      UNION SELECT 'FOREIGN_INCOME', 'Foreign Income', 'medium'
      UNION SELECT 'GOVERNMENT_PAYMENTS', 'Government Payments', 'medium'
      UNION SELECT 'SUPER_PENSION', 'Superannuation Pension', 'low'
      UNION SELECT 'SUPER_LUMPSUM', 'Superannuation Lump Sums', 'low'
      UNION SELECT 'EMPLOYMENT_TERMINATION', 'Employment Termination Payments', 'low'
      UNION SELECT 'ROYALTIES', 'Royalties', 'low'
      UNION SELECT 'OTHER', 'Other Income', 'low'
    ) ic ON ics.code = ic.code
    WHERE ics.is_visible = 1
    ORDER BY 
      CASE ic.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        ELSE 3 
      END,
      ics.display_order ASC
  `);
  
  return settings;
}

/**
 * Update income category setting
 */
export async function updateIncomeCategorySetting(
  database: Database,
  code: IncomeCategoryCode,
  updates: Partial<Omit<IncomeCategorySetting, "id" | "code" | "created_at">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.is_enabled !== undefined) {
    fields.push("is_enabled = ?");
    values.push(updates.is_enabled);
  }
  if (updates.is_visible !== undefined) {
    fields.push("is_visible = ?");
    values.push(updates.is_visible);
  }
  if (updates.custom_name !== undefined) {
    fields.push("custom_name = ?");
    values.push(updates.custom_name);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }
  if (updates.display_order !== undefined) {
    fields.push("display_order = ?");
    values.push(updates.display_order);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(code);

  await database.execute(
    `UPDATE income_category_settings SET ${fields.join(", ")} WHERE code = ?`,
    values
  );
}

/**
 * Create a new income entry
 */
export async function createIncomeEntry(
  database: Database,
  entry: Omit<IncomeEntry, "id" | "created_at" | "updated_at">
): Promise<number> {
  const result = await database.execute(`
    INSERT INTO income_entries 
    (category_code, subcategory_code, source, description, amount, tax_withheld, 
     tax_year, date_received, is_prefilled, is_reviewed, workpaper_id, document_ids, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    entry.category_code,
    entry.subcategory_code || null,
    entry.source,
    entry.description || null,
    entry.amount,
    entry.tax_withheld || 0,
    entry.tax_year,
    entry.date_received,
    entry.is_prefilled ? 1 : 0,
    entry.is_reviewed ? 1 : 0,
    entry.workpaper_id || null,
    entry.document_ids || null,
    entry.notes || null
  ]);

  return result.lastInsertId;
}

/**
 * Update an income entry
 */
export async function updateIncomeEntry(
  database: Database,
  id: number,
  updates: Partial<Omit<IncomeEntry, "id" | "created_at">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.category_code !== undefined) {
    fields.push("category_code = ?");
    values.push(updates.category_code);
  }
  if (updates.subcategory_code !== undefined) {
    fields.push("subcategory_code = ?");
    values.push(updates.subcategory_code);
  }
  if (updates.source !== undefined) {
    fields.push("source = ?");
    values.push(updates.source);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.amount !== undefined) {
    fields.push("amount = ?");
    values.push(updates.amount);
  }
  if (updates.tax_withheld !== undefined) {
    fields.push("tax_withheld = ?");
    values.push(updates.tax_withheld);
  }
  if (updates.date_received !== undefined) {
    fields.push("date_received = ?");
    values.push(updates.date_received);
  }
  if (updates.is_prefilled !== undefined) {
    fields.push("is_prefilled = ?");
    values.push(updates.is_prefilled ? 1 : 0);
  }
  if (updates.is_reviewed !== undefined) {
    fields.push("is_reviewed = ?");
    values.push(updates.is_reviewed ? 1 : 0);
  }
  if (updates.workpaper_id !== undefined) {
    fields.push("workpaper_id = ?");
    values.push(updates.workpaper_id);
  }
  if (updates.document_ids !== undefined) {
    fields.push("document_ids = ?");
    values.push(updates.document_ids);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await database.execute(
    `UPDATE income_entries SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}

/**
 * Delete an income entry
 */
export async function deleteIncomeEntry(
  database: Database,
  id: number
): Promise<void> {
  await database.execute("DELETE FROM income_entries WHERE id = ?", [id]);
}

/**
 * Get income entries by category and tax year
 */
export async function getIncomeEntries(
  database: Database,
  taxYear: number,
  categoryCode?: IncomeCategoryCode
): Promise<IncomeEntry[]> {
  let query = "SELECT * FROM income_entries WHERE tax_year = ?";
  const params: unknown[] = [taxYear];

  if (categoryCode) {
    query += " AND category_code = ?";
    params.push(categoryCode);
  }

  query += " ORDER BY date_received DESC";

  return await database.select<IncomeEntry[]>(query, params);
}

/**
 * Get income entry by ID
 */
export async function getIncomeEntryById(
  database: Database,
  id: number
): Promise<IncomeEntry | undefined> {
  const results = await database.select<IncomeEntry[]>(
    "SELECT * FROM income_entries WHERE id = ?",
    [id]
  );
  return results[0];
}

/**
 * Get income summary by category for a tax year
 */
export async function getIncomeSummaryByCategory(
  database: Database,
  taxYear: number
): Promise<IncomeSummary[]> {
  return await database.select<IncomeSummary[]>(`
    SELECT 
      ie.tax_year,
      ie.category_code,
      ics.custom_name as category_name,
      COALESCE(SUM(ie.amount), 0) as total_amount,
      COALESCE(SUM(ie.tax_withheld), 0) as total_tax_withheld,
      COUNT(ie.id) as entry_count,
      MAX(ie.updated_at) as last_updated
    FROM income_entries ie
    JOIN income_category_settings ics ON ie.category_code = ics.code
    WHERE ie.tax_year = ?
    GROUP BY ie.category_code, ics.custom_name, ie.tax_year
    ORDER BY total_amount DESC
  `, [taxYear]);
}

/**
 * Get total income for tax year
 */
export async function getTotalIncomeForYear(
  database: Database,
  taxYear: number
): Promise<{ total_income: number; total_tax_withheld: number; entry_count: number }> {
  const results = await database.select<{ total_income: number; total_tax_withheld: number; entry_count: number }[]>(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_income,
      COALESCE(SUM(tax_withheld), 0) as total_tax_withheld,
      COUNT(*) as entry_count
    FROM income_entries 
    WHERE tax_year = ?
  `, [taxYear]);

  return results[0] || { total_income: 0, total_tax_withheld: 0, entry_count: 0 };
}

/**
 * Get unreviewed income entries (for review workflow)
 */
export async function getUnreviewedIncomeEntries(
  database: Database,
  taxYear: number
): Promise<(IncomeEntry & { category_name: string })[]> {
  return await database.select<(IncomeEntry & { category_name: string })[]>(`
    SELECT ie.*, ics.custom_name as category_name
    FROM income_entries ie
    JOIN income_category_settings ics ON ie.category_code = ics.code
    WHERE ie.tax_year = ? AND ie.is_reviewed = 0
    ORDER BY ie.amount DESC
  `, [taxYear]);
}

/**
 * Mark income entry as reviewed
 */
export async function markIncomeEntryReviewed(
  database: Database,
  id: number,
  reviewed: boolean = true
): Promise<void> {
  await database.execute(
    "UPDATE income_entries SET is_reviewed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [reviewed ? 1 : 0, id]
  );
}

/**
 * Get income entries by source (for aggregation)
 */
export async function getIncomeEntriesBySource(
  database: Database,
  taxYear: number,
  source: string
): Promise<IncomeEntry[]> {
  return await database.select<IncomeEntry[]>(`
    SELECT * FROM income_entries 
    WHERE tax_year = ? AND source = ?
    ORDER BY date_received DESC
  `, [taxYear, source]);
}

/**
 * Import prefilled income data (from ATO/myGov)
 */
export async function importPrefilledIncome(
  database: Database,
  entries: Array<{
    category_code: IncomeCategoryCode;
    subcategory_code?: string;
    source: string;
    description?: string;
    amount: number;
    tax_withheld?: number;
    date_received: string;
    tax_year: number;
  }>
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Check for duplicates (same source, amount, date)
    const existing = await database.select<{ count: number }[]>(`
      SELECT COUNT(*) as count FROM income_entries
      WHERE category_code = ? AND source = ? AND amount = ? AND date_received = ?
    `, [entry.category_code, entry.source, entry.amount, entry.date_received]);

    if (existing[0].count > 0) {
      skipped++;
      continue;
    }

    await createIncomeEntry(database, {
      ...entry,
      is_prefilled: true,
      is_reviewed: false
    });
    imported++;
  }

  return { imported, skipped };
}

/**
 * Get income reconciliation report
 * Compares prefilled vs manually entered income
 */
export async function getIncomeReconciliationReport(
  database: Database,
  taxYear: number
): Promise<{
  category_code: string;
  category_name: string;
  prefilled_total: number;
  manual_total: number;
  difference: number;
  prefilled_count: number;
  manual_count: number;
}[]> {
  return await database.select<{
    category_code: string;
    category_name: string;
    prefilled_total: number;
    manual_total: number;
    difference: number;
    prefilled_count: number;
    manual_count: number;
  }[]>(`
    SELECT 
      ie.category_code,
      ics.custom_name as category_name,
      COALESCE(SUM(CASE WHEN ie.is_prefilled = 1 THEN ie.amount ELSE 0 END), 0) as prefilled_total,
      COALESCE(SUM(CASE WHEN ie.is_prefilled = 0 THEN ie.amount ELSE 0 END), 0) as manual_total,
      COALESCE(SUM(CASE WHEN ie.is_prefilled = 1 THEN ie.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN ie.is_prefilled = 0 THEN ie.amount ELSE 0 END), 0) as difference,
      SUM(CASE WHEN ie.is_prefilled = 1 THEN 1 ELSE 0 END) as prefilled_count,
      SUM(CASE WHEN ie.is_prefilled = 0 THEN 1 ELSE 0 END) as manual_count
    FROM income_entries ie
    JOIN income_category_settings ics ON ie.category_code = ics.code
    WHERE ie.tax_year = ?
    GROUP BY ie.category_code, ics.custom_name
    ORDER BY prefilled_total + manual_total DESC
  `, [taxYear]);
}

/**
 * Reset income category settings to defaults
 */
export async function resetIncomeCategorySettings(
  database: Database
): Promise<void> {
  await database.execute("DELETE FROM income_category_settings");
  await populateDefaultIncomeCategorySettings(database);
}
