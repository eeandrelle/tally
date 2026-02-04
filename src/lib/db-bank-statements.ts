/**
 * Database Layer for Bank Statements
 * SQLite operations for bank statements and transactions
 */

import Database from '@tauri-apps/plugin-sql';
import type {
  BankName,
  BankStatement,
  StatementTransaction,
  ParsedStatement,
  ParsedTransaction,
  TransactionType,
} from './bank-statement-types';

// Database connection
let db: Database | null = null;

// Initialize database connection
export async function initBankStatementDB(): Promise<Database> {
  if (db) return db;
  
  db = await Database.load('sqlite:tally.db');
  return db;
}

// Get database connection
export async function getDB(): Promise<Database> {
  if (!db) {
    db = await initBankStatementDB();
  }
  return db;
}

// Initialize bank statement tables
export async function initBankStatementTables(database?: Database): Promise<void> {
  const db = database || await getDB();
  
  // Create bank_statements table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bank_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_number TEXT,
      account_name TEXT,
      statement_period_start TEXT NOT NULL,
      statement_period_end TEXT NOT NULL,
      filename TEXT NOT NULL,
      parsed_at TEXT NOT NULL,
      opening_balance REAL,
      closing_balance REAL,
      transaction_count INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'AUD',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create statement_transactions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS statement_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id INTEGER NOT NULL,
      transaction_date TEXT NOT NULL,
      description TEXT NOT NULL,
      raw_description TEXT,
      amount REAL NOT NULL,
      balance REAL,
      transaction_type TEXT DEFAULT 'unknown',
      category TEXT,
      is_duplicate INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for better query performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_transactions_statement_id 
    ON statement_transactions(statement_id)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date 
    ON statement_transactions(transaction_date)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_transactions_category 
    ON statement_transactions(category)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_statements_period 
    ON bank_statements(statement_period_start, statement_period_end)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_statements_bank 
    ON bank_statements(bank_name)
  `);
  
  // Create unique index to prevent duplicate transactions
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_transaction 
    ON statement_transactions(statement_id, transaction_date, description, amount)
  `);
}

