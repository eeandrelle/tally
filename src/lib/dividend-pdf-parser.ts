/**
 * Dividend Statement PDF Parser
 * 
 * Parses PDF dividend statements from major Australian share registries:
 * - Computershare
 * - Link Market Services
 * - BoardRoom
 * - Direct company statements
 * 
 * Extracts: dividend amounts, dates, franking credits, company info, share count
 * 
 * @module dividend-pdf-parser
 */

// ============================================================================
// TYPES
// ============================================================================

export type RegistryProvider = 'computershare' | 'link' | 'boardroom' | 'direct' | 'unknown';

export interface ParsedDividend {
  // Company Information
  companyName: string;
  companyAbn?: string;
  companyAcn?: string;
  asxCode?: string;
  
  // Dividend Details
  dividendAmount: number;
  frankedAmount: number;
  unfrankedAmount: number;
  frankingCredits: number;
  frankingPercentage: number;
  
  // Share Details
  sharesHeld: number;
  dividendPerShare: number;
  
  // Dates
  paymentDate: string; // ISO date
  recordDate: string; // ISO date
  statementDate?: string; // ISO date
  
  // Tax Year
  financialYear: string; // e.g., "2024-2025"
  
  // Metadata
  provider: RegistryProvider;
  confidence: number; // 0-1
  rawText: string;
  extractionErrors: string[];
}

export interface ParseResult {
  success: boolean;
  dividend?: ParsedDividend;
  errors: string[];
  warnings: string[];
  provider: RegistryProvider;
  processingTimeMs: number;
}

export interface BatchParseResult {
  total: number;
  successful: number;
  failed: number;
  results: ParseResult[];
  dividends: ParsedDividend[];
  totalDividendAmount: number;
  totalFrankingCredits: number;
}

// ============================================================================
// REGISTRY DETECTION PATTERNS
// ============================================================================

const REGISTRY_PATTERNS: Record<RegistryProvider, RegExp[]> = {
  computershare: [
    /computershare/i,
    /computer share/i,
    /shareholder services/i,
    /investor centre/i,
    /dividend advice/i,
  ],
  link: [
    /link market services/i,
    /link administration/i,
    /link group/i,
    /linkmarketservices/i,
  ],
  boardroom: [
    /boardroom/i,
    /board room/i,
    /boardroom limited/i,
    /shareholder services.*boardroom/i,
  ],
  direct: [
    /dividend statement/i,
    /dividend payment/i,
    /distribution statement/i,
  ],
  unknown: [],
};

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

