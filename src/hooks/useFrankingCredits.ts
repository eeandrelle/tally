/**
 * useFrankingCredits Hook
 * 
 * React hook for franking credit calculations and history management
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { 
  DividendEntry, 
  AnnualFrankingSummary,
  TaxImpactResult,
  FrankingCreditCalculation 
} from '../lib/franking-credits';
import {
  calculateFrankingFromDividend,
  calculateTaxImpactAtAllRates,
  calculateTaxImpactForIncome,
  calculateAnnualSummary,
  formatCurrency,
  getFinancialYear,
} from '../lib/franking-credits';
import {
  getDividendEntriesByTaxYear,
  getAnnualFrankingSummary,
  getAvailableTaxYears,
  exportDividendEntriesToCSV,
  exportDividendEntriesToJSON,
} from '../lib/db-franking-credits';

// ============= HOOK: useFrankingCredits =============

interface UseFrankingCreditsOptions {
  taxYear?: string;
  autoLoad?: boolean;
}

interface UseFrankingCreditsReturn {
  // Data
  entries: DividendEntry[];
  summary: AnnualFrankingSummary | null;
  taxYears: string[];
  
  // Loading states
  isLoading: boolean;
  isExporting: boolean;
  error: Error | null;
  
  // Actions
  loadEntries: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  exportToCSV: () => Promise<string>;
  exportToJSON: () => Promise<string>;
  
  // Calculated values
  totalDividends: number;
  totalFrankingCredits: number;
  totalGrossedUpDividends: number;
  entryCount: number;
}

export function useFrankingCredits(options: UseFrankingCreditsOptions = {}): UseFrankingCreditsReturn {
  const { taxYear = getFinancialYear(), autoLoad = true } = options;
  
  const [entries, setEntries] = useState<DividendEntry[]>([]);
  const [summary, setSummary] = useState<AnnualFrankingSummary | null>(null);
  const [taxYears, setTaxYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Load entries for the tax year
  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [entriesData, yearsData] = await Promise.all([
        getDividendEntriesByTaxYear(taxYear),
        getAvailableTaxYears(),
      ]);
      
      setEntries(entriesData);
      setTaxYears(yearsData);
      
      // Calculate summary
      if (entriesData.length > 0) {
        const summaryData = calculateAnnualSummary(entriesData, taxYear);
        setSummary(summaryData);
      } else {
        setSummary({
          taxYear,
          totalDividends: 0,
          totalFrankingCredits: 0,
          totalGrossedUpDividends: 0,
          entries: [],
          taxImpactAtRates: calculateTaxImpactAtAllRates(0, 0),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load franking credit entries'));
    } finally {
      setIsLoading(false);
    }
  }, [taxYear]);
  
  // Refresh summary (without reloading entries)
  const refreshSummary = useCallback(async () => {
    if (entries.length === 0) return;
    
    try {
      const summaryData = calculateAnnualSummary(entries, taxYear);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh summary'));
    }
  }, [entries, taxYear]);
  
  // Export to CSV
  const exportToCSV = useCallback(async (): Promise<string> => {
    setIsExporting(true);
    try {
      const csv = await exportDividendEntriesToCSV(taxYear);
      return csv;
    } finally {
      setIsExporting(false);
    }
  }, [taxYear]);
  
  // Export to JSON
  const exportToJSON = useCallback(async (): Promise<string> => {
    setIsExporting(true);
    try {
      const json = await exportDividendEntriesToJSON(taxYear);
      return json;
    } finally {
      setIsExporting(false);
    }
  }, [taxYear]);
  
  // Auto-load on mount and when tax year changes
  useEffect(() => {
    if (autoLoad) {
      loadEntries();
    }
  }, [autoLoad, loadEntries, taxYear]);
  
  // Computed values
  const totalDividends = useMemo(() => 
    entries.reduce((sum, e) => sum + e.dividendAmount, 0),
    [entries]
  );
  
  const totalFrankingCredits = useMemo(() => 
    entries.reduce((sum, e) => sum + e.frankingCredit, 0),
    [entries]
  );
  
  const totalGrossedUpDividends = useMemo(() => 
    entries.reduce((sum, e) => sum + e.grossedUpDividend, 0),
    [entries]
  );
  
  const entryCount = entries.length;
  
  return {
    entries,
    summary,
    taxYears,
    isLoading,
    isExporting,
    error,
    loadEntries,
    refreshSummary,
    exportToCSV,
    exportToJSON,
    totalDividends,
    totalFrankingCredits,
    totalGrossedUpDividends,
    entryCount,
  };
}

// ============= HOOK: useFrankingCalculator =============

interface UseFrankingCalculatorOptions {
  initialDividend?: number;
  initialPercentage?: number;
}

interface UseFrankingCalculatorReturn {
  // Inputs
  dividendAmount: number;
  frankingPercentage: number;
  
  // Setters
  setDividendAmount: (amount: number) => void;
  setFrankingPercentage: (percentage: number) => void;
  
  // Calculated results
  calculation: FrankingCreditCalculation;
  taxImpacts: TaxImpactResult[];
  
  // Utility
  reset: () => void;
  isValid: boolean;
}

export function useFrankingCalculator(
  options: UseFrankingCalculatorOptions = {}
): UseFrankingCalculatorReturn {
  const { initialDividend = 0, initialPercentage = 100 } = options;
  
  const [dividendAmount, setDividendAmount] = useState(initialDividend);
  const [frankingPercentage, setFrankingPercentage] = useState(initialPercentage);
  
  // Calculate results
  const calculation = useMemo(() => 
    calculateFrankingFromDividend(dividendAmount, frankingPercentage),
    [dividendAmount, frankingPercentage]
  );
  
  // Calculate tax impacts at all rates
  const taxImpacts = useMemo(() => 
    calculateTaxImpactAtAllRates(calculation.grossedUpDividend, calculation.frankingCredit),
    [calculation.grossedUpDividend, calculation.frankingCredit]
  );
  
  // Validation
  const isValid = useMemo(() => 
    dividendAmount >= 0 && frankingPercentage >= 0 && frankingPercentage <= 100,
    [dividendAmount, frankingPercentage]
  );
  
  // Reset function
  const reset = useCallback(() => {
    setDividendAmount(initialDividend);
    setFrankingPercentage(initialPercentage);
  }, [initialDividend, initialPercentage]);
  
  return {
    dividendAmount,
    frankingPercentage,
    setDividendAmount,
    setFrankingPercentage,
    calculation,
    taxImpacts,
    reset,
    isValid,
  };
}

// ============= HOOK: useTaxImpact =============

interface UseTaxImpactOptions {
  grossedUpDividend: number;
  frankingCredit: number;
  taxableIncome?: number;
}

interface UseTaxImpactReturn {
  taxImpact: TaxImpactResult | null;
  allTaxImpacts: TaxImpactResult[];
  marginalRate: number;
  isRefundable: boolean;
  refundAmount: number;
  taxPayableAmount: number;
}

export function useTaxImpact(options: UseTaxImpactOptions): UseTaxImpactReturn {
  const { grossedUpDividend, frankingCredit, taxableIncome = 0 } = options;
  
  // Calculate tax impact at all rates
  const allTaxImpacts = useMemo(() => 
    calculateTaxImpactAtAllRates(grossedUpDividend, frankingCredit),
    [grossedUpDividend, frankingCredit]
  );
  
  // Calculate tax impact at user's specific income
  const taxImpact = useMemo(() => {
    if (taxableIncome <= 0) return null;
    return calculateTaxImpactForIncome(grossedUpDividend, frankingCredit, taxableIncome);
  }, [grossedUpDividend, frankingCredit, taxableIncome]);
  
  // Determine marginal rate
  const marginalRate = taxImpact?.marginalRate || 0;
  
  // Determine if refundable and amounts
  const isRefundable = (taxImpact?.netTaxPosition || 0) < 0;
  const refundAmount = isRefundable ? Math.abs(taxImpact?.netTaxPosition || 0) : 0;
  const taxPayableAmount = !isRefundable ? (taxImpact?.netTaxPosition || 0) : 0;
  
  return {
    taxImpact,
    allTaxImpacts,
    marginalRate,
    isRefundable,
    refundAmount,
    taxPayableAmount,
  };
}

// ============= HOOK: useFrankingCreditHistory =============

interface UseFrankingCreditHistoryReturn {
  taxYears: string[];
  isLoading: boolean;
  error: Error | null;
  loadTaxYears: () => Promise<void>;
}

export function useFrankingCreditHistory(): UseFrankingCreditHistoryReturn {
  const [taxYears, setTaxYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const loadTaxYears = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const years = await getAvailableTaxYears();
      setTaxYears(years);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tax years'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load on mount
  useEffect(() => {
    loadTaxYears();
  }, [loadTaxYears]);
  
  return {
    taxYears,
    isLoading,
    error,
    loadTaxYears,
  };
}

// ============= HOOK: useAnnualFrankingSummary =============

import {
  getDividendEntriesByTaxYear,
  getFrankingCreditSummaries,
} from '../lib/db-franking-credits';
import { calculateAnnualSummary } from '../lib/franking-credits';

interface UseAnnualFrankingSummaryOptions {
  taxYear: string;
  autoLoad?: boolean;
}

interface UseAnnualFrankingSummaryReturn {
  summary: AnnualFrankingSummary | null;
  allSummaries: { taxYear: string; totalDividends: number; totalFrankingCredits: number }[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAnnualFrankingSummary(
  options: UseAnnualFrankingSummaryOptions
): UseAnnualFrankingSummaryReturn {
  const { taxYear, autoLoad = true } = options;
  
  const [summary, setSummary] = useState<AnnualFrankingSummary | null>(null);
  const [allSummaries, setAllSummaries] = useState<{ taxYear: string; totalDividends: number; totalFrankingCredits: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [entries, summaries] = await Promise.all([
        getDividendEntriesByTaxYear(taxYear),
        getFrankingCreditSummaries(),
      ]);
      
      const calculatedSummary = calculateAnnualSummary(entries, taxYear);
      setSummary(calculatedSummary);
      
      setAllSummaries(summaries.map(s => ({
        taxYear: s.tax_year,
        totalDividends: s.total_dividends,
        totalFrankingCredits: s.total_franking_credits,
      })));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load annual summary'));
    } finally {
      setIsLoading(false);
    }
  }, [taxYear]);
  
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh, taxYear]);
  
  return {
    summary,
    allSummaries,
    isLoading,
    error,
    refresh,
  };
}

// ============= HOOK: useFrankingTaxImpact =============

interface UseFrankingTaxImpactOptions {
  grossedUpDividend: number;
  frankingCredit: number;
  taxableIncome: number;
}

interface UseFrankingTaxImpactReturn {
  taxImpact: TaxImpactResult | null;
  isRefundable: boolean;
  refundAmount: number;
  taxPayableAmount: number;
  breakEvenRate: number;
  effectiveTaxRate: number;
  scenarioAtZeroPercent: TaxImpactResult;
  scenarioAtThirtyPercent: TaxImpactResult;
  scenarioAtMarginalRate: TaxImpactResult | null;
}

export function useFrankingTaxImpact(
  options: UseFrankingTaxImpactOptions
): UseFrankingTaxImpactReturn {
  const { grossedUpDividend, frankingCredit, taxableIncome } = options;
  
  // Calculate at specific marginal rate
  const taxImpact = useMemo(() => {
    if (taxableIncome <= 0) return null;
    return calculateTaxImpactForIncome(grossedUpDividend, frankingCredit, taxableIncome);
  }, [grossedUpDividend, frankingCredit, taxableIncome]);
  
  // Calculate at 0% (full refund scenario)
  const scenarioAtZeroPercent = useMemo(() => 
    calculateTaxImpact(grossedUpDividend, frankingCredit, 0),
    [grossedUpDividend, frankingCredit]
  );
  
  // Calculate at 30% (break-even for fully franked)
  const scenarioAtThirtyPercent = useMemo(() => 
    calculateTaxImpact(grossedUpDividend, frankingCredit, 0.30),
    [grossedUpDividend, frankingCredit]
  );
  
  // Calculate at user's marginal rate
  const scenarioAtMarginalRate = taxImpact;
  
  // Determine refund/payable status
  const isRefundable = (taxImpact?.netTaxPosition || 0) < 0;
  const refundAmount = isRefundable ? Math.abs(taxImpact?.netTaxPosition || 0) : 0;
  const taxPayableAmount = !isRefundable ? (taxImpact?.netTaxPosition || 0) : 0;
  
  // Calculate break-even rate
  const breakEvenRate = grossedUpDividend > 0 
    ? (frankingCredit / grossedUpDividend) * 100 
    : 30;
  
  // Effective tax rate
  const effectiveTaxRate = taxImpact?.effectiveTaxRate || 0;
  
  return {
    taxImpact,
    isRefundable,
    refundAmount,
    taxPayableAmount,
    breakEvenRate,
    effectiveTaxRate,
    scenarioAtZeroPercent,
    scenarioAtThirtyPercent,
    scenarioAtMarginalRate,
  };
}

// ============= HOOK: useFrankingRefundEstimate =============

interface UseFrankingRefundEstimateOptions {
  totalDividends: number;
  totalFrankingCredits: number;
  taxableIncome: number;
  otherIncome?: number;
}

interface UseFrankingRefundEstimateReturn {
  // Core calculations
  refundAmount: number;
  taxPayableAmount: number;
  isRefundable: boolean;
  isTaxPayable: boolean;
  netTaxPosition: number;
  
  // Detailed breakdown
  marginalRate: number;
  totalTaxableIncome: number;
  taxOnGrossedUpDividends: number;
  effectiveTaxRateOnDividends: number;
  
  // Scenarios
  maxPossibleRefund: number;
  breakEvenIncomeLevel: number;
  refundAtZeroIncome: number;
  
  // Advice
  advice: string;
  canClaimRefund: boolean;
}

export function useFrankingRefundEstimate(
  options: UseFrankingRefundEstimateOptions
): UseFrankingRefundEstimateReturn {
  const { 
    totalDividends, 
    totalFrankingCredits, 
    taxableIncome, 
    otherIncome = 0 
  } = options;
  
  const grossedUpDividends = totalDividends + totalFrankingCredits;
  const totalTaxableIncome = taxableIncome + otherIncome + grossedUpDividends;
  
  // Get tax impact
  const taxImpact = useMemo(() => 
    calculateTaxImpactForIncome(grossedUpDividends, totalFrankingCredits, totalTaxableIncome),
    [grossedUpDividends, totalFrankingCredits, totalTaxableIncome]
  );
  
  // Calculate refund scenario at 0% income
  const zeroIncomeScenario = useMemo(() => 
    calculateTaxImpact(grossedUpDividends, totalFrankingCredits, 0),
    [grossedUpDividends, totalFrankingCredits]
  );
  
  const marginalRate = taxImpact.marginalRate;
  const netTaxPosition = taxImpact.netTaxPosition;
  const isRefundable = netTaxPosition < 0;
  const isTaxPayable = netTaxPosition > 0;
  const refundAmount = isRefundable ? Math.abs(netTaxPosition) : 0;
  const taxPayableAmount = isTaxPayable ? netTaxPosition : 0;
  
  // Max refund is at 0% tax rate
  const maxPossibleRefund = Math.abs(zeroIncomeScenario.netTaxPosition);
  const refundAtZeroIncome = maxPossibleRefund;
  
  // Calculate break-even income level (approximate)
  // This is the income where marginal rate equals the franking rate
  const breakEvenIncomeLevel = 45000; // 30% bracket threshold
  
  // Determine if user can claim refund
  const canClaimRefund = isRefundable;
  
  // Generate advice
  const advice = useMemo(() => {
    if (isRefundable) {
      return `You're eligible for a refund of ${formatCurrency(refundAmount)} because your marginal tax rate of ${(marginalRate * 100).toFixed(0)}% is lower than the 30% company tax rate paid on your dividends.`;
    } else if (isTaxPayable) {
      return `You'll need to pay an additional ${formatCurrency(taxPayableAmount)} in tax because your marginal tax rate of ${(marginalRate * 100).toFixed(0)}% is higher than the 30% company tax rate.`;
    } else {
      return `Your franking credits exactly offset your tax liability. No refund or additional tax is due on these dividends.`;
    }
  }, [isRefundable, isTaxPayable, refundAmount, taxPayableAmount, marginalRate]);
  
  return {
    refundAmount,
    taxPayableAmount,
    isRefundable,
    isTaxPayable,
    netTaxPosition,
    marginalRate,
    totalTaxableIncome,
    taxOnGrossedUpDividends: taxImpact.taxOnGrossedUp,
    effectiveTaxRateOnDividends: taxImpact.effectiveTaxRate,
    maxPossibleRefund,
    breakEvenIncomeLevel,
    refundAtZeroIncome,
    advice,
    canClaimRefund,
  };
}

// ============= UTILITY EXPORTS =============

export { formatCurrency, getFinancialYear };
