/**
 * useCompletenessChecker Hook
 * 
 * React hook for managing tax return completeness checking state and operations.
 * 
 * @example
 * ```tsx
 * const { 
 *   report, 
 *   isLoading, 
 *   refreshReport,
 *   implementSuggestion 
 * } = useCompletenessChecker({
 *   profile: userProfile,
 *   incomeData: currentIncome,
 *   deductionData: currentDeductions
 * });
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  CompletenessReport, 
  CompletenessCheckerOptions,
  UserTaxProfile,
  ChecklistItem,
  ChecklistStatus,
  IncomeSourceCheck,
  DeductionCategoryCheck,
  MissingDocument,
  OptimizationSuggestion,
  RiskAssessment
} from '@/lib/completeness-checker';
import type { OptimizationOpportunity } from '@/lib/tax-optimization';
import type { IncomeCategoryCode } from '@/lib/income-categories';
import type { AtoCategoryCode } from '@/lib/ato-categories';
import {
  generateCompletenessReport,
  calculateCompletenessScore
} from '@/lib/completeness-checker';

// ============= TYPES =============

export interface UseCompletenessCheckerOptions {
  profile: UserTaxProfile;
  incomeData: Partial<Record<IncomeCategoryCode, { amount: number; documents: number; lastYearAmount?: number }>>;
  deductionData: Partial<Record<AtoCategoryCode, { amount: number; workpaperComplete: boolean; receipts: number }>>;
  opportunities: OptimizationOpportunity[];
  taxWithheld: number;
  offsets?: { name: string; amount: number }[];
  autoGenerate?: boolean;
}

export interface UseCompletenessCheckerReturn {
  // Report data
  report: CompletenessReport | null;
  
  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  error: Error | null;
  
  // Score data
  score: {
    overall: number;
    incomeScore: number;
    deductionsScore: number;
    documentsScore: number;
    optimizationScore: number;
    colorStatus: 'red' | 'amber' | 'green';
    missingItemsCount: number;
  } | null;
  
  // Checklist data
  incomeChecks: IncomeSourceCheck[];
  deductionChecks: DeductionCategoryCheck[];
  missingDocuments: MissingDocument[];
  optimizationSuggestions: OptimizationSuggestion[];
  
  // Summary data
  taxEstimate: {
    taxableIncome: number;
    totalDeductions: number;
    estimatedRefund: number;
    estimatedTaxOwing: number;
  } | null;
  
  riskAssessment: RiskAssessment | null;
  estimatedCompletionTime: number;
  
  // Actions
  refreshReport: () => Promise<void>;
  implementSuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  markItemComplete: (itemId: string) => void;
  markItemIncomplete: (itemId: string) => void;
  
  // Export functions
  exportChecklist: () => string;
  exportAccountantSummary: () => string;
  
  // Filter/Sort functions
  getIncompleteItems: () => ChecklistItem[];
  getHighPriorityItems: () => ChecklistItem[];
  getItemsByCategory: (category: string) => ChecklistItem[];
  
  // Status helpers
  isReadyForLodgment: () => boolean;
  hasCriticalIssues: () => boolean;
  getNextAction: () => { title: string; description: string; link?: string } | null;
}

// ============= HOOK IMPLEMENTATION =============

export function useCompletenessChecker(
  options: UseCompletenessCheckerOptions
): UseCompletenessCheckerReturn {
  const { 
    profile, 
    incomeData, 
    deductionData, 
    opportunities, 
    taxWithheld, 
    offsets = [],
    autoGenerate = true 
  } = options;

  // State
  const [report, setReport] = useState<CompletenessReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [implementedSuggestions, setImplementedSuggestions] = useState<Set<string>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [manualItemStatus, setManualItemStatus] = useState<Map<string, ChecklistStatus>>(new Map());

  // Generate report function
  const generateReport = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate async operation for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const completenessOptions: CompletenessCheckerOptions = {
        profile,
        incomeData,
        deductionData,
        opportunities,
        taxWithheld,
        offsets
      };

      const newReport = generateCompletenessReport(completenessOptions);

      // Apply manual overrides
      newReport.incomeChecks = newReport.incomeChecks.map(item => ({
        ...item,
        status: manualItemStatus.get(item.id) || item.status
      }));

      newReport.deductionChecks = newReport.deductionChecks.map(item => ({
        ...item,
        status: manualItemStatus.get(item.id) || item.status
      }));

      // Apply suggestion implementations
      newReport.optimizationSuggestions = newReport.optimizationSuggestions.map(sugg => ({
        ...sugg,
        implemented: implementedSuggestions.has(sugg.id) || sugg.implemented,
        dismissed: dismissedSuggestions.has(sugg.id)
      }));

      // Recalculate score with overrides
      newReport.score = calculateCompletenessScore(
        newReport.incomeChecks,
        newReport.deductionChecks,
        newReport.missingDocuments,
        newReport.optimizationSuggestions.filter(s => !dismissedSuggestions.has(s.id))
      );

      setReport(newReport);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate report'));
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [profile, incomeData, deductionData, opportunities, taxWithheld, offsets, manualItemStatus, implementedSuggestions, dismissedSuggestions]);

  // Refresh report
  const refreshReport = useCallback(async () => {
    setIsLoading(true);
    await generateReport();
  }, [generateReport]);

  // Auto-generate on mount or when dependencies change
  useEffect(() => {
    if (autoGenerate) {
      generateReport();
    }
  }, [autoGenerate, generateReport]);

  // Memoized derived data
  const score = useMemo(() => {
    if (!report) return null;
    return {
      overall: report.score.overall,
      incomeScore: report.score.incomeScore,
      deductionsScore: report.score.deductionsScore,
      documentsScore: report.score.documentsScore,
      optimizationScore: report.score.optimizationScore,
      colorStatus: report.score.colorStatus,
      missingItemsCount: report.score.missingItemsCount
    };
  }, [report]);

  const taxEstimate = useMemo(() => {
    if (!report) return null;
    return {
      taxableIncome: report.taxEstimate.taxableIncome,
      totalDeductions: report.taxEstimate.totalDeductions,
      taxPayable: report.taxEstimate.taxPayable,
      taxWithheld: report.taxEstimate.taxWithheld,
      estimatedRefund: report.taxEstimate.estimatedRefund,
      estimatedTaxOwing: report.taxEstimate.estimatedTaxOwing,
      medicareLevy: report.taxEstimate.medicareLevy
    };
  }, [report]);

  const riskAssessment = useMemo(() => report?.riskAssessment || null, [report]);
  const estimatedCompletionTime = useMemo(() => report?.estimatedCompletionTime || 0, [report]);

  const incomeChecks = useMemo(() => report?.incomeChecks || [], [report]);
  const deductionChecks = useMemo(() => report?.deductionChecks || [], [report]);
  const missingDocuments = useMemo(() => report?.missingDocuments || [], [report]);
  const optimizationSuggestions = useMemo(() => 
    (report?.optimizationSuggestions || []).filter(s => !dismissedSuggestions.has(s.id)),
    [report, dismissedSuggestions]
  );

  // Actions
  const implementSuggestion = useCallback((suggestionId: string) => {
    setImplementedSuggestions(prev => new Set([...prev, suggestionId]));
    // Trigger refresh to update score
    generateReport();
  }, [generateReport]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  }, []);

  const markItemComplete = useCallback((itemId: string) => {
    setManualItemStatus(prev => new Map(prev).set(itemId, 'complete'));
  }, []);

  const markItemIncomplete = useCallback((itemId: string) => {
    setManualItemStatus(prev => new Map(prev).set(itemId, 'missing'));
  }, []);

  // Export functions
  const exportChecklist = useCallback(() => {
    if (!report) return '';
    return report.exportData.checklistData;
  }, [report]);

  const exportAccountantSummary = useCallback(() => {
    if (!report) return '';
    return report.exportData.summaryData;
  }, [report]);

  // Filter/Sort functions
  const getIncompleteItems = useCallback((): ChecklistItem[] => {
    if (!report) return [];
    const allItems: ChecklistItem[] = [
      ...report.incomeChecks,
      ...report.deductionChecks
    ];
    return allItems.filter(item => 
      item.status === 'missing' || item.status === 'partial'
    );
  }, [report]);

  const getHighPriorityItems = useCallback((): ChecklistItem[] => {
    if (!report) return [];
    const allItems: ChecklistItem[] = [
      ...report.incomeChecks,
      ...report.deductionChecks
    ];
    return allItems.filter(item => 
      item.required && (item.status === 'missing' || item.status === 'partial')
    );
  }, [report]);

  const getItemsByCategory = useCallback((category: string): ChecklistItem[] => {
    if (!report) return [];
    const allItems: ChecklistItem[] = [
      ...report.incomeChecks,
      ...report.deductionChecks
    ];
    return allItems.filter(item => item.category === category);
  }, [report]);

  // Status helpers
  const isReadyForLodgment = useCallback((): boolean => {
    if (!report) return false;
    // Ready if score >= 80 and no required items missing
    const requiredComplete = report.incomeChecks
      .filter(i => i.required)
      .every(i => i.status === 'complete');
    return report.score.overall >= 80 && requiredComplete && report.score.missingItemsCount <= 2;
  }, [report]);

  const hasCriticalIssues = useCallback((): boolean => {
    if (!report) return false;
    return report.score.colorStatus === 'red' || 
      report.incomeChecks.some(i => i.required && i.status === 'missing');
  }, [report]);

  const getNextAction = useCallback((): { title: string; description: string; link?: string } | null => {
    if (!report) return null;

    // Priority 1: Required missing income
    const missingRequiredIncome = report.incomeChecks
      .find(i => i.required && i.status === 'missing');
    if (missingRequiredIncome) {
      return {
        title: `Add ${missingRequiredIncome.title}`,
        description: missingRequiredIncome.actionNeeded || 'This required income source is missing',
        link: missingRequiredIncome.actionLink
      };
    }

    // Priority 2: High priority missing documents
    const highPriorityDoc = report.missingDocuments.find(d => d.priority === 'high');
    if (highPriorityDoc) {
      return {
        title: `Upload ${highPriorityDoc.documentType}`,
        description: highPriorityDoc.detectionReason,
        link: '/upload'
      };
    }

    // Priority 3: Partial items
    const partialItem = [...report.incomeChecks, ...report.deductionChecks]
      .find(i => i.status === 'partial');
    if (partialItem) {
      return {
        title: `Complete ${partialItem.title}`,
        description: partialItem.actionNeeded || 'Additional information needed',
        link: partialItem.actionLink
      };
    }

    // Priority 4: Critical optimization opportunities
    const criticalOpportunity = report.optimizationSuggestions
      .find(o => o.priority === 'critical' && !o.implemented);
    if (criticalOpportunity) {
      return {
        title: criticalOpportunity.title,
        description: `Potential tax savings: $${criticalOpportunity.estimatedTaxSavings.toLocaleString()}`,
        link: criticalOpportunity.actionLink
      };
    }

    // All done or just minor items
    if (report.score.overall >= 80) {
      return {
        title: 'Ready for Review',
        description: 'Your tax return is ready for final review and lodgment'
      };
    }

    return {
      title: 'Continue Adding Information',
      description: `Complete ${report.score.missingItemsCount} remaining items to improve your score`
    };
  }, [report]);

  return {
    // Report data
    report,
    
    // Loading states
    isLoading,
    isGenerating,
    error,
    
    // Score data
    score,
    
    // Checklist data
    incomeChecks,
    deductionChecks,
    missingDocuments,
    optimizationSuggestions,
    
    // Summary data
    taxEstimate,
    riskAssessment,
    estimatedCompletionTime,
    
    // Actions
    refreshReport,
    implementSuggestion,
    dismissSuggestion,
    markItemComplete,
    markItemIncomplete,
    
    // Export functions
    exportChecklist,
    exportAccountantSummary,
    
    // Filter/Sort functions
    getIncompleteItems,
    getHighPriorityItems,
    getItemsByCategory,
    
    // Status helpers
    isReadyForLodgment,
    hasCriticalIssues,
    getNextAction
  };
}

// ============= UTILITY HOOKS =============

/**
 * Hook for tracking a single checklist item's status
 */
