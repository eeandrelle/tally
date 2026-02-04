/**
 * PDF Bank Statement Parser
 * PDF parsing integration for bank statements
 * 
 * NOTE: This is a stub implementation for browser/Tauri environment.
 * In production, PDF parsing should be done via Tauri commands or 
 * a browser-compatible PDF library.
 */

import type { BankName, ParseResult, ParserProgress } from './bank-statement-types';
import { parseBankStatement, validateStatement } from './bank-statement-parser';
import { detectBankFromText } from './bank-parser-configs';

// Progress callback type
export type ProgressCallback = (progress: ParserProgress) => void;

// PDF parsing options
export interface PDFParseOptions {
  bankName?: BankName;
  onProgress?: ProgressCallback;
  maxPages?: number;
}

// Mock text extraction for development/testing
// In production, this would call Tauri commands
async function extractTextFromPDF(
  pdfBuffer: ArrayBuffer,
  onProgress?: ProgressCallback
): Promise<{ text: string; pageCount: number }> {
  // Report reading progress
  onProgress?.({
    status: 'reading',
    progress: 0,
    message: 'Reading PDF file...',
  });
  
  // For development/testing, we'll throw an error that suggests using Tauri
  // In a real implementation, this would call Tauri to parse the PDF
  
  // Check if we're in a Tauri environment
  const isTauri = typeof window !== 'undefined' && 
                  typeof (window as { __TAURI__?: unknown }).__TAURI__ !== 'undefined';
  
  if (!isTauri) {
    // For browser-only development, return a mock extraction
    // This allows UI testing without actual PDF parsing
    onProgress?.({
      status: 'extracting',
      progress: 50,
      message: 'PDF extraction requires Tauri environment',
    });
    
    // Return empty text - the parser will fail with bank detection error
    return { text: '', pageCount: 1 };
  }
  
  // In production with Tauri, we would invoke a Rust command
  // const { invoke } = await import('@tauri-apps/api/core');
  // const result = await invoke('parse_pdf', { buffer: Array.from(new Uint8Array(pdfBuffer)) });
  
  throw new Error('PDF parsing requires Tauri. Please use the desktop app or implement a Tauri command.');
}

// Main PDF parse function
export async function parsePDFBankStatement(
  pdfBuffer: ArrayBuffer,
  filename: string,
  options: PDFParseOptions = {}
): Promise<ParseResult> {
  const { bankName, onProgress, maxPages } = options;
  
  try {
    // Extract text from PDF
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer, onProgress);
    
    // Check if we exceeded max pages
    if (maxPages && pageCount > maxPages) {
      return {
        success: false,
        error: {
          code: 'PAGE_LIMIT_EXCEEDED',
          message: `Statement has ${pageCount} pages, exceeding limit of ${maxPages} pages`,
        },
        warnings: [],
        stats: {
          linesProcessed: 0,
          transactionsFound: 0,
          transactionsParsed: 0,
          transactionsSkipped: 0,
          dateParseErrors: 0,
          amountParseErrors: 0,
          processingTimeMs: 0,
        },
      };
    }
    
    // Report parsing progress
    onProgress?.({
      status: 'parsing',
      progress: 95,
      totalPages: pageCount,
      message: 'Parsing transactions...',
    });
    
    // Parse the extracted text
    const result = parseBankStatement(text, filename, bankName);
    
    // Update page count
    if (result.statement) {
      result.statement.pageCount = pageCount;
    }
    
    // Report complete
    onProgress?.({
      status: 'complete',
      progress: 100,
      totalPages: pageCount,
      message: `Successfully parsed ${result.statement?.transactions.length || 0} transactions`,
    });
    
    return result;
  } catch (error) {
    onProgress?.({
      status: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      error: {
        code: 'PDF_PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to parse PDF',
      },
      warnings: [],
      stats: {
        linesProcessed: 0,
        transactionsFound: 0,
        transactionsParsed: 0,
        transactionsSkipped: 0,
        dateParseErrors: 0,
        amountParseErrors: 0,
        processingTimeMs: 0,
      },
    };
  }
}

// Detect bank from PDF
export async function detectBankFromPDF(pdfBuffer: ArrayBuffer): Promise<BankName | null> {
  try {
    const { text } = await extractTextFromPDF(pdfBuffer);
    return detectBankFromText(text);
  } catch {
    return null;
  }
}

// Validate PDF is a bank statement
export async function validatePDFBankStatement(
  pdfBuffer: ArrayBuffer,
  expectedBank?: BankName
): Promise<{ valid: boolean; bank?: BankName; errors: string[] }> {
  const errors: string[] = [];
  
  // For development, we'll accept any valid PDF structure
  // In production, this would validate the actual PDF content
  
  if (pdfBuffer.byteLength === 0) {
    errors.push('PDF file is empty');
    return { valid: false, errors };
  }
  
  // Check PDF magic number
  const header = new Uint8Array(pdfBuffer.slice(0, 5));
  const pdfHeader = '%PDF-';
  const isValidPDF = header.every((byte, i) => byte === pdfHeader.charCodeAt(i));
  
  if (!isValidPDF) {
    errors.push('File is not a valid PDF');
    return { valid: false, errors };
  }
  
  // Size check
  if (pdfBuffer.byteLength > 50 * 1024 * 1024) {
    errors.push('PDF file is too large (max 50MB)');
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [] };
}

// Batch parse multiple PDFs
export async function batchParsePDFStatements(
  files: { buffer: ArrayBuffer; filename: string }[],
  options: PDFParseOptions = {}
): Promise<{ results: ParseResult[]; succeeded: number; failed: number }> {
  const results: ParseResult[] = [];
  let succeeded = 0;
  let failed = 0;
  
  for (const file of files) {
    const result = await parsePDFBankStatement(file.buffer, file.filename, options);
    results.push(result);
    
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }
  
  return { results, succeeded, failed };
}
