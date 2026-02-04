// Contract Document Parser
// Parse contract PDFs for key dates, payment schedules, parties, and depreciation-relevant information

import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

// ============================================================================
// Types
// ============================================================================

export interface ExtractedField<T> {
  value: T;
  confidence: number;
  source: string;
}

export interface ContractParty {
  name: string;
  abn?: string;
  acn?: string;
  role: "client" | "contractor" | "vendor" | "supplier" | "other";
  address?: string;
  contact?: string;
  confidence: number;
}

export interface PaymentSchedule {
  description: string;
  amount: number;
  due_date?: string;
  percentage?: number;
  is_milestone: boolean;
  confidence: number;
}

export interface DepreciationInfo {
  asset_description: string;
  asset_value: number;
  effective_life_years?: number;
  depreciation_method?: "prime_cost" | "diminishing_value";
  start_date?: string;
  is_immediate_deduction: boolean; // Items <= $300
  is_low_value_pool: boolean; // Items $300-$1,000
  confidence: number;
}

export interface KeyDate {
  date: string;
  description: string;
  date_type: "commencement" | "completion" | "milestone" | "review" | "termination" | "other";
  confidence: number;
}

export interface ContractClause {
  clause_number?: string;
  title?: string;
  text: string;
  category: "payment" | "termination" | "liability" | "warranty" | "intellectual_property" | "other";
  confidence: number;
}

export interface ExtractedContract {
  contract_type?: ExtractedField<string>;
  contract_number?: ExtractedField<string>;
  contract_date?: ExtractedField<string>;
  start_date?: ExtractedField<string>;
  end_date?: ExtractedField<string>;
  total_value?: ExtractedField<number>;
  parties: ContractParty[];
  payment_schedules: PaymentSchedule[];
  key_dates: KeyDate[];
  depreciation_assets: DepreciationInfo[];
  important_clauses: ContractClause[];
  raw_text: string;
  overall_confidence: number;
  document_type: "Unknown" | "Pdf" | "Image";
}

export interface ContractValidationResult {
  is_valid: boolean;
  missing_fields: string[];
  warnings: string[];
  suggested_action: "accept" | "review" | "manual_entry";
}

// Database Contract type
export interface Contract {
  id?: number;
  contract_type?: string;
  contract_number?: string;
  contract_date?: string;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  parties_json?: string; // JSON array of ContractParty
  payment_schedules_json?: string; // JSON array of PaymentSchedule
  key_dates_json?: string; // JSON array of KeyDate
  depreciation_assets_json?: string; // JSON array of DepreciationInfo
  important_clauses_json?: string; // JSON array of ContractClause
  raw_text?: string;
  document_path?: string;
  document_type: "pdf" | "image";
  confidence_score: number;
  status: "draft" | "pending" | "approved" | "linked" | "rejected";
  tax_year?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Rust Tauri API Wrappers
// ============================================================================

export async function parseContractPdf(pdfPath: string): Promise<ExtractedContract> {
  return invoke("parse_contract_pdf_command", { pdfPath });
}

export async function parseContractImage(imagePath: string): Promise<ExtractedContract> {
  return invoke("parse_contract_image_command", { imagePath });
}

export async function validateContract(contract: ExtractedContract): Promise<ContractValidationResult> {
  return invoke("validate_contract_command", { contract });
}

// ============================================================================
// Pattern Matching for Contract Parsing
// ============================================================================

const CONTRACT_TYPE_PATTERNS = [
  { pattern: /service\s+agreement/i, type: "Service Agreement" },
  { pattern: /consulting\s+agreement/i, type: "Consulting Agreement" },
  { pattern: /contractor\s+agreement/i, type: "Contractor Agreement" },
  { pattern: /employment\s+contract/i, type: "Employment Contract" },
  { pattern: /lease\s+agreement/i, type: "Lease Agreement" },
  { pattern: /rental\s+agreement/i, type: "Rental Agreement" },
  { pattern: /purchase\s+order/i, type: "Purchase Order" },
  { pattern: /supply\s+agreement/i, type: "Supply Agreement" },
  { pattern: /maintenance\s+contract/i, type: "Maintenance Contract" },
  { pattern: /subscription\s+agreement/i, type: "Subscription Agreement" },
  { pattern: /software\s+license/i, type: "Software License" },
  { pattern: /terms\s+and\s+conditions/i, type: "Terms and Conditions" },
];

const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  { pattern: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g, format: "dmy" },
  // YYYY-MM-DD
  { pattern: /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g, format: "ymd" },
  // DD MMM YYYY
  { pattern: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi, format: "dmy_text" },
];

