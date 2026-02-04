/**
 * Income Dashboard React Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IncomeEntry,
  IncomeType,
  IncomeSource,
  createIncomeEntry,
  calculateIncomeSummary,
  groupByMonth,
  getIncomeSources,
  estimateNextPayment,
  getCurrentTaxYear,
  exportIncomeData,
  generateIncomeCSV,
  INCOME_TYPE_METADATA,
} from '@/lib/income-dashboard';

const STORAGE_KEY = 'tally-income-dashboard';

interface IncomeState {
  entries: IncomeEntry[];
  taxYear: string;
}

interface UseIncomeDashboardReturn {
  // State
  entries: IncomeEntry[];
  taxYear: string;
  
  // CRUD
  addEntry: (entry: Omit<IncomeEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<IncomeEntry>) => void;
  deleteEntry: (id: string) => void;
  
  // Analysis
  summary: ReturnType<typeof calculateIncomeSummary>;
  monthlyData: ReturnType<typeof groupByMonth>;
  sources: IncomeSource[];
  
  // Filtering
  entriesByType: (type: IncomeType) => IncomeEntry[];
  recentEntries: (count?: number) => IncomeEntry[];
  upcomingPayments: IncomeSource[];
  
  // Tax year
  availableTaxYears: string[];
  setTaxYear: (year: string) => void;
  
  // Export
  exportJSON: () => string;
  exportCSV: () => string;
  
  // Constants
  incomeTypes: typeof INCOME_TYPE_METADATA;
}

export function useIncomeDashboard(): UseIncomeDashboardReturn {
  // Load initial state
  const [state, setState] = useState<IncomeState>(() => {
    if (typeof window === 'undefined') {
      return { entries: [], taxYear: getCurrentTaxYear() };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          entries: parsed.entries || [],
          taxYear: parsed.taxYear || getCurrentTaxYear(),
        };
      }
    } catch (e) {
      console.error('Failed to load income state:', e);
    }
    return { entries: [], taxYear: getCurrentTaxYear() };
  });
  
  // Persist state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);
  
  // CRUD operations
  const addEntry = useCallback((entryData: Omit<IncomeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEntry = createIncomeEntry(entryData);
    setState(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry],
    }));
  }, []);
  
  const updateEntry = useCallback((id: string, updates: Partial<IncomeEntry>) => {
    setState(prev => ({
      ...prev,
      entries: prev.entries.map(e => 
        e.id === id 
          ? { ...e, ...updates, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
  }, []);
  
  const deleteEntry = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== id),
    }));
  }, []);
  
  const setTaxYear = useCallback((year: string) => {
    setState(prev => ({ ...prev, taxYear: year }));
  }, []);
  
  // Analysis
  const summary = useMemo(() => {
    return calculateIncomeSummary(state.entries, state.taxYear);
  }, [state.entries, state.taxYear]);
  
  const monthlyData = useMemo(() => {
    return groupByMonth(state.entries.filter(e => e.taxYear === state.taxYear));
  }, [state.entries, state.taxYear]);
  
  const sources = useMemo(() => {
    return getIncomeSources(state.entries.filter(e => e.taxYear === state.taxYear));
  }, [state.entries, state.taxYear]);
  
  // Filtering helpers
  const entriesByType = useCallback((type: IncomeType) => {
    return state.entries.filter(e => e.type === type && e.taxYear === state.taxYear);
  }, [state.entries, state.taxYear]);
  
  const recentEntries = useCallback((count: number = 5) => {
    return state.entries
      .filter(e => e.taxYear === state.taxYear)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }, [state.entries, state.taxYear]);
  
  // Calculate upcoming payments
  const upcomingPayments = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return sources
      .filter(s => s.isActive && s.expectedFrequency)
      .map(s => ({
        ...s,
        nextExpectedDate: s.lastPaymentDate 
          ? estimateNextPayment(s.lastPaymentDate, s.expectedFrequency)
          : '',
      }))
      .filter(s => s.nextExpectedDate && s.nextExpectedDate >= now)
      .sort((a, b) => a.nextExpectedDate!.localeCompare(b.nextExpectedDate!));
  }, [sources]);
  
  // Available tax years
  const availableTaxYears = useMemo(() => {
    const years = new Set<string>();
    state.entries.forEach(e => years.add(e.taxYear));
    years.add(getCurrentTaxYear());
    return Array.from(years).sort().reverse();
  }, [state.entries]);
  
  // Export
  const exportJSON = useCallback(() => {
    return exportIncomeData(state.entries, state.taxYear);
  }, [state.entries, state.taxYear]);
  
  const exportCSV = useCallback(() => {
    return generateIncomeCSV(state.entries.filter(e => e.taxYear === state.taxYear));
  }, [state.entries, state.taxYear]);
  
  return {
    entries: state.entries,
    taxYear: state.taxYear,
    addEntry,
    updateEntry,
    deleteEntry,
    summary,
    monthlyData,
    sources,
    entriesByType,
    recentEntries,
    upcomingPayments,
    availableTaxYears,
    setTaxYear,
    exportJSON,
    exportCSV,
    incomeTypes: INCOME_TYPE_METADATA,
  };
}
