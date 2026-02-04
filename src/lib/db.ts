import Database from "@tauri-apps/plugin-sql";
import { AtoCategoryCode } from "./ato-categories";
import { initIncomeCategoryTables } from "./db-income-categories";
import { initBankStatementTables } from "./db-bank-statements";
import { initInvoiceTables } from "./invoices";
import { initContractTables } from "./contracts";

export type ReviewStatus = "none" | "pending" | "in_review" | "reviewed" | "dismissed";

export interface Receipt {
  id?: number;
  vendor: string;
  amount: number;
  category: string;
  ato_category_code?: AtoCategoryCode;
  date: string;
  image_path?: string;
  notes?: string;
  review_status?: ReviewStatus;
  review_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaxCategory {
  id?: number;
  name: string;
  description?: string;
  color?: string;
}

export interface TaxYear {
  id?: number;
  year: number;
  start_date: string;
  end_date: string;
}

export interface Income {
  id?: number;
  source: string;
  amount: number;
  type: "salary" | "freelance" | "business" | "investment" | "other";
  date: string;
  tax_withheld?: number;
  notes?: string;
  created_at?: string;
}

export interface Workpaper {
  id?: number;
  title: string;
  description?: string;
  category_code: AtoCategoryCode;
  tax_year: number;
  file_path?: string;
  receipt_ids?: string; // JSON array of linked receipt IDs
  total_amount: number;
  is_finalized: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReceiptWorkpaperLink {
  receipt_id: number;
  workpaper_id: number;
  created_at?: string;
}

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ATO Category Settings
export interface AtoCategorySetting {
  id?: number;
  code: AtoCategoryCode;
  is_enabled: boolean;
  custom_description?: string;
  notes?: string;
  total_claimed_fy?: number;
  created_at?: string;
  updated_at?: string;
}

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  db = await Database.load("sqlite:default.db");

  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tax_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#6b7280',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tax_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      ato_category_code TEXT,
      date TEXT NOT NULL,
      image_path TEXT,
      notes TEXT,
      review_status TEXT DEFAULT 'none',
      review_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ato_category_code) REFERENCES ato_categories_settings(code)
    )
  `);

  // Migration: Add ato_category_code column if it doesn't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE receipts ADD COLUMN ato_category_code TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Migration: Add review columns if they don't exist (for existing databases)
  try {
    await db.execute(`ALTER TABLE receipts ADD COLUMN review_status TEXT DEFAULT 'none'`);
  } catch (e) {
    // Column already exists
  }
  try {
    await db.execute(`ALTER TABLE receipts ADD COLUMN review_notes TEXT`);
  } catch (e) {
    // Column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      date TEXT NOT NULL,
      tax_withheld REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create ATO Categories settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ato_categories_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      is_enabled BOOLEAN DEFAULT 1,
      custom_description TEXT,
      notes TEXT,
      total_claimed_fy REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create ATO Category Claims table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ato_category_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_code TEXT NOT NULL,
      tax_year INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      description TEXT,
      receipt_count INTEGER DEFAULT 0,
      is_finalized BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category_code, tax_year)
    )
  `);

  // Create Workpapers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS workpapers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_code TEXT NOT NULL,
      tax_year INTEGER NOT NULL,
      file_path TEXT,
      receipt_ids TEXT,
      total_amount REAL DEFAULT 0,
      is_finalized BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_code) REFERENCES ato_categories_settings(code)
    )
  `);

  // Create Receipt-Workpaper link table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS receipt_workpaper_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      workpaper_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
      FOREIGN KEY (workpaper_id) REFERENCES workpapers(id) ON DELETE CASCADE,
      UNIQUE(receipt_id, workpaper_id)
    )
  `);

  // Create indexes for performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_receipts_ato_category 
    ON receipts(ato_category_code)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_receipts_date 
    ON receipts(date)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_category_claims_year 
    ON ato_category_claims(tax_year)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_category_claims_code 
    ON ato_category_claims(category_code)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_workpapers_category 
    ON workpapers(category_code)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_workpapers_year 
    ON workpapers(tax_year)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_links_workpaper 
    ON receipt_workpaper_links(workpaper_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_links_receipt 
    ON receipt_workpaper_links(receipt_id)
  `);

  // Insert default categories if empty
  const categories = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM tax_categories"
  );

  if (categories[0].count === 0) {
    await insertDefaultCategories(db);
  }

  // Insert current tax year if empty
  const years = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM tax_years"
  );

  if (years[0].count === 0) {
    await insertCurrentTaxYear(db);
  }

  // Seed ATO categories if empty
  await seedAtoCategories(db);

  // Initialize income category tables
  await initIncomeCategoryTables(db);

  // Initialize bank statement tables
  await initBankStatementTables(db);

  // Initialize invoice tables
  await initInvoiceTables(db);

  // Initialize contract tables
  await initContractTables(db);

  return db;
}

async function insertDefaultCategories(db: Database) {
  const defaultCategories = [
    { name: "Home Office", description: "Office supplies, equipment, furniture", color: "#3b82f6" },
    { name: "Vehicle", description: "Fuel, maintenance, parking", color: "#22c55e" },
    { name: "Meals", description: "Business meals and entertainment", color: "#f97316" },
    { name: "Travel", description: "Flights, accommodation, transport", color: "#8b5cf6" },
    { name: "Professional Development", description: "Courses, books, subscriptions", color: "#ec4899" },
    { name: "Insurance", description: "Business insurance premiums", color: "#14b8a6" },
    { name: "Other", description: "Miscellaneous deductions", color: "#6b7280" },
  ];
  
  for (const cat of defaultCategories) {
    await db.execute(
      "INSERT INTO tax_categories (name, description, color) VALUES ($1, $2, $3)",
      [cat.name, cat.description, cat.color]
    );
  }
}

async function insertCurrentTaxYear(db: Database) {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  await db.execute(
    "INSERT INTO tax_years (year, start_date, end_date) VALUES ($1, $2, $3)",
    [year, `${year}-07-01`, `${year + 1}-06-30`]
  );
}

async function seedAtoCategories(db: Database): Promise<void> {
  const existing = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM ato_categories_settings"
  );

  if (existing[0].count === 0) {
    const atoCategoryCodes = [
      "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
      "D10", "D11", "D12", "D13", "D14", "D15"
    ];

    for (const code of atoCategoryCodes) {
      await db.execute(
        `INSERT INTO ato_categories_settings (code, is_enabled) VALUES ($1, $2)`,
        [code, true]
      );
    }
  }
}

// Receipt CRUD operations
export async function createReceipt(receipt: Receipt): Promise<number> {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO receipts (vendor, amount, category, date, image_path, notes) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [receipt.vendor, receipt.amount, receipt.category, receipt.date, receipt.image_path, receipt.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function getReceipts(): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    "SELECT * FROM receipts ORDER BY date DESC, created_at DESC"
  );
}

export async function getReceiptsByCategory(category: string): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    "SELECT * FROM receipts WHERE category = $1 ORDER BY date DESC",
    [category]
  );
}

export async function getReceiptsByDateRange(startDate: string, endDate: string): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    "SELECT * FROM receipts WHERE date BETWEEN $1 AND $2 ORDER BY date DESC",
    [startDate, endDate]
  );
}

export async function updateReceipt(id: number, receipt: Partial<Receipt>): Promise<void> {
  const db = await initDatabase();
  const fields: string[] = [];
  const values: (string | number | undefined)[] = [];
  
  if (receipt.vendor !== undefined) {
    fields.push("vendor = $" + (fields.length + 1));
    values.push(receipt.vendor);
  }
  if (receipt.amount !== undefined) {
    fields.push("amount = $" + (fields.length + 1));
    values.push(receipt.amount);
  }
  if (receipt.category !== undefined) {
    fields.push("category = $" + (fields.length + 1));
    values.push(receipt.category);
  }
  if (receipt.date !== undefined) {
    fields.push("date = $" + (fields.length + 1));
    values.push(receipt.date);
  }
  if (receipt.image_path !== undefined) {
    fields.push("image_path = $" + (fields.length + 1));
    values.push(receipt.image_path);
  }
  if (receipt.notes !== undefined) {
    fields.push("notes = $" + (fields.length + 1));
    values.push(receipt.notes);
  }
  
  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);
  
  await db.execute(
    `UPDATE receipts SET ${fields.join(", ")} WHERE id = $${values.length}`,
    values
  );
}

export async function deleteReceipt(id: number): Promise<void> {
  const db = await initDatabase();
  await db.execute("DELETE FROM receipts WHERE id = $1", [id]);
}

// Review Status functions
export async function updateReceiptReviewStatus(
  id: number,
  status: ReviewStatus,
  notes?: string
): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE receipts 
     SET review_status = $1, review_notes = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3`,
    [status, notes || null, id]
  );
}