const MONEY_PATTERNS = [
  // $X,XXX.XX or $X.XX
  { pattern: /\$\s*([0-9,]+(?:\.\d{2})?)/g },
  // AUD X,XXX.XX
  { pattern: /AUD\s*([0-9,]+(?:\.\d{2})?)/gi },
  // X,XXX.XX dollars
  { pattern: /([0-9,]+(?:\.\d{2})?)\s*(?:dollars|AUD)/gi },
];

const ABN_PATTERN = /\b(\d\s?\d\s?\d\s?\d\s?\d\s?\d\s?\d\s?\d\s?\d\s?)\s?(\d{1})\b/g;
const ACN_PATTERN = /\b(\d{3}\s?\d{3}\s?\d{3})\b/g;

const PARTY_KEYWORDS = [
  "client", "customer", "purchaser", "buyer",
  "contractor", "consultant", "provider", "supplier", "vendor",
  "landlord", "lessor", "tenant", "lessee",
  "employer", "employee",
];

const KEY_DATE_KEYWORDS = [
  { keyword: "commencement", type: "commencement" },
  { keyword: "start date", type: "commencement" },
  { keyword: "effective date", type: "commencement" },
  { keyword: "completion", type: "completion" },
  { keyword: "expiry", type: "completion" },
  { keyword: "termination", type: "termination" },
  { keyword: "milestone", type: "milestone" },
  { keyword: "review", type: "review" },
  { keyword: "renewal", type: "review" },
];

const DEPRECIATION_KEYWORDS = [
  "equipment", "machinery", "furniture", "computer", "laptop", "software",
  "vehicle", "plant", "tools", "hardware", "device",
  "depreciat", "effective life", "prime cost", "diminishing value",
];

// ============================================================================
// Helper Functions
// ============================================================================

function calculateConfidence(matches: number, expected: number): number {
  return Math.min(matches / Math.max(expected, 1), 1);
}

function normalizeDate(dateStr: string, format: string): string {
  try {
    // Normalize to YYYY-MM-DD
    if (format === "dmy" || format === "dmy_text") {
      const parts = dateStr.split(/[\/\-\.\s]+/);
      if (parts.length >= 3) {
        let day = parts[0].padStart(2, "0");
        let month = parts[1];
        const year = parts[2];
        
        // Convert month name to number
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthIdx = monthNames.findIndex(m => month.toLowerCase().startsWith(m));
        if (monthIdx !== -1) {
          month = String(monthIdx + 1).padStart(2, "0");
        } else {
          month = month.padStart(2, "0");
        }
        
        return `${year}-${month}-${day}`;
      }
    } else if (format === "ymd") {
      const parts = dateStr.split(/[\/\-\.]+/);
      if (parts.length >= 3) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      }
    }
  } catch {
    // Return original if parsing fails
  }
  return dateStr;
}

function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/[,\$\s]/g, ""));
}

export function validateABN(abn: string): boolean {
  const cleaned = abn.replace(/\s/g, "");
  if (!/^\d{11}$/.test(cleaned)) return false;
  
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  
  for (let i = 0; i < 11; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i === 0) digit -= 1;
    sum += digit * weights[i];
  }
  
  return sum % 89 === 0;
}

export function validateACN(acn: string): boolean {
  const cleaned = acn.replace(/\s/g, "");
  if (!/^\d{9}$/.test(cleaned)) return false;
  
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i], 10) * weights[i];
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[8], 10);
}

// ============================================================================
// Extraction Functions
// ============================================================================

export function extractContractType(text: string): ExtractedField<string> | undefined {
  for (const { pattern, type } of CONTRACT_TYPE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        value: type,
        confidence: 0.85,
        source: `Matched pattern: ${match[0]}`,
      };
    }
  }
  return undefined;
}

