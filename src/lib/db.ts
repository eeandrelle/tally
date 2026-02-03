import Database from "@tauri-apps/plugin-sql";

export interface Receipt {
  id?: number;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  image_path?: string;
  notes?: string;
  created_at?: string;
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
      date TEXT NOT NULL,
      image_path TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
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

// Receipt CRUD operations
export async function createReceipt(receipt: Receipt): Promise<number> {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO receipts (vendor, amount, category, date, image_path, notes) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [receipt.vendor, receipt.amount, receipt.category, receipt.date, receipt.image_path, receipt.notes]
  );
  return result.lastInsertId;
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

export async function getReceiptCount(): Promise<number> {
  const db = await initDatabase();
  const result = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM receipts"
  );
  return result[0].count;
}
