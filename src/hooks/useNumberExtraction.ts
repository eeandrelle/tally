/**
 * React Hooks for Smart Number Extraction (TAL-102)
 * 
 * Provides easy-to-use hooks for extracting numbers from documents in React components:
 * - useNumberExtraction: Single document extraction
 * - useBatchNumberExtraction: Multiple document batch extraction
 */

import { useState, useCallback, useMemo } from "react";
import {
  extractNumbers,
  extractNumbersBatch,
  extractFromDocument,
  type ExtractedNumber,
  type ExtractionResult,
  type ExtractionOptions,
  type NumberType,
} from "../lib/number-extraction";

export interface UseNumberExtractionOptions extends ExtractionOptions {
  onSuccess?: (result: ExtractionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseNumberExtractionReturn {
  numbers: ExtractedNumber[];
  summary: ExtractionResult["summary"] | null;
  isExtracting: boolean;
  error: Error | null;
  extract: (text: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for extracting numbers from a single document
 */
export function useNumberExtraction(
  options: UseNumberExtractionOptions = {}
): UseNumberExtractionReturn {
  const [numbers, setNumbers] = useState<ExtractedNumber[]>([]);
  const [summary, setSummary] = useState<ExtractionResult["summary"] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError, ...extractionOptions } = options;

  const extract = useCallback(
    async (text: string) => {
      setIsExtracting(true);
      setError(null);

      try {
        const result = await extractNumbers(text, extractionOptions);
        setNumbers(result.numbers);
        setSummary(result.summary);
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsExtracting(false);
      }
    },
    [extractionOptions, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setNumbers([]);
    setSummary(null);
    setError(null);
  }, []);

  return {
    numbers,
    summary,
    isExtracting,
    error,
    extract,
    reset,
  };
}

export interface UseBatchNumberExtractionOptions extends ExtractionOptions {
  onSuccess?: (results: Map<string, ExtractionResult>) => void;
  onError?: (error: Error) => void;
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchDocument {
  id: string;
  text: string;
}

export interface UseBatchNumberExtractionReturn {
  results: Map<string, ExtractionResult>;
  isExtracting: boolean;
  progress: { completed: number; total: number };
  error: Error | null;
  extract: (documents: BatchDocument[]) => Promise<void>;
  getResult: (id: string) => ExtractionResult | undefined;
  reset: () => void;
}

/**
 * Hook for batch extracting numbers from multiple documents
 */
export function useBatchNumberExtraction(
  options: UseBatchNumberExtractionOptions = {}
): UseBatchNumberExtractionReturn {
  const [results, setResults] = useState<Map<string, ExtractionResult>>(new Map());
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError, onProgress, ...extractionOptions } = options;

  const extract = useCallback(
    async (documents: BatchDocument[]) => {
      setIsExtracting(true);
      setError(null);
      setProgress({ completed: 0, total: documents.length });

      try {
        const newResults = new Map<string, ExtractionResult>();
        
        // Process documents sequentially to allow progress tracking
        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          const result = await extractNumbers(doc.text, extractionOptions);
          newResults.set(doc.id, result);
          
          setProgress({ completed: i + 1, total: documents.length });
          onProgress?.(i + 1, documents.length);
        }

        setResults(newResults);
        onSuccess?.(newResults);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsExtracting(false);
      }
    },
    [extractionOptions, onSuccess, onError, onProgress]
  );

  const getResult = useCallback(
    (id: string) => results.get(id),
    [results]
  );

  const reset = useCallback(() => {
    setResults(new Map());
    setProgress({ completed: 0, total: 0 });
    setError(null);
  }, []);

  return {
    results,
    isExtracting,
    progress,
    error,
    extract,
    getResult,
    reset,
  };
}

export interface UseDocumentNumberExtractionOptions extends ExtractionOptions {
  documentType?: string;
  onSuccess?: (result: ExtractionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseDocumentNumberExtractionReturn {
  numbers: ExtractedNumber[];
  summary: ExtractionResult["summary"] | null;
  isExtracting: boolean;
  error: Error | null;
  extract: (text: string, documentType?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for extracting numbers with document type awareness
 */
export function useDocumentNumberExtraction(
  options: UseDocumentNumberExtractionOptions = {}
): UseDocumentNumberExtractionReturn {
  const [numbers, setNumbers] = useState<ExtractedNumber[]>([]);
  const [summary, setSummary] = useState<ExtractionResult["summary"] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { documentType: defaultDocType, onSuccess, onError, ...extractionOptions } = options;

  const extract = useCallback(
    async (text: string, documentType?: string) => {
      setIsExtracting(true);
      setError(null);

      try {
        const result = await extractFromDocument(
          text,
          documentType || defaultDocType,
          extractionOptions
        );
        setNumbers(result.numbers);
        setSummary(result.summary);
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsExtracting(false);
      }
    },
    [defaultDocType, extractionOptions, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setNumbers([]);
    setSummary(null);
    setError(null);
  }, []);

  return {
    numbers,
    summary,
    isExtracting,
    error,
    extract,
    reset,
  };
}

// Utility hooks for filtering extracted numbers

export function useFilteredNumbers(
  numbers: ExtractedNumber[],
  filters: {
    types?: NumberType[];
    minConfidence?: number;
    maxConfidence?: number;
  }
): ExtractedNumber[] {
  return useMemo(() => {
    return numbers.filter((num) => {
      if (filters.types && !filters.types.includes(num.type)) return false;
      if (filters.minConfidence !== undefined && num.confidence < filters.minConfidence) return false;
      if (filters.maxConfidence !== undefined && num.confidence > filters.maxConfidence) return false;
      return true;
    });
  }, [numbers, filters]);
}

export function useNumbersByType(
  numbers: ExtractedNumber[]
): Record<NumberType, ExtractedNumber[]> {
  return useMemo(() => {
    const byType: Record<NumberType, ExtractedNumber[]> = {
      amount: [],
      date: [],
      abn: [],
      acn: [],
      account_number: [],
      invoice_number: [],
      gst: [],
      tax: [],
      percentage: [],
      quantity: [],
      unknown: [],
    };

    for (const num of numbers) {
      byType[num.type].push(num);
    }

    return byType;
  }, [numbers]);
}

export function useTotalAmount(numbers: ExtractedNumber[]): number | undefined {
  return useMemo(() => {
    const amounts = numbers
      .filter((n) => n.type === "amount" && typeof n.normalized === "number")
      .map((n) => n.normalized as number);

    if (amounts.length === 0) return undefined;

    // Find the largest amount (likely the total)
    return Math.max(...amounts);
  }, [numbers]);
}

export function usePrimaryAbn(numbers: ExtractedNumber[]): string | undefined {
  return useMemo(() => {
    const abns = numbers.filter(
      (n) => n.type === "abn" && n.confidence > 0.9
    );
    return abns[0]?.normalized as string | undefined;
  }, [numbers]);
}

export default {
  useNumberExtraction,
  useBatchNumberExtraction,
  useDocumentNumberExtraction,
  useFilteredNumbers,
  useNumbersByType,
  useTotalAmount,
  usePrimaryAbn,
};
