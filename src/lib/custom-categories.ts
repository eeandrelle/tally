/**
 * Custom Tax Categories Database
 * 
 * Database schema and functions for storing and managing
 * user-defined custom tax deduction categories.
 */

import Database from "@tauri-apps/plugin-sql";

export interface CustomCategory {
  id?: number;
  name: string;
  description?: string | null;
  ato_code?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

let db: Database | null = null;

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
 * Initialize custom categories table
 */
export async function initCustomCategoriesTable(database?: Database): Promise<void> {
  const dbInstance = database || await getDb();
  
  await dbInstance.execute(`
    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      ato_code TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create index for faster lookups
  await dbInstance.execute(`
    CREATE INDEX IF NOT EXISTS idx_custom_categories_name 
    ON custom_categories(name)
  `);
  
  await dbInstance.execute(`
    CREATE INDEX IF NOT EXISTS idx_custom_categories_ato_code 
    ON custom_categories(ato_code)
  `);
}

/**
 * Get all custom categories
 */
export async function getCustomCategories(): Promise<CustomCategory[]> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  const categories = await dbInstance.select<CustomCategory[]>(
    `SELECT * FROM custom_categories 
     WHERE is_active = 1 
     ORDER BY name ASC`
  );
  
  return categories;
}

/**
 * Get a single custom category by ID
 */
export async function getCustomCategoryById(id: number): Promise<CustomCategory | null> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  const categories = await dbInstance.select<CustomCategory[]>(
    `SELECT * FROM custom_categories WHERE id = $1 AND is_active = 1`,
    [id]
  );
  
  return categories[0] || null;
}

/**
 * Create a new custom category
 */
export async function createCustomCategory(
  category: Omit<CustomCategory, "id" | "created_at" | "updated_at">
): Promise<number> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  // Check for duplicate name
  const existing = await dbInstance.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM custom_categories WHERE name = $1 AND is_active = 1`,
    [category.name]
  );
  
  if (existing[0].count > 0) {
    throw new Error(`A category with the name "${category.name}" already exists`);
  }
  
  const result = await dbInstance.execute(
    `INSERT INTO custom_categories (name, description, ato_code, is_active)
     VALUES ($1, $2, $3, 1)`,
    [category.name, category.description || null, category.ato_code || null]
  );
  
  return result.lastInsertId;
}

/**
 * Update an existing custom category
 */
export async function updateCustomCategory(
  id: number,
  updates: Partial<Omit<CustomCategory, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  // Check for duplicate name if name is being updated
  if (updates.name) {
    const existing = await dbInstance.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM custom_categories 
       WHERE name = $1 AND id != $2 AND is_active = 1`,
      [updates.name, id]
    );
    
    if (existing[0].count > 0) {
      throw new Error(`A category with the name "${updates.name}" already exists`);
    }
  }
  
  await dbInstance.execute(
    `UPDATE custom_categories 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         ato_code = COALESCE($3, ato_code),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [updates.name, updates.description, updates.ato_code, id]
  );
}

/**
 * Soft delete a custom category (sets is_active to false)
 */
export async function deleteCustomCategory(id: number): Promise<void> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  await dbInstance.execute(
    `UPDATE custom_categories 
     SET is_active = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );
}

/**
 * Hard delete a custom category (permanent removal)
 * Use with caution - only when no receipts reference this category
 */
export async function permanentlyDeleteCustomCategory(id: number): Promise<void> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  await dbInstance.execute(
    `DELETE FROM custom_categories WHERE id = $1`,
    [id]
  );
}

/**
 * Search custom categories by name or description
 */
export async function searchCustomCategories(query: string): Promise<CustomCategory[]> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  const searchTerm = `%${query}%`;
  const categories = await dbInstance.select<CustomCategory[]>(
    `SELECT * FROM custom_categories 
     WHERE is_active = 1 
     AND (name LIKE $1 OR description LIKE $1)
     ORDER BY name ASC`,
    [searchTerm]
  );
  
  return categories;
}

/**
 * Get custom categories linked to a specific ATO code
 */
export async function getCustomCategoriesByAtoCode(atoCode: string): Promise<CustomCategory[]> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  const categories = await dbInstance.select<CustomCategory[]>(
    `SELECT * FROM custom_categories 
     WHERE is_active = 1 AND ato_code = $1
     ORDER BY name ASC`,
    [atoCode]
  );
  
  return categories;
}

/**
 * Check if a custom category name already exists
 */
export async function customCategoryExists(name: string, excludeId?: number): Promise<boolean> {
  const dbInstance = await getDb();
  await initCustomCategoriesTable(dbInstance);
  
  let query = `SELECT COUNT(*) as count FROM custom_categories WHERE name = $1 AND is_active = 1`;
  const params: (string | number)[] = [name];
  
  if (excludeId) {
    query += ` AND id != $2`;
    params.push(excludeId);
  }
  
  const result = await dbInstance.select<{ count: number }[]>(query, params);
  return result[0].count > 0;
}