export function extractContractNumber(text: string): ExtractedField<string> | undefined {
  const patterns = [
    /contract\s*(?:number|#|no\.?)?\s*:?\s*([A-Z]{1,4}-?\d{4}-?\d{0,4}[A-Z0-9\-]*)/i,
    /agreement\s*(?:number|#|no\.?)?\s*:?\s*([A-Z0-9\-]+)/i,
    /reference\s*(?:number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /\b(CON\d+|AGR\d+|REF\d+[A-Z0-9\-]*|SA-\d{4}-\d{3})\b/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        value: match[1].trim(),
        confidence: 0.8,
        source: `Matched: ${match[0]}`,
      };
    }
  }
  return undefined;
}

export function extractTotalValue(text: string): ExtractedField<number> | undefined {
  // Look for total amount patterns
  const totalPatterns = [
    /total\s*(?:amount|value|price|cost|fee)\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /contract\s*(?:value|price|amount)\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /aggregate\s*(?:amount|value)\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
    /\b(?:value|amount)\s*:?\s*\$?\s*([0-9,]+(?:\.\d{2})?)/i,
  ];
  
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        value: parseAmount(match[1]),
        confidence: 0.8,
        source: `Matched: ${match[0]}`,
      };
    }
  }
  
  // Fall back to finding largest amount mentioned
  const amounts: number[] = [];
  for (const { pattern } of MONEY_PATTERNS) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      amounts.push(parseAmount(m[1]));
    }
  }
  
  if (amounts.length > 0) {
    const maxAmount = Math.max(...amounts);
    return {
      value: maxAmount,
      confidence: 0.6,
      source: "Largest amount found",
    };
  }
  
  return undefined;
}

export function extractParties(text: string): ContractParty[] {
  const parties: ContractParty[] = [];
  const lines = text.split(/\n+/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for party keywords
    for (const keyword of PARTY_KEYWORDS) {
      const pattern = new RegExp(`^\\s*${keyword}\\s*:?\\s*(.+)$`, "i");
      const match = line.match(pattern);
      
      if (match) {
        const party: ContractParty = {
          name: match[1].trim(),
          role: determinePartyRole(keyword),
          confidence: 0.75,
        };
        
        // Look for ABN in surrounding lines
        const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join(" ");
        const abnMatch = context.match(ABN_PATTERN);
        if (abnMatch && validateABN(abnMatch[0])) {
          party.abn = abnMatch[0].replace(/\s/g, "");
          party.confidence += 0.1;
        }
        
        // Look for ACN
        const acnMatch = context.match(ACN_PATTERN);
        if (acnMatch && validateACN(acnMatch[0])) {
          party.acn = acnMatch[0].replace(/\s/g, "");
          party.confidence += 0.05;
        }
        
        parties.push(party);
      }
    }
  }
  
  return parties;
}

function determinePartyRole(keyword: string): ContractParty["role"] {
  const clientKeywords = ["client", "customer", "purchaser", "buyer", "employer", "landlord", "lessor"];
  const contractorKeywords = ["contractor", "consultant", "provider", "employee"];
  const vendorKeywords = ["vendor", "supplier"];
  
  if (clientKeywords.includes(keyword.toLowerCase())) return "client";
  if (contractorKeywords.includes(keyword.toLowerCase())) return "contractor";
  if (vendorKeywords.includes(keyword.toLowerCase())) return "vendor";
  return "other";
}

export function extractKeyDates(text: string): KeyDate[] {
  const dates: KeyDate[] = [];
  const lines = text.split(/\n+/);
  
  for (const line of lines) {
    for (const { keyword, type } of KEY_DATE_KEYWORDS) {
      if (line.toLowerCase().includes(keyword)) {
        // Try to find a date in this line
        for (const { pattern, format } of DATE_PATTERNS) {
          const match = pattern.exec(line);
          if (match) {
            dates.push({
              date: normalizeDate(match[0], format),
              description: line.trim().substring(0, 100),
              date_type: type as KeyDate["date_type"],
              confidence: 0.75,
            });
            break;
          }
        }
      }
    }
  }
  
  return dates;
}

