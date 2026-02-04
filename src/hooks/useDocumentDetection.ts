/**
 * React Hook for Document Type Detection
 * 
 * Usage:
 * ```tsx
 * const { detect, result, isDetecting, error } = useDocumentDetection();
 * 
 * useEffect(() => {
 *   if (fileText) {
 *     detect(fileText, filePath);
 *   }
 * }, [fileText]);
 * ```
 */

import { useState, useCallback } from "react";
import {
  detectDocumentType,
  processDocument,
  DocumentTypeResult,
  DocumentType,
  getRecommendedAction,
  isConfidenceAcceptable,
  getDocumentTypeLabel,
  getDocumentTypeIcon,
} from "../lib/document-detection";

interface UseDocumentDetectionReturn {
  // State
  result: DocumentTypeResult | null;
  isDetecting: boolean;
  error: string | null;
  
  // Actions
  detect: (text: string, filePath?: string) => Promise<void>;
  detectFromFile: (filePath: string) => Promise<void>;
  reset: () => void;
  
  // Helpers
  shouldReview: boolean;
  canAutoProcess: boolean;
  documentLabel: string;
  documentIcon: string;
  confidenceLevel: "high" | "medium" | "low";
}

export function useDocumentDetection(): UseDocumentDetectionReturn {
  const [result, setResult] = useState<DocumentTypeResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (text: string, filePath?: string) => {
    setIsDetecting(true);
    setError(null);
    
    try {
      const detectionResult = await detectDocumentType(text, filePath);
      setResult(detectionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
      setResult(null);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const detectFromFile = useCallback(async (filePath: string) => {
    setIsDetecting(true);
    setError(null);
    
    try {
      const processed = await processDocument(filePath);
      setResult(processed.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setResult(null);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsDetecting(false);
  }, []);

  // Computed properties
  const shouldReview = result ? getRecommendedAction(result) === "review" : false;
  const canAutoProcess = result ? isConfidenceAcceptable(result.confidence) : false;
  const documentLabel = result ? getDocumentTypeLabel(result.type) : "Unknown";
  const documentIcon = result ? getDocumentTypeIcon(result.type) : "FileQuestion";
  
  const confidenceLevel: "high" | "medium" | "low" = result
    ? result.confidence >= 0.85
      ? "high"
      : result.confidence >= 0.60
      ? "medium"
      : "low"
    : "low";

  return {
    result,
    isDetecting,
    error,
    detect,
    detectFromFile,
    reset,
    shouldReview,
    canAutoProcess,
    documentLabel,
    documentIcon,
    confidenceLevel,
  };
}

/**
 * Hook for batch document detection
 */
interface BatchDetectionState {
  results: Array<{ filePath: string; result: DocumentTypeResult | null; error?: string }>;
  isProcessing: boolean;
  progress: number;
  currentFile: string | null;
}

interface UseBatchDocumentDetectionReturn extends BatchDetectionState {
  processBatch: (filePaths: string[]) => Promise<void>;
  reset: () => void;
  acceptedCount: number;
  reviewCount: number;
  manualCount: number;
}

export function useBatchDocumentDetection(): UseBatchDocumentDetectionReturn {
  const [state, setState] = useState<BatchDetectionState>({
    results: [],
    isProcessing: false,
    progress: 0,
    currentFile: null,
  });

  const processBatch = useCallback(async (filePaths: string[]) => {
    setState({
      results: filePaths.map(fp => ({ filePath: fp, result: null })),
      isProcessing: true,
      progress: 0,
      currentFile: null,
    });

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      setState(prev => ({ ...prev, currentFile: filePath }));

      try {
        const processed = await processDocument(filePath);
        setState(prev => ({
          ...prev,
          results: prev.results.map(r =>
            r.filePath === filePath
              ? { filePath, result: processed.result }
              : r
          ),
          progress: ((i + 1) / filePaths.length) * 100,
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          results: prev.results.map(r =>
            r.filePath === filePath
              ? { filePath, result: null, error: err instanceof Error ? err.message : "Failed" }
              : r
          ),
          progress: ((i + 1) / filePaths.length) * 100,
        }));
      }
    }

    setState(prev => ({
      ...prev,
      isProcessing: false,
      currentFile: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      results: [],
      isProcessing: false,
      progress: 0,
      currentFile: null,
    });
  }, []);

  // Count by action type
  const acceptedCount = state.results.filter(
    r => r.result && getRecommendedAction(r.result) === "accept"
  ).length;
  const reviewCount = state.results.filter(
    r => r.result && getRecommendedAction(r.result) === "review"
  ).length;
  const manualCount = state.results.filter(
    r => !r.result || getRecommendedAction(r.result) === "manual"
  ).length;

  return {
    ...state,
    processBatch,
    reset,
    acceptedCount,
    reviewCount,
    manualCount,
  };
}
