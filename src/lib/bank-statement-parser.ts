/**
 * Bank Statement Parser Core
 * Main parsing logic for Australian bank statements
 */

import type {
  BankName,
  ParsedStatement,
  ParsedTransaction,
  ParseResult,
  ParseStats,
  ParseWarning,
  TransactionType,
  BankParserConfig,
} from './bank-statement-types';
import { bankConfigs, detectBankFromText, monthMap } from './bank-parser-configs';

// Parse a date string in various formats
export function parseDate(dateStr: string, bankName: BankName): Date | null {
  const config = bankConfigs[bankName];
  const cleanDate = dateStr.trim();
  
  // Try DD/MM/YYYY format
  let match = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try DD/MM/YY format
  match = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }
  
  // Try DD MMM YYYY format (e.g., "12 Jan 2024")
  match = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const [, day, monthStr, year] = match;
    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(year), month, parseInt(day));
    }
  }
  
  // Try DD MMM format (assume current year, e.g., "12 Jan")
  match = cleanDate.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
  if (match) {
    const [, day, monthStr] = match;
    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined) {
      return new Date(new Date().getFullYear(), month, parseInt(day));
    }
  }
  
  // Try YYYY-MM-DD format
  match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Fallback to native Date parsing
  const nativeDate = new Date(cleanDate);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }
  
  return null;
}

// Parse amount string to number
export function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  
  // Clean the amount string
  let cleanAmount = amountStr
    .replace(/[$,\s]/g, '') // Remove $, commas, spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check for CR/DR suffixes
  const isCredit = /CR/i.test(cleanAmount);
  const isDebit = /DR/i.test(cleanAmount);
  
  cleanAmount = cleanAmount.replace(/\s*(CR|DR)/i, '');
  
  // Handle parentheses for negative numbers (e.g., "(123.45)")
  if (cleanAmount.startsWith('(') && cleanAmount.endsWith(')')) {
    cleanAmount = '-' + cleanAmount.slice(1, -1);
  }
  
  const value = parseFloat(cleanAmount);
  
  if (isNaN(value)) return null;
  
  // Apply CR/DR logic
  if (isCredit) return Math.abs(value);
  if (isDebit) return -Math.abs(value);
  
  return value;
}

// Detect transaction type from description
export function detectTransactionType(description: string): TransactionType {
  const lowerDesc = description.toLowerCase();
  
  // Fee detection
  if (/\b(fee|charges|service fee|account fee|transaction fee)\b/i.test(lowerDesc)) {
    return 'fee';
  }
  
  // Interest detection
  if (/\b(interest|int paid|int received|credit interest|debit interest)\b/i.test(lowerDesc)) {
    return 'interest';
  }
  
  // Transfer detection
  if (/\b(transfer|tfr|xfr|to|from|between accounts)\b/i.test(lowerDesc)) {
    return 'transfer';
  }
  
  // Direct debit detection
  if (/\b(direct debit|dd|autopay|automatic payment|recurring)\b/i.test(lowerDesc)) {
    return 'direct_debit';
  }
  
  // Direct credit detection
  if (/\b(direct credit|dc|salary|wages|payroll)\b/i.test(lowerDesc)) {
    return 'direct_credit';
  }
  
  // ATM detection
  if (/\b(atm|withdrawal|cash out)\b/i.test(lowerDesc)) {
    return 'atm';
  }
  
  // Card purchase detection - includes retail stores
  if (/\b(card|purchase|pos|paywave|paypass|tap|eftpos|store|shop|mart|supermarket|groceries)\b/i.test(lowerDesc)) {
    return 'card_purchase';
  }
  
  // Payment detection
  if (/\b(payment|pay|paid|bill|bpay)\b/i.test(lowerDesc)) {
    return 'payment';
  }
  
  // Deposit/withdrawal detection based on common terms
  if (/\b(deposit|credit|received|income)\b/i.test(lowerDesc)) {
    return 'deposit';
  }
  
  if (/\b(withdrawal|debit|deducted|outgoing)\b/i.test(lowerDesc)) {
    return 'withdrawal';
  }
  
  return 'unknown';
}

// Clean transaction description
export function cleanDescription(description: string): string {
  return description
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b([A-Z]{2,})\b/g, (match) => { // Keep all-caps words as-is (likely proper nouns)
      return match;
    })
    .replace(/\s*\d{4}\s+/g, ' ') // Remove 4-digit codes (card endings)
    .replace(/\*+/g, '*') // Normalize asterisks
    .trim();
}

