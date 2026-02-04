/**
 * useCategorizationSuggestions Hook
 * 
 * React hook for managing categorization suggestions.
 * Provides reactive state management for suggestion review and application.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  generateSuggestions,
  filterSuggestions,
  calculateSuggestionAnalytics,
  applySuggestion,
  exportSuggestionsReport,
  type CategorizationSuggestion,
  type SuggestionFilter,
  type SuggestionStatus,
  type SuggestionType,
  type ReceiptForSuggestion,
  type SuggestionAnalytics,
} from '../lib/categorization-suggestions';
import type { UserProfile } from '../lib/tax-optimization';
import type { AtoCategoryCode } from '../lib/ato-categories';

export interface UseCategorizationSuggestionsOptions {
  autoGenerate?: boolean;
  receipts?: ReceiptForSuggestion[];
  profile?: UserProfile;
}

export interface UseCategorizationSuggestionsReturn {
  // State
  suggestions: CategorizationSuggestion[];
  isGenerating: boolean;
  error: Error | null;
  lastGeneratedAt: Date | null;
  hasOpportunities: boolean;
  
  // Actions
  generate: (receipts: ReceiptForSuggestion[], profile: UserProfile) => void;
  generateAsync: (receipts: ReceiptForSuggestion[], profile: UserProfile) => Promise<void>;
  acceptSuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
  ignoreSuggestion: (suggestionId: string) => void;
  resetSuggestion: (suggestionId: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  clearSuggestions: () => void;
  
  // Bulk operations
  acceptByType: (type: SuggestionType) => void;
  acceptByPriority: (priority: 'critical' | 'high' | 'medium' | 'low') => void;
  acceptHighConfidence: () => void;
  
  // Filters
  filteredSuggestions: CategorizationSuggestion[];
  setFilter: (filter: SuggestionFilter) => void;
  clearFilters: () => void;
  activeFilter: SuggestionFilter;
  hasActiveFilters: boolean;
  
  // Computed
  analytics: SuggestionAnalytics;
  pendingSuggestions: CategorizationSuggestion[];
  acceptedSuggestions: CategorizationSuggestion[];
  rejectedSuggestions: CategorizationSuggestion[];
  ignoredSuggestions: CategorizationSuggestion[];
  highImpactSuggestions: CategorizationSuggestion[];
  
  // Grouped
  byType: Record<SuggestionType, CategorizationSuggestion[]>;
  byPriority: Record<string, CategorizationSuggestion[]>;
  byCategory: Record<string, CategorizationSuggestion[]>;
  
  // Stats
  totalPotentialSavings: number;
  acceptedSavings: number;
  pendingSavings: number;
  
  // Export
  exportReport: () => string;
  getPendingChanges: () => { receiptId: number; newCategory: AtoCategoryCode | string; notes: string }[];
  
  // Learning data
  getLearningData: () => { acceptedPatterns: string[]; rejectedPatterns: string[] };
}

/**
 * React hook for managing categorization suggestions
 */
