/**
 * React Hooks for ATO Categories
 * 
 * Custom hooks for managing ATO deduction categories in React components.
 */

import { useState, useEffect, useCallback } from "react";
import { 
  AtoCategory, 
  AtoCategoryCode, 
  getCategoryByCode,
  getCategoriesByPriority,
  getCategoriesByUsage,
  searchCategories,
  getRelatedCategories,
  getCategoryStats
} from "@/lib/ato-categories";
import {
  getAllCategoriesWithSettings,
  getEnabledCategories,
  setCategoryEnabled,
  updateCategoryNotes,
  getCategoryClaim,
  setCategoryClaim,
  addToCategoryClaim,
  getClaimsForTaxYear,
  getTaxYearSummary,
  exportClaimsForLodgment,
  suggestCategoriesForExpense,
  CategoryClaim
} from "@/lib/ato-categories-db";

// Hook for loading all categories with settings
export function useAtoCategories() {
  const [categories, setCategories] = useState<(AtoCategory & { isEnabled: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllCategoriesWithSettings();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load categories"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const toggleCategory = useCallback(async (code: AtoCategoryCode) => {
    const category = categories.find(c => c.code === code);
    if (category) {
      await setCategoryEnabled(code, !category.isEnabled);
      await loadCategories();
    }
  }, [categories, loadCategories]);

  const updateNotes = useCallback(async (code: AtoCategoryCode, notes: string) => {
    await updateCategoryNotes(code, notes);
    await loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
    toggleCategory,
    updateNotes,
    enabledCategories: categories.filter(c => c.isEnabled),
    highPriority: categories.filter(c => c.priority === "high"),
    mediumPriority: categories.filter(c => c.priority === "medium"),
    lowPriority: categories.filter(c => c.priority === "low")
  };
}

// Hook for a single category
export function useAtoCategory(code: AtoCategoryCode) {
  const [category, setCategory] = useState<AtoCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cat = getCategoryByCode(code);
    setCategory(cat || null);
    setLoading(false);
  }, [code]);

  const relatedCategories = category?.relatedCategories 
    ? getRelatedCategories(code) 
    : [];

  return {
    category,
    loading,
    relatedCategories
  };
}

// Hook for category claims
export function useCategoryClaims(taxYear: number) {
  const [claims, setClaims] = useState<(CategoryClaim & { category?: AtoCategory })[]>([]);
  const [summary, setSummary] = useState<{
    totalClaims: number;
    finalizedCount: number;
    totalAmount: number;
    totalReceipts: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);
      const [claimsData, summaryData] = await Promise.all([
        getClaimsForTaxYear(taxYear),
        getTaxYearSummary(taxYear)
      ]);
      setClaims(claimsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("Failed to load claims:", err);
    } finally {
      setLoading(false);
    }
  }, [taxYear]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const setClaim = useCallback(async (
    code: AtoCategoryCode, 
    amount: number, 
    description?: string,
    receiptCount?: number
  ) => {
    await setCategoryClaim(code, taxYear, amount, description, receiptCount);
    await loadClaims();
  }, [taxYear, loadClaims]);

  const addToClaim = useCallback(async (
    code: AtoCategoryCode,
    amount: number,
    receiptsToAdd: number = 0
  ) => {
    await addToCategoryClaim(code, taxYear, amount, receiptsToAdd);
    await loadClaims();
  }, [taxYear, loadClaims]);

  return {
    claims,
    summary,
    loading,
    refresh: loadClaims,
    setClaim,
    addToClaim
  };
}

// Hook for a single category claim
export function useCategoryClaim(code: AtoCategoryCode, taxYear: number) {
  const [claim, setClaim] = useState<CategoryClaim | null>(null);
  const [category, setCategory] = useState<AtoCategory | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClaim = useCallback(async () => {
    try {
      setLoading(true);
      const [claimData, catData] = await Promise.all([
        getCategoryClaim(code, taxYear),
        Promise.resolve(getCategoryByCode(code))
      ]);
      setClaim(claimData);
      setCategory(catData || null);
    } catch (err) {
      console.error("Failed to load claim:", err);
    } finally {
      setLoading(false);
    }
  }, [code, taxYear]);

  useEffect(() => {
    loadClaim();
  }, [loadClaim]);

  const updateClaim = useCallback(async (
    amount: number,
    description?: string,
    receiptCount?: number
  ) => {
    await setCategoryClaim(code, taxYear, amount, description, receiptCount);
    await loadClaim();
  }, [code, taxYear, loadClaim]);

  const addAmount = useCallback(async (amount: number, receipts: number = 0) => {
    await addToCategoryClaim(code, taxYear, amount, receipts);
    await loadClaim();
  }, [code, taxYear, loadClaim]);

  return {
    claim,
    category,
    loading,
    refresh: loadClaim,
    updateClaim,
    addAmount
  };
}

// Hook for expense categorization suggestions
export function useCategorySuggestions() {
  const getSuggestions = useCallback((description: string): AtoCategory[] => {
    return suggestCategoriesForExpense(description);
  }, []);

  return { getSuggestions };
}

// Hook for category statistics
export function useCategoryStats() {
  const [stats, setStats] = useState<{
    total: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    highUsage: number;
  } | null>(null);

  useEffect(() => {
    setStats(getCategoryStats());
  }, []);

  return stats;
}

// Hook for search
export function useCategorySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AtoCategory[]>([]);

  useEffect(() => {
    if (query.trim()) {
      setResults(searchCategories(query));
    } else {
      setResults([]);
    }
  }, [query]);

  return {
    query,
    setQuery,
    results
  };
}

// Hook for export
export function useClaimsExport(taxYear: number) {
  const [exporting, setExporting] = useState(false);

  const exportClaims = useCallback(async () => {
    try {
      setExporting(true);
      const data = await exportClaimsForLodgment(taxYear);
      return data;
    } catch (err) {
      console.error("Export failed:", err);
      throw err;
    } finally {
      setExporting(false);
    }
  }, [taxYear]);

  return { exportClaims, exporting };
}

// Hook for prioritized categories
export function usePrioritizedCategories() {
  const [categories, setCategories] = useState<{
    high: AtoCategory[];
    medium: AtoCategory[];
    low: AtoCategory[];
  }>({ high: [], medium: [], low: [] });

  useEffect(() => {
    setCategories({
      high: getCategoriesByPriority("high"),
      medium: getCategoriesByPriority("medium"),
      low: getCategoriesByPriority("low")
    });
  }, []);

  return categories;
}

// Hook for commonly used categories
export function useCommonCategories(limit: number = 5) {
  const [categories, setCategories] = useState<AtoCategory[]>([]);

  useEffect(() => {
    setCategories(getCategoriesByUsage().slice(0, limit));
  }, [limit]);

  return categories;
}

export default {
  useAtoCategories,
  useAtoCategory,
  useCategoryClaims,
  useCategoryClaim,
  useCategorySuggestions,
  useCategoryStats,
  useCategorySearch,
  useClaimsExport,
  usePrioritizedCategories,
  useCommonCategories
};
