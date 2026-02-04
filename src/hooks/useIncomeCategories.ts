/**
 * React Hooks for Income Categories
 * 
 * Provides state management and database integration for income categories
 * in the Tally Tax Application.
 */

import { useState, useEffect, useCallback } from "react";
import Database from "@tauri-apps/plugin-sql";
import {
  IncomeCategoryCode,
  IncomeCategory,
  IncomeSubcategory,
  getAllIncomeCategories,
  getIncomeCategoryByCode,
  getSubcategoriesForCategory,
  getHighPriorityCategories,
  getPrefillableIncomeCategories,
  searchIncomeCategories,
  getSubcategoryByCode,
  validateIncomeAmount
} from "../lib/income-categories";
import {
  IncomeCategorySetting,
  IncomeEntry,
  IncomeSummary,
  initIncomeCategoryTables,
  getIncomeCategorySettings,
  getVisibleIncomeCategorySettings,
  updateIncomeCategorySetting,
  createIncomeEntry,
  updateIncomeEntry,
  deleteIncomeEntry,
  getIncomeEntries,
  getIncomeEntryById,
  getIncomeSummaryByCategory,
  getTotalIncomeForYear,
  getUnreviewedIncomeEntries,
  markIncomeEntryReviewed,
  importPrefilledIncome,
  getIncomeReconciliationReport
} from "../lib/db-income-categories";

// ============================================
// Income Categories Data Hooks
// ============================================

/**
 * Hook to get all income categories (static data)
 */
export function useIncomeCategories() {
  const categories = getAllIncomeCategories();
  const highPriority = getHighPriorityCategories();
  const prefillable = getPrefillableIncomeCategories();

  return {
    categories,
    highPriority,
    prefillable,
    totalCount: categories.length
  };
}

/**
 * Hook to get a specific income category
 */
export function useIncomeCategory(code: IncomeCategoryCode) {
  const category = getIncomeCategoryByCode(code);
  const subcategories = category ? getSubcategoriesForCategory(code) : [];

  return {
    category,
    subcategories,
    isFound: !!category
  };
}

/**
 * Hook to search income categories
 */
export function useIncomeCategorySearch(query: string) {
  const [results, setResults] = useState<IncomeCategory[]>([]);

  useEffect(() => {
    if (query.trim()) {
      setResults(searchIncomeCategories(query));
    } else {
      setResults([]);
    }
  }, [query]);

  return results;
}

/**
 * Hook to get subcategory details
 */
export function useSubcategory(subcategoryCode: string) {
  const data = getSubcategoryByCode(subcategoryCode);
  return {
    category: data?.category,
    subcategory: data?.subcategory,
    isFound: !!data
  };
}

// ============================================
// Database Integration Hooks
// ============================================