export async function getReceiptsByReviewStatus(status: ReviewStatus): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    "SELECT * FROM receipts WHERE review_status = $1 ORDER BY date DESC, created_at DESC",
    [status]
  );
}

export async function getReceiptsNeedingReview(): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    `SELECT * FROM receipts 
     WHERE review_status IN ('pending', 'in_review') 
     ORDER BY 
       CASE review_status 
         WHEN 'in_review' THEN 1 
         WHEN 'pending' THEN 2 
         ELSE 3 
       END,
       date DESC`
  );
}

export async function getReviewStatusCounts(): Promise<{
  none: number;
  pending: number;
  in_review: number;
  reviewed: number;
  dismissed: number;
}> {
  const db = await initDatabase();
  const result = await db.select<{ review_status: string; count: number }[]>(
    `SELECT review_status, COUNT(*) as count 
     FROM receipts 
     GROUP BY review_status`
  );

  const counts = {
    none: 0,
    pending: 0,
    in_review: 0,
    reviewed: 0,
    dismissed: 0,
  };

  for (const row of result) {
    const status = row.review_status as keyof typeof counts;
    if (status in counts) {
      counts[status] = row.count;
    }
  }

  return counts;
}

// Tax Categories
export async function getCategories(): Promise<TaxCategory[]> {
  const db = await initDatabase();
  return await db.select<TaxCategory[]>(
    "SELECT * FROM tax_categories ORDER BY name"
  );
}

