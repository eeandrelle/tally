/**
 * Smart Number Extraction System (TAL-102)
 * 
 * Extract structured numerical data from documents:
 * - Amounts/currency values
 * - Dates (various formats)
 * - ABNs (Australian Business Numbers with validation)
 * - Account numbers
 * - Invoice numbers
 * - Tax/GST amounts
 * 
 * Features:
 * - Multi-pattern extraction with confidence scoring
 * - ABN checksum validation
 * - Date normalization to ISO format
 * - Currency symbol recognition
 * - Context-aware extraction
 */

export interface ExtractedNumber {
  value: string;
  type: NumberType;
  confidence: number;
  position: Position;
  context: string;
  normalized?: string | number;
}

export type NumberType =
  | "amount"
  | "date"
  | "abn"
  | "acn"
  | "account_number"
  | "invoice_number"
  | "gst"
  | "tax"
  | "percentage"
  | "quantity"
  | "unknown";

export interface Position {
  start: number;
  end: number;
  line?: number;
}

export interface ExtractionResult {
  numbers: ExtractedNumber[];
  summary: ExtractionSummary;
}

export interface ExtractionSummary {
  totalFound: number;
  byType: Record<NumberType, number>;
  totalAmount?: number;
  dateRange?: { earliest: string; latest: string };
  primaryAbn?: string;
  confidence: number;
}

export interface ExtractionOptions {
  minConfidence?: number;
  extractContext?: boolean;
  contextWindow?: number;
  validateAbn?: boolean;
  normalizeDates?: boolean;
  currency?: "AUD" | "USD" | "EUR" | "GBP" | "auto";
}

// Default options
const DEFAULT_OPTIONS: Required<ExtractionOptions> = {
  minConfidence: 0.5,
  extractContext: true,
  contextWindow: 50,
  validateAbn: true,
  normalizeDates: true,
  currency: "auto",
};

