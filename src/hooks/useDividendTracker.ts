/**
 * useDividendTracker Hook
 * 
 * React hook for comprehensive dividend tracking functionality
 * Provides data loading, calculations, filtering, and chart generation
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  DividendPayment,
  CompanyDividendSummary,
  AnnualDividendSummary,
  DividendTrackerOverview,
  DividendChartData,
  UpcomingDividend,
  DividendFilterOptions,
  DividendTaxSummary,
} from '../lib/dividend-tracker';
import {
  aggregateCompanies,
  generateMonthlyBreakdown,
  generateChartData,
  generateUpcomingDividends,
  calculateOverview,
  generateAnnualSummary,
  filterDividends,
  exportDividendsToCSV,
  exportAnnualSummaryForTax,
  formatCurrency,
} from '../lib/dividend-tracker';
import { getFinancialYear } from '../lib/franking-credits';
import {
  calculateTaxImpactAtAllRates,
  calculateTaxImpactForIncome,
  getMarginalTaxRate,
} from '../lib/franking-credits';
import {
  getAllDividendEntries,
  getDividendEntriesByTaxYear,
  getAvailableTaxYears,
  createDividendEntry,
  updateDividendEntry,
  deleteDividendEntry,
} from '../lib/db-franking-credits';
import { toast } from 'sonner';

// ============================================================================
// HOOK: useDividendTracker
// ============================================================================

interface UseDividendTrackerOptions {
  financialYear?: string;
  autoLoad?: boolean;
}

interface UseDividendTrackerReturn {
  // Raw data
  allPayments: DividendPayment[];
  filteredPayments: DividendPayment[];
  
  // Calculated data
  overview: DividendTrackerOverview | null;
  companies: CompanyDividendSummary[];
  annualSummary: AnnualDividendSummary | null;
  chartData: DividendChartData | null;
  upcomingDividends: UpcomingDividend[];
  taxSummary: DividendTaxSummary | null;
  
  // State
  financialYear: string;
  availableYears: string[];
  filters: DividendFilterOptions;
  selectedCompanyId: string | null;
  
  // Loading states
  isLoading: boolean;
  isExporting: boolean;
  error: Error | null;
  
  // Actions
  setFinancialYear: (year: string) => void;
  setFilters: (filters: DividendFilterOptions | ((prev: DividendFilterOptions) => DividendFilterOptions)) => void;
  setSelectedCompanyId: (id: string | null) => void;
  refreshData: () => Promise<void>;
  loadAllPayments: () => Promise<void>;
  
  // CRUD operations
  addPayment: (payment: Omit<DividendPayment, 'id' | 'frankingCredit' | 'grossedUpDividend'>) => Promise<void>;
  updatePayment: (id: number, updates: Partial<DividendPayment>) => Promise<void>;
  deletePayment: (id: number) => Promise<void>;
  
  // Export
  exportToCSV: () => string;
  exportAnnualTaxSummary: () => string;
  exportToPDF: () => Promise<void>;
  
  // Utilities
  getCompanyById: (id: string) => CompanyDividendSummary | undefined;
  calculateTaxImpact: (taxableIncome: number) => DividendTaxSummary['userTaxImpact'];
}

export function useDividendTracker(
  options: UseDividendTrackerOptions = {}
): UseDividendTrackerReturn {
  const { financialYear: initialYear, autoLoad = true } = options;
  
  // State
  const [allPayments, setAllPayments] = useState<DividendPayment[]>([]);
  const [financialYear, setFinancialYear] = useState<string>(initialYear || getFinancialYear());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [filters, setFilters] = useState<DividendFilterOptions>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Load all dividend data
  const loadAllPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load from database
      const entries = await getAllDividendEntries();
      
      // Transform to DividendPayment format
      const payments: DividendPayment[] = entries.map(entry => ({
        ...entry,
        source: 'manual',
        sharesHeld: 0,
        dividendPerShare: 0,
      }));
      
      setAllPayments(payments);
      
      // Load available years
      const years = await getAvailableTaxYears();
      setAvailableYears(years);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load dividend data');
      setError(error);
      toast.error('Failed to load dividend data');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Refresh data
  const refreshData = useCallback(async () => {
    await loadAllPayments();
  }, [loadAllPayments]);
  
  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadAllPayments();
    }
  }, [autoLoad, loadAllPayments]);
  
  // Apply filters to get filtered payments
  const filteredPayments = useMemo(() => {
    return filterDividends(allPayments, { ...filters, financialYear });
  }, [allPayments, filters, financialYear]);
  
  // Calculate overview
  const overview = useMemo(() => {
    if (allPayments.length === 0) return null;
    return calculateOverview(allPayments, financialYear);
  }, [allPayments, financialYear]);
  
  // Aggregate companies
  const companies = useMemo(() => {
    return aggregateCompanies(filteredPayments);
  }, [filteredPayments]);
  
  // Generate annual summary
  const annualSummary = useMemo(() => {
    if (filteredPayments.length === 0) return null;
    
    // Get previous year payments
    const [startYearStr] = financialYear.split('-');
    const startYear = parseInt(startYearStr);
    const prevYear = `${startYear - 1}-${startYear}`;
    const prevYearPayments = allPayments.filter(p => 
      (p.taxYear || getFinancialYear(new Date(p.dateReceived))) === prevYear
    );
    
    return generateAnnualSummary(filteredPayments, financialYear, prevYearPayments);
  }, [filteredPayments, allPayments, financialYear]);
  
  // Generate chart data
  const chartData = useMemo(() => {
    if (allPayments.length === 0) return null;
    return generateChartData(allPayments, financialYear);
  }, [allPayments, financialYear]);
  
  // Generate upcoming dividends
  const upcomingDividends = useMemo(() => {
    return generateUpcomingDividends(companies);
  }, [companies]);
  
  // Calculate tax summary
  const taxSummary = useMemo(() => {
    if (!annualSummary) return null;
    
    const taxImpactAtRates = calculateTaxImpactAtAllRates(
      annualSummary.totalGrossedUpDividends,
      annualSummary.totalFrankingCredits
    );
    
    return {
      financialYear: annualSummary.financialYear,
      totalDividends: annualSummary.totalDividends,
      totalFrankingCredits: annualSummary.totalFrankingCredits,
      totalGrossedUpDividends: annualSummary.totalGrossedUpDividends,
      taxImpactAtRates: taxImpactAtRates.map(t => ({
        rate: t.marginalRate,
        taxOnGrossedUp: t.taxOnGrossedUp,
        frankingCreditOffset: t.frankingCreditOffset,
        netTaxPosition: t.netTaxPosition,
        effectiveTaxRate: t.effectiveTaxRate,
      })),
    };
  }, [annualSummary]);
  
  // CRUD operations
  const addPayment = useCallback(async (
    payment: Omit<DividendPayment, 'id' | 'frankingCredit' | 'grossedUpDividend'>
  ) => {
    try {
      await createDividendEntry({
        companyName: payment.companyName,
        dividendAmount: payment.dividendAmount,
        frankingPercentage: payment.frankingPercentage,
        dateReceived: payment.dateReceived,
        notes: payment.notes,
        taxYear: payment.taxYear,
      });
      toast.success('Dividend added successfully');
      await refreshData();
    } catch (err) {
      toast.error('Failed to add dividend');
      throw err;
    }
  }, [refreshData]);
  
  const updatePayment = useCallback(async (id: number, updates: Partial<DividendPayment>) => {
    try {
      await updateDividendEntry(id, updates);
      toast.success('Dividend updated successfully');
      await refreshData();
    } catch (err) {
      toast.error('Failed to update dividend');
      throw err;
    }
  }, [refreshData]);
  
  const deletePayment = useCallback(async (id: number) => {
    try {
      await deleteDividendEntry(id);
      toast.success('Dividend deleted successfully');
      await refreshData();
    } catch (err) {
      toast.error('Failed to delete dividend');
      throw err;
    }
  }, [refreshData]);
  
  // Export functions
  const exportToCSV = useCallback(() => {
    return exportDividendsToCSV(filteredPayments);
  }, [filteredPayments]);
  
  const exportAnnualTaxSummary = useCallback(() => {
    if (!annualSummary) return '';
    return exportAnnualSummaryForTax(annualSummary);
  }, [annualSummary]);
  
  const exportToPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      // PDF export would be implemented here using jspdf
      // For now, just simulate the delay
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('PDF export functionality coming soon');
    } finally {
      setIsExporting(false);
    }
  }, []);
  
  // Utility functions
  const getCompanyById = useCallback((id: string) => {
    return companies.find(c => c.id === id);
  }, [companies]);
  
  const calculateTaxImpact = useCallback((taxableIncome: number) => {
    if (!annualSummary) return undefined;
    
    const impact = calculateTaxImpactForIncome(
      annualSummary.totalGrossedUpDividends,
      annualSummary.totalFrankingCredits,
      taxableIncome
    );
    
    return {
      taxableIncome,
      marginalRate: impact.marginalRate,
      taxOnGrossedUp: impact.taxOnGrossedUp,
      frankingCreditOffset: impact.frankingCreditOffset,
      netTaxPosition: impact.netTaxPosition,
      refundOrPayable: impact.netTaxPosition < 0 ? 'refund' : impact.netTaxPosition > 0 ? 'payable' : 'neutral',
      amount: Math.abs(impact.netTaxPosition),
    };
  }, [annualSummary]);
  
  return {
    allPayments,
    filteredPayments,
    overview,
    companies,
    annualSummary,
    chartData,
    upcomingDividends,
    taxSummary,
    financialYear,
    availableYears,
    filters,
    selectedCompanyId,
    isLoading,
    isExporting,
    error,
    setFinancialYear,
    setFilters,
    setSelectedCompanyId,
    refreshData,
    loadAllPayments,
    addPayment,
    updatePayment,
    deletePayment,
    exportToCSV,
    exportAnnualTaxSummary,
    exportToPDF,
    getCompanyById,
    calculateTaxImpact,
  };
}

// ============================================================================
// HOOK: useCompanyDetail
// ============================================================================

interface UseCompanyDetailOptions {
  companyId: string | null;
  payments: DividendPayment[];
}

interface UseCompanyDetailReturn {
  company: CompanyDividendSummary | null;
  companyPayments: DividendPayment[];
  paymentHistory: {
    date: string;
    amount: number;
    frankingCredits: number;
    dividendPerShare: number;
  }[];
  annualTotals: {
    financialYear: string;
    totalDividends: number;
    totalFrankingCredits: number;
  }[];
}

export function useCompanyDetail(options: UseCompanyDetailOptions): UseCompanyDetailReturn {
  const { companyId, payments } = options;
  
  const companyPayments = useMemo(() => {
    if (!companyId) return [];
    return payments.filter(p => 
      p.asxCode === companyId || p.companyName === companyId
    ).sort((a, b) => 
      new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime()
    );
  }, [companyId, payments]);
  
  const company = useMemo(() => {
    if (!companyId || companyPayments.length === 0) return null;
    const companies = aggregateCompanies(companyPayments);
    return companies.find(c => c.id === companyId) || null;
  }, [companyId, companyPayments]);
  
  const paymentHistory = useMemo(() => {
    return companyPayments.map(p => ({
      date: p.dateReceived,
      amount: p.dividendAmount,
      frankingCredits: p.frankingCredit,
      dividendPerShare: p.dividendPerShare,
    }));
  }, [companyPayments]);
  
  const annualTotals = useMemo(() => {
    const byYear = new Map<string, { totalDividends: number; totalFrankingCredits: number }>();
    
    for (const payment of companyPayments) {
      const fy = payment.taxYear || getFinancialYear(new Date(payment.dateReceived));
      const existing = byYear.get(fy);
      if (existing) {
        existing.totalDividends += payment.dividendAmount;
        existing.totalFrankingCredits += payment.frankingCredit;
      } else {
        byYear.set(fy, {
          totalDividends: payment.dividendAmount,
          totalFrankingCredits: payment.frankingCredit,
        });
      }
    }
    
    return Array.from(byYear.entries())
      .map(([financialYear, totals]) => ({
        financialYear,
        ...totals,
      }))
      .sort((a, b) => a.financialYear.localeCompare(b.financialYear));
  }, [companyPayments]);
  
  return {
    company,
    companyPayments,
    paymentHistory,
    annualTotals,
  };
}

// ============================================================================
// HOOK: useDividendFilters
// ============================================================================

interface UseDividendFiltersReturn {
  filters: DividendFilterOptions;
  searchQuery: string;
  dateRange: { start?: string; end?: string };
  amountRange: { min?: number; max?: number };
  
  setSearchQuery: (query: string) => void;
  setDateRange: (range: { start?: string; end?: string }) => void;
  setAmountRange: (range: { min?: number; max?: number }) => void;
  setFrankedOnly: (value: boolean) => void;
  clearFilters: () => void;
  
  hasActiveFilters: boolean;
}

export function useDividendFilters(): UseDividendFiltersReturn {
  const [filters, setFilters] = useState<DividendFilterOptions>({});
  
  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query || undefined }));
  }, []);
  
  const setDateRange = useCallback((range: { start?: string; end?: string }) => {
    setFilters(prev => ({
      ...prev,
      startDate: range.start,
      endDate: range.end,
    }));
  }, []);
  
  const setAmountRange = useCallback((range: { min?: number; max?: number }) => {
    setFilters(prev => ({
      ...prev,
      minAmount: range.min,
      maxAmount: range.max,
    }));
  }, []);
  
  const setFrankedOnly = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, frankedOnly: value || undefined }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof DividendFilterOptions];
      return value !== undefined && value !== '';
    });
  }, [filters]);
  
  return {
    filters,
    searchQuery: filters.searchQuery || '',
    dateRange: { start: filters.startDate, end: filters.endDate },
    amountRange: { min: filters.minAmount, max: filters.maxAmount },
    setSearchQuery,
    setDateRange,
    setAmountRange,
    setFrankedOnly,
    clearFilters,
    hasActiveFilters,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { formatCurrency, getFinancialYear };