// Statistics
export async function getTotalDeductions(startDate?: string, endDate?: string): Promise<number> {
  const db = await initDatabase();
  let query = "SELECT COALESCE(SUM(amount), 0) as total FROM receipts";
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " WHERE date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  const result = await db.select<{ total: number }[]>(query, params);
  return result[0].total;
}

export async function getDeductionsByCategory(startDate?: string, endDate?: string): Promise<{ category: string; total: number }[]> {
  const db = await initDatabase();
  let query = `
    SELECT category, SUM(amount) as total 
    FROM receipts 
    WHERE 1=1
  `;
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " AND date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  query += " GROUP BY category ORDER BY total DESC";
  
  return await db.select<{ category: string; total: number }[]>(query, params);
}

export async function getReceiptCount(startDate?: string, endDate?: string): Promise<number> {
  const db = await initDatabase();
  let query = "SELECT COUNT(*) as count FROM receipts";
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " WHERE date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  const result = await db.select<{ count: number }[]>(query, params);
  return result[0].count;
}

export async function getAverageReceiptValue(startDate?: string, endDate?: string): Promise<number> {
  const db = await initDatabase();
  let query = "SELECT COALESCE(AVG(amount), 0) as average FROM receipts";
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " WHERE date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  const result = await db.select<{ average: number }[]>(query, params);
  return result[0].average;
}

export async function getTopCategory(startDate?: string, endDate?: string): Promise<{ category: string; total: number } | null> {
  const db = await initDatabase();
  let query = `
    SELECT category, SUM(amount) as total 
    FROM receipts 
    WHERE 1=1
  `;
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " AND date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  query += " GROUP BY category ORDER BY total DESC LIMIT 1";
  
  const result = await db.select<{ category: string; total: number }[]>(query, params);
  return result[0] || null;
}

export async function getMonthlySpending(startDate?: string, endDate?: string): Promise<{ month: string; total: number }[]> {
  const db = await initDatabase();
  let query = `
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM receipts
    WHERE 1=1
  `;
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " AND date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  query += " GROUP BY month ORDER BY month ASC";
  
  return await db.select<{ month: string; total: number }[]>(query, params);
}

export async function getTaxYears(): Promise<TaxYear[]> {
  const db = await initDatabase();
  return await db.select<TaxYear[]>(
    "SELECT * FROM tax_years ORDER BY year DESC"
  );
}