const PATTERNS = {
  // Company identification
  companyName: [
    /(?:company|issuer|security)\s*[:\-]?\s*([A-Z][A-Za-z0-9\s&\.]+?(?:\s+(?:Limited|Ltd|Corp|Inc|PLC|Group|NSW|VIC|QLD|WA|SA|TAS|ACT|NT))?)(?=\s*(?:ABN|ACN|ASX|Shareholder|Security|Holding|$|\n))/i,
    /([A-Z][A-Za-z0-9\s&\.]+(?:Limited|Ltd|Corp|Inc|PLC))(?:\s+(?:ABN|ACN))/i,
    /(?:holding|holdings)\s+in\s+([A-Z][A-Za-z0-9\s&\.]+)/i,
  ],
  
  asxCode: [
    /ASX\s*(?::|Code)?\s*[:\-]?\s*([A-Z]{3,5})(?!\s*(?:Code|Ltd|Limited|Co|Company|\d))/i,
    /Security\s+Code\s*[:\-]?\s*([A-Z]{3,5})/i,
    /(?:^|\n)\s*(?:ASX|Code)\s*[:\-]?\s*([A-Z]{3,5})\s*(?:\n|$)/im,
  ],
  
  abn: [
    /(?:Company|Issuer)\s+ABN\s*[:\-]?\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})/i,
    /ABN\s*[:\-]?\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})/i,
    /ABN[:\s]+(\d{11})(?=\s*(?:$|\n|\r|\s{2,}))/i,
  ],
  
  acn: [
    /Australian Company Number\s*[:\-]?\s*(\d{3}\s*\d{3}\s*\d{3})/i,
    /Australian Company Number\s*[:\-]?\s*(\d{9})/i,
    /ACN\s*[:\-]?\s*(\d{3}\s*\d{3}\s*\d{3})/i,
    /ACN[:\s]+(\d{9})/i,
  ],
  
  // Dividend amounts
  grossDividend: [
    /(?:gross|total)\s+dividend\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /dividend\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /dividend\s+(?:paid|amount)\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /amount\s+payable\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /total\s+payment\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
  ],
  
  frankedAmount: [
    /(?<!un)franked\s+(?:amount|dividend)\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /fully\s+franked\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /(?<!un)franked\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
  ],
  
  unfrankedAmount: [
    /unfranked\s+(?:amount|dividend)\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /unfranked\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
  ],
  
  frankingCredits: [
    /franking\s+(?:credit|offset)s?\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /(?:imputation|franking)\s+credits?\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
    /credit\s+entitlement\s*[:]?\s*\$?\s*([\d,]+\.\d{2})/i,
  ],
  
  frankingPercentage: [
    /franked\s+at\s+(\d+)%/i,
    /franking\s+percentage\s*[:\-]?\s*(\d+)%?/i,
    /(\d+)%\s+franked/i,
  ],
  
  // Share details
  sharesHeld: [
    /(?:shares|units)\s+held\s*[:\-]?\s*([\d,]+)/i,
    /holding\s*[:\-]?\s*([\d,]+)\s+(?:shares|units)/i,
    /number\s+of\s+(?:shares|units)\s*[:\-]?\s*([\d,]+)/i,
    /(?:shares|units)\s*[:\-]?\s*([\d,]+)/i,
  ],
  
  dividendPerShare: [
    /dividend\s+per\s+(?:share|unit)\s*[:]?\s*\$?\s*([\d\.]+)/i,
    /DPS\s*[:]?\s*\$?\s*([\d\.]+)/i,
    /(\d+\.?\d*)\s*cents?\s+per\s+(?:share|unit)/i,
    /dividend\s+per\s+(?:share|unit)\s*[:]?\s*(\d+)\s*cents/i,
  ],
  
  // Dates - numeric and text formats
  paymentDate: [
    /(?:payment|pay|distribution)\s+date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:payment|pay|distribution)\s+date\s*[:\-]?\s*([a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /paid\s+on\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /date\s+paid\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ],
  
  recordDate: [
    /record\s+date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /entitlement\s+date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ],
  
  statementDate: [
    /statement\s+date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /date\s+of\s+statement\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect the registry provider from PDF text
 */
function detectProvider(text: string): RegistryProvider {
  const scores: Record<RegistryProvider, number> = {
    computershare: 0,
    link: 0,
    boardroom: 0,
    direct: 0,
    unknown: 0,
  };
  
  for (const [provider, patterns] of Object.entries(REGISTRY_PATTERNS) as [RegistryProvider, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[provider]++;
      }
    }
  }
  
  // Find highest score
  let bestProvider: RegistryProvider = 'unknown';
  let bestScore = 0;
  
  for (const [provider, score] of Object.entries(scores) as [RegistryProvider, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestProvider = provider;
    }
  }
  
  return bestProvider;
}

/**
 * Extract text using multiple patterns
 */
function extractWithPatterns(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Parse Australian date format to ISO string (YYYY-MM-DD)
 * Uses UTC to avoid timezone issues
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Clean the date string
  const clean = dateStr.replace(/[,\s]+/g, ' ').trim();
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  let match = clean.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (match) {
    let [, day, month, year] = match;
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum >= 50 ? `19${year}` : `20${year}`;
    }
    // Use UTC to avoid timezone issues
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try Month DD, YYYY
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  match = clean.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    const monthIdx = monthNames.findIndex(m => match![1].toLowerCase().startsWith(m));
    if (monthIdx !== -1) {
      // Use UTC to avoid timezone issues
      const date = new Date(Date.UTC(parseInt(match[3]), monthIdx, parseInt(match[2])));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  
  // Remove currency symbols, spaces, and commas
  const clean = amountStr.replace(/[$,\s]/g, '');
  const num = parseFloat(clean);
  
  return isNaN(num) ? null : num;
}

/**
 * Calculate financial year from date
 */
function calculateFinancialYear(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  
  // Australian financial year: July 1 - June 30
  if (month >= 6) { // July or later
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Validate ABN checksum
 */
function validateAbn(abn: string): boolean {
  const clean = abn.replace(/\s/g, '');
  if (!/^\d{11}$/.test(clean)) return false;
  
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(clean[i]) - (i === 0 ? 1 : 0);
    sum += digit * weights[i];
  }
  
  return sum % 89 === 0;
}

/**
 * Calculate franking credits from franked amount
 * Formula: Franking Credits = Franked Amount × (30/70)
 */
function calculateFrankingCredits(frankedAmount: number): number {
  return Math.round(frankedAmount * (30 / 70) * 100) / 100;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse dividend statement from extracted PDF text
 */
export function parseDividendStatement(text: string): ParseResult {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Detect provider
  const provider = detectProvider(text);
  
  // Extract company info
  let companyName = extractWithPatterns(text, PATTERNS.companyName) || 'Unknown Company';
  // Clean up company name
  companyName = companyName.replace(/\s+/g, ' ').trim();
  
  const asxCode = extractWithPatterns(text, PATTERNS.asxCode);
  
  // Try to find company ABN (not Computershare/Link's ABN)
  // Look for ABN that appears near company name or after "Company:" or "Issuer:"
  let abn: string | null = null;
  
  // First try: Look for "Company ABN" or "Issuer ABN" pattern
  const companyAbnMatch = text.match(/(?:Company|Issuer)\s+ABN\s*[:\-]?\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})/i);
  if (companyAbnMatch) {
    abn = companyAbnMatch[1].replace(/\s/g, '');
  } else {
    // Second try: Find ABNs and exclude known registry ABNs
    const allAbns = Array.from(text.matchAll(/ABN\s*[:\-]?\s*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})/gi));
    const knownRegistryAbns = ['48078279277', '14003209836', '49004028077'];
    for (const match of allAbns) {
      const candidate = match[1].replace(/\s/g, '');
      if (!knownRegistryAbns.includes(candidate)) {
        abn = candidate;
        break;
      }
    }
    // Fallback to first ABN if none found
    if (!abn && allAbns.length > 0) {
      abn = allAbns[allAbns.length - 1][1].replace(/\s/g, '');
    }
  }
  
  if (abn && !validateAbn(abn)) {
    warnings.push(`ABN ${abn} failed validation check`);
  }
  
  const acn = extractWithPatterns(text, PATTERNS.acn)?.replace(/\s/g, '');
  
  // Extract dividend amounts
  let grossDividend: number | null = null;
  const grossStr = extractWithPatterns(text, PATTERNS.grossDividend);
  if (grossStr) {
    grossDividend = parseAmount(grossStr);
  }
  
  let frankedAmount: number | null = null;
  const frankedStr = extractWithPatterns(text, PATTERNS.frankedAmount);
  if (frankedStr) {
    frankedAmount = parseAmount(frankedStr);
  }
  
  let unfrankedAmount: number | null = null;
  const unfrankedStr = extractWithPatterns(text, PATTERNS.unfrankedAmount);
  if (unfrankedStr) {
    unfrankedAmount = parseAmount(unfrankedStr);
  }
  
  // Extract or calculate franking credits
  let frankingCredits: number | null = null;
  const creditsStr = extractWithPatterns(text, PATTERNS.frankingCredits);
  if (creditsStr) {
    frankingCredits = parseAmount(creditsStr);
  } else if (frankedAmount && frankedAmount > 0) {
    // Calculate from franked amount
    frankingCredits = calculateFrankingCredits(frankedAmount);
    warnings.push('Franking credits calculated from franked amount');
  }
  
  // Extract franking percentage
  let frankingPercentage = 100; // Default to fully franked
  const percentageStr = extractWithPatterns(text, PATTERNS.frankingPercentage);
  if (percentageStr) {
    frankingPercentage = parseInt(percentageStr);
  }
  
  // Detect unfranked dividends (explicit "unfranked" with no franked amount)
  // Only override if we have explicit unfranked amount and no franked amount
  if (frankedAmount === 0 && unfrankedAmount && unfrankedAmount > 0) {
    frankingPercentage = 0;
    frankingCredits = 0;
  }
  
  // Extract share details
  let sharesHeld: number | null = null;
  const sharesStr = extractWithPatterns(text, PATTERNS.sharesHeld);
  if (sharesStr) {
    sharesHeld = parseInt(sharesStr.replace(/,/g, ''));
  }
  
  let dividendPerShare: number | null = null;
  const dpsStr = extractWithPatterns(text, PATTERNS.dividendPerShare);
  if (dpsStr) {
    dividendPerShare = parseFloat(dpsStr);
    // Convert cents to dollars if:
    // 1. The original text mentions "cents", OR
    // 2. The value is large (>10) and we have grossDividend to validate against
    const isCents = /cents?\s+per\s+(?:share|unit)/i.test(text) || 
                    /dividend\s+per\s+(?:share|unit).*\d+\s*cents/i.test(text);
    if (isCents || (dividendPerShare > 10 && grossDividend && sharesHeld && dividendPerShare * sharesHeld > grossDividend * 2)) {
      dividendPerShare = dividendPerShare / 100;
    }
  }
  
  // Calculate missing gross dividend if we have per share and shares held
  if (!grossDividend && dividendPerShare && sharesHeld) {
    grossDividend = Math.round(dividendPerShare * sharesHeld * 100) / 100;
    warnings.push('Gross dividend calculated from DPS and shares held');
  }
  
  // Extract dates
  const paymentDateStr = extractWithPatterns(text, PATTERNS.paymentDate);
  const paymentDate = paymentDateStr ? parseDate(paymentDateStr) : null;
  
  const recordDateStr = extractWithPatterns(text, PATTERNS.recordDate);
  const recordDate = recordDateStr ? parseDate(recordDateStr) : null;
  
  const statementDateStr = extractWithPatterns(text, PATTERNS.statementDate);
  const statementDate = statementDateStr ? parseDate(statementDateStr) : null;
  
  // Use current date as fallback for payment date
  const effectivePaymentDate = paymentDate || new Date().toISOString().split('T')[0];
  
  if (!paymentDate) {
    warnings.push('Could not extract payment date, using current date');
  }
  
  // Calculate financial year
  let financialYear = '';
  if (effectivePaymentDate) {
    financialYear = calculateFinancialYear(effectivePaymentDate);
  }
  
  // Calculate confidence score
  const requiredFields = [companyName, grossDividend, paymentDate];
  const optionalFields = [frankingCredits, sharesHeld, asxCode, recordDate];
  
  const requiredScore = requiredFields.filter(f => f !== null && f !== '' && f !== 'Unknown Company').length / requiredFields.length;
  const optionalScore = optionalFields.filter(f => f !== null && f !== '').length / optionalFields.length;
  
  const confidence = Math.round((requiredScore * 0.7 + optionalScore * 0.3) * 100) / 100;
  
  // Validate required fields - only dividend amount is truly required
  if (!grossDividend) {
    errors.push('Could not extract dividend amount');
  }
  
  const processingTimeMs = Math.round(performance.now() - startTime);
  
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
      provider,
      processingTimeMs,
    };
  }
  
  // Infer franked/unfranked split if not explicit
  if (frankedAmount === null && unfrankedAmount === null && grossDividend) {
    if (frankingPercentage === 100) {
      frankedAmount = grossDividend;
      unfrankedAmount = 0;
    } else if (frankingPercentage === 0) {
      frankedAmount = 0;
      unfrankedAmount = grossDividend;
    } else {
      frankedAmount = Math.round(grossDividend * (frankingPercentage / 100) * 100) / 100;
      unfrankedAmount = Math.round((grossDividend - frankedAmount) * 100) / 100;
    }
  }
  
  // Ensure we have franked/unfranked values
  frankedAmount = frankedAmount ?? 0;
  unfrankedAmount = unfrankedAmount ?? 0;
  
  return {
    success: true,
    dividend: {
      companyName,
      companyAbn: abn,
      companyAcn: acn,
      asxCode: asxCode || undefined,
      dividendAmount: grossDividend!,
      frankedAmount,
      unfrankedAmount,
      frankingCredits: frankingCredits ?? 0,
      frankingPercentage,
      sharesHeld: sharesHeld ?? 0,
      dividendPerShare: dividendPerShare ?? 0,
      paymentDate: effectivePaymentDate,
      recordDate: recordDate || effectivePaymentDate,
      statementDate: statementDate || undefined,
      financialYear,
      provider,
      confidence,
      rawText: text.substring(0, 5000), // Limit stored text
      extractionErrors: errors,
    },
    errors,
    warnings,
    provider,
    processingTimeMs,
  };
}