interface UseIncomeCategorySettingsReturn {
  settings: (IncomeCategorySetting & { category_name: string; priority: string })[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateSetting: (code: IncomeCategoryCode, updates: Partial<IncomeCategorySetting>) => Promise<void>;
}

/**
 * Hook to manage income category settings
 */
export function useIncomeCategorySettings(
  db: Database | null
): UseIncomeCategorySettingsReturn {
  const [settings, setSettings] = useState<(IncomeCategorySetting & { category_name: string; priority: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!db) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await getVisibleIncomeCategorySettings(db);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const updateSetting = useCallback(async (
    code: IncomeCategoryCode,
    updates: Partial<IncomeCategorySetting>
  ) => {
    if (!db) return;
    
    await updateIncomeCategorySetting(db, code, updates);
    await fetchSettings();
  }, [db, fetchSettings]);

  useEffect(() => {
    if (db) {
      fetchSettings();
    }
  }, [db, fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    updateSetting
  };
}

interface UseIncomeEntriesReturn {
  entries: IncomeEntry[];
  summary: IncomeSummary[];
  totalIncome: number;
  totalTaxWithheld: number;
  entryCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createEntry: (entry: Omit<IncomeEntry, "id" | "created_at" | "updated_at">) => Promise<number>;
  updateEntry: (id: number, updates: Partial<IncomeEntry>) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  markReviewed: (id: number, reviewed?: boolean) => Promise<void>;
}

/**
 * Hook to manage income entries for a tax year
 */
export function useIncomeEntries(
  db: Database | null,
  taxYear: number,
  categoryCode?: IncomeCategoryCode
): UseIncomeEntriesReturn {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [summary, setSummary] = useState<IncomeSummary[]>([]);
  const [totals, setTotals] = useState({
    totalIncome: 0,
    totalTaxWithheld: 0,
    entryCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!db) return;

    try {
      setIsLoading(true);
      setError(null);

      const [entriesData, summaryData, totalData] = await Promise.all([
        getIncomeEntries(db, taxYear, categoryCode),
        getIncomeSummaryByCategory(db, taxYear),
        getTotalIncomeForYear(db, taxYear)
      ]);

      setEntries(entriesData);
      setSummary(summaryData);
      setTotals({
        totalIncome: totalData.total_income,
        totalTaxWithheld: totalData.total_tax_withheld,
        entryCount: totalData.entry_count
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [db, taxYear, categoryCode]);

  const createEntry = useCallback(async (
    entry: Omit<IncomeEntry, "id" | "created_at" | "updated_at">
  ) => {
    if (!db) throw new Error("Database not initialized");
    
    const id = await createIncomeEntry(db, entry);
    await fetchData();
    return id;
  }, [db, fetchData]);

  const updateEntry = useCallback(async (
    id: number,
    updates: Partial<IncomeEntry>
  ) => {
    if (!db) return;
    
    await updateIncomeEntry(db, id, updates);
    await fetchData();
  }, [db, fetchData]);

  const deleteEntry = useCallback(async (id: number) => {
    if (!db) return;
    
    await deleteIncomeEntry(db, id);
    await fetchData();
  }, [db, fetchData]);

  const markReviewed = useCallback(async (id: number, reviewed: boolean = true) => {
    if (!db) return;
    
    await markIncomeEntryReviewed(db, id, reviewed);
    await fetchData();
  }, [db, fetchData]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return {
    entries,
    summary,
    totalIncome: totals.totalIncome,
    totalTaxWithheld: totals.totalTaxWithheld,
    entryCount: totals.entryCount,
    isLoading,
    error,
    refetch: fetchData,
    createEntry,
    updateEntry,
    deleteEntry,
    markReviewed
  };
}

/**
 * Hook to get a single income entry
 */
export function useIncomeEntry(db: Database | null, id: number | null) {
  const [entry, setEntry] = useState<IncomeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !id) {
      setEntry(null);
      return;
    }

    const fetchEntry = async () => {
      try {
        setIsLoading(true);
        const data = await getIncomeEntryById(db, id);
        setEntry(data || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntry();
  }, [db, id]);

  return { entry, isLoading, error };
}

/**
 * Hook to get unreviewed entries (for review workflow)
 */
export function useUnreviewedIncomeEntries(db: Database | null, taxYear: number) {
  const [entries, setEntries] = useState<(IncomeEntry & { category_name: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnreviewed = useCallback(async () => {
    if (!db) return;

    try {
      setIsLoading(true);
      const data = await getUnreviewedIncomeEntries(db, taxYear);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [db, taxYear]);

  useEffect(() => {
    if (db) {
      fetchUnreviewed();
    }
  }, [db, fetchUnreviewed]);

  return {
    entries,
    isLoading,
    error,
    refetch: fetchUnreviewed,
    unreviewedCount: entries.length
  };
}

/**
 * Hook to import prefilled income data
 */
export function usePrefilledIncomeImport(db: Database | null) {
  const [isImporting, setIsImporting] = useState(false);
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const importData = useCallback(async (
    entries: Parameters<typeof importPrefilledIncome>[1]
  ) => {
    if (!db) throw new Error("Database not initialized");

    try {
      setIsImporting(true);
      setError(null);
      const result = await importPrefilledIncome(db, entries);
      setLastResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, [db]);

  return {
    importData,
    isImporting,
    lastResult,
    error
  };
}

/**
 * Hook to get income reconciliation report
 */
export function useIncomeReconciliation(db: Database | null, taxYear: number) {
  const [report, setReport] = useState<{
    category_code: string;
    category_name: string;
    prefilled_total: number;
    manual_total: number;
    difference: number;
    prefilled_count: number;
    manual_count: number;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReport = useCallback(async () => {
    if (!db) return;

    try {
      setIsLoading(true);
      const data = await getIncomeReconciliationReport(db, taxYear);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [db, taxYear]);

  useEffect(() => {
    if (db) {
      fetchReport();
    }
  }, [db, fetchReport]);

  return {
    report,
    isLoading,
    error,
    refetch: fetchReport
  };
}

// ============================================
// Initialization Hook
// ============================================

interface UseIncomeCategoriesInitReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  initialize: (db: Database) => Promise<void>;
}

/**
 * Hook to initialize income category tables
 */
export function useIncomeCategoriesInit(): UseIncomeCategoriesInitReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async (db: Database) => {
    try {
      setIsInitializing(true);
      setError(null);
      await initIncomeCategoryTables(db);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  return {
    isInitialized,
    isInitializing,
    error,
    initialize
  };
}

// ============================================
// Validation Hooks
// ============================================

/**
 * Hook to validate income amount
 */
export function useIncomeValidation(categoryCode: IncomeCategoryCode, amount: number) {
  return validateIncomeAmount(categoryCode, amount);
}