// Extract account number from text
export function extractAccountNumber(text: string, bankName: BankName): string | undefined {
  const patterns: Record<BankName, RegExp[]> = {
    commbank: [
      /Account number:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
      /Account:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
      /Card number:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
    ],
    nab: [
      /Account number:\s*(\d{6,})/i,
      /Account:\s*(\d{6,})/i,
    ],
    westpac: [
      /Account number:\s*(\d{3}[\s-]?\d{6})/i,
      /Account:\s*(\d{3}[\s-]?\d{6})/i,
    ],
    anz: [
      /Account number:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
      /Account:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
    ],
    ing: [
      /Account number:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
      /Account:\s*(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/i,
    ],
  };
  
  const regexes = patterns[bankName];
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) {
      return match[1].replace(/\s/g, '');
    }
  }
  
  return undefined;
}

// Extract statement period from text
export function extractStatementPeriod(
  text: string,
  bankName: BankName
): { start: string; end: string } | null {
  const patterns: Record<BankName, RegExp[]> = {
    commbank: [
      /Statement period:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /Period:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ],
    nab: [
      /Statement period:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /Period:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ],
    westpac: [
      /Statement period:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /Period:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ],
    anz: [
      /Statement period:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /Period:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ],
    ing: [
      /Statement period:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /Period:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ],
  };
  
  const regexes = patterns[bankName];
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) {
      const startDate = parseDate(match[1], bankName);
      const endDate = parseDate(match[2], bankName);
      
      if (startDate && endDate) {
        // Use timezone-safe formatting
        const formatDateStr = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return {
          start: formatDateStr(startDate),
          end: formatDateStr(endDate),
        };
      }
    }
  }
  
  return null;
}

// Extract opening/closing balance from text
export function extractBalances(text: string): { opening?: number; closing?: number } {
  const result: { opening?: number; closing?: number } = {};
  
  // Opening balance patterns
  const openingMatch = text.match(/Opening balance[:\s]+(-?[\d,]+\.\d{2})/i) ||
                       text.match(/Brought forward[:\s]+(-?[\d,]+\.\d{2})/i);
  if (openingMatch) {
    result.opening = parseAmount(openingMatch[1]) || undefined;
  }
  
  // Closing balance patterns
  const closingMatch = text.match(/Closing balance[:\s]+(-?[\d,]+\.\d{2})/i) ||
                       text.match(/Carried forward[:\s]+(-?[\d,]+\.\d{2})/i);
  if (closingMatch) {
    result.closing = parseAmount(closingMatch[1]) || undefined;
  }
  
  return result;
}

// Check if a line should be skipped
function shouldSkipLine(line: string, config: BankParserConfig): boolean {
  const trimmedLine = line.trim();
  
  if (!trimmedLine) return true;
  
  for (const skipPattern of config.skipLines) {
    if (trimmedLine.toLowerCase().includes(skipPattern.toLowerCase())) {
      return true;
    }
  }
  
  // Skip lines that look like headers or footers
  for (const pattern of config.headerPatterns) {
    if (pattern.test(trimmedLine)) return true;
  }
  
  for (const pattern of config.footerPatterns) {
    if (pattern.test(trimmedLine)) return true;
  }
  
  return false;
}

// Parse a single transaction line
function parseTransactionLine(
  line: string,
  config: BankParserConfig,
  warnings: ParseWarning[]
): ParsedTransaction | null {
  // Try to extract date
  const dateMatch = line.match(config.dateRegex);
  if (!dateMatch) {
    return null;
  }
  
  // Extract date string
  let dateStr = dateMatch[0];
  const date = parseDate(dateStr, config.name);
  
  if (!date) {
    warnings.push({
      code: 'DATE_PARSE_ERROR',
      message: `Could not parse date: ${dateStr}`,
      context: line,
    });
    return null;
  }
  
  // Remove date from line to get description and amounts
  let remainingLine = line.replace(dateMatch[0], '').trim();
  
  // Extract amount(s)
  const amountMatches = remainingLine.match(new RegExp(config.amountRegex.source, 'g'));
  let amount: number | null = null;
  let balance: number | undefined;
  
  if (amountMatches && amountMatches.length > 0) {
    // Last match is usually the balance
    balance = parseAmount(amountMatches[amountMatches.length - 1]) || undefined;
    
    // First or second match is usually the transaction amount
    if (amountMatches.length >= 2) {
      // Check if we have separate debit/credit columns
      const amounts = amountMatches.slice(0, -1).map(parseAmount).filter((a): a is number => a !== null);
      if (amounts.length > 0) {
        // Use the non-zero amount
        amount = amounts.find(a => a !== 0) || amounts[0];
      }
    } else {
      amount = parseAmount(amountMatches[0]);
    }
  }
  
  // Remove amounts from line to get description
  if (amountMatches) {
    for (const match of amountMatches) {
      remainingLine = remainingLine.replace(match, '');
    }
  }
  
  // Clean up description
  let description = cleanDescription(remainingLine);
  const rawDescription = description;
  
  // Detect transaction type
  const transactionType = detectTransactionType(description);
  
  // If no amount found, this might not be a valid transaction
  if (amount === null) {
    warnings.push({
      code: 'AMOUNT_PARSE_ERROR',
      message: 'Could not parse transaction amount',
      context: line,
    });
    return null;
  }
  
  return {
    date: date.toISOString().split('T')[0],
    description,
    rawDescription,
    amount,
    balance,
    transactionType,
  };
}