export function extractPaymentSchedules(text: string): PaymentSchedule[] {
  const schedules: PaymentSchedule[] = [];
  const lines = text.split(/\n+/);
  
  for (const line of lines) {
    // Look for payment/milestone patterns
    if (/payment|milestone|installment|deposit|balance/i.test(line)) {
      const amountMatch = line.match(/\$\s*([0-9,]+(?:\.\d{2})?)/);
      const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
      const percentMatch = line.match(/(\d+)%/);
      
      if (amountMatch || percentMatch) {
        schedules.push({
          description: line.trim().substring(0, 200),
          amount: amountMatch ? parseAmount(amountMatch[1]) : 0,
          due_date: dateMatch ? normalizeDate(dateMatch[1], "dmy") : undefined,
          percentage: percentMatch ? parseInt(percentMatch[1], 10) : undefined,
          is_milestone: /milestone|stage|phase/i.test(line),
          confidence: amountMatch ? 0.8 : 0.6,
        });
      }
    }
  }
  
  return schedules;
}

export function extractDepreciationInfo(text: string): DepreciationInfo[] {
  const assets: DepreciationInfo[] = [];
  const lines = text.split(/\n+/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Check for depreciation-related keywords
    const hasDepreciationKeyword = DEPRECIATION_KEYWORDS.some(kw => line.includes(kw.toLowerCase()));
    
    if (hasDepreciationKeyword) {
      const amountMatch = lines[i].match(/\$\s*([0-9,]+(?:\.\d{2})?)/);
      
      if (amountMatch) {
        const value = parseAmount(amountMatch[1]);
        const asset: DepreciationInfo = {
          asset_description: lines[i].trim().substring(0, 200),
          asset_value: value,
          is_immediate_deduction: value <= 300,
          is_low_value_pool: value > 300 && value <= 1000,
          confidence: 0.7,
        };
        
        // Look for effective life
        const lifeMatch = lines.slice(i, Math.min(lines.length, i + 3)).join(" ").match(/(\d+)\s*(?:year|yr)s?/i);
        if (lifeMatch) {
          asset.effective_life_years = parseInt(lifeMatch[1], 10);
          asset.confidence += 0.1;
        }
        
        // Look for depreciation method
        const context = lines.slice(i, Math.min(lines.length, i + 3)).join(" ").toLowerCase();
        if (context.includes("diminishing value")) {
          asset.depreciation_method = "diminishing_value";
        } else if (context.includes("prime cost") || context.includes("straight line")) {
          asset.depreciation_method = "prime_cost";
        }
        
        assets.push(asset);
      }
    }
  }
  
  return assets;
}

export function extractImportantClauses(text: string): ContractClause[] {
  const clauses: ContractClause[] = [];
  const lines = text.split(/\n+/);
  
  const clausePatterns = [
    { pattern: /^(\d+\.\d+|\d+|\([a-z]\))[:.)]?\s+(.+)$/i, extract: (m: RegExpMatchArray) => ({ num: m[1], title: m[2] }) },
    { pattern: /clause\s+(\d+\.?\d*)\s*:?\s*(.+)/i, extract: (m: RegExpMatchArray) => ({ num: m[1], title: m[2] }) },
    { pattern: /^([\d.]+)\s+([A-Za-z].*)$/i, extract: (m: RegExpMatchArray) => ({ num: m[1], title: m[2] }) },
  ];
  
  for (const line of lines) {
    // Check for clause patterns
    for (const { pattern, extract } of clausePatterns) {
      const match = line.match(pattern);
      if (match) {
        const extracted = extract(match);
        const category = categorizeClause(extracted.title);
        
        clauses.push({
          clause_number: extracted.num,
          title: extracted.title.substring(0, 100),
          text: line.trim().substring(0, 500),
          category,
          confidence: 0.75,
        });
      }
    }
  }
  
  return clauses.slice(0, 20); // Limit to top 20 clauses
}

function categorizeClause(text: string): ContractClause["category"] {
  const lower = text.toLowerCase();
  
  if (/payment|fee|price|cost|invoice|billing/i.test(lower)) return "payment";
  if (/terminat|cancel|breach|default/i.test(lower)) return "termination";
  if (/liability|indemnif|insurance|warrant/i.test(lower)) return "liability";
  if (/intellectual|copyright|trademark|patent|ip\s|license/i.test(lower)) return "intellectual_property";
  
  return "other";
}

