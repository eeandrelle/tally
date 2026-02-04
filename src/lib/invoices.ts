// Invoice types and database operations
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

// Types matching Rust structures
export interface ExtractedField<T> {
  value: T;
  confidence: number;
  source: string;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total: number;
  confidence: number;
}

export interface ExtractedInvoice {
  abn?: ExtractedField<string>;
  invoice_number?: ExtractedField<string>;
  invoice_date?: ExtractedField<string>;
  due_date?: ExtractedField<string>;
  vendor_name?: ExtractedField<string>;
  total_amount?: ExtractedField<number>;
  gst_amount?: ExtractedField<number>;
  payment_terms?: ExtractedField<string>;
  line_items: LineItem[];
  raw_text: string;
  overall_confidence: number;
  document_type: "Unknown" | "Pdf" | "Image";
}

export interface InvoiceValidationResult {
  is_valid: boolean;
  missing_fields: string[];
  warnings: string[];
  suggested_action: "accept" | "review" | "manual_entry";
}

// Database Invoice type
export interface Invoice {
  id?: number;
  abn?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  vendor_name?: string;
  total_amount: number;
  gst_amount?: number;
  payment_terms?: string;
  line_items_json?: string; // JSON array of LineItem
  raw_text?: string;
  document_path?: string;
  document_type: "pdf" | "image";
  confidence_score: number;
  status: "draft" | "pending" | "approved" | "linked" | "rejected";
  expense_id?: number; // Linked expense record
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Rust Tauri API wrappers
export async function parseInvoicePdf(pdfPath: string): Promise<ExtractedInvoice> {
  return invoke("parse_invoice_pdf_command", { pdfPath });
}

export async function parseInvoiceImage(imagePath: string): Promise<ExtractedInvoice> {
  return invoke("parse_invoice_image_command", { imagePath });
}

export async function validateInvoice(invoice: ExtractedInvoice): Promise<InvoiceValidationResult> {
  return invoke("validate_invoice_command", { invoice });
}

// Database operations
export async function initInvoiceTables(db: Database): Promise<void> {
  // Create invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      abn TEXT,
      invoice_number TEXT,
      invoice_date TEXT,
      due_date TEXT,
      vendor_name TEXT,
      total_amount REAL NOT NULL,
      gst_amount REAL,
      payment_terms TEXT,
      line_items_json TEXT,
      raw_text TEXT,
      document_path TEXT,
      document_type TEXT NOT NULL DEFAULT 'pdf',
      confidence_score REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      expense_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expense_id) REFERENCES receipts(id) ON DELETE SET NULL
    )
  `);

  // Create indexes
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoices_abn ON invoices(abn)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_name)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoices_expense ON invoices(expense_id)
  `);
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "created_at" | "updated_at">): Promise<number> {
  const db = await initDatabase();
  const result = await db.execute(
    `INSERT INTO invoices 
     (abn, invoice_number, invoice_date, due_date, vendor_name, total_amount, gst_amount, 
      payment_terms, line_items_json, raw_text, document_path, document_type, 
      confidence_score, status, expense_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      invoice.abn || null,
      invoice.invoice_number || null,
      invoice.invoice_date || null,
      invoice.due_date || null,
      invoice.vendor_name || null,
      invoice.total_amount,
      invoice.gst_amount || null,
      invoice.payment_terms || null,
      invoice.line_items_json || null,
      invoice.raw_text || null,
      invoice.document_path || null,
      invoice.document_type,
      invoice.confidence_score,
      invoice.status,
      invoice.expense_id || null,
      invoice.notes || null,
    ]
  );
  return result.lastInsertId ?? 0;
}

export async function getInvoices(): Promise<Invoice[]> {
  const db = await initDatabase();
  return await db.select<Invoice[]>(
    "SELECT * FROM invoices ORDER BY created_at DESC"
  );
}

export async function getInvoicesByStatus(status: Invoice["status"]): Promise<Invoice[]> {
  const db = await initDatabase();
  return await db.select<Invoice[]>(
    "SELECT * FROM invoices WHERE status = $1 ORDER BY created_at DESC",
    [status]
  );
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const db = await initDatabase();
  const results = await db.select<Invoice[]>(
    "SELECT * FROM invoices WHERE id = $1",
    [id]
  );
  return results[0] || null;
}

export async function updateInvoice(id: number, invoice: Partial<Invoice>): Promise<void> {
  const db = await initDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (invoice.abn !== undefined) {
    fields.push("abn = $" + (fields.length + 1));
    values.push(invoice.abn);
  }
  if (invoice.invoice_number !== undefined) {
    fields.push("invoice_number = $" + (fields.length + 1));
    values.push(invoice.invoice_number);
  }
  if (invoice.invoice_date !== undefined) {
    fields.push("invoice_date = $" + (fields.length + 1));
    values.push(invoice.invoice_date);
  }
  if (invoice.due_date !== undefined) {
    fields.push("due_date = $" + (fields.length + 1));
    values.push(invoice.due_date);
  }
  if (invoice.vendor_name !== undefined) {
    fields.push("vendor_name = $" + (fields.length + 1));
    values.push(invoice.vendor_name);
  }
  if (invoice.total_amount !== undefined) {
    fields.push("total_amount = $" + (fields.length + 1));
    values.push(invoice.total_amount);
  }
  if (invoice.gst_amount !== undefined) {
    fields.push("gst_amount = $" + (fields.length + 1));
    values.push(invoice.gst_amount);
  }
  if (invoice.payment_terms !== undefined) {
    fields.push("payment_terms = $" + (fields.length + 1));
    values.push(invoice.payment_terms);
  }
  if (invoice.line_items_json !== undefined) {
    fields.push("line_items_json = $" + (fields.length + 1));
    values.push(invoice.line_items_json);
  }
  if (invoice.status !== undefined) {
    fields.push("status = $" + (fields.length + 1));
    values.push(invoice.status);
  }
  if (invoice.expense_id !== undefined) {
    fields.push("expense_id = $" + (fields.length + 1));
    values.push(invoice.expense_id);
  }
  if (invoice.notes !== undefined) {
    fields.push("notes = $" + (fields.length + 1));
    values.push(invoice.notes);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await db.execute(
    `UPDATE invoices SET ${fields.join(", ")} WHERE id = $${values.length}`,
    values
  );
}

export async function deleteInvoice(id: number): Promise<void> {
  const db = await initDatabase();
  await db.execute("DELETE FROM invoices WHERE id = $1", [id]);
}

export async function linkInvoiceToExpense(invoiceId: number, expenseId: number): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE invoices SET expense_id = $1, status = 'linked', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [expenseId, invoiceId]
  );
}

export async function unlinkInvoiceFromExpense(invoiceId: number): Promise<void> {
  const db = await initDatabase();
  await db.execute(
    `UPDATE invoices SET expense_id = NULL, status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [invoiceId]
  );
}

