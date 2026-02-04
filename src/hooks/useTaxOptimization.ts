/**
 * useTaxOptimization Hook
 * 
 * React hook for integrating the Tax Optimization Engine into components.
 * Provides reactive state management for optimization opportunities.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  runOptimizationEngine,
  checkOpportunityType,
  getTopOpportunities,
  exportOpportunitiesForAccountant,
  type UserProfile,
  type ExpenseHistory,
  type OptimizationResult,
  type OptimizationOpportunity,
  type PatternMatch
} from '../lib/tax-optimization';

export interface UseTaxOptimizationOptions {
  autoRun?: boolean;
}

export interface UseTaxOptimizationReturn {
  // State
  result: OptimizationResult | null;
  isAnalyzing: boolean;
  error: Error | null;
  
  // Actions
  runAnalysis: (profile: UserProfile, history: ExpenseHistory, allHistory?: ExpenseHistory[]) => void;
  runAnalysisAsync: (profile: UserProfile, history: ExpenseHistory, allHistory?: ExpenseHistory[]) => Promise<void>;
  clearResults: () => void;
  
  // Computed
  opportunities: OptimizationOpportunity[];
  totalSavings: number;
  criticalOpportunities: OptimizationOpportunity[];
  highOpportunities: OptimizationOpportunity[];
  mediumOpportunities: OptimizationOpportunity[];
  lowOpportunities: OptimizationOpportunity[];
  patterns: PatternMatch[];
  
  // Filters
  getByCategory: (category: string) => OptimizationOpportunity[];
  getByType: (type: OptimizationOpportunity['type']) => OptimizationOpportunity[];
  getTopN: (n: number) => OptimizationOpportunity[];
  
  // Export
  exportReport: () => string;
  hasOpportunities: boolean;
}

/**
 * React hook for tax optimization analysis
 */
export function useTaxOptimization(options: UseTaxOptimizationOptions = {}): UseTaxOptimizationReturn {
  const { autoRun = false } = options;
  
  // State
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Run analysis synchronously
   */
  const runAnalysis = useCallback((
    profile: UserProfile,
    history: ExpenseHistory,
    allHistory?: ExpenseHistory[]
  ) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysisResult = runOptimizationEngine(profile, history, allHistory);
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Analysis failed'));
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);
  
  /**
   * Run analysis asynchronously (for non-blocking UI)
   */
  const runAnalysisAsync = useCallback(async (
    profile: UserProfile,
    history: ExpenseHistory,
    allHistory?: ExpenseHistory[]
  ): Promise<void> => {
    setIsAnalyzing(true);
    setError(null);
    
    // Use setTimeout to yield to main thread
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const analysisResult = runOptimizationEngine(profile, history, allHistory);
          setResult(analysisResult);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Analysis failed'));
          setResult(null);
        } finally {
          setIsAnalyzing(false);
          resolve();
        }
      }, 0);
    });
  }, []);
  
  /**
   * Clear all results
   */
  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);
  
  // Computed values
  const opportunities = useMemo(() => result?.opportunities ?? [], [result]);
  const totalSavings = useMemo(() => result?.totalPotentialSavings ?? 0, [result]);
  const patterns = useMemo(() => result?.patternsDetected ?? [], [result]);
  
  const criticalOpportunities = useMemo(() => 
    opportunities.filter(o => o.priority === 'critical'),
    [opportunities]
  );
  
  const highOpportunities = useMemo(() => 
    opportunities.filter(o => o.priority === 'high'),
    [opportunities]
  );
  
  const mediumOpportunities = useMemo(() => 
    opportunities.filter(o => o.priority === 'medium'),
    [opportunities]
  );
  
  const lowOpportunities = useMemo(() => 
    opportunities.filter(o => o.priority === 'low'),
    [opportunities]
  );
  
  /**
   * Get opportunities by category
   */
  const getByCategory = useCallback((category: string): OptimizationOpportunity[] => {
    return opportunities.filter(o => o.category === category);
  }, [opportunities]);
  
  /**
   * Get opportunities by type
   */
  const getByType = useCallback((type: OptimizationOpportunity['type']): OptimizationOpportunity[] => {
    return opportunities.filter(o => o.type === type);
  }, [opportunities]);
  
  /**
   * Get top N opportunities
   */
  const getTopN = useCallback((n: number): OptimizationOpportunity[] => {
    return opportunities.slice(0, n);
  }, [opportunities]);
  
  /**
   * Export report for accountant
   */
  const exportReport = useCallback((): string => {
    if (!result) return '';
    return exportOpportunitiesForAccountant(result);
  }, [result]);
  
  const hasOpportunities = opportunities.length > 0;
  
  return {
    // State
    result,
    isAnalyzing,
    error,
    
    // Actions
    runAnalysis,
    runAnalysisAsync,
    clearResults,
    
    // Computed
    opportunities,
    totalSavings,
    criticalOpportunities,
    highOpportunities,
    mediumOpportunities,
    lowOpportunities,
    patterns,
    
    // Filters
    getByCategory,
    getByType,
    getTopN,
    
    // Export
    exportReport,
    hasOpportunities
  };
}