export async function getCategoryColors(): Promise<{ name: string; color: string }[]> {
  const db = await initDatabase();
  return await db.select<{ name: string; color: string }[]>(
    "SELECT name, color FROM tax_categories"
  );
}

// Income CRUD operations
export async function createIncome(income: Income): Promise<number> {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO income (source, amount, type, date, tax_withheld, notes) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [income.source, income.amount, income.type, income.date, income.tax_withheld || 0, income.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function getIncome(): Promise<Income[]> {
  const db = await initDatabase();
  return await db.select<Income[]>(
    "SELECT * FROM income ORDER BY date DESC, created_at DESC"
  );
}

export async function getIncomeByDateRange(startDate: string, endDate: string): Promise<Income[]> {
  const db = await initDatabase();
  return await db.select<Income[]>(
    "SELECT * FROM income WHERE date BETWEEN $1 AND $2 ORDER BY date DESC",
    [startDate, endDate]
  );
}

export async function getIncomeByType(type: string): Promise<Income[]> {
  const db = await initDatabase();
  return await db.select<Income[]>(
    "SELECT * FROM income WHERE type = $1 ORDER BY date DESC",
    [type]
  );
}

export async function updateIncome(id: number, income: Partial<Income>): Promise<void> {
  const db = await initDatabase();
  const fields: string[] = [];
  const values: (string | number | undefined)[] = [];
  
  if (income.source !== undefined) {
    fields.push("source = $" + (fields.length + 1));
    values.push(income.source);
  }
  if (income.amount !== undefined) {
    fields.push("amount = $" + (fields.length + 1));
    values.push(income.amount);
  }
  if (income.type !== undefined) {
    fields.push("type = $" + (fields.length + 1));
    values.push(income.type);
  }
  if (income.date !== undefined) {
    fields.push("date = $" + (fields.length + 1));
    values.push(income.date);
  }
  if (income.tax_withheld !== undefined) {
    fields.push("tax_withheld = $" + (fields.length + 1));
    values.push(income.tax_withheld);
  }
  if (income.notes !== undefined) {
    fields.push("notes = $" + (fields.length + 1));
    values.push(income.notes);
  }
  
  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);
  
  await db.execute(
    `UPDATE income SET ${fields.join(", ")} WHERE id = $${values.length}`,
    values
  );
}

export async function deleteIncome(id: number): Promise<void> {
  const db = await initDatabase();
  await db.execute("DELETE FROM income WHERE id = $1", [id]);
}

// Income statistics
export async function getTotalIncome(startDate?: string, endDate?: string): Promise<number> {
  const db = await initDatabase();
  let query = "SELECT COALESCE(SUM(amount), 0) as total FROM income";
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " WHERE date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  const result = await db.select<{ total: number }[]>(query, params);
  return result[0].total;
}

export async function getTotalTaxWithheld(startDate?: string, endDate?: string): Promise<number> {
  const db = await initDatabase();
  let query = "SELECT COALESCE(SUM(tax_withheld), 0) as total FROM income";
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " WHERE date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  const result = await db.select<{ total: number }[]>(query, params);
  return result[0].total;
}

export async function getIncomeByTypeSummary(startDate?: string, endDate?: string): Promise<{ type: string; total: number }[]> {
  const db = await initDatabase();
  let query = `
    SELECT type, SUM(amount) as total 
    FROM income 
    WHERE 1=1
  `;
  const params: string[] = [];
  
  if (startDate && endDate) {
    query += " AND date BETWEEN $1 AND $2";
    params.push(startDate, endDate);
  }
  
  query += " GROUP BY type ORDER BY total DESC";
  
  return await db.select<{ type: string; total: number }[]>(query, params);
}

// CSV Export functionality
export function convertToCSV<T extends Record<string, unknown>>(data: T[], headers?: string[]): string {
  if (data.length === 0) return "";
  
  const keys = headers || Object.keys(data[0]);
  const csvHeaders = keys.join(",");
  
  const csvRows = data.map(row => {
    return keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      // Escape values containing commas, quotes, or newlines
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(",");
  });
  
  return [csvHeaders, ...csvRows].join("\n");
}

export async function exportReceiptsToCSV(startDate?: string, endDate?: string): Promise<string> {
  let receipts: Receipt[];
  if (startDate && endDate) {
    receipts = await getReceiptsByDateRange(startDate, endDate);
  } else {
    receipts = await getReceipts();
  }
  
  const data = receipts.map(r => ({
    id: r.id,
    vendor: r.vendor,
    amount: r.amount,
    category: r.category,
    date: r.date,
    notes: r.notes || "",
  }));
  
  return convertToCSV(data);
}

export async function exportIncomeToCSV(startDate?: string, endDate?: string): Promise<string> {
  let income: Income[];
  if (startDate && endDate) {
    income = await getIncomeByDateRange(startDate, endDate);
  } else {
    income = await getIncome();
  }
  
  const data = income.map(i => ({
    id: i.id,
    source: i.source,
    amount: i.amount,
    type: i.type,
    date: i.date,
    tax_withheld: i.tax_withheld || 0,
    notes: i.notes || "",
  }));
  
  return convertToCSV(data);
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Financial year helpers
export function getCurrentFinancialYear(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Australian financial year runs July 1 - June 30
  return month >= 6 ? year : year - 1;
}

export function getFinancialYearDates(financialYear: number): { startDate: string; endDate: string } {
  return {
    startDate: `${financialYear}-07-01`,
    endDate: `${financialYear + 1}-06-30`,
  };
}

// ==================== ATO Categories CRUD ====================

export async function getAtoCategorySettings(): Promise<AtoCategorySetting[]> {
  const db = await initDatabase();
  return await db.select<AtoCategorySetting[]>(
    "SELECT * FROM ato_categories_settings ORDER BY code"
  );
}

export async function getAtoCategorySetting(code: AtoCategoryCode): Promise<AtoCategorySetting | null> {
  const db = await initDatabase();
  const results = await db.select<AtoCategorySetting[]>(
    "SELECT * FROM ato_categories_settings WHERE code = $1",
    [code]
  );
  return results[0] || null;
}

export async function setAtoCategoryEnabled(code: AtoCategoryCode, enabled: boolean): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE ato_categories_settings 
     SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE code = $2`,
    [enabled, code]
  );
}

export async function updateAtoCategoryNotes(code: AtoCategoryCode, notes: string): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE ato_categories_settings 
     SET notes = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE code = $2`,
    [notes, code]
  );
}

