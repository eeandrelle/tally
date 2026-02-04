/**
 * Document Type Detection Engine (TAL-101)
 * 
 * ML-based classifier to auto-detect document types:
 * - receipts
 * - bank_statements
 * - dividend_statements
 * - invoices
 * - contracts
 * 
 * Features:
 * - Multi-stage detection with confidence scoring
 * - Text-based classification using keyword patterns
 * - Structure-based classification using layout analysis
 * - Confidence threshold management
 */

import { invoke } from "@tauri-apps/api/core";

export type DocumentType = 
  | "receipt"
  | "bank_statement"
  | "dividend_statement"
  | "invoice"
  | "contract"
  | "unknown";

export interface DocumentTypeResult {
  type: DocumentType;
  confidence: number;
  method: "keyword" | "structure" | "ml" | "fallback";
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  detectedKeywords: string[];
  pageCount?: number;
  hasTables?: boolean;
  hasAmounts?: boolean;
  hasDates?: boolean;
  hasAbn?: boolean;
  format: "pdf" | "image" | "text";
}

export interface DetectionStage {
  name: string;
  weight: number;
  detect: (text: string, metadata: Partial<DocumentMetadata>) => Promise<StageResult>;
}

interface StageResult {
  type: DocumentType;
  confidence: number;
  keywords: string[];
}

// Confidence thresholds
const CONFIDENCE_HIGH = 0.85;
const CONFIDENCE_MEDIUM = 0.60;
const CONFIDENCE_LOW = 0.40;

// Keyword patterns for each document type
const KEYWORD_PATTERNS: Record<DocumentType, string[]> = {
  receipt: [
    "receipt", "tax invoice", "invoice no", "abn", "acn",
    "total", "subtotal", "gst", "payment", "change",
    "cash", "card", "eftpos", "tap", "pin",
    "thank you", "thanks for your business", "come again",
    "item", "qty", "quantity", "price", "each",
    "register", "terminal", "store", "shop"
  ],
  bank_statement: [
    "statement", "account statement", "bank statement",
    "opening balance", "closing balance", "balance brought forward",
    "transaction", "debit", "credit", "transfer",
    "account number", "bsb", "sort code",
    "commonwealth bank", "commbank", "nab", "westpac", "anz", "ing",
    "period", "from", "to", "date range",
    "withdrawal", "deposit", "direct debit", "direct credit"
  ],
  dividend_statement: [
    "dividend", "dividend statement", "distribution",
    "franked", "unfranked", "franking credits",
    "shareholder", "shares", "holdings", "securities",
    "druid", "dr", "dividend reinvestment plan",
    "payment date", "record date", "ex-dividend",
    "company", "corporation", "limited", "ltd",
    "asx", "share registry", "link market", "computershare"
  ],
  invoice: [
    "invoice", "tax invoice", "commercial invoice",
    "bill to", "ship to", "sold to", "customer",
    "payment terms", "due date", "net 30", "net 14",
    "purchase order", "po number", "quote",
    "description", "line item", "unit price", "amount",
    "subtotal", "tax", "total", "balance due",
    "please pay", "payment instructions", "bank transfer"
  ],
  contract: [
    "contract", "agreement", "terms and conditions",
    "party", "parties", "hereby", "herein", "whereas",
    "obligation", "liability", "indemnity", "warranty",
    "termination", "breach", "governing law",
    "signature", "signed", "date signed", "witness",
    "effective date", "commencement", "duration",
    "clause", "section", "article", "schedule"
  ],
  unknown: []
};

// High-confidence unique identifiers
const UNIQUE_IDENTIFIERS: Record<DocumentType, string[]> = {
  receipt: ["receipt no:", "receipt number:", "receipt #", "tax invoice"],
  bank_statement: ["bank statement", "account statement", "opening balance", "bsb"],
  dividend_statement: ["dividend statement", "franking credits", "druid", "share registry"],
  invoice: ["invoice no:", "invoice number:", "invoice #", "payment terms"],
  contract: ["this agreement", "terms and conditions", "party of the first part"],
  unknown: []
};

/**
 * Main document type detection function
 * Uses multi-stage detection for accurate classification
 */
export async function detectDocumentType(
  text: string,
  filePath?: string
): Promise<DocumentTypeResult> {
  const normalizedText = normalizeText(text);
  
  // Stage 1: Quick keyword matching
  const keywordResult = await keywordDetectionStage(normalizedText);
  if (keywordResult.confidence >= CONFIDENCE_HIGH) {
    return buildResult(keywordResult, "keyword");
  }
  
  // Stage 2: Structure analysis (tables, layout)
  const structureResult = await structureDetectionStage(normalizedText, filePath);
  if (structureResult.confidence >= CONFIDENCE_HIGH) {
    return buildResult(structureResult, "structure");
  }
  
  // Stage 3: Weighted combination if both stages have results
  if (keywordResult.type !== "unknown" && structureResult.type !== "unknown") {
    const combined = combineResults([
      { ...keywordResult, weight: 0.6 },
      { ...structureResult, weight: 0.4 }
    ]);
    if (combined.confidence >= CONFIDENCE_MEDIUM) {
      return buildResult(combined, "ml");
    }
  }
  
  // Stage 4: Use best available result
  const bestResult = keywordResult.confidence > structureResult.confidence
    ? keywordResult
    : structureResult;
    
  if (bestResult.type !== "unknown" && bestResult.confidence >= CONFIDENCE_LOW) {
    return buildResult(bestResult, "ml");
  }
  
  // Fallback: unknown
  return {
    type: "unknown",
    confidence: 1.0,
    method: "fallback",
    metadata: {
      detectedKeywords: [],
      format: detectFormat(filePath)
    }
  };
}