/**
 * Parse multiple dividend statements
 */
export function parseDividendStatements(texts: string[]): BatchParseResult {
  const results: ParseResult[] = [];
  const dividends: ParsedDividend[] = [];
  
  for (const text of texts) {
    const result = parseDividendStatement(text);
    results.push(result);
    
    if (result.success && result.dividend) {
      dividends.push(result.dividend);
    }
  }
  
  const successful = dividends.length;
  const failed = texts.length - successful;
  
  return {
    total: texts.length,
    successful,
    failed,
    results,
    dividends,
    totalDividendAmount: dividends.reduce((sum, d) => sum + d.dividendAmount, 0),
    totalFrankingCredits: dividends.reduce((sum, d) => sum + d.frankingCredits, 0),
  };
}

/**
 * Extract text from a PDF file (placeholder for actual PDF extraction)
 * In production, this would use pdf-lib, pdf-parse, or similar
 */
export async function extractTextFromPDF(file: File | Blob): Promise<string> {
  // This is a placeholder - in the actual implementation,
  // you would use a PDF parsing library
  // For Tauri apps, you might use a Rust PDF extractor
  throw new Error('PDF extraction requires a PDF parsing library. Install pdf-parse or similar.');
}

/**
 * Format dividend for display
 */
export function formatDividend(dividend: ParsedDividend): string {
  const lines = [
    `Company: ${dividend.companyName}`,
    dividend.asxCode && `ASX: ${dividend.asxCode}`,
    `Amount: $${dividend.dividendAmount.toFixed(2)}`,
    `Franking: ${dividend.frankingPercentage}% ($${dividend.frankingCredits.toFixed(2)} credits)`,
    `Payment Date: ${dividend.paymentDate}`,
    `Financial Year: ${dividend.financialYear}`,
    dividend.sharesHeld > 0 && `Shares Held: ${dividend.sharesHeld.toLocaleString()}`,
    `Confidence: ${Math.round(dividend.confidence * 100)}%`,
  ].filter(Boolean);
  
  return lines.join('\n');
}