// ============================================================================
// Main Parser
// ============================================================================

export function parseContractFromText(text: string): ExtractedContract {
  const contract: ExtractedContract = {
    parties: [],
    payment_schedules: [],
    key_dates: [],
    depreciation_assets: [],
    important_clauses: [],
    raw_text: text,
    overall_confidence: 0,
    document_type: "Unknown",
  };
  
  // Extract contract type
  contract.contract_type = extractContractType(text);
  
  // Extract contract number
  contract.contract_number = extractContractNumber(text);
  
  // Extract total value
  contract.total_value = extractTotalValue(text);
  
  // Extract parties
  contract.parties = extractParties(text);
  
  // Extract key dates
  contract.key_dates = extractKeyDates(text);
  
  // Extract payment schedules
  contract.payment_schedules = extractPaymentSchedules(text);
  
  // Extract depreciation info
  contract.depreciation_assets = extractDepreciationInfo(text);
  
  // Extract important clauses
  contract.important_clauses = extractImportantClauses(text);
  
  // Calculate overall confidence
  const confidences: number[] = [];
  if (contract.contract_type) confidences.push(contract.contract_type.confidence);
  if (contract.total_value) confidences.push(contract.total_value.confidence);
  contract.parties.forEach(p => confidences.push(p.confidence));
  contract.key_dates.forEach(d => confidences.push(d.confidence));
  contract.payment_schedules.forEach(p => confidences.push(p.confidence));
  
  contract.overall_confidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0.3;
  
  return contract;
}

// ============================================================================
// Validation
// ============================================================================

export function validateExtractedContract(contract: ExtractedContract): ContractValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  if (!contract.contract_type) missing.push("contract_type");
  if (!contract.total_value) missing.push("total_value");
  if (contract.parties.length === 0) missing.push("parties");
  if (contract.key_dates.length === 0) warnings.push("No key dates identified");
  
  // Check for suspicious values
  if (contract.total_value && contract.total_value.value > 10000000) {
    warnings.push("Unusually high contract value - please verify");
  }
  
  // Determine action
  let action: ContractValidationResult["suggested_action"] = "accept";
  if (missing.length > 2) action = "manual_entry";
  else if (missing.length > 0 || warnings.length > 0) action = "review";
  
  return {
    is_valid: missing.length <= 2,
    missing_fields: missing,
    warnings,
    suggested_action: action,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

export async function initContractTables(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_type TEXT,
      contract_number TEXT,
      contract_date TEXT,
      start_date TEXT,
      end_date TEXT,
      total_value REAL,
      parties_json TEXT,
      payment_schedules_json TEXT,
      key_dates_json TEXT,
      depreciation_assets_json TEXT,
      important_clauses_json TEXT,
      raw_text TEXT,
      document_path TEXT,
      document_type TEXT NOT NULL DEFAULT 'pdf',
      confidence_score REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      tax_year INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create index for common queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_contracts_tax_year ON contracts(tax_year)
  `);
}

export async function saveContract(
  db: Database,
  extracted: ExtractedContract,
  documentPath: string,
  documentType: "pdf" | "image",
  taxYear?: number,
  notes?: string
): Promise<number> {
  const contract: Omit<Contract, "id" | "created_at" | "updated_at"> = {
    contract_type: extracted.contract_type?.value,
    contract_number: extracted.contract_number?.value,
    contract_date: extracted.contract_date?.value,
    start_date: extracted.start_date?.value,
    end_date: extracted.end_date?.value,
    total_value: extracted.total_value?.value,
    parties_json: JSON.stringify(extracted.parties),
    payment_schedules_json: JSON.stringify(extracted.payment_schedules),
    key_dates_json: JSON.stringify(extracted.key_dates),
    depreciation_assets_json: JSON.stringify(extracted.depreciation_assets),
    important_clauses_json: JSON.stringify(extracted.important_clauses),
    raw_text: extracted.raw_text,
    document_path: documentPath,
    document_type: documentType,
    confidence_score: extracted.overall_confidence,
    status: "draft",
    tax_year: taxYear,
    notes,
  };
  
  const result = await db.execute(
    `INSERT INTO contracts (
      contract_type, contract_number, contract_date, start_date, end_date,
      total_value, parties_json, payment_schedules_json, key_dates_json,
      depreciation_assets_json, important_clauses_json, raw_text, document_path,
      document_type, confidence_score, status, tax_year, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contract.contract_type,
      contract.contract_number,
      contract.contract_date,
      contract.start_date,
      contract.end_date,
      contract.total_value,
      contract.parties_json,
      contract.payment_schedules_json,
      contract.key_dates_json,
      contract.depreciation_assets_json,
      contract.important_clauses_json,
      contract.raw_text,
      contract.document_path,
      contract.document_type,
      contract.confidence_score,
      contract.status,
      contract.tax_year,
      contract.notes,
    ]
  );
  
  return result.lastInsertId;
}