export async function updateAtoCategoryCustomDescription(
  code: AtoCategoryCode,
  description: string
): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE ato_categories_settings 
     SET custom_description = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE code = $2`,
    [description, code]
  );
}

// ==================== Receipt-Category Linking ====================

export async function updateReceiptAtoCategory(
  receiptId: number,
  atoCategoryCode: AtoCategoryCode | null
): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE receipts 
     SET ato_category_code = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [atoCategoryCode, receiptId]
  );
}

export async function getReceiptsByAtoCategory(
  atoCategoryCode: AtoCategoryCode,
  taxYear?: number
): Promise<Receipt[]> {
  const db = await initDatabase();

  if (taxYear) {
    const { startDate, endDate } = getFinancialYearDates(taxYear);
    return await db.select<Receipt[]>(
      `SELECT * FROM receipts 
       WHERE ato_category_code = $1 
       AND date BETWEEN $2 AND $3 
       ORDER BY date DESC`,
      [atoCategoryCode, startDate, endDate]
    );
  }

  return await db.select<Receipt[]>(
    "SELECT * FROM receipts WHERE ato_category_code = $1 ORDER BY date DESC",
    [atoCategoryCode]
  );
}

export async function getReceiptsWithoutAtoCategory(): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    `SELECT * FROM receipts 
     WHERE ato_category_code IS NULL OR ato_category_code = '' 
     ORDER BY date DESC`
  );
}

// ==================== Workpapers CRUD ====================

export async function createWorkpaper(workpaper: Omit<Workpaper, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO workpapers (title, description, category_code, tax_year, file_path, total_amount, is_finalized, notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      workpaper.title,
      workpaper.description || null,
      workpaper.category_code,
      workpaper.tax_year,
      workpaper.file_path || null,
      workpaper.total_amount || 0,
      workpaper.is_finalized ? 1 : 0,
      workpaper.notes || null
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function getWorkpapers(): Promise<Workpaper[]> {
  const db = await initDatabase();
  return await db.select<Workpaper[]>(
    "SELECT * FROM workpapers ORDER BY tax_year DESC, created_at DESC"
  );
}

export async function getWorkpapersByCategory(categoryCode: AtoCategoryCode): Promise<Workpaper[]> {
  const db = await initDatabase();
  return await db.select<Workpaper[]>(
    "SELECT * FROM workpapers WHERE category_code = $1 ORDER BY tax_year DESC",
    [categoryCode]
  );
}

export async function getWorkpapersByTaxYear(taxYear: number): Promise<Workpaper[]> {
  const db = await initDatabase();
  return await db.select<Workpaper[]>(
    "SELECT * FROM workpapers WHERE tax_year = $1 ORDER BY category_code",
    [taxYear]
  );
}

export async function getWorkpaperById(id: number): Promise<Workpaper | null> {
  const db = await initDatabase();
  const results = await db.select<Workpaper[]>(
    "SELECT * FROM workpapers WHERE id = $1",
    [id]
  );
  return results[0] || null;
}

export async function updateWorkpaper(id: number, workpaper: Partial<Omit<Workpaper, 'id' | 'created_at'>>): Promise<void> {
  const db = await initDatabase();
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (workpaper.title !== undefined) {
    fields.push("title = $" + (fields.length + 1));
    values.push(workpaper.title);
  }
  if (workpaper.description !== undefined) {
    fields.push("description = $" + (fields.length + 1));
    values.push(workpaper.description);
  }
  if (workpaper.category_code !== undefined) {
    fields.push("category_code = $" + (fields.length + 1));
    values.push(workpaper.category_code);
  }
  if (workpaper.tax_year !== undefined) {
    fields.push("tax_year = $" + (fields.length + 1));
    values.push(workpaper.tax_year);
  }
  if (workpaper.file_path !== undefined) {
    fields.push("file_path = $" + (fields.length + 1));
    values.push(workpaper.file_path);
  }
  if (workpaper.total_amount !== undefined) {
    fields.push("total_amount = $" + (fields.length + 1));
    values.push(workpaper.total_amount);
  }
  if (workpaper.is_finalized !== undefined) {
    fields.push("is_finalized = $" + (fields.length + 1));
    values.push(workpaper.is_finalized ? 1 : 0);
  }
  if (workpaper.notes !== undefined) {
    fields.push("notes = $" + (fields.length + 1));
    values.push(workpaper.notes);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await db.execute(
    `UPDATE workpapers SET ${fields.join(", ")} WHERE id = $${values.length}`,
    values
  );
}

export async function deleteWorkpaper(id: number): Promise<void> {
  const db = await initDatabase();
  await db.execute("DELETE FROM workpapers WHERE id = $1", [id]);
}

export async function finalizeWorkpaper(id: number): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE workpapers 
     SET is_finalized = 1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1`,
    [id]
  );
}

