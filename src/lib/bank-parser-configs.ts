/**
 * Bank Parser Configurations
 * Configuration for each Australian bank's statement format
 */

import type { BankParserConfig, BankName } from './bank-statement-types';

// Common date formats used by Australian banks
const COMMON_DATE_FORMATS = [
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'YYYY-MM-DD',
  'DD MMM YYYY',
  'DD MMMM YYYY',
  'DD/MM/YY',
];

// CommBank (Commonwealth Bank of Australia) configuration
export const commbankConfig: BankParserConfig = {
  name: 'commbank',
  displayName: 'Commonwealth Bank',
  dateFormats: ['DD MMM YYYY', 'DD/MM/YYYY', 'DD/MM/YY'],
  currency: 'AUD',
  // Matches dates like "12 Jan 2024" or "12/01/2024"
  dateRegex: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b|\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i,
  // Matches amounts like "-1,234.56" or "1,234.56 CR"
  amountRegex: /-?[\d,]+\.\d{2}(?:\s*(?:CR|DR))?|[\d,]+\.\d{2}\s*(?:CR|DR)/i,
  // Matches balance amounts
  balanceRegex: /Balance:?\s*(-?[\d,]+\.\d{2})/i,
  // Splits transactions by date patterns
  transactionDelimiter: /\n(?=\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  skipLines: [
    'COMMONWEALTH BANK',
    'ABN',
    'Page',
    'Statement period',
    'Opening balance',
    'Closing balance',
    'Total credits',
    'Total debits',
    'Brought forward',
    'Carried forward',
    'Transaction details',
    'Date Description',
    'BSB',
  ],
  headerPatterns: [
    /COMMONWEALTH BANK OF AUSTRALIA/i,
    /Statement period:/i,
    /Account number:/i,
    /BSB:/i,
  ],
  footerPatterns: [
    /Page \d+ of \d+/i,
    /Total credits:/i,
    /Total debits:/i,
    /Closing balance:/i,
  ],
};

// NAB (National Australia Bank) configuration
export const nabConfig: BankParserConfig = {
  name: 'nab',
  displayName: 'NAB',
  dateFormats: ['DD/MM/YYYY', 'DD MMM YYYY', 'DD-MM-YYYY'],
  currency: 'AUD',
  // NAB typically uses DD/MM/YYYY format
  dateRegex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
  // NAB uses Debit/Credit columns
  amountRegex: /-?[\d,]+\.\d{2}/,
  balanceRegex: /Balance\s+(-?[\d,]+\.\d{2})/i,
  transactionDelimiter: /\n(?=\d{1,2}\/\d{1,2}\/\d{4})/,
  skipLines: [
    'National Australia Bank',
    'NAB',
    'ABN',
    'Page',
    'Statement Date',
    'Account Details',
    'Date Description Debit Credit Balance',
    'Date Description Debit($) Credit($)',
    'Opening Balance',
    'Closing Balance',
  ],
  headerPatterns: [
    /National Australia Bank/i,
    /NAB Classic/i,
    /Account details/i,
    /Statement date:/i,
  ],
  footerPatterns: [
    /Page \d+ of \d+/i,
    /Opening balance/i,
    /Closing balance/i,
    /Totals/i,
  ],
};

// Westpac configuration
export const westpacConfig: BankParserConfig = {
  name: 'westpac',
  displayName: 'Westpac',
  dateFormats: ['DD/MM/YYYY', 'DD MMM YYYY', 'DD MMM'],
  currency: 'AUD',
  // Westpac typically uses DD/MM/YYYY
  dateRegex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i,
  amountRegex: /-?[\d,]+\.\d{2}(?:\s*(?:CR|DR))?/i,
  balanceRegex: /Balance[\s:]+(-?[\d,]+\.\d{2})/i,
  transactionDelimiter: /\n(?=\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i,
  skipLines: [
    'Westpac',
    'ABN',
    'Page',
    'Account number',
    'BSB',
    'Statement period',
    'Date Transaction Details Debits Credits Balance',
    'Opening balance',
    'Closing balance',
  ],
  headerPatterns: [
    /Westpac Banking Corporation/i,
    /Account number:/i,
    /BSB:/i,
    /Statement period:/i,
  ],
  footerPatterns: [
    /Page \d+ of \d+/i,
    /Opening balance/i,
    /Closing balance/i,
    /Total debits/i,
    /Total credits/i,
  ],
};

// ANZ configuration
export const anzConfig: BankParserConfig = {
  name: 'anz',
  displayName: 'ANZ',
  dateFormats: ['DD/MM/YYYY', 'DD MMM YYYY', 'DD MMM'],
  currency: 'AUD',
  // ANZ typically uses DD/MM/YYYY
  dateRegex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i,
  amountRegex: /-?[\d,]+\.\d{2}(?:\s*(?:CR|DR))?/i,
  balanceRegex: /Balance[\s:]+(-?[\d,]+\.\d{2})/i,
  transactionDelimiter: /\n(?=\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i,
  skipLines: [
    'Australia and New Zealand Banking',
    'ANZ',
    'ABN',
    'Page',
    'Account number',
    'BSB',
    'Statement period',
    'Date Details Withdrawals Deposits Balance',
    'Opening balance',
    'Closing balance',
  ],
  headerPatterns: [
    /Australia and New Zealand Banking Group/i,
    /ANZ/i,
    /Account number:/i,
    /BSB:/i,
    /Statement period:/i,
  ],
  footerPatterns: [
    /Page \d+ of \d+/i,
    /Opening balance/i,
    /Closing balance/i,
    /Total withdrawals/i,
    /Total deposits/i,
  ],
};

// ING configuration
export const ingConfig: BankParserConfig = {
  name: 'ing',
  displayName: 'ING',
  dateFormats: ['DD/MM/YYYY', 'DD MMM YYYY'],
  currency: 'AUD',
  // ING uses DD/MM/YYYY format
  dateRegex: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
  amountRegex: /-?[\d,]+\.\d{2}/,
  balanceRegex: /Balance[\s:]+(-?[\d,]+\.\d{2})/i,
  transactionDelimiter: /\n(?=\d{1,2}\/\d{1,2}\/\d{4})/,
  skipLines: [
    'ING Bank',
    'ABN',
    'Page',
    'Account name',
    'Account number',
    'Statement period',
    'Date Description Money in Money out Balance',
    'Opening balance',
    'Closing balance',
  ],
  headerPatterns: [
    /ING Bank/i,
    /Account name:/i,
    /Account number:/i,
    /Statement period:/i,
  ],
  footerPatterns: [
    /Page \d+ of \d+/i,
    /Opening balance/i,
    /Closing balance/i,
    /Total money in/i,
    /Total money out/i,
  ],
};

// Map of all bank configurations
export const bankConfigs: Record<BankName, BankParserConfig> = {
  commbank: commbankConfig,
  nab: nabConfig,
  westpac: westpacConfig,
  anz: anzConfig,
  ing: ingConfig,
};

// Get config by bank name
export function getBankConfig(bankName: BankName): BankParserConfig {
  return bankConfigs[bankName];
}

// Get all supported banks
export function getSupportedBanks(): { name: BankName; displayName: string }[] {
  return Object.values(bankConfigs).map(config => ({
    name: config.name,
    displayName: config.displayName,
  }));
}

// Detect bank from statement text
export function detectBankFromText(text: string): BankName | null {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('commonwealth bank') || lowerText.includes('commbank')) {
    return 'commbank';
  }
  if (lowerText.includes('national australia bank') || lowerText.includes('nab') && !lowerText.includes('anz')) {
    return 'nab';
  }
  if (lowerText.includes('westpac')) {
    return 'westpac';
  }
  if (lowerText.includes('anz') || lowerText.includes('australia and new zealand')) {
    return 'anz';
  }
  if (lowerText.includes('ing bank') || lowerText.includes('ing australia')) {
    return 'ing';
  }
  
  return null;
}

// Month name to number mapping
export const monthMap: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};