export async function getContractById(db: Database, id: number): Promise<Contract | null> {
  const results = await db.select<Contract[]>(
    "SELECT * FROM contracts WHERE id = ?",
    [id]
  );
  return results[0] || null;
}

export async function getContractsByStatus(
  db: Database,
  status: Contract["status"]
): Promise<Contract[]> {
  return db.select<Contract[]>(
    "SELECT * FROM contracts WHERE status = ? ORDER BY created_at DESC",
    [status]
  );
}

export async function updateContractStatus(
  db: Database,
  id: number,
  status: Contract["status"]
): Promise<void> {
  await db.execute(
    "UPDATE contracts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, id]
  );
}

export async function deleteContract(db: Database, id: number): Promise<void> {
  await db.execute("DELETE FROM contracts WHERE id = ?", [id]);
}

// ============================================================================
// Export Functions
// ============================================================================

export function exportContractsToJSON(contracts: Contract[]): string {
  return JSON.stringify(contracts, null, 2);
}

export function exportContractsToCSV(contracts: Contract[]): string {
  const headers = [
    "ID",
    "Contract Type",
    "Contract Number",
    "Total Value",
    "Parties",
    "Key Dates Count",
    "Payment Schedules Count",
    "Depreciation Assets Count",
    "Status",
    "Created At",
  ];
  
  const rows = contracts.map(c => [
    c.id,
    c.contract_type || "",
    c.contract_number || "",
    c.total_value || 0,
    c.parties_json ? JSON.parse(c.parties_json).length : 0,
    c.key_dates_json ? JSON.parse(c.key_dates_json).length : 0,
    c.payment_schedules_json ? JSON.parse(c.payment_schedules_json).length : 0,
    c.depreciation_assets_json ? JSON.parse(c.depreciation_assets_json).length : 0,
    c.status,
    c.created_at || "",
  ]);
  
  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

// ============================================================================
// Utility Functions
// ============================================================================

export function calculateTotalDepreciationValue(assets: DepreciationInfo[]): number {
  return assets.reduce((sum, asset) => sum + asset.asset_value, 0);
}

export function getImmediateDeductions(assets: DepreciationInfo[]): DepreciationInfo[] {
  return assets.filter(a => a.is_immediate_deduction);
}

export function getLowValuePoolAssets(assets: DepreciationInfo[]): DepreciationInfo[] {
  return assets.filter(a => a.is_low_value_pool);
}

export function summarizeContract(contract: Contract): {
  totalValue: number;
  partyCount: number;
  keyDatesCount: number;
  paymentCount: number;
  depreciationCount: number;
  immediateDeductions: number;
  lowValuePoolAssets: number;
} {
  const parties = contract.parties_json ? JSON.parse(contract.parties_json) : [];
  const keyDates = contract.key_dates_json ? JSON.parse(contract.key_dates_json) : [];
  const payments = contract.payment_schedules_json ? JSON.parse(contract.payment_schedules_json) : [];
  const depreciation = contract.depreciation_assets_json ? JSON.parse(contract.depreciation_assets_json) : [];
  
  return {
    totalValue: contract.total_value || 0,
    partyCount: parties.length,
    keyDatesCount: keyDates.length,
    paymentCount: payments.length,
    depreciationCount: depreciation.length,
    immediateDeductions: depreciation.filter((a: DepreciationInfo) => a.is_immediate_deduction).length,
    lowValuePoolAssets: depreciation.filter((a: DepreciationInfo) => a.is_low_value_pool).length,
  };
}