/**
 * Stage 1: Keyword-based detection
 */
async function keywordDetectionStage(text: string): Promise<StageResult> {
  const scores: Record<DocumentType, { score: number; matches: string[] }> = {
    receipt: { score: 0, matches: [] },
    bank_statement: { score: 0, matches: [] },
    dividend_statement: { score: 0, matches: [] },
    invoice: { score: 0, matches: [] },
    contract: { score: 0, matches: [] },
    unknown: { score: 0, matches: [] }
  };
  
  // Count keyword matches for each type
  for (const [type, keywords] of Object.entries(KEYWORD_PATTERNS)) {
    if (type === "unknown") continue;
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        scores[type as DocumentType].score += matches.length;
        scores[type as DocumentType].matches.push(keyword);
      }
    }
  }
  
  // Check for unique identifiers (higher weight)
  for (const [type, identifiers] of Object.entries(UNIQUE_IDENTIFIERS)) {
    if (type === "unknown") continue;
    
    for (const identifier of identifiers) {
      if (text.toLowerCase().includes(identifier)) {
        scores[type as DocumentType].score += 5; // Higher weight for unique identifiers
        scores[type as DocumentType].matches.push(`!${identifier}`);
      }
    }
  }
  
  // Find best match
  let bestType: DocumentType = "unknown";
  let bestScore = 0;
  
  for (const [type, data] of Object.entries(scores)) {
    if (type === "unknown") continue;
    if (data.score > bestScore) {
      bestScore = data.score;
      bestType = type as DocumentType;
    }
  }
  
  // Calculate confidence based on score differential
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
  const confidence = totalScore > 0 
    ? Math.min(bestScore / totalScore + 0.3, 0.95)
    : 0;
  
  return {
    type: bestScore > 0 ? bestType : "unknown",
    confidence,
    keywords: scores[bestType].matches
  };
}

/**
 * Stage 2: Structure-based detection
 * Analyzes document layout, tables, and formatting
 */
async function structureDetectionStage(
  text: string,
  filePath?: string
): Promise<StageResult> {
  const metadata = extractMetadata(text, filePath);
  const scores: Record<DocumentType, number> = {
    receipt: 0,
    bank_statement: 0,
    dividend_statement: 0,
    invoice: 0,
    contract: 0,
    unknown: 0
  };
  
  // Receipt indicators
  if (metadata.hasAmounts && metadata.hasDates && !metadata.hasTables) {
    scores.receipt += 3;
  }
  if (text.includes("total") && text.includes("gst")) {
    scores.receipt += 2;
  }
  
  // Bank statement indicators
  if (metadata.hasTables && text.includes("balance")) {
    scores.bank_statement += 4;
  }
  if (text.includes("transaction") && text.includes("debit")) {
    scores.bank_statement += 2;
  }
  
  // Dividend statement indicators
  if (text.includes("franked") || text.includes("franking")) {
    scores.dividend_statement += 5;
  }
  if (metadata.hasTables && text.includes("shares")) {
    scores.dividend_statement += 2;
  }
  
  // Invoice indicators
  if (text.includes("payment terms") || text.includes("due date")) {
    scores.invoice += 4;
  }
  if (metadata.hasTables && metadata.hasAbn) {
    scores.invoice += 2;
  }
  
  // Contract indicators
  if (text.includes("signature") || text.includes("agreement")) {
    scores.contract += 3;
  }
  if (metadata.pageCount && metadata.pageCount > 2) {
    scores.contract += 2;
  }
  
  // Find best match
  let bestType: DocumentType = "unknown";
  let bestScore = 0;
  
  for (const [type, score] of Object.entries(scores)) {
    if (type === "unknown") continue;
    if (score > bestScore) {
      bestScore = score;
      bestType = type as DocumentType;
    }
  }
  
  // Calculate confidence
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
  const confidence = totalScore > 0
    ? Math.min(bestScore / totalScore + 0.2, 0.90)
    : 0;
  
  return {
    type: bestScore > 0 ? bestType : "unknown",
    confidence,
    keywords: []
  };
}

/**
 * Extract metadata from document text
 */
