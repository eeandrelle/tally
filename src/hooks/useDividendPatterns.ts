/**
 * useDividendPatterns Hooks
 * 
 * React hooks for dividend pattern detection and analysis
 * Provides:
 * - useDividendPatterns: Analyze and retrieve patterns
 * - usePatternDetection: Run detection on holdings
 * - useExpectedDividends: Predict upcoming payments
 * 
 * @module useDividendPatterns
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import type {
  DividendPattern,
  PatternAnalysisResult,
  ExpectedDividend,
  PaymentFrequency,
  PatternConfidence,
  DividendPaymentRecord,
} from '../lib/dividend-patterns';
import {
  detectPattern,
  analyzePatterns,
  groupPaymentsByHolding,
  generateExpectedDividends,
  generateExpectedDividendCalendar,
} from '../lib/dividend-patterns';
import {
  saveDividendPattern,
  getAllDividendPatterns,
  getDividendPattern,
  getPatternsWithUpcomingPayments,
  getDividendPaymentHistory,
  syncPatternsFromDividendEntries,
  startPatternAnalysis,
  completePatternAnalysis,
  getPatternStatistics,
  getPatternAnalysisHistory,
} from '../lib/db-dividend-patterns';
import { getAllDividendEntries } from '../lib/db-franking-credits';

// ============================================================================
// HOOK: useDividendPatterns
// ============================================================================

interface UseDividendPatternsOptions {
  autoLoad?: boolean;
  autoAnalyze?: boolean;
}

interface UseDividendPatternsReturn {
  // Data
  patterns: DividendPattern[];
  selectedPattern: DividendPattern | null;
  
  // Statistics
  statistics: PatternStatistics | null;
  
  // Loading states
  isLoading: boolean;
  isAnalyzing: boolean;
  error: Error | null;
  
  // Actions
  loadPatterns: () => Promise<void>;
  refreshPatterns: () => Promise<void>;
  selectPattern: (holdingId: string) => Promise<void>;
  analyzeHolding: (holdingId: string) => Promise<void>;
  analyzeAll: () => Promise<void>;
  syncFromEntries: () => Promise<void>;
  clearSelection: () => void;
}

interface PatternStatistics {
  totalHoldings: number;
  byFrequency: Record<PaymentFrequency, number>;
  byConfidence: Record<PatternConfidence, number>;
  averageConfidence: number;
  upcomingPaymentsCount: number;
}

export function useDividendPatterns(
  options: UseDividendPatternsOptions = {}
): UseDividendPatternsReturn {
  const { autoLoad = true, autoAnalyze = false } = options;

  const [patterns, setPatterns] = useState<DividendPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<DividendPattern | null>(null);
  const [statistics, setStatistics] = useState<PatternStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all patterns
  const loadPatterns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedPatterns, stats] = await Promise.all([
        getAllDividendPatterns(),
        getPatternStatistics(),
      ]);

      setPatterns(loadedPatterns);
      setStatistics(stats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load patterns');
      setError(error);
      toast.error('Failed to load dividend patterns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh patterns
  const refreshPatterns = useCallback(async () => {
    await loadPatterns();
    toast.success('Patterns refreshed');
  }, [loadPatterns]);

  // Select a specific pattern
  const selectPattern = useCallback(async (holdingId: string) => {
    try {
      const pattern = await getDividendPattern(holdingId);
      setSelectedPattern(pattern);
    } catch (err) {
      toast.error('Failed to load pattern details');
    }
  }, []);

  // Analyze a single holding
  const analyzeHolding = useCallback(async (holdingId: string) => {
    setIsAnalyzing(true);

    try {
      // Get payment history for this holding
      const payments = await getDividendPaymentHistory(holdingId);

      if (payments.length === 0) {
        toast.error('No payment history found for this holding');
        return;
      }

      // Detect pattern
      const pattern = detectPattern(payments);

      if (pattern) {
        await saveDividendPattern(pattern);
        await loadPatterns();
        toast.success(`Pattern analyzed: ${pattern.frequency} (${pattern.confidence} confidence)`);
      } else {
        toast.warning('Could not detect pattern for this holding');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Analysis failed');
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [loadPatterns]);

  // Analyze all holdings
  const analyzeAll = useCallback(async () => {
    setIsAnalyzing(true);
    const analysisId = await startPatternAnalysis();
    const startTime = Date.now();

    try {
      // Get all dividend entries
      const entries = await getAllDividendEntries();

      // Group by holding
      const holdings = groupPaymentsByHolding(
        entries.map(e => ({
          id: e.id || 0,
          companyName: e.companyName,
          asxCode: undefined, // Would need to extract from company name or add to schema
          dividendAmount: e.dividendAmount,
          frankingPercentage: e.frankingPercentage,
          dateReceived: e.dateReceived,
          taxYear: e.taxYear,
        }))
      );

      // Analyze patterns
      const result = analyzePatterns(holdings);

      // Save all patterns
      for (const pattern of result.patterns) {
        await saveDividendPattern(pattern);
      }

      // Complete analysis record
      const duration = Date.now() - startTime;
      await completePatternAnalysis(
        analysisId,
        result.totalHoldings,
        result.patternsDetected,
        duration,
        result.errors
      );

      // Reload patterns
      await loadPatterns();

      if (result.errors.length > 0) {
        toast.warning(`Analysis completed with ${result.errors.length} errors`);
      } else {
        toast.success(`Analyzed ${result.patternsDetected} patterns`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Analysis failed');
      setError(error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [loadPatterns]);

  // Sync from dividend entries
  const syncFromEntries = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await syncPatternsFromDividendEntries();
      
      if (result.errors.length > 0) {
        toast.warning(`Synced with ${result.errors.length} errors`);
      } else {
        toast.success(`Synced ${result.paymentsSynced} payments for ${result.patternsCreated} holdings`);
      }

      // Auto-analyze if enabled
      if (autoAnalyze) {
        await analyzeAll();
      } else {
        await loadPatterns();
      }
    } catch (err) {
      toast.error('Failed to sync patterns');
    } finally {
      setIsLoading(false);
    }
  }, [autoAnalyze, analyzeAll, loadPatterns]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPattern(null);
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadPatterns();
    }
  }, [autoLoad, loadPatterns]);

  return {
    patterns,
    selectedPattern,
    statistics,
    isLoading,
    isAnalyzing,
    error,
    loadPatterns,
    refreshPatterns,
    selectPattern,
    analyzeHolding,
    analyzeAll,
    syncFromEntries,
    clearSelection,
  };
}

// ============================================================================
// HOOK: usePatternDetection
// ============================================================================

interface UsePatternDetectionOptions {
  onDetectionComplete?: (result: PatternAnalysisResult) => void;
}

interface UsePatternDetectionReturn {
  // State
  isDetecting: boolean;
  progress: number;
  currentHolding: string | null;
  result: PatternAnalysisResult | null;
  error: Error | null;
  
  // Actions
  runDetection: (payments: DividendPaymentRecord[]) => Promise<void>;
  runDetectionOnHoldings: (holdings: Map<string, DividendPaymentRecord[]>) => Promise<void>;
  runDetectionFromDatabase: () => Promise<void>;
  reset: () => void;
}

export function usePatternDetection(
  options: UsePatternDetectionOptions = {}
): UsePatternDetectionReturn {
  const { onDetectionComplete } = options;

  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentHolding, setCurrentHolding] = useState<string | null>(null);
  const [result, setResult] = useState<PatternAnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Run detection on a single set of payments
  const runDetection = useCallback(async (payments: DividendPaymentRecord[]) => {
    setIsDetecting(true);
    setProgress(0);
    setError(null);

    try {
      const holdings = groupPaymentsByHolding(payments);
      const analysisResult = analyzePatterns(holdings);

      // Save patterns
      for (const pattern of analysisResult.patterns) {
        await saveDividendPattern(pattern);
      }

      setResult(analysisResult);
      onDetectionComplete?.(analysisResult);

      toast.success(`Detected ${analysisResult.patternsDetected} patterns`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Detection failed');
      setError(error);
      toast.error(`Detection failed: ${error.message}`);
    } finally {
      setIsDetecting(false);
      setProgress(100);
    }
  }, [onDetectionComplete]);

  // Run detection on multiple holdings
  const runDetectionOnHoldings = useCallback(async (holdings: Map<string, DividendPaymentRecord[]>) => {
    setIsDetecting(true);
    setProgress(0);
    setError(null);

    try {
      const total = holdings.size;
      let processed = 0;

      for (const [holdingId, payments] of holdings) {
        setCurrentHolding(holdingId);
        
        const pattern = detectPattern(payments);
        
        if (pattern) {
          await saveDividendPattern(pattern);
        }

        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      const analysisResult: PatternAnalysisResult = {
        patterns: await getAllDividendPatterns(),
        analyzedAt: new Date().toISOString(),
        totalHoldings: total,
        patternsDetected: processed,
        errors: [],
      };

      setResult(analysisResult);
      onDetectionComplete?.(analysisResult);

      toast.success(`Analyzed ${total} holdings`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Detection failed');
      setError(error);
      toast.error(`Detection failed: ${error.message}`);
    } finally {
      setIsDetecting(false);
      setCurrentHolding(null);
    }
  }, [onDetectionComplete]);

  // Run detection from database entries
  const runDetectionFromDatabase = useCallback(async () => {
    setIsDetecting(true);
    setProgress(0);
    setError(null);

    try {
      // Start analysis
      const analysisId = await startPatternAnalysis();
      const startTime = Date.now();

      // Get all entries
      const entries = await getAllDividendEntries();

      // Group by holding
      const holdings = groupPaymentsByHolding(
        entries.map(e => ({
          id: e.id || 0,
          companyName: e.companyName,
          asxCode: undefined,
          dividendAmount: e.dividendAmount,
          frankingPercentage: e.frankingPercentage,
          dateReceived: e.dateReceived,
          taxYear: e.taxYear,
        }))
      );

      const total = holdings.size;
      let processed = 0;
      const errors: string[] = [];

      // Analyze each holding
      for (const [holdingId, payments] of holdings) {
        setCurrentHolding(holdingId);

        try {
          const pattern = detectPattern(payments);
          
          if (pattern) {
            await saveDividendPattern(pattern);
          }
        } catch (err) {
          errors.push(`${holdingId}: ${err instanceof Error ? err.message : String(err)}`);
        }

        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Complete analysis
      const duration = Date.now() - startTime;
      await completePatternAnalysis(analysisId, total, processed, duration, errors);

      // Load results
      const patterns = await getAllDividendPatterns();

      const analysisResult: PatternAnalysisResult = {
        patterns,
        analyzedAt: new Date().toISOString(),
        totalHoldings: total,
        patternsDetected: processed,
        errors,
      };

      setResult(analysisResult);
      onDetectionComplete?.(analysisResult);

      if (errors.length > 0) {
        toast.warning(`Analysis completed with ${errors.length} errors`);
      } else {
        toast.success(`Analyzed ${processed} holdings`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Detection failed');
      setError(error);
      toast.error(`Detection failed: ${error.message}`);
    } finally {
      setIsDetecting(false);
      setCurrentHolding(null);
    }
  }, [onDetectionComplete]);

  // Reset state
  const reset = useCallback(() => {
    setIsDetecting(false);
    setProgress(0);
    setCurrentHolding(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    isDetecting,
    progress,
    currentHolding,
    result,
    error,
    runDetection,
    runDetectionOnHoldings,
    runDetectionFromDatabase,
    reset,
  };
}

// ============================================================================
// HOOK: useExpectedDividends
// ============================================================================

interface UseExpectedDividendsOptions {
  lookAheadDays?: number;
  autoLoad?: boolean;
}

interface UseExpectedDividendsReturn {
  // Data
  expectedDividends: ExpectedDividend[];
  dividendCalendar: ExpectedDividend[];
  totalExpectedAmount: number;
  totalExpectedFrankingCredits: number;
  
  // Grouped by month
  byMonth: Map<string, ExpectedDividend[]>;
  
  // Loading state
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  loadExpectedDividends: () => Promise<void>;
  refresh: () => Promise<void>;
  getExpectedByHolding: (holdingId: string) => ExpectedDividend[];
}

export function useExpectedDividends(
  options: UseExpectedDividendsOptions = {}
): UseExpectedDividendsReturn {
  const { lookAheadDays = 90, autoLoad = true } = options;

  const [expectedDividends, setExpectedDividends] = useState<ExpectedDividend[]>([]);
  const [dividendCalendar, setDividendCalendar] = useState<ExpectedDividend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load expected dividends
  const loadExpectedDividends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get patterns with upcoming payments
      const patterns = await getPatternsWithUpcomingPayments(lookAheadDays);

      // Generate expected dividends
      const expected = generateExpectedDividends(patterns, lookAheadDays);
      setExpectedDividends(expected);

      // Generate full calendar
      const calendar = generateExpectedDividendCalendar(patterns);
      setDividendCalendar(calendar);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load expected dividends');
      setError(error);
      toast.error('Failed to load expected dividends');
    } finally {
      setIsLoading(false);
    }
  }, [lookAheadDays]);

  // Refresh expected dividends
  const refresh = useCallback(async () => {
    await loadExpectedDividends();
    toast.success('Expected dividends refreshed');
  }, [loadExpectedDividends]);

  // Get expected dividends for a specific holding
  const getExpectedByHolding = useCallback((holdingId: string) => {
    return expectedDividends.filter(d => d.id === holdingId);
  }, [expectedDividends]);

  // Calculate totals
  const totalExpectedAmount = useMemo(() => {
    return expectedDividends.reduce((sum, d) => sum + d.estimatedAmount, 0);
  }, [expectedDividends]);

  const totalExpectedFrankingCredits = useMemo(() => {
    return expectedDividends.reduce((sum, d) => sum + d.estimatedFrankingCredits, 0);
  }, [expectedDividends]);

  // Group by month
  const byMonth = useMemo(() => {
    const grouped = new Map<string, ExpectedDividend[]>();

    for (const dividend of expectedDividends) {
      const month = dividend.estimatedPaymentDate.slice(0, 7); // YYYY-MM

      if (!grouped.has(month)) {
        grouped.set(month, []);
      }

      grouped.get(month)!.push(dividend);
    }

    return grouped;
  }, [expectedDividends]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadExpectedDividends();
    }
  }, [autoLoad, loadExpectedDividends]);

  return {
    expectedDividends,
    dividendCalendar,
    totalExpectedAmount,
    totalExpectedFrankingCredits,
    byMonth,
    isLoading,
    error,
    loadExpectedDividends,
    refresh,
    getExpectedByHolding,
  };
}

// ============================================================================
// HOOK: usePatternHistory
// ============================================================================

interface UsePatternHistoryReturn {
  analysisHistory: Array<{
    id: string;
    analysisDate: string;
    totalHoldings: number;
    patternsDetected: number;
    analysisDurationMs: number;
    status: 'completed' | 'running' | 'failed';
    errorLog: string[];
    notes: string | null;
  }>;
  isLoading: boolean;
  loadHistory: () => Promise<void>;
}

export function usePatternHistory(): UsePatternHistoryReturn {
  const [analysisHistory, setAnalysisHistory] = useState<UsePatternHistoryReturn['analysisHistory']>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);

    try {
      const history = await getPatternAnalysisHistory(20);
      setAnalysisHistory(history);
    } catch (err) {
      toast.error('Failed to load analysis history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    analysisHistory,
    isLoading,
    loadHistory,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  PaymentFrequency,
  PatternConfidence,
  DividendPattern,
  PatternAnalysisResult,
  ExpectedDividend,
  DividendPaymentRecord,
};

// Re-export utility functions from lib
export {
  detectPattern,
  analyzePatterns,
  generateExpectedDividends,
  getFrequencyLabel,
  getConfidenceColor,
} from '../lib/dividend-patterns';

/**
 * Get badge variant for frequency
 */
export function getFrequencyBadgeVariant(frequency: PaymentFrequency): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<PaymentFrequency, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    monthly: 'default',
    quarterly: 'secondary',
    'half-yearly': 'secondary',
    yearly: 'outline',
    irregular: 'destructive',
    unknown: 'outline',
  };

  return variants[frequency];
}