// Create a new bank statement
export async function createBankStatement(
  statement: Omit<BankStatement, 'id'>
): Promise<BankStatement> {
  const db = await getDB();
  
  const result = await db.execute(
    `INSERT INTO bank_statements 
     (bank_name, account_number, account_name, statement_period_start, statement_period_end, 
      filename, parsed_at, opening_balance, closing_balance, transaction_count, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      statement.bank_name,
      statement.account_number || null,
      statement.account_name || null,
      statement.statement_period_start,
      statement.statement_period_end,
      statement.filename,
      statement.parsed_at,
      statement.opening_balance || null,
      statement.closing_balance || null,
      statement.transaction_count,
      statement.currency,
    ]
  );
  
  const id = result.lastInsertId;
  const created = await getBankStatementById(id);
  
  if (!created) {
    throw new Error('Failed to create bank statement');
  }
  
  return created;
}

// Get bank statement by ID
export async function getBankStatementById(id: number): Promise<BankStatement | null> {
  const db = await getDB();
  
  const result = await db.select<BankStatement[]>(
    'SELECT * FROM bank_statements WHERE id = ?',
    [id]
  );
  
  return result[0] || null;
}

// Get all bank statements
export async function getAllBankStatements(): Promise<BankStatement[]> {
  const db = await getDB();
  
  return await db.select<BankStatement[]>(
    'SELECT * FROM bank_statements ORDER BY parsed_at DESC'
  );
}

// Get bank statements by bank name
export async function getBankStatementsByBank(bankName: BankName): Promise<BankStatement[]> {
  const db = await getDB();
  
  return await db.select<BankStatement[]>(
    'SELECT * FROM bank_statements WHERE bank_name = ? ORDER BY statement_period_end DESC',
    [bankName]
  );
}

// Get bank statements by date range
export async function getBankStatementsByDateRange(
  startDate: string,
  endDate: string
): Promise<BankStatement[]> {
  const db = await getDB();
  
  return await db.select<BankStatement[]>(
    `SELECT * FROM bank_statements 
     WHERE statement_period_start >= ? AND statement_period_end <= ?
     ORDER BY statement_period_start DESC`,
    [startDate, endDate]
  );
}

// Update bank statement
export async function updateBankStatement(
  id: number,
  updates: Partial<Omit<BankStatement, 'id'>>
): Promise<BankStatement> {
  const db = await getDB();
  
  const allowedFields: (keyof BankStatement)[] = [
    'bank_name', 'account_number', 'account_name', 'statement_period_start',
    'statement_period_end', 'filename', 'opening_balance', 'closing_balance',
    'transaction_count', 'currency',
  ];
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  for (const key of allowedFields) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  await db.execute(
    `UPDATE bank_statements SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  const updated = await getBankStatementById(id);
  if (!updated) {
    throw new Error('Failed to update bank statement');
  }
  
  return updated;
}

// Delete bank statement (cascades to transactions)
export async function deleteBankStatement(id: number): Promise<void> {
  const db = await getDB();
  await db.execute('DELETE FROM bank_statements WHERE id = ?', [id]);
}

// Create statement transaction
export async function createStatementTransaction(
  transaction: Omit<StatementTransaction, 'id' | 'created_at'>
): Promise<StatementTransaction> {
  const db = await getDB();
  
  try {
    const result = await db.execute(
      `INSERT INTO statement_transactions 
       (statement_id, transaction_date, description, raw_description, amount, 
        balance, transaction_type, category, is_duplicate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.statement_id,
        transaction.transaction_date,
        transaction.description,
        transaction.raw_description || transaction.description,
        transaction.amount,
        transaction.balance || null,
        transaction.transaction_type,
        transaction.category || null,
        transaction.is_duplicate ? 1 : 0,
      ]
    );
    
    const id = result.lastInsertId;
    const created = await getStatementTransactionById(id);
    
    if (!created) {
      throw new Error('Failed to create transaction');
    }
    
    return created;
  } catch (error) {
    // Handle duplicate transaction
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Transaction already exists');
    }
    throw error;
  }
}

// Create multiple transactions in batch
export async function createStatementTransactionsBatch(
  transactions: Omit<StatementTransaction, 'id' | 'created_at'>[]
): Promise<{ created: number; skipped: number }> {
  const db = await getDB();
  let created = 0;
  let skipped = 0;
  
  await db.execute('BEGIN TRANSACTION');
  
  try {
    for (const transaction of transactions) {
      try {
        await db.execute(
          `INSERT INTO statement_transactions 
           (statement_id, transaction_date, description, raw_description, amount, 
            balance, transaction_type, category, is_duplicate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transaction.statement_id,
            transaction.transaction_date,
            transaction.description,
            transaction.raw_description || transaction.description,
            transaction.amount,
            transaction.balance || null,
            transaction.transaction_type,
            transaction.category || null,
            transaction.is_duplicate ? 1 : 0,
          ]
        );
        created++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          skipped++;
        } else {
          throw error;
        }
      }
    }
    
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
  
  return { created, skipped };
}

// Get transaction by ID
export async function getStatementTransactionById(id: number): Promise<StatementTransaction | null> {
  const db = await getDB();
  
  const result = await db.select<StatementTransaction[]>(
    'SELECT * FROM statement_transactions WHERE id = ?',
    [id]
  );
  
  return result[0] || null;
}

// Get transactions by statement ID
export async function getTransactionsByStatementId(
  statementId: number
): Promise<StatementTransaction[]> {
  const db = await getDB();
  
  return await db.select<StatementTransaction[]>(
    `SELECT * FROM statement_transactions 
     WHERE statement_id = ? 
     ORDER BY transaction_date ASC, id ASC`,
    [statementId]
  );
}

// Get all transactions
export async function getAllStatementTransactions(): Promise<StatementTransaction[]> {
  const db = await getDB();
  
  return await db.select<StatementTransaction[]>(
    'SELECT * FROM statement_transactions ORDER BY transaction_date DESC'
  );
}

// Get transactions by category
export async function getTransactionsByCategory(
  category: string
): Promise<StatementTransaction[]> {
  const db = await getDB();
  
  return await db.select<StatementTransaction[]>(
    'SELECT * FROM statement_transactions WHERE category = ? ORDER BY transaction_date DESC',
    [category]
  );
}

// Get transactions by date range
export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<StatementTransaction[]> {
  const db = await getDB();
  
  return await db.select<StatementTransaction[]>(
    `SELECT * FROM statement_transactions 
     WHERE transaction_date >= ? AND transaction_date <= ?
     ORDER BY transaction_date DESC`,
    [startDate, endDate]
  );
}

