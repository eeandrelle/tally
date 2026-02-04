import { useState, useEffect, useMemo } from 'react';
import type { AtoCategory, AtoCategoryCode } from '@/lib/ato-categories';
import { getCategoryByCode } from '@/lib/ato-categories';

// Workpaper completion status
type WorkpaperStatus = 'not-started' | 'in-progress' | 'complete';

// Workpaper data stored per category
export interface WorkpaperData {
  categoryCode: AtoCategoryCode;
  status: WorkpaperStatus;
  totalClaimed: number;
  lastAccessed?: string;
  completionPercentage: number;
  itemsCount: number;
  estimatedTaxSavings: number;
}

// Full workpaper library state
export interface WorkpaperLibraryState {
  taxYear: string;
  workpapers: Record<AtoCategoryCode, WorkpaperData>;
  lastUpdated: string;
}

// Default workpaper data for a category
function createDefaultWorkpaper(categoryCode: AtoCategoryCode): WorkpaperData {
  return {
    categoryCode,
    status: 'not-started',
    totalClaimed: 0,
    completionPercentage: 0,
    itemsCount: 0,
    estimatedTaxSavings: 0,
  };
}

// Get all D1-D15 category codes
const ALL_WORKPAPER_CODES: AtoCategoryCode[] = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',
  'D10', 'D11', 'D12', 'D13', 'D14', 'D15'
];

// Group categories by type for organization
export const WORKPAPER_GROUPS = {
  'work-related': ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] as AtoCategoryCode[],
  'investment': ['D7', 'D8'] as AtoCategoryCode[],
  'tax-offsets': ['D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'] as AtoCategoryCode[],
};

export interface UseWorkpaperLibraryOptions {
  taxYear?: string;
}