function extractMetadata(text: string, filePath?: string): DocumentMetadata {
  const detectedKeywords: string[] = [];
  
  // Detect format
  const format = detectFormat(filePath);
  
  // Check for common patterns
  const hasTables = /\|\s*[-]+\s*\||\+[=-]+\+|\n.*\|.*\|.*\n/.test(text);
  const hasAmounts = /\$[\d,]+\.?\d*|\d+\.\d{2}/.test(text);
  const hasDates = /\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}/.test(text) ||
                   /\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}/.test(text);
  const hasAbn = /\b\d{2}\s*\d{3}\s*\d{3}\s*\d{3}\s*\d{3}\b/.test(text) ||
                 /abn/i.test(text);
  
  return {
    detectedKeywords,
    hasTables,
    hasAmounts,
    hasDates,
    hasAbn,
    format
  };
}

/**
 * Detect file format from path
 */
function detectFormat(filePath?: string): "pdf" | "image" | "text" {
  if (!filePath) return "text";
  
  const ext = filePath.toLowerCase().split(".").pop();
  
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff"].includes(ext || "")) {
    return "image";
  }
  return "text";
}

/**
 * Normalize text for processing
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\$\.\%\,\-\/]/g, "")
    .trim();
}

/**
 * Combine results from multiple stages
 */
function combineResults(
  results: Array<StageResult & { weight: number }>
): StageResult {
  // Group by type and calculate weighted scores
  const typeScores: Record<DocumentType, { score: number; keywords: Set<string> }> = {
    receipt: { score: 0, keywords: new Set() },
    bank_statement: { score: 0, keywords: new Set() },
    dividend_statement: { score: 0, keywords: new Set() },
    invoice: { score: 0, keywords: new Set() },
    contract: { score: 0, keywords: new Set() },
    unknown: { score: 0, keywords: new Set() }
  };
  
  for (const result of results) {
    typeScores[result.type].score += result.confidence * result.weight;
    result.keywords.forEach(k => typeScores[result.type].keywords.add(k));
  }
  
  // Find best type
  let bestType: DocumentType = "unknown";
  let bestScore = 0;
  
  for (const [type, data] of Object.entries(typeScores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestType = type as DocumentType;
    }
  }
  
  // Calculate confidence
  const totalScore = Object.values(typeScores).reduce((sum, s) => sum + s.score, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0;
  
  return {
    type: bestScore > 0 ? bestType : "unknown",
    confidence: Math.min(confidence, 0.98),
    keywords: Array.from(typeScores[bestType].keywords)
  };
}

/**
 * Build final result object
 */
function buildResult(
  stageResult: StageResult,
  method: DocumentTypeResult["method"]
): DocumentTypeResult {
  return {
    type: stageResult.type,
    confidence: stageResult.confidence,
    method,
    metadata: {
      detectedKeywords: stageResult.keywords,
      format: "text"
    }
  };
}

/**
 * Batch process multiple documents
 */
export async function detectDocumentTypesBatch(
  documents: Array<{ text: string; filePath?: string }>
): Promise<DocumentTypeResult[]> {
  return Promise.all(
    documents.map(doc => detectDocumentType(doc.text, doc.filePath))
  );
}

/**
 * Get human-readable label for document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    receipt: "Receipt",
    bank_statement: "Bank Statement",
    dividend_statement: "Dividend Statement",
    invoice: "Invoice",
    contract: "Contract",
    unknown: "Unknown Document"
  };
  return labels[type];
}

/**
 * Get icon name for document type
 */
export function getDocumentTypeIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    receipt: "Receipt",
    bank_statement: "Banknote",
    dividend_statement: "TrendingUp",
    invoice: "FileText",
    contract: "FileSignature",
    unknown: "FileQuestion"
  };
  return icons[type];
}

/**
 * Check if confidence is acceptable for automatic processing
 */
export function isConfidenceAcceptable(confidence: number): boolean {
  return confidence >= CONFIDENCE_MEDIUM;
}

/**
 * Get recommended action based on confidence
 */
export function getRecommendedAction(
  result: DocumentTypeResult
): "accept" | "review" | "manual" {
  if (result.confidence >= CONFIDENCE_HIGH) return "accept";
  if (result.confidence >= CONFIDENCE_LOW) return "review";
  return "manual";
}

/**
 * Extract text from a file using Tauri backend
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  try {
    const text = await invoke<string>("extract_text_from_document", {
      filePath,
    });
    return text;
  } catch (error) {
    console.error("Text extraction failed:", error);
    throw new Error(`Failed to extract text: ${error}`);
  }
}

/**
 * Full document processing pipeline
 * Extracts text and detects type in one call
 */
export async function processDocument(filePath: string): Promise<{
  filePath: string;
  result: DocumentTypeResult;
  text: string;
}> {
  const text = await extractTextFromFile(filePath);
  const result = await detectDocumentType(text, filePath);
  
  return {
    filePath,
    result,
    text
  };
}

/**
 * Export detection results to JSON
 */
export function exportDetectionResults(
  results: Array<{ filePath: string; result: DocumentTypeResult }>
): string {
  return JSON.stringify(
    results.map(r => ({
      file: r.filePath,
      type: r.result.type,
      confidence: r.result.confidence,
      method: r.result.method,
      recommendedAction: getRecommendedAction(r.result)
    })),
    null,
    2
  );
}