export function useCategorizationSuggestions(
  options: UseCategorizationSuggestionsOptions = {}
): UseCategorizationSuggestionsReturn {
  const { autoGenerate = false, receipts: initialReceipts, profile: initialProfile } = options;
  
  // State
  const [suggestions, setSuggestions] = useState<CategorizationSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<SuggestionFilter>({});
  
  // Auto-generate on mount if options provided
  useEffect(() => {
    if (autoGenerate && initialReceipts && initialProfile && suggestions.length === 0) {
      generate(initialReceipts, initialProfile);
    }
  }, [autoGenerate, initialReceipts, initialProfile]);
  
  /**
   * Generate suggestions synchronously
   */
  const generate = useCallback((
    receipts: ReceiptForSuggestion[],
    profile: UserProfile
  ) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const newSuggestions = generateSuggestions(receipts, profile);
      setSuggestions(newSuggestions.map(s => ({ ...s, status: 'pending' as SuggestionStatus })));
      setLastGeneratedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate suggestions'));
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  /**
   * Generate suggestions asynchronously
   */
  const generateAsync = useCallback(async (
    receipts: ReceiptForSuggestion[],
    profile: UserProfile
  ): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const newSuggestions = generateSuggestions(receipts, profile);
          setSuggestions(newSuggestions.map(s => ({ ...s, status: 'pending' as SuggestionStatus })));
          setLastGeneratedAt(new Date());
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to generate suggestions'));
        } finally {
          setIsGenerating(false);
          resolve();
        }
      }, 0);
    });
  }, []);
  
  /**
   * Accept a suggestion
   */
  const acceptSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId 
        ? { ...s, status: 'accepted' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Reject a suggestion
   */
  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId 
        ? { ...s, status: 'rejected' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Ignore a suggestion
   */
  const ignoreSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId 
        ? { ...s, status: 'ignored' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Reset a suggestion to pending
   */
  const resetSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId 
        ? { ...s, status: 'pending' as SuggestionStatus, reviewedAt: undefined }
        : s
    ));
  }, []);
  
  /**
   * Accept all pending suggestions
   */
  const acceptAll = useCallback(() => {
    setSuggestions(prev => prev.map(s => 
      s.status === 'pending' 
        ? { ...s, status: 'accepted' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Reject all pending suggestions
   */
  const rejectAll = useCallback(() => {
    setSuggestions(prev => prev.map(s => 
      s.status === 'pending' 
        ? { ...s, status: 'rejected' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setLastGeneratedAt(null);
    setError(null);
  }, []);
  
  /**
   * Accept all suggestions of a specific type
   */
  const acceptByType = useCallback((type: SuggestionType) => {
    setSuggestions(prev => prev.map(s => 
      s.suggestionType === type && s.status === 'pending'
        ? { ...s, status: 'accepted' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Accept all suggestions of a specific priority
   */
  const acceptByPriority = useCallback((priority: 'critical' | 'high' | 'medium' | 'low') => {
    setSuggestions(prev => prev.map(s => 
      s.priority === priority && s.status === 'pending'
        ? { ...s, status: 'accepted' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Accept all high confidence suggestions
   */
  const acceptHighConfidence = useCallback(() => {
    setSuggestions(prev => prev.map(s => 
      s.confidence === 'high' && s.status === 'pending'
        ? { ...s, status: 'accepted' as SuggestionStatus, reviewedAt: new Date() }
        : s
    ));
  }, []);
  
  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilter({});
  }, []);
  
  // Computed values
  const filteredSuggestions = useMemo(() => 
    filterSuggestions(suggestions, filter),
    [suggestions, filter]
  );
  
  const analytics = useMemo(() => 
    calculateSuggestionAnalytics(suggestions),
    [suggestions]
  );
  
  const pendingSuggestions = useMemo(() => 
    suggestions.filter(s => s.status === 'pending'),
    [suggestions]
  );
  
  const acceptedSuggestions = useMemo(() => 
    suggestions.filter(s => s.status === 'accepted'),
    [suggestions]
  );
  
  const rejectedSuggestions = useMemo(() => 
    suggestions.filter(s => s.status === 'rejected'),
    [suggestions]
  );
  
  const ignoredSuggestions = useMemo(() => 
    suggestions.filter(s => s.status === 'ignored'),
    [suggestions]
  );
  
  const highImpactSuggestions = useMemo(() => 
    suggestions.filter(s => Math.abs(s.taxImpact) > 50),
    [suggestions]
  );
  
  // Grouped suggestions
  const byType = useMemo(() => {
    const grouped: Record<SuggestionType, CategorizationSuggestion[]> = {
      d5_to_d6: [],
      immediate_to_depreciation: [],
      depreciation_to_immediate: [],
      home_office_method: [],
      vehicle_method: [],
      missing_depreciation: [],
      wrong_category: [],
      split_expense: [],
    };
    
    for (const s of suggestions) {
      grouped[s.suggestionType].push(s);
    }
    
    return grouped;
  }, [suggestions]);
  
  const byPriority = useMemo(() => {
    const grouped: Record<string, CategorizationSuggestion[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    
    for (const s of suggestions) {
      grouped[s.priority].push(s);
    }
    
    return grouped;
  }, [suggestions]);
  
  const byCategory = useMemo(() => {
    const grouped: Record<string, CategorizationSuggestion[]> = {};
    
    for (const s of suggestions) {
      const cat = s.suggestedCategory;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    
    return grouped;
  }, [suggestions]);
  
  // Financial stats
  const totalPotentialSavings = useMemo(() => 
    suggestions.reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0),
    [suggestions]
  );
  
  const acceptedSavings = useMemo(() => 
    acceptedSuggestions.reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0),
    [acceptedSuggestions]
  );
  
  const pendingSavings = useMemo(() => 
    pendingSuggestions.reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0),
    [pendingSuggestions]
  );
  
  /**
   * Export report
   */
  const exportReport = useCallback((): string => {
    return exportSuggestionsReport(suggestions);
  }, [suggestions]);
  
  /**
   * Get pending changes for application
   */
  const getPendingChanges = useCallback(() => {
    return acceptedSuggestions.map(s => {
      const applied = applySuggestion(s);
      return {
        receiptId: s.receiptId,
        newCategory: applied.category,
        notes: applied.notes,
      };
    });
  }, [acceptedSuggestions]);
  
  /**
   * Get learning data from accept/reject patterns
   */
  const getLearningData = useCallback(() => {
    const acceptedPatterns = acceptedSuggestions.map(s => 
      `${s.suggestionType}:${s.currentCategory}:${s.suggestedCategory}`
    );
    
    const rejectedPatterns = rejectedSuggestions.map(s => 
      `${s.suggestionType}:${s.currentCategory}:${s.suggestedCategory}`
    );
    
    return {
      acceptedPatterns,
      rejectedPatterns,
    };
  }, [acceptedSuggestions, rejectedSuggestions]);
  
  // Derived boolean states
  const hasOpportunities = useMemo(() => suggestions.length > 0, [suggestions]);
  const hasActiveFilters = useMemo(() => 
    Object.keys(filter).length > 0,
    [filter]
  );
  
  return {
    // State
    suggestions,
    isGenerating,
    error,
    lastGeneratedAt,
    hasOpportunities,
    
    // Actions
    generate,
    generateAsync,
    acceptSuggestion,
    rejectSuggestion,
    ignoreSuggestion,
    resetSuggestion,
    acceptAll,
    rejectAll,
    clearSuggestions,
    
    // Bulk operations
    acceptByType,
    acceptByPriority,
    acceptHighConfidence,
    
    // Filters
    filteredSuggestions,
    setFilter,
    clearFilters,
    activeFilter: filter,
    hasActiveFilters,
    
    // Computed
    analytics,
    pendingSuggestions,
    acceptedSuggestions,
    rejectedSuggestions,
    ignoredSuggestions,
    highImpactSuggestions,
    
    // Grouped
    byType,
    byPriority,
    byCategory,
    
    // Stats
    totalPotentialSavings,
    acceptedSavings,
    pendingSavings,
    
    // Export
    exportReport,
    getPendingChanges,
    getLearningData,
  };
}

/**
 * Hook for managing a single suggestion
 */
export function useSuggestion(suggestion: CategorizationSuggestion | null) {
  const [localStatus, setLocalStatus] = useState<SuggestionStatus>(suggestion?.status || 'pending');
  
  useEffect(() => {
    if (suggestion) {
      setLocalStatus(suggestion.status);
    }
  }, [suggestion?.status]);
  
  const isPending = localStatus === 'pending';
  const isAccepted = localStatus === 'accepted';
  const isRejected = localStatus === 'rejected';
  const isIgnored = localStatus === 'ignored';
  
  const taxImpactPositive = (suggestion?.taxImpact || 0) > 0;
  const taxImpactNegative = (suggestion?.taxImpact || 0) < 0;
  
  return {
    status: localStatus,
    isPending,
    isAccepted,
    isRejected,
    isIgnored,
    taxImpactPositive,
    taxImpactNegative,
    taxImpactAmount: Math.abs(suggestion?.taxImpact || 0),
  };
}

/**
 * Hook for suggestion statistics
 */
export function useSuggestionStats(suggestions: CategorizationSuggestion[]) {
  return useMemo(() => {
    const total = suggestions.length;
    const pending = suggestions.filter(s => s.status === 'pending').length;
    const accepted = suggestions.filter(s => s.status === 'accepted').length;
    const rejected = suggestions.filter(s => s.status === 'rejected').length;
    const ignored = suggestions.filter(s => s.status === 'ignored').length;
    
    const pendingPercentage = total > 0 ? (pending / total) * 100 : 0;
    const acceptedPercentage = total > 0 ? (accepted / total) * 100 : 0;
    const processedPercentage = total > 0 ? ((accepted + rejected + ignored) / total) * 100 : 0;
    
    const totalSavings = suggestions.reduce((sum, s) => sum + Math.max(0, s.taxImpact), 0);
    const averageSavings = total > 0 ? totalSavings / total : 0;
    
    const highConfidenceCount = suggestions.filter(s => s.confidence === 'high').length;
    const highConfidencePercentage = total > 0 ? (highConfidenceCount / total) * 100 : 0;
    
    return {
      total,
      pending,
      accepted,
      rejected,
      ignored,
      pendingPercentage,
      acceptedPercentage,
      processedPercentage,
      totalSavings,
      averageSavings,
      highConfidenceCount,
      highConfidencePercentage,
    };
  }, [suggestions]);
}

export default useCategorizationSuggestions;