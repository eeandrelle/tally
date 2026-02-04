import { useState, useEffect, useCallback } from 'react';
import type {
  SelfEducationData,
  Course,
  EducationExpense,
  DepreciatingAsset,
  EducationExpenseType,
  CourseType,
  StudyMode,
} from '@/lib/self-education-expenses';
import {
  createEmptySelfEducationData,
  calculateSelfEducationDeduction,
  calculateTaxableIncomeReduction,
  calculateDeclineInValue,
} from '@/lib/self-education-expenses';

const STORAGE_KEY = 'tally_self_education_workpaper';

export interface UseSelfEducationReturn {
  data: SelfEducationData;
  isLoading: boolean;

  // Course management
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  removeCourse: (id: string) => void;

  // Expense management
  addExpense: (expense: Omit<EducationExpense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<EducationExpense>) => void;
  removeExpense: (id: string) => void;

  // Asset management
  addAsset: (asset: Omit<DepreciatingAsset, 'id'>) => void;
  updateAsset: (id: string, updates: Partial<DepreciatingAsset>) => void;
  removeAsset: (id: string) => void;
  calculateAssetDepreciation: (id: string) => void;

  // Calculations
  recalculateTotals: () => void;

  // Export
  exportToJson: () => string;
  importFromJson: (json: string) => void;

  // Reset
  reset: () => void;
}

export function useSelfEducation(taxYear: number = 2024): UseSelfEducationReturn {
  const [data, setData] = useState<SelfEducationData>(() => createEmptySelfEducationData(taxYear));
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.taxYear === taxYear) {
            setData(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load self-education data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [taxYear]);

  // Save to localStorage when data changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoading]);

  // Course management
  const addCourse = useCallback((course: Omit<Course, 'id'>) => {
    const newCourse: Course = {
      ...course,
      id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setData(prev => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }));
  }, []);

  const updateCourse = useCallback((id: string, updates: Partial<Course>) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, []);

  const removeCourse = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.filter(c => c.id !== id),
    }));
  }, []);

  // Expense management
  const addExpense = useCallback((expense: Omit<EducationExpense, 'id'>) => {
    const newExpense: EducationExpense = {
      ...expense,
      id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setData(prev => {
      const newExpenses = [...prev.expenses, newExpense];
      const reduction = calculateTaxableIncomeReduction(newExpenses);
      const deductible = calculateSelfEducationDeduction(newExpenses, prev.depreciatingAssets, reduction);
      return {
        ...prev,
        expenses: newExpenses,
        taxableIncomeReduction: reduction,
        totalDeductible: deductible,
      };
    });
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<EducationExpense>) => {
    setData(prev => {
      const newExpenses = prev.expenses.map(e => e.id === id ? { ...e, ...updates } : e);
      const reduction = calculateTaxableIncomeReduction(newExpenses);
      const deductible = calculateSelfEducationDeduction(newExpenses, prev.depreciatingAssets, reduction);
      return {
        ...prev,
        expenses: newExpenses,
        taxableIncomeReduction: reduction,
        totalDeductible: deductible,
      };
    });
  }, []);

  const removeExpense = useCallback((id: string) => {
    setData(prev => {
      const newExpenses = prev.expenses.filter(e => e.id !== id);
      const reduction = calculateTaxableIncomeReduction(newExpenses);
      const deductible = calculateSelfEducationDeduction(newExpenses, prev.depreciatingAssets, reduction);
      return {
        ...prev,
        expenses: newExpenses,
        taxableIncomeReduction: reduction,
        totalDeductible: deductible,
      };
    });
  }, []);

  // Asset management
  const addAsset = useCallback((asset: Omit<DepreciatingAsset, 'id'>) => {
    const newAsset: DepreciatingAsset = {
      ...asset,
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setData(prev => {
      const newAssets = [...prev.depreciatingAssets, newAsset];
      const reduction = calculateTaxableIncomeReduction(prev.expenses);
      const deductible = calculateSelfEducationDeduction(prev.expenses, newAssets, reduction);
      return {
        ...prev,
        depreciatingAssets: newAssets,
        totalDeductible: deductible,
      };
    });
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<DepreciatingAsset>) => {
    setData(prev => {
      const newAssets = prev.depreciatingAssets.map(a => a.id === id ? { ...a, ...updates } : a);
      const reduction = calculateTaxableIncomeReduction(prev.expenses);
      const deductible = calculateSelfEducationDeduction(prev.expenses, newAssets, reduction);
      return {
        ...prev,
        depreciatingAssets: newAssets,
        totalDeductible: deductible,
      };
    });
  }, []);

  const removeAsset = useCallback((id: string) => {
    setData(prev => {
      const newAssets = prev.depreciatingAssets.filter(a => a.id !== id);
      const reduction = calculateTaxableIncomeReduction(prev.expenses);
      const deductible = calculateSelfEducationDeduction(prev.expenses, newAssets, reduction);
      return {
        ...prev,
        depreciatingAssets: newAssets,
        totalDeductible: deductible,
      };
    });
  }, []);

  const calculateAssetDepreciation = useCallback((id: string) => {
    setData(prev => {
      const asset = prev.depreciatingAssets.find(a => a.id === id);
      if (!asset) return prev;

      const openingBalance = asset.openingBalance ?? asset.cost;
      const declineInValue = calculateDeclineInValue(
        asset.cost,
        asset.businessUsePercentage,
        asset.effectiveLifeYears,
        asset.method,
        openingBalance
      );
      const closingBalance = openingBalance - declineInValue;

      const newAssets = prev.depreciatingAssets.map(a =>
        a.id === id
          ? { ...a, openingBalance, declineInValue, closingBalance }
          : a
      );

      const reduction = calculateTaxableIncomeReduction(prev.expenses);
      const deductible = calculateSelfEducationDeduction(prev.expenses, newAssets, reduction);

      return {
        ...prev,
        depreciatingAssets: newAssets,
        totalDeductible: deductible,
      };
    });
  }, []);

  const recalculateTotals = useCallback(() => {
    setData(prev => {
      const reduction = calculateTaxableIncomeReduction(prev.expenses);
      const deductible = calculateSelfEducationDeduction(prev.expenses, prev.depreciatingAssets, reduction);
      return {
        ...prev,
        taxableIncomeReduction: reduction,
        totalDeductible: deductible,
      };
    });
  }, []);

  const exportToJson = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importFromJson = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.courses && parsed.expenses && parsed.depreciatingAssets) {
        setData(parsed);
      }
    } catch (error) {
      console.error('Failed to import self-education data:', error);
    }
  }, []);

  const reset = useCallback(() => {
    setData(createEmptySelfEducationData(taxYear));
    localStorage.removeItem(STORAGE_KEY);
  }, [taxYear]);

  return {
    data,
    isLoading,
    addCourse,
    updateCourse,
    removeCourse,
    addExpense,
    updateExpense,
    removeExpense,
    addAsset,
    updateAsset,
    removeAsset,
    calculateAssetDepreciation,
    recalculateTotals,
    exportToJson,
    importFromJson,
    reset,
  };
}