/**
 * Hook for tracking a single opportunity's action items
 */
export function useOpportunityTracker(opportunity: OptimizationOpportunity | null) {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  
  const toggleAction = useCallback((action: string) => {
    setCompletedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(action)) {
        newSet.delete(action);
      } else {
        newSet.add(action);
      }
      return newSet;
    });
  }, []);
  
  const isCompleted = useCallback((action: string): boolean => {
    return completedActions.has(action);
  }, [completedActions]);
  
  const progress = useMemo(() => {
    if (!opportunity || opportunity.actionItems.length === 0) return 0;
    return Math.round((completedActions.size / opportunity.actionItems.length) * 100);
  }, [completedActions, opportunity]);
  
  const reset = useCallback(() => {
    setCompletedActions(new Set());
  }, []);
  
  return {
    completedActions: Array.from(completedActions),
    toggleAction,
    isCompleted,
    progress,
    reset
  };
}

/**
 * Hook for filtering and sorting opportunities
 */
export function useOpportunityFilter(opportunities: OptimizationOpportunity[]) {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<OptimizationOpportunity['type'] | null>(null);
  const [filterPriority, setFilterPriority] = useState<OptimizationOpportunity['priority'] | null>(null);
  const [sortBy, setSortBy] = useState<'savings' | 'priority' | 'confidence'>('priority');
  
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];
    
    if (filterCategory) {
      filtered = filtered.filter(o => o.category === filterCategory);
    }
    
    if (filterType) {
      filtered = filtered.filter(o => o.type === filterType);
    }
    
    if (filterPriority) {
      filtered = filtered.filter(o => o.priority === filterPriority);
    }
    
    // Sort
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'savings':
          return b.estimatedSavings - a.estimatedSavings;
        case 'priority':
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'confidence':
          return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [opportunities, filterCategory, filterType, filterPriority, sortBy]);
  
  const categories = useMemo(() => {
    const cats = new Set(opportunities.map(o => o.category));
    return Array.from(cats);
  }, [opportunities]);
  
  const types = useMemo(() => {
    const t = new Set(opportunities.map(o => o.type));
    return Array.from(t);
  }, [opportunities]);
  
  const clearFilters = useCallback(() => {
    setFilterCategory(null);
    setFilterType(null);
    setFilterPriority(null);
  }, []);
  
  return {
    filteredOpportunities,
    categories,
    types,
    filterCategory,
    setFilterCategory,
    filterType,
    setFilterType,
    filterPriority,
    setFilterPriority,
    sortBy,
    setSortBy,
    clearFilters,
    hasActiveFilters: filterCategory !== null || filterType !== null || filterPriority !== null
  };
}

export default useTaxOptimization;
