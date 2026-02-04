/**
 * Bank Statements Module Index
 * Export all bank statement related modules
 */

// Types
export type {
  BankName,
  TransactionType,
  ParsedTransaction,
  ParsedStatement,
  BankParserConfig,
  ParseResult,
  ParseError,
  ParseWarning,
  ParseStats,
  BankStatement,
  StatementTransaction,
  ParserProgress,
  ExportOptions,
  CategorySuggestion,
} from './bank-statement-types';

// Parser
export {
  parseDate,
  parseAmount,
  detectTransactionType,
  cleanDescription,
  extractAccountNumber,
  extractStatementPeriod,
  extractBalances,
  parseBankStatement,
  validateStatement,
  calculateStatementStats,
} from './bank-statement-parser';

// PDF Parser
export {
  parsePDFBankStatement,
  detectBankFromPDF,
  validatePDFBankStatement,
  batchParsePDFStatements,
  type PDFParseOptions,
  type ProgressCallback,
} from './bank-pdf-parser';

// Configs
export {
  bankConfigs,
  commbankConfig,
  nabConfig,
  westpacConfig,
  anzConfig,
  ingConfig,
  getBankConfig,
  getSupportedBanks,
  detectBankFromText as detectBankFromTextConfig,
  monthMap,
} from './bank-parser-configs';

// Database
export {
  initBankStatementDB,
  getDB,
  initBankStatementTables,
  createBankStatement,
  getBankStatementById,
  getAllBankStatements,
  getBankStatementsByBank,
  getBankStatementsByDateRange,
  updateBankStatement,
  deleteBankStatement,
  createStatementTransaction,
  createStatementTransactionsBatch,
  getStatementTransactionById,
  getTransactionsByStatementId,
  getAllStatementTransactions,
  getTransactionsByCategory,
  getTransactionsByDateRange,
  updateStatementTransaction,
  deleteStatementTransaction,
  deleteTransactionsByStatementId,
  checkDuplicateTransaction,
  getTransactionStats,
  saveParsedStatement,
  searchTransactions,
} from './db-bank-statements';
