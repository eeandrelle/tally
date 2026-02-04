import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  LowValuePoolWorkpaper,
  LowValuePoolAsset,
  LowValuePoolSummary,
  DisposalType,
  ValidationResult,
  LowValuePoolExport,
} from '@/lib/low-value-pool';
import {
  createEmptyWorkpaper,
  addAssetToPool,
  disposeAsset,
  recalculatePool,
  validateWorkpaper,
  exportWorkpaper,
  getWorkpaperStats,
  isEligibleForPool,
  LOW_VALUE_POOL_THRESHOLD,
} from '@/lib/low-value-pool';

export interface UseLowValuePoolOptions {
  taxYear?: string;
  storageKey?: string;
  priorYearClosingBalance?: number;
}

export interface UseLowValuePoolReturn {
  // State
  workpaper: LowValuePoolWorkpaper;
  isLoading: boolean;
  
  // Asset management
  addAsset: (asset: {
    description: string;
    cost: number;
    acquisitionDate: string;
    isFirstYear: boolean;
    openingBalance?: number;
  }) => void;
  
  updateAsset: (id: string, updates: Partial<LowValuePoolAsset>) => void;
  
  removeAsset: (id: string) => void;
  
  // Disposal management
  disposeAsset: (id: string, disposal: {
    date: string;
    type: DisposalType;
    salePrice?: number;
    terminationValue?: number;
  }) => void;
  
  // Pool management
  setOpeningBalance: (balance: number) => void;
  recalculate: () => void;
  
  // Export
  exportData: LowValuePoolExport | null;
  
  // Validation
  validation: ValidationResult;
  
  // Stats
  stats: ReturnType<typeof getWorkpaperStats>;
  
  // Actions
  reset: () => void;
  exportToJson: () => string;
  importFromJson: (json: string) => boolean;
  
  // Constants
  threshold: number;
  isEligible: (cost: number) => boolean;
}

export function useLowValuePool(options: UseLowValuePoolOptions = {}): UseLowValuePoolReturn {
  const {
    taxYear = getCurrentTaxYear(),
    storageKey = `tally-low-value-pool-${taxYear}`,
    priorYearClosingBalance: initialOpeningBalance = 0,
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  
  const [workpaper, setWorkpaper] = useState<LowValuePoolWorkpaper>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.taxYear === taxYear) {
            return parsed;
          }
        } catch {
          // Fall through to default
        }
      }
    }
    
    return createEmptyWorkpaper(taxYear);
  });

  // Save to localStorage whenever workpaper changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoading) {
      localStorage.setItem(storageKey, JSON.stringify(workpaper));
    }
  }, [workpaper, storageKey, isLoading]);

  // Mark loading complete after initial load
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Recalculate when workpaper changes
  useEffect(() => {
    if (!isLoading) {
      setWorkpaper(prev => recalculatePool(prev));
    }
  }, [workpaper.assets.length, isLoading]);

  // Add a new asset to the pool
  const addAsset = useCallback((asset: {
    description: string;
    cost: number;
    acquisitionDate: string;
    isFirstYear: boolean;
    openingBalance?: number;
  }) => {
    setWorkpaper(prev => {
      try {
        return addAssetToPool(prev, asset);
      } catch (error) {
        console.error('Failed to add asset:', error);
        // Return unchanged if error
        return prev;
      }
    });
  }, []);

  // Update an existing asset
  const updateAsset = useCallback((id: string, updates: Partial<LowValuePoolAsset>) => {
    setWorkpaper(prev => {
      const updatedAssets = prev.assets.map(asset => 
        asset.id === id ? { ...asset, ...updates } : asset
      );
      
      // Recalculate pool
      const updated = recalculatePool({
        ...prev,
        assets: updatedAssets,
      });
      
      return updated;
    });
  }, []);

  // Remove an asset from the pool
  const removeAsset = useCallback((id: string) => {
    setWorkpaper(prev => {
      const updatedAssets = prev.assets.filter(asset => asset.id !== id);
      
      return recalculatePool({
        ...prev,
        assets: updatedAssets,
      });
    });
  }, []);

  // Dispose of an asset
  const disposeAssetFromPool = useCallback((id: string, disposal: {
    date: string;
    type: DisposalType;
    salePrice?: number;
    terminationValue?: number;
  }) => {
    setWorkpaper(prev => {
      try {
        return disposeAsset(prev, id, disposal);
      } catch (error) {
        console.error('Failed to dispose asset:', error);
        return prev;
      }
    });
  }, []);

  // Set opening balance from prior year
  const setOpeningBalance = useCallback((balance: number) => {
    setWorkpaper(prev => {
      const updated = {
        ...prev,
        priorYearClosingBalance: balance,
      };
      return recalculatePool(updated);
    });
  }, []);

  // Recalculate the entire pool
  const recalculate = useCallback(() => {
    setWorkpaper(prev => recalculatePool(prev));
  }, []);

  // Reset the workpaper
  const reset = useCallback(() => {
    setWorkpaper(createEmptyWorkpaper(taxYear));
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [taxYear, storageKey]);

  // Export to JSON string
  const exportToJson = useCallback(() => {
    return JSON.stringify(workpaper, null, 2);
  }, [workpaper]);

  // Import from JSON string
  const importFromJson = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.assets && parsed.summary && parsed.taxYear) {
        setWorkpaper(parsed);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import low value pool data:', error);
      return false;
    }
  }, []);

  // Memoized values
  const validation = useMemo(() => validateWorkpaper(workpaper), [workpaper]);
  
  const stats = useMemo(() => getWorkpaperStats(workpaper), [workpaper]);
  
  const exportData = useMemo(() => {
    if (stats.isComplete) {
      return exportWorkpaper(workpaper);
    }
    return null;
  }, [workpaper, stats.isComplete]);

  return {
    workpaper,
    isLoading,
    addAsset,
    updateAsset,
    removeAsset,
    disposeAsset: disposeAssetFromPool,
    setOpeningBalance,
    recalculate,
    exportData,
    validation,
    stats,
    reset,
    exportToJson,
    importFromJson,
    threshold: LOW_VALUE_POOL_THRESHOLD,
    isEligible: isEligibleForPool,
  };
}

// Helper function
function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  if (month < 6) {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
  return `${year}-${String(year + 1).slice(-2)}`;
}