// ==================== Receipt-Workpaper Links ====================

export async function linkReceiptToWorkpaper(receiptId: number, workpaperId: number): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `INSERT OR IGNORE INTO receipt_workpaper_links (receipt_id, workpaper_id) 
     VALUES ($1, $2)`,
    [receiptId, workpaperId]
  );

  // Update workpaper total
  await updateWorkpaperTotalAmount(workpaperId);
}

export async function unlinkReceiptFromWorkpaper(receiptId: number, workpaperId: number): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `DELETE FROM receipt_workpaper_links 
     WHERE receipt_id = $1 AND workpaper_id = $2`,
    [receiptId, workpaperId]
  );

  // Update workpaper total
  await updateWorkpaperTotalAmount(workpaperId);
}

export async function getReceiptsForWorkpaper(workpaperId: number): Promise<Receipt[]> {
  const db = await initDatabase();
  return await db.select<Receipt[]>(
    `SELECT r.* FROM receipts r
     INNER JOIN receipt_workpaper_links l ON r.id = l.receipt_id
     WHERE l.workpaper_id = $1
     ORDER BY r.date DESC`,
    [workpaperId]
  );
}

export async function getWorkpapersForReceipt(receiptId: number): Promise<Workpaper[]> {
  const db = await initDatabase();
  return await db.select<Workpaper[]>(
    `SELECT w.* FROM workpapers w
     INNER JOIN receipt_workpaper_links l ON w.id = l.workpaper_id
     WHERE l.receipt_id = $1
     ORDER BY w.tax_year DESC`,
    [receiptId]
  );
}