// Main parse function
export function parseBankStatement(
  text: string,
  filename: string,
  bankName?: BankName
): ParseResult {
  const startTime = Date.now();
  const warnings: ParseWarning[] = [];
  const stats: ParseStats = {
    linesProcessed: 0,
    transactionsFound: 0,
    transactionsParsed: 0,
    transactionsSkipped: 0,
    dateParseErrors: 0,
    amountParseErrors: 0,
    processingTimeMs: 0,
  };
  
  // Detect bank if not provided
  const detectedBank = bankName || detectBankFromText(text);
  
  if (!detectedBank) {
    return {
      success: false,
      error: {
        code: 'BANK_DETECTION_FAILED',
        message: 'Could not detect bank from statement. Please specify the bank.',
      },
      warnings,
      stats: { ...stats, processingTimeMs: Date.now() - startTime },
    };
  }
  
  const config = bankConfigs[detectedBank];
  
  // Split text into lines
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];
  
  // Extract metadata
  const accountNumber = extractAccountNumber(text, detectedBank);
  const period = extractStatementPeriod(text, detectedBank);
  const balances = extractBalances(text);
  
  // Parse transaction lines
  for (const line of lines) {
    stats.linesProcessed++;
    
    if (shouldSkipLine(line, config)) {
      continue;
    }
    
    const transaction = parseTransactionLine(line, config, warnings);
    
    if (transaction) {
      stats.transactionsFound++;
      
      // Check for duplicates
      const isDuplicate = transactions.some(
        t => t.date === transaction.date &&
             t.description === transaction.description &&
             Math.abs(t.amount - transaction.amount) < 0.01
      );
      
      transaction.isDuplicate = isDuplicate;
      transactions.push(transaction);
      stats.transactionsParsed++;
    } else if (line.trim()) {
      stats.transactionsSkipped++;
    }
  }
  
  // Sort transactions by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Infer period if not found
  let statementPeriodStart = period?.start;
  let statementPeriodEnd = period?.end;
  
  if (!statementPeriodStart && transactions.length > 0) {
    statementPeriodStart = transactions[0].date;
  }
  if (!statementPeriodEnd && transactions.length > 0) {
    statementPeriodEnd = transactions[transactions.length - 1].date;
  }
  
  // Default to current month if still not found
  const now = new Date();
  if (!statementPeriodStart) {
    statementPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }
  if (!statementPeriodEnd) {
    statementPeriodEnd = now.toISOString().split('T')[0];
  }
  
  stats.processingTimeMs = Date.now() - startTime;
  
  return {
    success: true,
    statement: {
      bankName: detectedBank,
      accountNumber,
      statementPeriodStart,
      statementPeriodEnd,
      openingBalance: balances.opening,
      closingBalance: balances.closing,
      transactions,
      currency: config.currency,
      pageCount: 1, // Will be updated by PDF parser
      filename,
      parsedAt: new Date().toISOString(),
    },
    warnings,
    stats,
  };
}

// Validate parsed statement
export function validateStatement(statement: ParsedStatement): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!statement.bankName) {
    errors.push('Bank name is required');
  }
  
  if (!statement.statementPeriodStart) {
    errors.push('Statement period start date is required');
  }
  
  if (!statement.statementPeriodEnd) {
    errors.push('Statement period end date is required');
  }
  
  if (statement.transactions.length === 0) {
    errors.push('No transactions found in statement');
  }
  
  // Validate transaction dates are within period
  for (const tx of statement.transactions) {
    const txDate = new Date(tx.date);
    const periodStart = new Date(statement.statementPeriodStart);
    const periodEnd = new Date(statement.statementPeriodEnd);
    
    if (txDate < periodStart || txDate > periodEnd) {
      errors.push(`Transaction date ${tx.date} is outside statement period`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Calculate statement statistics
export function calculateStatementStats(statement: ParsedStatement) {
  const transactions = statement.transactions;
  
  const totalDebits = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalCredits = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const transactionTypes = transactions.reduce((acc, t) => {
    acc[t.transactionType] = (acc[t.transactionType] || 0) + 1;
    return acc;
  }, {} as Record<TransactionType, number>);
  
  const duplicates = transactions.filter(t => t.isDuplicate).length;
  
  return {
    transactionCount: transactions.length,
    totalDebits,
    totalCredits,
    netChange: totalCredits - totalDebits,
    transactionTypes,
    duplicates,
    averageTransactionAmount: transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length 
      : 0,
  };
}
