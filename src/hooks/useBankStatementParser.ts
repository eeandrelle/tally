/**
 * useBankStatementParser Hook
 * React hook for parsing bank statements from PDFs
 */

import { useState, useCallback, useRef } from 'react';
import type {
  BankName,
  ParsedStatement,
  ParseResult,
  ParserProgress,
} from '../lib/bank-statement-types';
import { parsePDFBankStatement, type PDFParseOptions } from '../lib/bank-pdf-parser';

// ============= HOOK: useBankStatementParser =============

interface UseBankStatementParserReturn {
  // Current state
  result: ParseResult | null;
  progress: ParserProgress;
  
  // Loading states
  isParsing: boolean;
  isComplete: boolean;
  error: Error | null;
  
  // Actions
  parsePDF: (file: File, bankName?: BankName) => Promise<ParsedStatement | null>;
  parseBuffer: (buffer: ArrayBuffer, filename: string, bankName?: BankName) => Promise<ParsedStatement | null>;
  reset: () => void;
}

export function useBankStatementParser(): UseBankStatementParserReturn {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [progress, setProgress] = useState<ParserProgress>({
    status: 'idle',
    progress: 0,
  });
  const [isParsing, setIsParsing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to prevent stale closures in callbacks
  const isParsingRef = useRef(false);
  
  const handleProgress = useCallback((progressUpdate: ParserProgress) => {
    setProgress(progressUpdate);
  }, []);
  
  const parseBuffer = useCallback(async (
    buffer: ArrayBuffer,
    filename: string,
    bankName?: BankName
  ): Promise<ParsedStatement | null> => {
    if (isParsingRef.current) {
      throw new Error('Parsing already in progress');
    }
    
    isParsingRef.current = true;
    setIsParsing(true);
    setIsComplete(false);
    setError(null);
    setResult(null);
    
    try {
      const options: PDFParseOptions = {
        bankName,
        onProgress: handleProgress,
      };
      
      const parseResult = await parsePDFBankStatement(buffer, filename, options);
      
      setResult(parseResult);
      
      if (!parseResult.success) {
        const errorMessage = parseResult.error?.message || 'Failed to parse statement';
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
        message: `Successfully parsed ${parseResult.statement?.transactions.length || 0} transactions`,
      });
      
      return parseResult.statement || null;
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
  
  const parsePDF = useCallback(async (
    file: File,
    bankName?: BankName
  ): Promise<ParsedStatement | null> => {
    try {
      const buffer = await file.arrayBuffer();
      return await parseBuffer(buffer, file.name, bankName);
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
  
  const reset = useCallback(() => {
    isParsingRef.current = false;
    setResult(null);
    setProgress({ status: 'idle', progress: 0 });
    setIsParsing(false);
    setIsComplete(false);
    setError(null);
  }, []);
  
  return {
    result,
    progress,
    isParsing,
    isComplete,
    error,
    parsePDF,
    parseBuffer,
    reset,
  };
}