// Regex patterns for different number types
const PATTERNS = {
  // Amounts with currency symbols or codes
  amount: [
    // AUD formats: $1,234.56, $1234.56, AUD 1,234.56, A$1,234.56
    /\$\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2}|\d+\.\d{2})/gi,
    /AUD\s+(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    /A\$\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    // USD formats: USD 1,234.56, US$1,234.56
    /USD\s+(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    /US\$\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    // EUR formats: €1,234.56, EUR 1,234.56
    /€\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    /EUR\s+(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    // GBP formats: £1,234.56, GBP 1,234.56
    /£\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    /GBP\s+(\d{1,3}(?:,\d{3})*\.?\d{0,2})/gi,
    // Generic amount with decimal
    /\b(total|amount|subtotal|balance|due|payment)\s*[:\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})\b/gi,
    // Amounts in text like "one hundred and fifty dollars"
    /\b(\d+)\s*dollars?\b/gi,
  ],

  // Date patterns
  date: [
    // DD/MM/YYYY or DD-MM-YYYY (Australian format)
    /\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](\d{4}|\d{2})\b/g,
    // YYYY-MM-DD (ISO format)
    /\b(\d{4})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])\b/g,
    // DD MMM YYYY or DD MMMM YYYY
    /\b(0?[1-9]|[12]\d|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4}|\d{2})\b/gi,
    // MMM DD, YYYY (US format)
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(0?[1-9]|[12]\d|3[01]),?\s+(\d{4}|\d{2})\b/gi,
    // Relative dates
    /\b(today|tomorrow|yesterday)\b/gi,
  ],

  // ABN pattern (11 digits, typically formatted as XX XXX XXX XXX)
  abn: [
    /\b(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})\b/g,  // Formatted with spaces
    /\b(\d{11})\b/g,  // Raw 11 digits
    /\bABN[:\s]*(\d[\d\s]{10,})\b/gi,  // With ABN prefix
  ],

  // ACN pattern (9 digits)
  acn: [
    /\b(\d{3}\s*\d{3}\s*\d{3})\b/g,
    /\b(\d{9})\b/g,
    /\bACN[:\s]*(\d[\d\s]{8,})\b/gi,
  ],

  // Account numbers (various formats)
  account_number: [
    /\b(?:account|acct|a\/c)[:\s#]*(\d[\d\s\-]{5,})\b/gi,
    /\b(?:account\s*number|acct\s*no)[:\s#]*(\d[\d\s\-]{5,})\b/gi,
  ],

  // Invoice numbers
  invoice_number: [
    /\b(?:invoice|inv)[:\s#]*(\w[\w\-\d]{2,})\b/gi,
    /\b(?:invoice\s*number|inv\s*no)[:\s#]*(\w[\w\-\d]{2,})\b/gi,
    /\b(?:tax\s*invoice)[:\s#]*(\w[\w\-\d]{2,})\b/gi,
  ],

  // GST amounts
  gst: [
    /\bGST[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})\b/gi,
    /\b(?:goods?\s*and\s*services?\s*tax)[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})\b/gi,
    /\binc\.?\s*GST\b/gi,
    /\bexcl\.?\s*GST\b/gi,
    /\bGST\s*(?:inclusive|exclusive)\b/gi,
  ],

  // Tax amounts
  tax: [
    /\btax[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})\b/gi,
    /\btotal\s*tax[:\s]*\$?\s*(\d{1,3}(?:,\d{3})*\.?\d{0,2})\b/gi,
  ],

  // Percentages
  percentage: [
    /\b(\d{1,3}(?:\.\d{1,2})?)\s*%\b/g,
    /\b(\d{1,3}(?:\.\d{1,2})?)\s*percent\b/gi,
  ],

  // Quantities
  quantity: [
    /\b(?:qty|quantity)[:\s]*(\d+)\b/gi,
    /\b(\d+)\s*(?:items?|pcs?|units?)\b/gi,
  ],
};

// Keywords that boost confidence for amount extraction
const AMOUNT_KEYWORDS = [
  "total", "amount", "subtotal", "balance", "due", "payment",
  "price", "cost", "charge", "fee", "gst", "tax", "discount"
];

// Keywords that boost confidence for date extraction
const DATE_KEYWORDS = [
  "date", "issued", "due", "payment date", "transaction date",
  "invoice date", "receipt date", "statement date", "period"
];

/**
 * Validates an ABN using the official ATO checksum algorithm
 * @param abn - The ABN to validate (with or without spaces)
 * @returns boolean indicating if the ABN is valid
 */
export function validateAbn(abn: string): boolean {
  // Remove all whitespace
  const cleaned = abn.replace(/\s/g, "");
  
  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    return false;
  }

  // ATO validation weights
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  
  // Subtract 1 from the first digit
  const digits = cleaned.split("").map(Number);
  digits[0] -= 1;
  
  // Calculate weighted sum
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * weights[i];
  }
  
  // Valid if divisible by 89
  return sum % 89 === 0;
}

/**
 * Formats an ABN in the standard format (XX XXX XXX XXX)
 */