// Update transaction
export async function updateStatementTransaction(
  id: number,
  updates: Partial<Pick<StatementTransaction, 'description' | 'category' | 'transaction_type' | 'is_duplicate'>>
): Promise<StatementTransaction> {
  const db = await getDB();
  
  const allowedFields = ['description', 'category', 'transaction_type', 'is_duplicate'];
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  for (const key of allowedFields) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      const value = updates[key as keyof typeof updates];
      values.push(key === 'is_duplicate' ? (value ? 1 : 0) : value);
    }
  }
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(id);
  
  await db.execute(
    `UPDATE statement_transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  const updated = await getStatementTransactionById(id);
  if (!updated) {
    throw new Error('Failed to update transaction');
  }
  
  return updated;
}

// Delete transaction
export async function deleteStatementTransaction(id: number): Promise<void> {
  const db = await getDB();
  await db.execute('DELETE FROM statement_transactions WHERE id = ?', [id]);
}

// Delete all transactions for a statement
export async function deleteTransactionsByStatementId(statementId: number): Promise<void> {
  const db = await getDB();
  await db.execute('DELETE FROM statement_transactions WHERE statement_id = ?', [statementId]);
}

// Check for duplicate transactions
export async function checkDuplicateTransaction(
  statementId: number,
  date: string,
  description: string,
  amount: number
): Promise<boolean> {
  const db = await getDB();
  
  const result = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM statement_transactions 
     WHERE statement_id = ? AND transaction_date = ? AND description = ? AND amount = ?`,
    [statementId, date, description, amount]
  );
  
  return result[0]?.count > 0;
}

// Get transaction statistics
export async function getTransactionStats(statementId: number): Promise<{
  totalCount: number;
  totalDebits: number;
  totalCredits: number;
  typeBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}> {
  const db = await getDB();
  
  const transactions = await getTransactionsByStatementId(statementId);
  
  const totalDebits = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalCredits = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const typeBreakdown = transactions.reduce((acc, t) => {
    acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const categoryBreakdown = transactions.reduce((acc, t) => {
    const category = t.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalCount: transactions.length,
    totalDebits,
    totalCredits,
    typeBreakdown,
    categoryBreakdown,
  };
}

// Save parsed statement to database
export async function saveParsedStatement(
  parsed: ParsedStatement
): Promise<{ statement: BankStatement; transactionsCreated: number; duplicatesSkipped: number }> {
  // Create the bank statement record
  const statement = await createBankStatement({
    bank_name: parsed.bankName,
    account_number: parsed.accountNumber,
    account_name: parsed.accountName,
    statement_period_start: parsed.statementPeriodStart,
    statement_period_end: parsed.statementPeriodEnd,
    filename: parsed.filename,
    parsed_at: parsed.parsedAt,
    opening_balance: parsed.openingBalance,
    closing_balance: parsed.closingBalance,
    transaction_count: parsed.transactions.length,
    currency: parsed.currency,
  });
  
  // Prepare transactions
  const transactionsToInsert = parsed.transactions.map(tx => ({
    statement_id: statement.id,
    transaction_date: tx.date,
    description: tx.description,
    raw_description: tx.rawDescription,
    amount: tx.amount,
    balance: tx.balance,
    transaction_type: tx.transactionType,
    category: tx.category,
    is_duplicate: tx.isDuplicate || false,
  }));
  
  // Insert transactions in batch
  const { created, skipped } = await createStatementTransactionsBatch(transactionsToInsert);
  
  return {
    statement,
    transactionsCreated: created,
    duplicatesSkipped: skipped,
  };
}

// Search transactions
export async function searchTransactions(
  query: string,
  options?: {
    statementId?: number;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }
): Promise<StatementTransaction[]> {
  const db = await getDB();
  
  let sql = 'SELECT * FROM statement_transactions WHERE (description LIKE ? OR raw_description LIKE ?)';
  const params: unknown[] = [`%${query}%`, `%${query}%`];
  
  if (options?.statementId) {
    sql += ' AND statement_id = ?';
    params.push(options.statementId);
  }
  
  if (options?.startDate) {
    sql += ' AND transaction_date >= ?';
    params.push(options.startDate);
  }
  
  if (options?.endDate) {
    sql += ' AND transaction_date <= ?';
    params.push(options.endDate);
  }
  
  if (options?.minAmount !== undefined) {
    sql += ' AND amount >= ?';
    params.push(options.minAmount);
  }
  
  if (options?.maxAmount !== undefined) {
    sql += ' AND amount <= ?';
    params.push(options.maxAmount);
  }
  
  sql += ' ORDER BY transaction_date DESC';
  
  return await db.select<StatementTransaction[]>(sql, params);
}
