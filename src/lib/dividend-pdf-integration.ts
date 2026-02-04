/**
 * Dividend PDF Parser
 * PDF parsing integration for dividend statements
 * 
 * Supports: Computershare, Link Market Services, BoardRoom, Direct company statements
 */

import {
  parseDividendStatement,
  type ParseResult,
  type ParsedDividend,
  type BatchParseResult,
  type RegistryProvider,
} from './dividend-pdf-parser';

// ============================================================================
// TYPES
// ============================================================================

export interface ParserProgress {
  status: 'idle' | 'reading' | 'extracting' | 'parsing' | 'complete' | 'error';
  progress: number; // 0-100
  message?: string;
  pageCount?: number;
}

export interface DividendParseOptions {
  provider?: RegistryProvider;
  onProgress?: (progress: ParserProgress) => void;
  maxPages?: number;
}

export interface DividendPDFResult {
  success: boolean;
  dividend?: ParsedDividend;
  errors: string[];
  warnings: string[];
  provider: RegistryProvider;
  processingTimeMs: number;
}

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

/**
 * Extract text from PDF buffer
 * In production, this calls Tauri commands. In browser, it uses a fallback.
 */
async function extractTextFromPDF(
  pdfBuffer: ArrayBuffer,
  onProgress?: (progress: ParserProgress) => void
): Promise<{ text: string; pageCount: number }> {
  onProgress?.({
    status: 'reading',
    progress: 10,
    message: 'Reading PDF file...',
  });

  // Check if we're in a Tauri environment
  const isTauri = typeof window !== 'undefined' && 
                  typeof (window as { __TAURI__?: unknown }).__TAURI__ !== 'undefined';

  if (!isTauri) {
    // Browser development mode - return empty text
    // The actual text extraction would need pdf.js or similar in browser
    onProgress?.({
      status: 'extracting',
      progress: 50,
      message: 'PDF extraction requires Tauri environment or pdf.js library',
    });

    // For now, throw error to indicate this needs proper implementation
    throw new Error(
      'PDF text extraction requires Tauri desktop environment. ' +
      'For web usage, integrate pdf.js or similar library.'
    );
  }

  // In production Tauri app, invoke Rust command
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    onProgress?.({
      status: 'extracting',
      progress: 40,
      message: 'Extracting text from PDF...',
    });

    const result = await invoke<{ text: string; pageCount: number }>('extract_pdf_text', {
      buffer: Array.from(new Uint8Array(pdfBuffer)),
    });

    onProgress?.({
      status: 'extracting',
      progress: 80,
      pageCount: result.pageCount,
      message: `Extracted text from ${result.pageCount} page(s)`,
    });

    return result;
  } catch (error) {
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// MAIN PARSER FUNCTIONS
// ============================================================================

/**
 * Parse a dividend statement PDF
 */
export async function parseDividendPDF(
  pdfBuffer: ArrayBuffer,
  filename: string,
  options: DividendParseOptions = {}
): Promise<DividendPDFResult> {
  const { onProgress } = options;
  const startTime = performance.now();

  try {
    // Extract text from PDF
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer, onProgress);

    onProgress?.({
      status: 'parsing',
      progress: 85,
      pageCount,
      message: 'Parsing dividend details...',
    });

    // Parse the extracted text
    const result = parseDividendStatement(text);

    onProgress?.({
      status: 'complete',
      progress: 100,
      pageCount,
      message: result.success 
        ? `Successfully parsed dividend from ${result.dividend?.companyName || 'unknown company'}`
        : 'Parsing completed with errors',
    });

    return {
      ...result,
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown PDF parsing error';
    
    onProgress?.({
      status: 'error',
      progress: 0,
      message: errorMessage,
    });

    return {
      success: false,
      errors: [errorMessage],
      warnings: [],
      provider: 'unknown',
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Parse dividend statement from pre-extracted text
 * Useful when text is already available (e.g., from OCR or paste)
 */
export function parseDividendText(
  text: string,
  options: { onProgress?: (progress: ParserProgress) => void } = {}
): DividendPDFResult {
  const { onProgress } = options;
  const startTime = performance.now();

  onProgress?.({
    status: 'parsing',
    progress: 50,
    message: 'Parsing dividend details from text...',
  });

  const result = parseDividendStatement(text);

  onProgress?.({
    status: result.success ? 'complete' : 'error',
    progress: 100,
    message: result.success 
      ? `Successfully parsed dividend from ${result.dividend?.companyName || 'unknown company'}`
      : 'Parsing completed with errors',
  });

  return {
    ...result,
    processingTimeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Parse multiple dividend PDFs
 */
export async function batchParseDividendPDFs(
  files: { buffer: ArrayBuffer; filename: string }[],
  options: DividendParseOptions = {}
): Promise<BatchParseResult & { totalProcessingTimeMs: number }> {
  const startTime = performance.now();
  const results: DividendPDFResult[] = [];
  const dividends: ParsedDividend[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileOptions: DividendParseOptions = {
      ...options,
      onProgress: (progress) => {
        options.onProgress?.({
          ...progress,
          message: `[${i + 1}/${files.length}] ${file.filename}: ${progress.message}`,
        });
      },
    };

    const result = await parseDividendPDF(file.buffer, file.filename, fileOptions);
    results.push(result);

    if (result.success && result.dividend) {
      dividends.push(result.dividend);
    }
  }

  return {
    total: files.length,
    successful: dividends.length,
    failed: files.length - dividends.length,
    results,
    dividends,
    totalDividendAmount: dividends.reduce((sum, d) => sum + d.dividendAmount, 0),
    totalFrankingCredits: dividends.reduce((sum, d) => sum + d.frankingCredits, 0),
    totalProcessingTimeMs: Math.round(performance.now() - startTime),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a file is a valid PDF
 */
export function validateDividendPDF(pdfBuffer: ArrayBuffer): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (pdfBuffer.byteLength === 0) {
    errors.push('PDF file is empty');
    return { valid: false, errors };
  }

  // Check PDF magic number (%PDF-)
  const header = new Uint8Array(pdfBuffer.slice(0, 5));
  const pdfHeader = '%PDF-';
  const isValidPDF = header.every((byte, i) => byte === pdfHeader.charCodeAt(i));

  if (!isValidPDF) {
    errors.push('File is not a valid PDF');
    return { valid: false, errors };
  }

  // Size check (50MB max)
  const maxSize = 50 * 1024 * 1024;
  if (pdfBuffer.byteLength > maxSize) {
    errors.push(`PDF file is too large (${(pdfBuffer.byteLength / 1024 / 1024).toFixed(1)}MB, max 50MB)`);
    return { valid: false, errors };
  }

  return { valid: true, errors };
}

/**
 * Detect registry provider from PDF
 */
export async function detectDividendProvider(
  pdfBuffer: ArrayBuffer
): Promise<RegistryProvider | null> {
  try {
    const { text } = await extractTextFromPDF(pdfBuffer);
    
    // Use the same patterns from dividend-pdf-parser
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

    let bestProvider: RegistryProvider = 'unknown';
    let bestScore = 0;

    for (const [provider, score] of Object.entries(scores) as [RegistryProvider, number][]) {
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    return bestProvider;
  } catch {
    return null;
  }
}

// Re-export types for convenience
export type { ParsedDividend, ParseResult, BatchParseResult, RegistryProvider };
export {
  formatDividend,
  exportToCSV,
  groupByFinancialYear,
  calculateTaxSummary,
} from './dividend-pdf-parser';