export function formatAbn(abn: string): string {
  const cleaned = abn.replace(/\D/g, "");
  if (cleaned.length !== 11) return abn;
  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 11)}`;
}

/**
 * Validates an ACN using the official ASIC checksum algorithm
 * @param acn - The ACN to validate
 * @returns boolean indicating if the ACN is valid
 */
export function validateAcn(acn: string): boolean {
  const cleaned = acn.replace(/\s/g, "");
  
  if (!/^\d{9}$/.test(cleaned)) {
    return false;
  }

  const weights = [8, 7, 6, 5, 4, 3, 2];
  const digits = cleaned.split("").map(Number);
  const checkDigit = digits[8];
  
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += digits[i] * weights[i];
  }
  
  const remainder = sum % 10;
  const calculatedCheck = (10 - remainder) % 10;
  
  return checkDigit === calculatedCheck;
}

/**
 * Formats an ACN in the standard format (XXX XXX XXX)
 */
export function formatAcn(acn: string): string {
  const cleaned = acn.replace(/\D/g, "");
  if (cleaned.length !== 9) return acn;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
}

/**
 * Parses a date string and normalizes to ISO format (YYYY-MM-DD)
 */
export function normalizeDate(dateStr: string): string | null {
  const cleaned = dateStr.trim().toLowerCase();
  
  // Handle relative dates
  const today = new Date();
  if (cleaned === "today") {
    return today.toISOString().split("T")[0];
  }
  if (cleaned === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
  if (cleaned === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }
  
  // Try parsing various formats
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  
  // DD/MM/YYYY or DD-MM-YYYY
  let match = cleaned.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }
  
  // YYYY-MM-DD
  match = cleaned.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }
  
  // DD MMM YYYY
  match = cleaned.match(/(\d{1,2})\s+([a-z]{3,})\.?\s+(\d{4}|\d{2})/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthIndex = monthNames.findIndex(m => match![2].toLowerCase().startsWith(m));
    if (monthIndex !== -1) {
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      return `${year}-${(monthIndex + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  
  // MMM DD, YYYY
  match = cleaned.match(/([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4}|\d{2})/i);
  if (match) {
    const monthIndex = monthNames.findIndex(m => match![1].toLowerCase().startsWith(m));
    if (monthIndex !== -1) {
      const day = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      return `${year}-${(monthIndex + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  
  return null;
}

/**
 * Parses an amount string and returns a normalized number
 */
export function normalizeAmount(amountStr: string): number | null {
  // Remove currency symbols and normalize
  const cleaned = amountStr
    .replace(/[$€£]/g, "")
    .replace(/AUD|USD|EUR|GBP/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")  // Normalize multiple spaces
    .trim();
  
  // Extract just the number part (handle cases like "A$ 1234.56" where A$ is removed but space remains)
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  return isNaN(value) ? null : value;
}

/**
 * Extracts context around a match
 */
function extractContext(text: string, start: number, end: number, window: number): string {
  const contextStart = Math.max(0, start - window);
  const contextEnd = Math.min(text.length, end + window);
  return text.slice(contextStart, contextEnd).replace(/\s+/g, " ").trim();
}

/**
 * Calculates confidence score based on context keywords
 */
function calculateContextConfidence(context: string, keywords: string[]): number {
  const lowerContext = context.toLowerCase();
  let matches = 0;
  for (const keyword of keywords) {
    if (lowerContext.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  return Math.min(0.95, 0.5 + matches * 0.15);
}

/**
 * Main extraction function
 */
export async function extractNumbers(
  text: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const numbers: ExtractedNumber[] = [];
  
  // Track positions to avoid duplicates
  const seenPositions = new Set<string>();
  
  // Extract amounts
  for (const pattern of PATTERNS.amount) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1] || match[2];
      if (!value) continue;
      
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const normalized = normalizeAmount(value);
      const confidence = calculateContextConfidence(context, AMOUNT_KEYWORDS);
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "amount",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized,
        });
      }
    }
  }
  
  // Extract dates
  for (const pattern of PATTERNS.date) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      const positionKey = `${match.index}-${match.index + value.length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + value.length, opts.contextWindow)
        : "";
      
      const normalized = opts.normalizeDates ? normalizeDate(value) : undefined;
      const confidence = calculateContextConfidence(context, DATE_KEYWORDS);
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value,
          type: "date",
          confidence,
          position: { start: match.index, end: match.index + value.length },
          context,
          normalized,
        });
      }
    }
  }
  
  // Extract ABNs
  for (const pattern of PATTERNS.abn) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].replace(/\s/g, "");
      if (value.length !== 11) continue;
      
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const isValid = opts.validateAbn ? validateAbn(value) : true;
      const confidence = isValid ? 0.95 : 0.6;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "abn",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized: formatAbn(value),
        });
      }
    }
  }
  
  // Extract ACNs
  for (const pattern of PATTERNS.acn) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].replace(/\s/g, "");
      if (value.length !== 9) continue;
      
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const isValid = validateAcn(value);
      const confidence = isValid ? 0.9 : 0.5;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "acn",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized: formatAcn(value),
        });
      }
    }
  }
  
  // Extract account numbers
  for (const pattern of PATTERNS.account_number) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].trim();
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const confidence = 0.75;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "account_number",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized: value.replace(/\s/g, ""),
        });
      }
    }
  }
  
  // Extract invoice numbers
  for (const pattern of PATTERNS.invoice_number) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1].trim();
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const confidence = 0.8;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "invoice_number",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized: value,
        });
      }
    }
  }
  
  // Extract GST amounts
  for (const pattern of PATTERNS.gst) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const value = match[1];
      const normalized = value ? normalizeAmount(value) : undefined;
      const confidence = 0.85;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "gst",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized,
        });
      }
    }
  }
  
  // Extract tax amounts
  for (const pattern of PATTERNS.tax) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1];
      if (!value) continue;
      
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const normalized = normalizeAmount(value);
      const confidence = 0.8;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "tax",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized,
        });
      }
    }
  }
  
  // Extract percentages
  for (const pattern of PATTERNS.percentage) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1];
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const confidence = 0.7;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "percentage",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized: parseFloat(value),
        });
      }
    }
  }
  
  // Extract quantities
  for (const pattern of PATTERNS.quantity) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1];
      const positionKey = `${match.index}-${match.index + match[0].length}`;
      if (seenPositions.has(positionKey)) continue;
      seenPositions.add(positionKey);
      
      const context = opts.extractContext 
        ? extractContext(text, match.index, match.index + match[0].length, opts.contextWindow)
        : "";
      
      const confidence = 0.7;
      
      if (confidence >= opts.minConfidence) {
        numbers.push({
          value: match[0],
          type: "quantity",
          confidence,
          position: { start: match.index, end: match.index + match[0].length },
          context,
          normalized: parseInt(value, 10),
        });
      }
    }
  }
  
  // Generate summary
  const summary = generateSummary(numbers);
  
  return {
    numbers,
    summary,
  };
}