async function updateWorkpaperTotalAmount(workpaperId: number): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE workpapers 
     SET total_amount = (
       SELECT COALESCE(SUM(r.amount), 0) 
       FROM receipts r
       INNER JOIN receipt_workpaper_links l ON r.id = l.receipt_id
       WHERE l.workpaper_id = $1
     ),
     updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [workpaperId]
  );
}

// ==================== ATO Category Claims ====================

export async function getCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number
): Promise<{ category_code: AtoCategoryCode; tax_year: number; amount: number; description?: string; receipt_count: number; is_finalized: boolean } | null> {
  const db = await initDatabase();
  const results = await db.select<{
    category_code: AtoCategoryCode;
    tax_year: number;
    amount: number;
    description?: string;
    receipt_count: number;
    is_finalized: boolean;
  }[]>(
    `SELECT * FROM ato_category_claims 
     WHERE category_code = $1 AND tax_year = $2`,
    [code, taxYear]
  );
  return results[0] || null;
}

export async function setCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number,
  amount: number,
  description?: string,
  receiptCount?: number
): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `INSERT INTO ato_category_claims 
     (category_code, tax_year, amount, description, receipt_count, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT(category_code, tax_year) 
     DO UPDATE SET 
       amount = $3, 
       description = $4, 
       receipt_count = $5,
       updated_at = CURRENT_TIMESTAMP`,
    [code, taxYear, amount, description || null, receiptCount || 0]
  );
}

export async function addToCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number,
  amount: number,
  receiptsToAdd: number = 0
): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `INSERT INTO ato_category_claims 
     (category_code, tax_year, amount, receipt_count, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT(category_code, tax_year) 
     DO UPDATE SET 
       amount = amount + $3, 
       receipt_count = receipt_count + $4,
       updated_at = CURRENT_TIMESTAMP`,
    [code, taxYear, amount, receiptsToAdd]
  );
}

export async function getClaimsForTaxYear(taxYear: number): Promise<{
  category_code: AtoCategoryCode;
  amount: number;
  receipt_count: number;
  is_finalized: boolean;
}[]> {
  const db = await initDatabase();
  return await db.select<
    { category_code: AtoCategoryCode; amount: number; receipt_count: number; is_finalized: boolean }[]
  >(
    `SELECT category_code, amount, receipt_count, is_finalized 
     FROM ato_category_claims 
     WHERE tax_year = $1 
     ORDER BY category_code`,
    [taxYear]
  );
}

// ==================== Validation Rules ====================