export function useWorkpaperLibrary(options: UseWorkpaperLibraryOptions = {}) {
  const { taxYear = new Date().getFullYear().toString() } = options;
  const storageKey = `tally-workpaper-library-${taxYear}`;

  // Initialize library state
  const [libraryState, setLibraryState] = useState<WorkpaperLibraryState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure all categories exist
          const workpapers: Record<AtoCategoryCode, WorkpaperData> = {} as Record<AtoCategoryCode, WorkpaperData>;
          ALL_WORKPAPER_CODES.forEach(code => {
            workpapers[code] = parsed.workpapers?.[code] || createDefaultWorkpaper(code);
          });
          return { ...parsed, workpapers };
        } catch {
          // Fall through to default
        }
      }
    }
    
    // Initialize with all categories
    const workpapers: Record<AtoCategoryCode, WorkpaperData> = {} as Record<AtoCategoryCode, WorkpaperData>;
    ALL_WORKPAPER_CODES.forEach(code => {
      workpapers[code] = createDefaultWorkpaper(code);
    });
    
    return {
      taxYear,
      workpapers,
      lastUpdated: new Date().toISOString(),
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(libraryState));
    }
  }, [libraryState, storageKey]);

  // Update a specific workpaper
  const updateWorkpaper = (categoryCode: AtoCategoryCode, updates: Partial<WorkpaperData>) => {
    setLibraryState(prev => ({
      ...prev,
      workpapers: {
        ...prev.workpapers,
        [categoryCode]: {
          ...prev.workpapers[categoryCode],
          ...updates,
        },
      },
      lastUpdated: new Date().toISOString(),
    }));
  };

  // Mark workpaper as accessed
  const markAccessed = (categoryCode: AtoCategoryCode) => {
    updateWorkpaper(categoryCode, {
      lastAccessed: new Date().toISOString(),
    });
  };

  // Set workpaper status
  const setWorkpaperStatus = (categoryCode: AtoCategoryCode, status: WorkpaperStatus) => {
    updateWorkpaper(categoryCode, { status });
  };

  // Update workpaper claim amount
  const updateClaimAmount = (categoryCode: AtoCategoryCode, amount: number) => {
    const taxRate = 0.325; // Approximate marginal tax rate - could be made dynamic
    const estimatedSavings = amount * taxRate;
    
    updateWorkpaper(categoryCode, {
      totalClaimed: amount,
      estimatedTaxSavings: estimatedSavings,
    });
  };

  // Update completion percentage
  const setCompletionPercentage = (categoryCode: AtoCategoryCode, percentage: number) => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    let status: WorkpaperStatus = 'not-started';
    if (clampedPercentage === 100) status = 'complete';
    else if (clampedPercentage > 0) status = 'in-progress';
    
    updateWorkpaper(categoryCode, {
      completionPercentage: clampedPercentage,
      status,
    });
  };

  // Update items count
  const setItemsCount = (categoryCode: AtoCategoryCode, count: number) => {
    updateWorkpaper(categoryCode, {
      itemsCount: count,
    });
  };

  // Reset all workpapers
  const resetAll = () => {
    const workpapers: Record<AtoCategoryCode, WorkpaperData> = {} as Record<AtoCategoryCode, WorkpaperData>;
    ALL_WORKPAPER_CODES.forEach(code => {
      workpapers[code] = createDefaultWorkpaper(code);
    });
    
    setLibraryState({
      taxYear,
      workpapers,
      lastUpdated: new Date().toISOString(),
    });
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  };

  // Reset specific workpaper
  const resetWorkpaper = (categoryCode: AtoCategoryCode) => {
    updateWorkpaper(categoryCode, createDefaultWorkpaper(categoryCode));
  };

  // Get workpapers by status
  const getWorkpapersByStatus = (status: WorkpaperStatus): WorkpaperData[] => {
    return Object.values(libraryState.workpapers).filter(wp => wp.status === status);
  };

  // Get recently accessed workpapers
  const getRecentlyAccessed = (limit: number = 5): WorkpaperData[] => {
    return Object.values(libraryState.workpapers)
      .filter(wp => wp.lastAccessed)
      .sort((a, b) => new Date(b.lastAccessed!).getTime() - new Date(a.lastAccessed!).getTime())
      .slice(0, limit);
  };

  // Get category info for a workpaper
  const getCategoryInfo = (categoryCode: AtoCategoryCode): AtoCategory | undefined => {
    return getCategoryByCode(categoryCode);
  };

  // Computed statistics
  const stats = useMemo(() => {
    const workpapers = Object.values(libraryState.workpapers);
    const total = workpapers.length;
    const complete = workpapers.filter(wp => wp.status === 'complete').length;
    const inProgress = workpapers.filter(wp => wp.status === 'in-progress').length;
    const notStarted = workpapers.filter(wp => wp.status === 'not-started').length;
    
    const totalClaimed = workpapers.reduce((sum, wp) => sum + wp.totalClaimed, 0);
    const totalEstimatedSavings = workpapers.reduce((sum, wp) => sum + wp.estimatedTaxSavings, 0);
    
    const overallProgress = total > 0 ? Math.round((complete / total) * 100) : 0;
    
    return {
      total,
      complete,
      inProgress,
      notStarted,
      totalClaimed,
      totalEstimatedSavings,
      overallProgress,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
    };
  }, [libraryState.workpapers]);

  // Get workpapers by group
  const workpapersByGroup = useMemo(() => {
    const result: Record<string, { category: AtoCategory; workpaper: WorkpaperData }[]> = {};
    
    Object.entries(WORKPAPER_GROUPS).forEach(([groupName, codes]) => {
      result[groupName] = codes
        .map(code => ({
          category: getCategoryByCode(code)!,
          workpaper: libraryState.workpapers[code],
        }))
        .filter(item => item.category);
    });
    
    return result;
  }, [libraryState.workpapers]);

  // Get all workpapers with category info
  const allWorkpapers = useMemo(() => {
    return ALL_WORKPAPER_CODES.map(code => ({
      category: getCategoryByCode(code)!,
      workpaper: libraryState.workpapers[code],
    })).filter(item => item.category);
  }, [libraryState.workpapers]);

  return {
    // State
    libraryState,
    taxYear: libraryState.taxYear,
    workpapers: libraryState.workpapers,
    
    // Actions
    updateWorkpaper,
    markAccessed,
    setWorkpaperStatus,
    updateClaimAmount,
    setCompletionPercentage,
    setItemsCount,
    resetAll,
    resetWorkpaper,
    
    // Queries
    getWorkpapersByStatus,
    getRecentlyAccessed,
    getCategoryInfo,
    
    // Computed
    stats,
    workpapersByGroup,
    allWorkpapers,
    
    // Constants
    allCodes: ALL_WORKPAPER_CODES,
    groups: WORKPAPER_GROUPS,
  };
}

export type UseWorkpaperLibraryReturn = ReturnType<typeof useWorkpaperLibrary>;