export function useChecklistItem(item: ChecklistItem | null) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  const statusColor = useMemo(() => {
    if (!item) return 'gray';
    switch (item.status) {
      case 'complete': return 'green';
      case 'partial': return 'yellow';
      case 'missing': return 'red';
      case 'not_applicable': return 'gray';
      default: return 'gray';
    }
  }, [item]);

  const statusLabel = useMemo(() => {
    if (!item) return '';
    switch (item.status) {
      case 'complete': return 'Complete';
      case 'partial': return 'Partial';
      case 'missing': return 'Missing';
      case 'not_applicable': return 'Not Applicable';
      default: return '';
    }
  }, [item]);

  const progressPercentage = useMemo(() => {
    if (!item) return 0;
    if (item.status === 'complete') return 100;
    if (item.status === 'partial') return 50;
    if (item.status === 'missing') return 0;
    return 0;
  }, [item]);

  return {
    isExpanded,
    isActionPending,
    statusColor,
    statusLabel,
    progressPercentage,
    toggleExpand,
    expand,
    collapse,
    setIsActionPending
  };
}

/**
 * Hook for filtering and sorting checklist items
 */
export function useChecklistFilters(items: ChecklistItem[]) {
  const [filterStatus, setFilterStatus] = useState<ChecklistStatus | 'all'>('all');
  const [filterRequired, setFilterRequired] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'name' | 'status'>('priority');

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(item => item.status === filterStatus);
    }

    // Required filter
    if (filterRequired !== null) {
      result = result.filter(item => item.required === filterRequired);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // Required first, then by status (missing > partial > complete)
          if (a.required !== b.required) return a.required ? -1 : 1;
          const statusOrder = { missing: 0, partial: 1, complete: 2, not_applicable: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'name':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return result;
  }, [items, filterStatus, filterRequired, searchQuery, sortBy]);

  const counts = useMemo(() => ({
    total: items.length,
    complete: items.filter(i => i.status === 'complete').length,
    partial: items.filter(i => i.status === 'partial').length,
    missing: items.filter(i => i.status === 'missing').length,
    notApplicable: items.filter(i => i.status === 'not_applicable').length,
    required: items.filter(i => i.required).length
  }), [items]);

  const clearFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterRequired(null);
    setSearchQuery('');
  }, []);

  return {
    filteredItems,
    counts,
    filterStatus,
    setFilterStatus,
    filterRequired,
    setFilterRequired,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    clearFilters
  };
}

export default useCompletenessChecker;