/**
 * Export dividends to CSV format
 */
export function exportToCSV(dividends: ParsedDividend[]): string {
  const headers = [
    'Company Name',
    'ASX Code',
    'Payment Date',
    'Financial Year',
    'Dividend Amount',
    'Franked Amount',
    'Unfranked Amount',
    'Franking Credits',
    'Franking %',
    'Shares Held',
    'Provider',
    'Confidence',
  ];
  
  const rows = dividends.map(d => [
    d.companyName,
    d.asxCode || '',
    d.paymentDate,
    d.financialYear,
    d.dividendAmount.toFixed(2),
    d.frankedAmount.toFixed(2),
    d.unfrankedAmount.toFixed(2),
    d.frankingCredits.toFixed(2),
    d.frankingPercentage.toString(),
    d.sharesHeld.toString(),
    d.provider,
    Math.round(d.confidence * 100).toString(),
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Group dividends by financial year
 */
export function groupByFinancialYear(dividends: ParsedDividend[]): Record<string, ParsedDividend[]> {
  return dividends.reduce((groups, dividend) => {
    const year = dividend.financialYear;
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(dividend);
    return groups;
  }, {} as Record<string, ParsedDividend[]>);
}

/**
 * Calculate tax summary from dividends
 */
export function calculateTaxSummary(dividends: ParsedDividend[]) {
  const byYear = groupByFinancialYear(dividends);
  
  const summary = Object.entries(byYear).map(([year, yearDividends]) => {
    const totalDividend = yearDividends.reduce((sum, d) => sum + d.dividendAmount, 0);
    const totalFranked = yearDividends.reduce((sum, d) => sum + d.frankedAmount, 0);
    const totalUnfranked = yearDividends.reduce((sum, d) => sum + d.unfrankedAmount, 0);
    const totalFrankingCredits = yearDividends.reduce((sum, d) => sum + d.frankingCredits, 0);
    
    return {
      financialYear: year,
      totalDividend,
      totalFranked,
      totalUnfranked,
      totalFrankingCredits,
      grossIncome: totalDividend + totalFrankingCredits,
      count: yearDividends.length,
    };
  });
  
  return summary;
}