/**
 * Generates a summary of extracted numbers
 */
function generateSummary(numbers: ExtractedNumber[]): ExtractionSummary {
  const byType: Record<NumberType, number> = {
    amount: 0,
    date: 0,
    abn: 0,
    acn: 0,
    account_number: 0,
    invoice_number: 0,
    gst: 0,
    tax: 0,
    percentage: 0,
    quantity: 0,
    unknown: 0,
  };
  
  let totalAmount = 0;
  const dates: string[] = [];
  let primaryAbn: string | undefined;
  let totalConfidence = 0;
  
  for (const num of numbers) {
    byType[num.type]++;
    totalConfidence += num.confidence;
    
    if (num.type === "amount" && typeof num.normalized === "number") {
      totalAmount += num.normalized;
    }
    
    if (num.type === "date" && typeof num.normalized === "string") {
      dates.push(num.normalized);
    }
    
    if (num.type === "abn" && num.confidence > 0.9 && !primaryAbn) {
      primaryAbn = num.normalized as string;
    }
  }
  
  // Sort dates and find range
  dates.sort();
  const dateRange = dates.length >= 2 
    ? { earliest: dates[0], latest: dates[dates.length - 1] }
    : undefined;
  
  const avgConfidence = numbers.length > 0 ? totalConfidence / numbers.length : 0;
  
  return {
    totalFound: numbers.length,
    byType,
    totalAmount: totalAmount > 0 ? totalAmount : undefined,
    dateRange,
    primaryAbn,
    confidence: avgConfidence,
  };
}

/**
 * Batch extraction from multiple documents
 */
export async function extractNumbersBatch(
  documents: { id: string; text: string }[],
  options: ExtractionOptions = {}
): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>();
  
  for (const doc of documents) {
    const result = await extractNumbers(doc.text, options);
    results.set(doc.id, result);
  }
  
  return results;
}

/**
 * Extract numbers from structured document data
 */
export async function extractFromDocument(
  documentText: string,
  documentType?: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  // Adjust options based on document type
  const typeSpecificOptions: ExtractionOptions = { ...options };
  
  switch (documentType) {
    case "receipt":
      typeSpecificOptions.minConfidence = 0.6;
      break;
    case "bank_statement":
      typeSpecificOptions.minConfidence = 0.7;
      break;
    case "invoice":
      typeSpecificOptions.minConfidence = 0.65;
      break;
    default:
      break;
  }
  
  return extractNumbers(documentText, typeSpecificOptions);
}

export default {
  extractNumbers,
  extractNumbersBatch,
  extractFromDocument,
  validateAbn,
  validateAcn,
  formatAbn,
  formatAcn,
  normalizeDate,
  normalizeAmount,
};