// Helper to convert extracted invoice to database format
export function extractedInvoiceToDbInvoice(
  extracted: ExtractedInvoice,
  documentPath: string
): Omit<Invoice, "id" | "created_at" | "updated_at"> {
  return {
    abn: extracted.abn?.value,
    invoice_number: extracted.invoice_number?.value,
    invoice_date: extracted.invoice_date?.value,
    due_date: extracted.due_date?.value,
    vendor_name: extracted.vendor_name?.value,
    total_amount: extracted.total_amount?.value ?? 0,
    gst_amount: extracted.gst_amount?.value,
    payment_terms: extracted.payment_terms?.value,
    line_items_json: extracted.line_items.length > 0 
      ? JSON.stringify(extracted.line_items) 
      : undefined,
    raw_text: extracted.raw_text,
    document_path: documentPath,
    document_type: extracted.document_type === "Image" ? "image" : "pdf",
    confidence_score: extracted.overall_confidence,
    status: extracted.overall_confidence >= 0.75 ? "pending" : "draft",
  };
}

// Helper to parse line items from JSON
export function parseLineItems(invoice: Invoice): LineItem[] {
  if (!invoice.line_items_json) return [];
  try {
    return JSON.parse(invoice.line_items_json) as LineItem[];
  } catch {
    return [];
  }
}

// Statistics
export async function getInvoiceStats(): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
  linked: number;
  totalAmount: number;
}> {
  const db = await initDatabase();
  
  const results = await db.select<{
    status: string;
    count: number;
    total_amount: number;
  }[]>(
    `SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount 
     FROM invoices 
     GROUP BY status`
  );

  const stats = {
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    linked: 0,
    totalAmount: 0,
  };

  for (const row of results) {
    stats.total += row.count;
    stats.totalAmount += row.total_amount;
    
    switch (row.status) {
      case "draft":
        stats.draft = row.count;
        break;
      case "pending":
        stats.pending = row.count;
        break;
      case "approved":
        stats.approved = row.count;
        break;
      case "linked":
        stats.linked = row.count;
        break;
    }
  }

  return stats;
}

// Import from main db module
import { initDatabase } from "./db";
