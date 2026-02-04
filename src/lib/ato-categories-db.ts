/**
 * ATO Categories Database Integration
 * 
 * Database schema and functions for storing and retrieving 
 * ATO deduction categories with user-specific settings.
 */

import Database from "@tauri-apps/plugin-sql";
import { AtoCategory, AtoCategoryCode, atoCategories, getCategoryByCode } from "./ato-categories";

export interface AtoCategoryRecord {
  id?: number;
  code: AtoCategoryCode;
  is_enabled: boolean;
  custom_description?: string;
  notes?: string;
  total_claimed_fy?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryClaim {
  id?: number;
  category_code: AtoCategoryCode;
  tax_year: number;
  amount: number;
  description?: string;
  receipt_count?: number;
  is_finalized: boolean;
  created_at?: string;
  updated_at?: string;
}

let db: Database | null = null;

/**
 * Initialize ATO categories tables in the database
 */
export async function initAtoCategoriesTable(database?: Database): Promise<void> {
  const dbInstance = database || await getDb();
  
  // Create table for user-enabled categories
  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS ato_categories_enabled (
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
  
  // Create table for category claims per tax year
  await dbInstance.execute(`
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
  
  // Create index for faster lookups
  await dbInstance.execute(`
    CREATE INDEX IF NOT EXISTS idx_category_claims_year 
    ON ato_category_claims(tax_year)
  `);
  
  await dbInstance.execute(`
    CREATE INDEX IF NOT EXISTS idx_category_claims_code 
    ON ato_category_claims(category_code)
  `);
  
  // Seed default categories if empty
  await seedDefaultCategories(dbInstance);
}

/**
 * Get database instance
 */
async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:default.db");
  }
  return db;
}

/**
 * Seed the database with default ATO categories
 */
async function seedDefaultCategories(database: Database): Promise<void> {
  const existing = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM ato_categories_enabled"
  );
  
  if (existing[0].count === 0) {
    // Insert all categories as enabled by default
    for (const category of atoCategories) {
      await database.execute(
        `INSERT INTO ato_categories_enabled (code, is_enabled) VALUES ($1, $2)`,
        [category.code, true]
      );
    }
  }
}

/**
 * Get all ATO categories with their database settings
 */
export async function getAllCategoriesWithSettings(): Promise<(AtoCategory & { isEnabled: boolean; customDescription?: string; notes?: string })[]> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  const records = await dbInstance.select<AtoCategoryRecord[]>(
    "SELECT * FROM ato_categories_enabled ORDER BY code"
  );
  
  return atoCategories.map(cat => {
    const record = records.find(r => r.code === cat.code);
    return {
      ...cat,
      isEnabled: record?.is_enabled ?? true,
      customDescription: record?.custom_description,
      notes: record?.notes
    };
  });
}

/**
 * Get enabled categories only
 */
export async function getEnabledCategories(): Promise<AtoCategory[]> {
  const all = await getAllCategoriesWithSettings();
  return all.filter(cat => cat.isEnabled).map(({ isEnabled, customDescription, notes, ...cat }) => cat);
}

/**
 * Enable or disable a category
 */
export async function setCategoryEnabled(code: AtoCategoryCode, enabled: boolean): Promise<void> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  await dbInstance.execute(
    `UPDATE ato_categories_enabled 
     SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE code = $2`,
    [enabled, code]
  );
}

/**
 * Update category notes
 */
export async function updateCategoryNotes(code: AtoCategoryCode, notes: string): Promise<void> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  await dbInstance.execute(
    `UPDATE ato_categories_enabled 
     SET notes = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE code = $2`,
    [notes, code]
  );
}

/**
 * Update custom description for a category
 */
export async function updateCategoryCustomDescription(
  code: AtoCategoryCode, 
  description: string
): Promise<void> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  await dbInstance.execute(
    `UPDATE ato_categories_enabled 
     SET custom_description = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE code = $2`,
    [description, code]
  );
}

/**
 * Get or create a claim record for a category and tax year
 */
export async function getCategoryClaim(
  code: AtoCategoryCode, 
  taxYear: number
): Promise<CategoryClaim | null> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  const records = await dbInstance.select<CategoryClaim[]>(
    `SELECT * FROM ato_category_claims 
     WHERE category_code = $1 AND tax_year = $2`,
    [code, taxYear]
  );
  
  return records[0] || null;
}

/**
 * Set claim amount for a category and tax year
 */
export async function setCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number,
  amount: number,
  description?: string,
  receiptCount?: number
): Promise<void> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  await dbInstance.execute(
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

/**
 * Add to existing claim amount
 */
export async function addToCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number,
  amount: number,
  receiptsToAdd: number = 0
): Promise<void> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  await dbInstance.execute(
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

/**
 * Finalize a category claim (lock from further edits)
 */
export async function finalizeCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number
): Promise<void> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  await dbInstance.execute(
    `UPDATE ato_category_claims 
     SET is_finalized = 1, updated_at = CURRENT_TIMESTAMP 
     WHERE category_code = $1 AND tax_year = $2`,
    [code, taxYear]
  );
}

/**
 * Get all claims for a tax year
 */
export async function getClaimsForTaxYear(taxYear: number): Promise<(CategoryClaim & { category?: AtoCategory })[]> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  const records = await dbInstance.select<CategoryClaim[]>(
    `SELECT * FROM ato_category_claims 
     WHERE tax_year = $1 
     ORDER BY category_code`,
    [taxYear]
  );
  
  return records.map(record => ({
    ...record,
    category: getCategoryByCode(record.category_code as AtoCategoryCode)
  }));
}

/**
 * Get tax year summary
 */
export async function getTaxYearSummary(taxYear: number): Promise<{
  totalClaims: number;
  finalizedCount: number;
  totalAmount: number;
  totalReceipts: number;
  categoriesClaimed: number;
}> {
  const dbInstance = await getDb();
  await initAtoCategoriesTable(dbInstance);
  
  const result = await dbInstance.select<{
    total_claims: number;
    finalized_count: number;
    total_amount: number;
    total_receipts: number;
  }[]>(
    `SELECT 
      COUNT(*) as total_claims,
      SUM(CASE WHEN is_finalized = 1 THEN 1 ELSE 0 END) as finalized_count,
      SUM(amount) as total_amount,
      SUM(receipt_count) as total_receipts
     FROM ato_category_claims 
     WHERE tax_year = $1`,
    [taxYear]
  );
  
  return {
    totalClaims: result[0]?.total_claims || 0,
    finalizedCount: result[0]?.finalized_count || 0,
    totalAmount: result[0]?.total_amount || 0,
    totalReceipts: result[0]?.total_receipts || 0,
    categoriesClaimed: result[0]?.total_claims || 0
  };
}

/**
 * Delete a claim
 */
export async function deleteCategoryClaim(
  code: AtoCategoryCode,
  taxYear: number
): Promise<void> {
  const dbInstance = await getDb();
  
  await dbInstance.execute(
    `DELETE FROM ato_category_claims 
     WHERE category_code = $1 AND tax_year = $2 AND is_finalized = 0`,
    [code, taxYear]
  );
}

/**
 * Get suggested categories based on expense description
 */
export function suggestCategoriesForExpense(description: string): AtoCategory[] {
  const lowerDesc = description.toLowerCase();
  const suggestions: { category: AtoCategory; score: number }[] = [];
  
  for (const category of atoCategories) {
    let score = 0;
    
    // Check typical worksheet items
    for (const item of category.typicalWorksheetItems || []) {
      if (lowerDesc.includes(item.toLowerCase())) {
        score += 3;
      }
    }
    
    // Check claimable examples
    for (const example of category.examples.claimable) {
      const words = example.toLowerCase().split(" ");
      for (const word of words) {
        if (word.length > 3 && lowerDesc.includes(word)) {
          score += 1;
        }
      }
    }
    
    // Check name and description
    if (lowerDesc.includes(category.name.toLowerCase())) score += 5;
    if (lowerDesc.includes(category.code.toLowerCase())) score += 5;
    
    if (score > 0) {
      suggestions.push({ category, score });
    }
  }
  
  // Sort by score and return top matches
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.category);
}

/**
 * Export claims for tax lodgment
 */
export async function exportClaimsForLodgment(taxYear: number): Promise<{
  taxYear: number;
  generatedAt: string;
  categories: {
    code: AtoCategoryCode;
    name: string;
    amount: number;
    receiptCount: number;
    description?: string;
  }[];
  totals: {
    deductions: number;
    offsets: number;
  };
}> {
  const claims = await getClaimsForTaxYear(taxYear);
  
  const deductionCodes = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9"];
  const offsetCodes = ["D10", "D11", "D12", "D13", "D14", "D15"];
  
  let totalDeductions = 0;
  let totalOffsets = 0;
  
  const categories = claims.map(claim => {
    const amount = claim.amount || 0;
    if (deductionCodes.includes(claim.category_code)) {
      totalDeductions += amount;
    } else if (offsetCodes.includes(claim.category_code)) {
      totalOffsets += amount;
    }
    
    return {
      code: claim.category_code as AtoCategoryCode,
      name: claim.category?.name || claim.category_code,
      amount,
      receiptCount: claim.receipt_count || 0,
      description: claim.description
    };
  });
  
  return {
    taxYear,
    generatedAt: new Date().toISOString(),
    categories,
    totals: {
      deductions: totalDeductions,
      offsets: totalOffsets
    }
  };
}

/**
 * Reset all categories to default settings
 */
export async function resetCategoriesToDefault(): Promise<void> {
  const dbInstance = await getDb();
  
  // Clear all settings
  await dbInstance.execute("DELETE FROM ato_categories_enabled");
  await dbInstance.execute("DELETE FROM ato_category_claims");
  
  // Reseed
  await seedDefaultCategories(dbInstance);
}

export default {
  initAtoCategoriesTable,
  getAllCategoriesWithSettings,
  getEnabledCategories,
  setCategoryEnabled,
  updateCategoryNotes,
  updateCategoryCustomDescription,
  getCategoryClaim,
  setCategoryClaim,
  addToCategoryClaim,
  finalizeCategoryClaim,
  getClaimsForTaxYear,
  getTaxYearSummary,
  deleteCategoryClaim,
  suggestCategoriesForExpense,
  exportClaimsForLodgment,
  resetCategoriesToDefault
};