export function validateAtoCategoryCode(code: string): ValidationResult {
  const validCodes: AtoCategoryCode[] = [
    "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
    "D10", "D11", "D12", "D13", "D14", "D15"
  ];

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!code) {
    errors.push({ field: "ato_category_code", message: "ATO category code is required", code: "REQUIRED" });
  } else if (!validCodes.includes(code as AtoCategoryCode)) {
    errors.push({ field: "ato_category_code", message: `Invalid ATO category code: ${code}`, code: "INVALID_CODE" });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateReceipt(receipt: Partial<Receipt>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!receipt.vendor || receipt.vendor.trim() === "") {
    errors.push({ field: "vendor", message: "Vendor is required", code: "REQUIRED" });
  }

  if (receipt.amount === undefined || receipt.amount === null) {
    errors.push({ field: "amount", message: "Amount is required", code: "REQUIRED" });
  } else if (typeof receipt.amount !== "number" || receipt.amount < 0) {
    errors.push({ field: "amount", message: "Amount must be a positive number", code: "INVALID_AMOUNT" });
  } else if (receipt.amount === 0) {
    warnings.push({ field: "amount", message: "Amount is zero", code: "ZERO_AMOUNT" });
  }

  if (!receipt.category || receipt.category.trim() === "") {
    errors.push({ field: "category", message: "Category is required", code: "REQUIRED" });
  }

  if (!receipt.date) {
    errors.push({ field: "date", message: "Date is required", code: "REQUIRED" });
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(receipt.date)) {
      errors.push({ field: "date", message: "Date must be in YYYY-MM-DD format", code: "INVALID_FORMAT" });
    }
  }

  // Validate ATO category if provided
  if (receipt.ato_category_code) {
    const codeValidation = validateAtoCategoryCode(receipt.ato_category_code);
    errors.push(...codeValidation.errors);
    warnings.push(...codeValidation.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateWorkpaper(workpaper: Partial<Workpaper>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!workpaper.title || workpaper.title.trim() === "") {
    errors.push({ field: "title", message: "Title is required", code: "REQUIRED" });
  }

  if (!workpaper.category_code) {
    errors.push({ field: "category_code", message: "Category code is required", code: "REQUIRED" });
  } else {
    const codeValidation = validateAtoCategoryCode(workpaper.category_code);
    // Remap field name from ato_category_code to category_code for workpaper context
    errors.push(...codeValidation.errors.map(e => ({ ...e, field: "category_code" })));
  }

  if (workpaper.tax_year === undefined || workpaper.tax_year === null) {
    errors.push({ field: "tax_year", message: "Tax year is required", code: "REQUIRED" });
  } else if (workpaper.tax_year < 2000 || workpaper.tax_year > 2100) {
    errors.push({ field: "tax_year", message: "Tax year must be between 2000 and 2100", code: "INVALID_YEAR" });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ==================== Migration Helpers ====================

export async function migrateReceiptsToAtoCategories(): Promise<{
  migrated: number;
  failed: number;
  errors: string[];
}> {
  const db = await initDatabase();
  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;

  // Get receipts that don't have an ATO category
  const receipts = await db.select<Receipt[]>(
    "SELECT * FROM receipts WHERE ato_category_code IS NULL OR ato_category_code = ''"
  );

  // Category mapping from legacy to ATO codes
  const categoryMapping: Record<string, AtoCategoryCode> = {
    "Vehicle": "D1",
    "Car": "D1",
    "Travel": "D2",
    "Accommodation": "D2",
    "Clothing": "D3",
    "Uniform": "D3",
    "Laundry": "D3",
    "Education": "D4",
    "Course": "D4",
    "Training": "D4",
    "Home Office": "D5",
    "Phone": "D5",
    "Internet": "D5",
    "Union": "D5",
    "Subscriptions": "D5",
    "Tools": "D5",
    "Equipment": "D5",
    "Donations": "D8",
    "Gifts": "D8",
    "Charity": "D8",
    "Tax Agent": "D9",
    "Accountant": "D9",
    "Super": "D10",
    "Superannuation": "D10",
    "Investment": "D7",
    "Interest": "D7",
    "Dividends": "D7",
  };

  for (const receipt of receipts) {
    try {
      let mappedCode: AtoCategoryCode | null = null;

      // Try exact match first
      if (categoryMapping[receipt.category]) {
        mappedCode = categoryMapping[receipt.category];
      } else {
        // Try partial match
        for (const [key, code] of Object.entries(categoryMapping)) {
          if (receipt.category.toLowerCase().includes(key.toLowerCase())) {
            mappedCode = code;
            break;
          }
        }
      }

      if (mappedCode) {
        await db.execute(
          "UPDATE receipts SET ato_category_code = $1 WHERE id = $2",
          [mappedCode, receipt.id]
        );
        migrated++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      errors.push(`Receipt ${receipt.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { migrated, failed, errors };
}

// ==================== Summary and Statistics ====================

export async function getAtoCategorySummary(taxYear: number): Promise<{
  category_code: AtoCategoryCode;
  total_amount: number;
  receipt_count: number;
  claim_amount: number;
}[]> {
  const db = await initDatabase();
  const { startDate, endDate } = getFinancialYearDates(taxYear);

  return await db.select<
    { category_code: AtoCategoryCode; total_amount: number; receipt_count: number; claim_amount: number }[]
  >(
    `SELECT 
       COALESCE(r.ato_category_code, 'D5') as category_code,
       SUM(r.amount) as total_amount,
       COUNT(r.id) as receipt_count,
       COALESCE(c.amount, 0) as claim_amount
     FROM receipts r
     LEFT JOIN ato_category_claims c 
       ON r.ato_category_code = c.category_code 
       AND c.tax_year = $3
     WHERE r.date BETWEEN $1 AND $2
       AND r.ato_category_code IS NOT NULL
     GROUP BY r.ato_category_code
     ORDER BY total_amount DESC`,
    [startDate, endDate, taxYear]
  );
}
