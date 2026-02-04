/**
 * Bank Statement Parser Types
 * Type definitions for parsing Australian bank statements
 */

// Supported Australian banks
export type BankName = 
  | 'commbank' 
  | 'nab' 
  | 'westpac' 
  | 'anz' 
  | 'ing';

// Transaction types
export type TransactionType =
  | 'payment'
  | 'transfer'
  | 'fee'
  | 'interest'
  | 'deposit'
  | 'withdrawal'
  | 'direct_debit'
  | 'direct_credit'
  | 'atm'
  | 'card_purchase'
  | 'unknown';

// Parsed transaction
export interface ParsedTransaction {
  id?: number;
  statementId?: number;
  date: string; // ISO format YYYY-MM-DD
  description: string;
  rawDescription: string;
  amount: number; // Negative for debits, positive for credits
  balance?: number;
  transactionType: TransactionType;
  category?: string;
  isDuplicate?: boolean;
}

// Parsed bank statement
export interface ParsedStatement {
  bankName: BankName;
  accountNumber?: string;
  accountName?: string;
  statementPeriodStart: string; // ISO format YYYY-MM-DD
  statementPeriodEnd: string; // ISO format YYYY-MM-DD
  openingBalance?: number;
  closingBalance?: number;
  transactions: ParsedTransaction[];
  currency: string;
  pageCount: number;
  filename: string;
  parsedAt: string;
}

// Parser configuration for each bank
export interface BankParserConfig {
  name: BankName;
  displayName: string;
  dateFormats: string[];
  currency: string;
  dateRegex: RegExp;
  amountRegex: RegExp;
  balanceRegex: RegExp;
  transactionDelimiter: RegExp;
  skipLines: string[];
  headerPatterns: RegExp[];
  footerPatterns: RegExp[];
}

// Parser result
export interface ParseResult {
  success: boolean;
  statement?: ParsedStatement;
  error?: ParseError;
  warnings: ParseWarning[];
  stats: ParseStats;
}

export interface ParseError {
  code: string;
  message: string;
  details?: string;
}

export interface ParseWarning {
  code: string;
  message: string;
  line?: number;
  context?: string;
}

export interface ParseStats {
  linesProcessed: number;
  transactionsFound: number;
  transactionsParsed: number;
  transactionsSkipped: number;
  dateParseErrors: number;
  amountParseErrors: number;
  processingTimeMs: number;
}

// Database types
export interface BankStatement {
  id: number;
  bank_name: BankName;
  account_number?: string;
  account_name?: string;
  statement_period_start: string;
  statement_period_end: string;
  filename: string;
  parsed_at: string;
  opening_balance?: number;
  closing_balance?: number;
  transaction_count: number;
  currency: string;
}

export interface StatementTransaction {
  id: number;
  statement_id: number;
  transaction_date: string;
  description: string;
  raw_description: string;
  amount: number;
  balance?: number;
  transaction_type: TransactionType;
  category?: string;
  is_duplicate: boolean;
  created_at: string;
}

// Parser progress
export interface ParserProgress {
  status: 'idle' | 'reading' | 'parsing' | 'extracting' | 'saving' | 'complete' | 'error';
  progress: number; // 0-100
  currentPage?: number;
  totalPages?: number;
  message?: string;
}

// Export options
export interface ExportOptions {
  format: 'csv' | 'json';
  includeMetadata: boolean;
  dateRange?: { start: string; end: string };
  categories?: string[];
}

// Category suggestion
export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}
