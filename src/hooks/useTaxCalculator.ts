/**
 * useTaxCalculator Hook
 * 
 * React hook for managing tax calculator state and calculations.
 * Provides functions for creating scenarios, managing deductions, and comparing methods.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  type TaxScenario,
  type DeductionItem,
  type MethodComparison,
  type WhatIfComparison,
  type TaxCalculationResult,
  type SavingsBreakdown,
  createTaxScenario,
  compareScenarios,
  compareDeductionMethods,
  calculateTaxPayable,
  calculateTaxSavings,
  getMarginalTaxRate,
  getTaxBracketData,
  getRemainingInBracket,
  calculateDeductionImpact,
  validateDeduction,
  generateDeductionId,
  formatCurrency,
  formatPercent,
  TAX_BRACKETS,
} from '@/lib/tax-calculator';

// ============= TYPES =============

export interface CalculatorState {
  // Current scenario being edited
  currentScenario: TaxScenario;
  
  // Saved scenarios for comparison
  savedScenarios: TaxScenario[];
  
  // Comparison state
  comparison: WhatIfComparison | null;
  
  // Method comparison state
  methodComparison: MethodComparison | null;
  
  // UI state
  selectedDeductionId: string | null;
  activeTab: 'calculator' | 'comparison' | 'methods' | 'brackets';
  showAddDeduction: boolean;
}

export interface UseTaxCalculatorReturn {
  // State
  currentScenario: TaxScenario;
  savedScenarios: TaxScenario[];
  comparison: WhatIfComparison | null;
  methodComparison: MethodComparison | null;
  selectedDeductionId: string | null;
  activeTab: CalculatorState['activeTab'];
  showAddDeduction: boolean;
  
  // Computed values
  totalDeductions: number;
  taxableIncome: number;
  taxResult: TaxCalculationResult;
  marginalRate: number;
  effectiveRate: number;
  bracketData: ReturnType<typeof getTaxBracketData>;
  remainingInBracket: ReturnType<typeof getRemainingInBracket>;
  
  // Actions - Scenario
  setScenarioName: (name: string) => void;
  setTaxableIncome: (income: number) => void;
  setMedicareLevy: (enabled: boolean) => void;
  setPrivateHospitalCover: (hasCover: boolean) => void;
  setTaxOffsets: (offsets: number) => void;
  saveCurrentScenario: () => void;
  loadScenario: (scenarioId: string) => void;
  deleteScenario: (scenarioId: string) => void;
  resetScenario: () => void;
  duplicateScenario: (scenarioId: string) => void;
  
  // Actions - Deductions
  addDeduction: (deduction: Omit<DeductionItem, 'id'>) => { success: boolean; errors: string[] };
  updateDeduction: (id: string, updates: Partial<DeductionItem>) => void;
  removeDeduction: (id: string) => void;
  selectDeduction: (id: string | null) => void;
  setDeductionMethod: (id: string, method: DeductionItem['method']) => void;
  
  // Actions - Comparison
  compareWithBaseline: (baselineId?: string) => WhatIfComparison | null;
  compareTwoScenarios: (scenarioAId: string, scenarioBId: string) => WhatIfComparison | null;
  clearComparison: () => void;
  
  // Actions - Method Comparison
  compareMethods: (assetValue: number, assetName: string, years?: number) => MethodComparison | null;
  clearMethodComparison: () => void;
  
  // Actions - UI
  setActiveTab: (tab: CalculatorState['activeTab']) => void;
  setShowAddDeduction: (show: boolean) => void;
  
  // Utility functions
  calculateImpact: (additionalDeduction: number) => ReturnType<typeof calculateDeductionImpact>;
  getSavingsForDeduction: (amount: number) => SavingsBreakdown;
  formatCurrency: (amount: number) => string;
  formatPercent: (value: number, decimals?: number) => string;
  
  // Export
  exportToCSV: () => string;
}

// ============= DEFAULT VALUES =============

const DEFAULT_TAXABLE_INCOME = 75000;

const createDefaultScenario = (): TaxScenario =>
  createTaxScenario('Current Scenario', DEFAULT_TAXABLE_INCOME);

// ============= HOOK IMPLEMENTATION =============

export function useTaxCalculator(
  initialIncome: number = DEFAULT_TAXABLE_INCOME
): UseTaxCalculatorReturn {
  // ============= STATE =============
  
  const [currentScenario, setCurrentScenario] = useState<TaxScenario>(
    createTaxScenario('Current Scenario', initialIncome)
  );
  
  // Ref to always access latest currentScenario in callbacks
  const currentScenarioRef = useRef(currentScenario);
  useEffect(() => {
    currentScenarioRef.current = currentScenario;
  }, [currentScenario]);
  
  const [savedScenarios, setSavedScenarios] = useState<TaxScenario[]>([]);
  const [comparison, setComparison] = useState<WhatIfComparison | null>(null);
  const [methodComparison, setMethodComparison] = useState<MethodComparison | null>(null);
  const [selectedDeductionId, setSelectedDeductionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalculatorState['activeTab']>('calculator');
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  
  // ============= COMPUTED VALUES =============
  
  const totalDeductions = useMemo(() => {
    return currentScenario.deductions
      .filter((d) => d.method === 'immediate')
      .reduce((sum, d) => sum + d.amount, 0);
  }, [currentScenario.deductions]);
  
  const taxableIncome = useMemo(() => {
    return Math.max(0, currentScenario.taxableIncome - totalDeductions);
  }, [currentScenario.taxableIncome, totalDeductions]);
  
  const taxResult = useMemo(() => {
    return calculateTaxPayable(
      taxableIncome,
      currentScenario.medicareLevy,
      currentScenario.privateHospitalCover
    );
  }, [taxableIncome, currentScenario.medicareLevy, currentScenario.privateHospitalCover]);
  
  const marginalRate = useMemo(() => {
    return getMarginalTaxRate(taxableIncome);
  }, [taxableIncome]);
  
  const effectiveRate = useMemo(() => {
    return taxableIncome > 0 ? taxResult.totalTax / taxableIncome : 0;
  }, [taxResult.totalTax, taxableIncome]);
  
  const bracketData = useMemo(() => {
    return getTaxBracketData(taxableIncome);
  }, [taxableIncome]);
  
  const remainingInBracket = useMemo(() => {
    return getRemainingInBracket(taxableIncome);
  }, [taxableIncome]);
  
  // ============= SCENARIO ACTIONS =============
  
  const setScenarioName = useCallback((name: string) => {
    setCurrentScenario((prev) => ({ ...prev, name }));
  }, []);
  
  const setTaxableIncome = useCallback((income: number) => {
    setCurrentScenario((prev) => ({ ...prev, taxableIncome: Math.max(0, income) }));
  }, []);
  
  const setMedicareLevy = useCallback((enabled: boolean) => {
    setCurrentScenario((prev) => ({ ...prev, medicareLevy: enabled }));
  }, []);
  
  const setPrivateHospitalCover = useCallback((hasCover: boolean) => {
    setCurrentScenario((prev) => ({ ...prev, privateHospitalCover: hasCover }));
  }, []);
  
  const setTaxOffsets = useCallback((offsets: number) => {
    setCurrentScenario((prev) => ({ ...prev, taxOffsets: Math.max(0, offsets) }));
  }, []);
  
  const saveCurrentScenario = useCallback(() => {
    const current = currentScenarioRef.current;
    setSavedScenarios((prev) => {
      const exists = prev.find((s) => s.id === current.id);
      if (exists) {
        return prev.map((s) => (s.id === current.id ? { ...current } : s));
      }
      // Create a deep copy of the current scenario
      const scenarioToSave = JSON.parse(JSON.stringify(current));
      return [...prev, scenarioToSave];
    });
  }, []);
  
  const loadScenario = useCallback((scenarioId: string) => {
    setSavedScenarios((prev) => {
      const scenario = prev.find((s) => s.id === scenarioId);
      if (scenario) {
        setCurrentScenario({ ...scenario });
      }
      return prev;
    });
  }, []);
  
  const deleteScenario = useCallback((scenarioId: string) => {
    setSavedScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
  }, []);
  
  const resetScenario = useCallback(() => {
    setCurrentScenario(createDefaultScenario());
    setComparison(null);
    setMethodComparison(null);
    setSelectedDeductionId(null);
  }, []);
  
  const duplicateScenario = useCallback((scenarioId: string) => {
    setSavedScenarios((prev) => {
      const scenario = prev.find((s) => s.id === scenarioId);
      if (scenario) {
        const duplicated: TaxScenario = {
          ...scenario,
          id: generateDeductionId(),
          name: `${scenario.name} (Copy)`,
        };
        return [...prev, duplicated];
      }
      return prev;
    });
  }, []);
  
  // ============= DEDUCTION ACTIONS =============
  
  const addDeduction = useCallback((deduction: Omit<DeductionItem, 'id'>): { success: boolean; errors: string[] } => {
    const validation = validateDeduction(deduction);
    
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    const newDeduction: DeductionItem = {
      ...deduction,
      id: generateDeductionId(),
    };
    
    setCurrentScenario((prev) => ({
      ...prev,
      deductions: [...prev.deductions, newDeduction],
    }));
    
    return { success: true, errors: [] };
  }, []);
  
  const updateDeduction = useCallback((id: string, updates: Partial<DeductionItem>) => {
    setCurrentScenario((prev) => ({
      ...prev,
      deductions: prev.deductions.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  }, []);
  
  const removeDeduction = useCallback((id: string) => {
    setCurrentScenario((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((d) => d.id !== id),
    }));
    if (selectedDeductionId === id) {
      setSelectedDeductionId(null);
    }
  }, [selectedDeductionId]);
  
  const selectDeduction = useCallback((id: string | null) => {
    setSelectedDeductionId(id);
  }, []);
  
  const setDeductionMethod = useCallback((id: string, method: DeductionItem['method']) => {
    setCurrentScenario((prev) => ({
      ...prev,
      deductions: prev.deductions.map((d) =>
        d.id === id ? { ...d, method } : d
      ),
    }));
  }, []);
  
  // ============= COMPARISON ACTIONS =============
  
  const compareWithBaseline = useCallback((baselineId?: string): WhatIfComparison | null => {
    let baseline: TaxScenario;
    
    if (baselineId) {
      const found = savedScenarios.find((s) => s.id === baselineId);
      if (!found) return null;
      baseline = found;
    } else {
      // Use empty baseline
      baseline = createTaxScenario('Baseline (No Deductions)', currentScenario.taxableIncome);
    }
    
    const newComparison = compareScenarios(baseline, currentScenario);
    setComparison(newComparison);
    return newComparison;
  }, [currentScenario, savedScenarios]);
  
  const compareTwoScenarios = useCallback((scenarioAId: string, scenarioBId: string): WhatIfComparison | null => {
    const scenarioA = savedScenarios.find((s) => s.id === scenarioAId);
    const scenarioB = savedScenarios.find((s) => s.id === scenarioBId);
    
    if (!scenarioA || !scenarioB) return null;
    
    const newComparison = compareScenarios(scenarioA, scenarioB);
    setComparison(newComparison);
    return newComparison;
  }, [savedScenarios]);
  
  const clearComparison = useCallback(() => {
    setComparison(null);
  }, []);
  
  // ============= METHOD COMPARISON ACTIONS =============
  
  const compareMethods = useCallback((assetValue: number, assetName: string, years: number = 5): MethodComparison | null => {
    const newComparison = compareDeductionMethods(
      assetValue,
      assetName,
      currentScenario.taxableIncome,
      years,
      currentScenario.medicareLevy
    );
    setMethodComparison(newComparison);
    return newComparison;
  }, [currentScenario.taxableIncome, currentScenario.medicareLevy]);
  
  const clearMethodComparison = useCallback(() => {
    setMethodComparison(null);
  }, []);
  
  // ============= UTILITY FUNCTIONS =============
  
  const calculateImpact = useCallback((additionalDeduction: number) => {
    return calculateDeductionImpact(currentScenario.taxableIncome, additionalDeduction);
  }, [currentScenario.taxableIncome]);
  
  const getSavingsForDeduction = useCallback((amount: number) => {
    return calculateTaxSavings(amount, currentScenario.taxableIncome, currentScenario.medicareLevy);
  }, [currentScenario.taxableIncome, currentScenario.medicareLevy]);
  
  // ============= EXPORT =============
  
  const exportToCSV = useCallback(() => {
    if (!comparison) {
      // Export current scenario
      const emptyBaseline = createTaxScenario('Baseline', currentScenario.taxableIncome);
      const currentComparison = compareScenarios(emptyBaseline, currentScenario);
      return exportComparisonToCSV(currentComparison);
    }
    return exportComparisonToCSV(comparison);
  }, [comparison, currentScenario]);
  
  // ============= RETURN =============
  
  return {
    // State
    currentScenario,
    savedScenarios,
    comparison,
    methodComparison,
    selectedDeductionId,
    activeTab,
    showAddDeduction,
    
    // Computed values
    totalDeductions,
    taxableIncome,
    taxResult,
    marginalRate,
    effectiveRate,
    bracketData,
    remainingInBracket,
    
    // Actions - Scenario
    setScenarioName,
    setTaxableIncome,
    setMedicareLevy,
    setPrivateHospitalCover,
    setTaxOffsets,
    saveCurrentScenario,
    loadScenario,
    deleteScenario,
    resetScenario,
    duplicateScenario,
    
    // Actions - Deductions
    addDeduction,
    updateDeduction,
    removeDeduction,
    selectDeduction,
    setDeductionMethod,
    
    // Actions - Comparison
    compareWithBaseline,
    compareTwoScenarios,
    clearComparison,
    
    // Actions - Method Comparison
    compareMethods,
    clearMethodComparison,
    
    // Actions - UI
    setActiveTab,
    setShowAddDeduction,
    
    // Utility functions
    calculateImpact,
    getSavingsForDeduction,
    formatCurrency,
    formatPercent,
    
    // Export
    exportToCSV,
  };
}

// ============= HELPER FUNCTIONS =============

function exportComparisonToCSV(comparison: WhatIfComparison): string {
  const lines: string[] = [];
  
  lines.push('Tax Scenario Comparison');
  lines.push('');
  lines.push(`Baseline:,${comparison.baseline.name}`);
  lines.push(`Scenario:,${comparison.scenario.name}`);
  lines.push('');
  lines.push('Metric,Baseline,Scenario,Difference');
  lines.push(`Taxable Income,${comparison.baselineResult.taxableIncome},${comparison.scenarioResult.taxableIncome},${comparison.baselineResult.taxableIncome - comparison.scenarioResult.taxableIncome}`);
  lines.push(`Tax Payable,${comparison.baselineResult.taxPayable},${comparison.scenarioResult.taxPayable},${comparison.baselineResult.taxPayable - comparison.scenarioResult.taxPayable}`);
  lines.push(`Medicare Levy,${comparison.baselineResult.medicareLevy},${comparison.scenarioResult.medicareLevy},${comparison.baselineResult.medicareLevy - comparison.scenarioResult.medicareLevy}`);
  lines.push(`Total Tax,${comparison.baselineResult.totalTax},${comparison.scenarioResult.totalTax},${comparison.baselineResult.totalTax - comparison.scenarioResult.totalTax}`);
  lines.push('');
  lines.push('Savings Breakdown');
  lines.push(`Federal Tax Savings:,${comparison.savingsBreakdown.federalTaxSavings}`);
  lines.push(`Medicare Levy Savings:,${comparison.savingsBreakdown.medicareLevySavings}`);
  lines.push(`MLS Savings:,${comparison.savingsBreakdown.mlsSavings}`);
  lines.push(`Total Savings:,${comparison.savingsBreakdown.totalSavings}`);
  lines.push(`Estimated Refund:,${comparison.savingsBreakdown.refundEstimate}`);
  
  return lines.join('\n');
}
