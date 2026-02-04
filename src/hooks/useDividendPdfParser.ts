/**
 * useDividendPdfParser Hook
 * React hook for parsing dividend statements from PDFs and text
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ParsedDividend,
  RegistryProvider,
  ParserProgress,
  DividendParseOptions,
  DividendPDFResult,
} from '../lib/dividend-pdf-integration';
import {
  parseDividendPDF,
  parseDividendText,
  validateDividendPDF,
  detectDividendProvider,
} from '../lib/dividend-pdf-integration';

// ============================================================================
// HOOK: useDividendPdfParser
// ============================================================================

export interface UseDividendPdfParserReturn {
  // Current state
  result: DividendPDFResult | null;
  progress: ParserProgress;
  
  // Loading states
  isParsing: boolean;
  isComplete: boolean;
  error: Error | null;
  
  // Parsed data (convenience)
  dividend: ParsedDividend | null;
  provider: RegistryProvider;
  confidence: number;
  
  // Actions
  parsePDF: (file: File) => Promise<ParsedDividend | null>;
  parseBuffer: (buffer: ArrayBuffer, filename: string) => Promise<ParsedDividend | null>;
  parseText: (text: string) => DividendPDFResult;
  detectProvider: (file: File) => Promise<RegistryProvider>;
  validateFile: (file: File) => Promise<{ valid: boolean; errors: string[] }>;
  reset: () => void;
}

export function useDividendPdfParser(): UseDividendPdfParserReturn {
  const [result, setResult] = useState<DividendPDFResult | null>(null);
  const [progress, setProgress] = useState<ParserProgress>({
    status: 'idle',
    progress: 0,
  });
  const [isParsing, setIsParsing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to prevent stale closures
  const isParsingRef = useRef(false);
  
  const handleProgress = useCallback((progressUpdate: ParserProgress) => {
    setProgress(progressUpdate);
  }, []);
  
  /**
   * Parse PDF from ArrayBuffer
   */
  const parseBuffer = useCallback(async (
    buffer: ArrayBuffer,
    filename: string
  ): Promise<ParsedDividend | null> => {
    if (isParsingRef.current) {
      throw new Error('Parsing already in progress');
    }
    
    isParsingRef.current = true;
    setIsParsing(true);
    setIsComplete(false);
    setError(null);
    setResult(null);
    
    try {
      const options: DividendParseOptions = {
        onProgress: handleProgress,
      };
      
      const parseResult = await parseDividendPDF(buffer, filename, options);
      
      setResult(parseResult);
      
      if (!parseResult.success) {
        const errorMessage = parseResult.errors.join(', ') || 'Failed to parse dividend statement';
        const err = new Error(errorMessage);
        setError(err);
        setProgress({
          status: 'error',
          progress: 0,
          message: errorMessage,
        });
        return null;
      }
      
      setIsComplete(true);
      setProgress({
        status: 'complete',
        progress: 100,
        message: `Successfully parsed dividend from ${parseResult.dividend?.companyName || 'unknown company'}`,
      });
      
      return parseResult.dividend || null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown parsing error');
      setError(error);
      setProgress({
        status: 'error',
        progress: 0,
        message: error.message,
      });
      return null;
    } finally {
      isParsingRef.current = false;
      setIsParsing(false);
    }
  }, [handleProgress]);
  
  /**
   * Parse PDF from File
   */
  const parsePDF = useCallback(async (file: File): Promise<ParsedDividend | null> => {
    try {
      const buffer = await file.arrayBuffer();
      return await parseBuffer(buffer, file.name);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to read file');
      setError(error);
      setProgress({
        status: 'error',
        progress: 0,
        message: error.message,
      });
      return null;
    }
  }, [parseBuffer]);
  
  /**
   * Parse text directly (useful for paste/preview scenarios)
   */
  const parseText = useCallback((text: string): DividendPDFResult => {
    setIsParsing(true);
    setIsComplete(false);
    setError(null);
    
    try {
      const parseResult = parseDividendText(text, {
        onProgress: handleProgress,
      });
      
      setResult(parseResult);
      
      if (!parseResult.success) {
        const errorMessage = parseResult.errors.join(', ') || 'Failed to parse dividend statement';
        setError(new Error(errorMessage));
      } else {
        setIsComplete(true);
      }
      
      return parseResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown parsing error');
      setError(error);
      const errorResult: DividendPDFResult = {
        success: false,
        errors: [error.message],
        warnings: [],
        provider: 'unknown',
        processingTimeMs: 0,
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsParsing(false);
    }
  }, [handleProgress]);
  
  /**
   * Detect provider from PDF file
   */
  const detectProvider = useCallback(async (file: File): Promise<RegistryProvider> => {
    try {
      const buffer = await file.arrayBuffer();
      return await detectDividendProvider(buffer) || 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);
  
  /**
   * Validate PDF file
   */
  const validateFile = useCallback(async (file: File): Promise<{ valid: boolean; errors: string[] }> => {
    try {
      const buffer = await file.arrayBuffer();
      return validateDividendPDF(buffer);
    } catch (err) {
      return {
        valid: false,
        errors: [err instanceof Error ? err.message : 'Failed to validate file'],
      };
    }
  }, []);
  
  /**
   * Reset parser state
   */
  const reset = useCallback(() => {
    isParsingRef.current = false;
    setResult(null);
    setProgress({ status: 'idle', progress: 0 });
    setIsParsing(false);
    setIsComplete(false);
    setError(null);
  }, []);
  
  // Computed values for convenience
  const dividend = result?.dividend || null;
  const provider = result?.provider || 'unknown';
  const confidence = dividend?.confidence || 0;
  
  return {
    // State
    result,
    progress,
    isParsing,
    isComplete,
    error,
    
    // Computed
    dividend,
    provider,
    confidence,
    
    // Actions
    parsePDF,
    parseBuffer,
    parseText,
    detectProvider,
    validateFile,
    reset,
  };
}

// ============================================================================
// HOOK: useMultipleDividendParsers (for batch processing)
// ============================================================================

export interface BatchParseState {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentFile: string | null;
  isProcessing: boolean;
}

export interface UseMultipleDividendParsersReturn {
  results: DividendPDFResult[];
  dividends: ParsedDividend[];
  state: BatchParseState;
  isProcessing: boolean;
  error: Error | null;
  parseFiles: (files: File[]) => Promise<ParsedDividend[]>;
  reset: () => void;
}

export function useMultipleDividendParsers(): UseMultipleDividendParsersReturn {
  const [results, setResults] = useState<DividendPDFResult[]>([]);
  const [dividends, setDividends] = useState<ParsedDividend[]>([]);
  const [state, setState] = useState<BatchParseState>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    currentFile: null,
    isProcessing: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const parseFiles = useCallback(async (files: File[]): Promise<ParsedDividend[]> => {
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setDividends([]);
    setState({
      total: files.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentFile: null,
      isProcessing: true,
    });
    
    const parsedDividends: ParsedDividend[] = [];
    const parseResults: DividendPDFResult[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setState(prev => ({
          ...prev,
          currentFile: file.name,
        }));
        
        try {
          const buffer = await file.arrayBuffer();
          const result = await parseDividendPDF(buffer, file.name);
          
          parseResults.push(result);
          
          if (result.success && result.dividend) {
            parsedDividends.push(result.dividend);
            setState(prev => ({
              ...prev,
              processed: i + 1,
              successful: prev.successful + 1,
            }));
          } else {
            setState(prev => ({
              ...prev,
              processed: i + 1,
              failed: prev.failed + 1,
            }));
          }
        } catch (err) {
          const errorResult: DividendPDFResult = {
            success: false,
            errors: [err instanceof Error ? err.message : 'Unknown error'],
            warnings: [],
            provider: 'unknown',
            processingTimeMs: 0,
          };
          parseResults.push(errorResult);
          setState(prev => ({
            ...prev,
            processed: i + 1,
            failed: prev.failed + 1,
          }));
        }
      }
      
      setResults(parseResults);
      setDividends(parsedDividends);
      
      return parsedDividends;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch parsing failed');
      setError(error);
      return parsedDividends;
    } finally {
      setIsProcessing(false);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentFile: null,
      }));
    }
  }, []);
  
  const reset = useCallback(() => {
    setResults([]);
    setDividends([]);
    setState({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      currentFile: null,
      isProcessing: false,
    });
    setIsProcessing(false);
    setError(null);
  }, []);
  
  return {
    results,
    dividends,
    state,
    isProcessing,
    error,
    parseFiles,
    reset,
  };
}

// Re-export types
export type { ParsedDividend, RegistryProvider, ParserProgress };
