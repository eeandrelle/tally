import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ClothingWorkpaper,
  ClothingExpense,
  LaundryExpense,
  ClothingType,
  createEmptyWorkpaper,
  calculateTotals,
  validateWorkpaper,
  generateId,
  exportForTax,
  CategoryTotals,
  ValidationResult,
  REASONABLE_LAUNDRY_RATES,
} from '@/lib/clothing-expenses';

const STORAGE_KEY = 'tally-clothing-expenses';

export interface UseClothingExpensesReturn {
  // State
  workpaper: ClothingWorkpaper;
  totals: CategoryTotals;
  validation: ValidationResult;

  // Employee/employer info
  updateEmployeeInfo: (info: { 
    employeeName: string; 
    employerName: string;
    employerRequiresUniform: boolean;
    uniformDescription?: string;
  }) => void;

  // Settings
  setUseReasonableLaundryRate: (use: boolean) => void;

  // Clothing expenses
  addClothingExpense: (expense: Omit<ClothingExpense, 'id'>) => void;
  updateClothingExpense: (id: string, updates: Partial<ClothingExpense>) => void;
  deleteClothingExpense: (id: string) => void;
  linkClothingReceipt: (id: string, receiptId: string, receiptUrl?: string) => void;
  unlinkClothingReceipt: (id: string) => void;

  // Laundry expenses
  addLaundryExpense: (expense: Omit<LaundryExpense, 'id'>) => void;
  updateLaundryExpense: (id: string, updates: Partial<LaundryExpense>) => void;
  deleteLaundryExpense: (id: string) => void;
  linkLaundryReceipt: (id: string, receiptId: string, receiptUrl?: string) => void;
  unlinkLaundryReceipt: (id: string) => void;

  // Notes
  updateNotes: (notes: string) => void;

  // Actions
  reset: () => void;
  exportData: () => object;
  save: () => void;
  load: (id: string) => void;
  getAllSaved: () => ClothingWorkpaper[];
  deleteSaved: (id: string) => void;
  
  // Constants
  reasonableLaundryRates: typeof REASONABLE_LAUNDRY_RATES;
}

export function useClothingExpenses(taxYear: string): UseClothingExpensesReturn {
  // Initialize state
  const [workpaper, setWorkpaper] = useState<ClothingWorkpaper>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-current-${taxYear}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return createEmptyWorkpaper(taxYear);
        }
      }
    }
    return createEmptyWorkpaper(taxYear);
  });

  // Calculate derived values
  const totals = useMemo(() => calculateTotals(workpaper), [workpaper]);
  const validation = useMemo(() => validateWorkpaper(workpaper), [workpaper]);

  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}-current-${taxYear}`, JSON.stringify(workpaper));
    }
  }, [workpaper, taxYear]);

  // Update helpers
  const updateWorkpaper = useCallback((updates: Partial<ClothingWorkpaper>) => {
    setWorkpaper(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Employee info actions
  const updateEmployeeInfo = useCallback((info: {
    employeeName: string;
    employerName: string;
    employerRequiresUniform: boolean;
    uniformDescription?: string;
  }) => {
    updateWorkpaper(info);
  }, [updateWorkpaper]);

  // Settings
  const setUseReasonableLaundryRate = useCallback((use: boolean) => {
    updateWorkpaper({ useReasonableLaundryRate: use });
  }, [updateWorkpaper]);

  // Clothing expense actions
  const addClothingExpense = useCallback((expense: Omit<ClothingExpense, 'id'>) => {
    const newExpense: ClothingExpense = {
      ...expense,
      id: generateId(),
    };
    updateWorkpaper({
      clothingExpenses: [...workpaper.clothingExpenses, newExpense],
    });
  }, [workpaper.clothingExpenses, updateWorkpaper]);

  const updateClothingExpense = useCallback((id: string, updates: Partial<ClothingExpense>) => {
    updateWorkpaper({
      clothingExpenses: workpaper.clothingExpenses.map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      ),
    });
  }, [workpaper.clothingExpenses, updateWorkpaper]);

  const deleteClothingExpense = useCallback((id: string) => {
    updateWorkpaper({
      clothingExpenses: workpaper.clothingExpenses.filter(expense => expense.id !== id),
    });
  }, [workpaper.clothingExpenses, updateWorkpaper]);

  const linkClothingReceipt = useCallback((id: string, receiptId: string, receiptUrl?: string) => {
    updateClothingExpense(id, { receiptUrl: receiptUrl || receiptId });
  }, [updateClothingExpense]);

  const unlinkClothingReceipt = useCallback((id: string) => {
    updateClothingExpense(id, { receiptUrl: undefined });
  }, [updateClothingExpense]);

  // Laundry expense actions
  const addLaundryExpense = useCallback((expense: Omit<LaundryExpense, 'id'>) => {
    const newExpense: LaundryExpense = {
      ...expense,
      id: generateId(),
    };
    updateWorkpaper({
      laundryExpenses: [...workpaper.laundryExpenses, newExpense],
    });
  }, [workpaper.laundryExpenses, updateWorkpaper]);

  const updateLaundryExpense = useCallback((id: string, updates: Partial<LaundryExpense>) => {
    updateWorkpaper({
      laundryExpenses: workpaper.laundryExpenses.map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      ),
    });
  }, [workpaper.laundryExpenses, updateWorkpaper]);

  const deleteLaundryExpense = useCallback((id: string) => {
    updateWorkpaper({
      laundryExpenses: workpaper.laundryExpenses.filter(expense => expense.id !== id),
    });
  }, [workpaper.laundryExpenses, updateWorkpaper]);

  const linkLaundryReceipt = useCallback((id: string, receiptId: string, receiptUrl?: string) => {
    updateLaundryExpense(id, { receiptUrl: receiptUrl || receiptId });
  }, [updateLaundryExpense]);

  const unlinkLaundryReceipt = useCallback((id: string) => {
    updateLaundryExpense(id, { receiptUrl: undefined });
  }, [updateLaundryExpense]);

  // Notes
  const updateNotes = useCallback((notes: string) => {
    updateWorkpaper({ notes });
  }, [updateWorkpaper]);

  // Reset
  const reset = useCallback(() => {
    setWorkpaper(createEmptyWorkpaper(taxYear));
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}-current-${taxYear}`);
    }
  }, [taxYear]);

  // Export
  const exportData = useCallback(() => {
    return exportForTax(workpaper);
  }, [workpaper]);

  // Save to saved workpapers list
  const save = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved`);
      const savedList: ClothingWorkpaper[] = saved ? JSON.parse(saved) : [];
      
      // Remove existing entry with same ID
      const filtered = savedList.filter(w => w.id !== workpaper.id);
      
      // Add current workpaper
      filtered.push(workpaper);
      
      localStorage.setItem(`${STORAGE_KEY}-saved`, JSON.stringify(filtered));
    }
  }, [workpaper]);

  // Load specific workpaper
  const load = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved`);
      if (saved) {
        const savedList: ClothingWorkpaper[] = JSON.parse(saved);
        const found = savedList.find(w => w.id === id);
        if (found) {
          setWorkpaper(found);
        }
      }
    }
  }, []);

  // Get all saved workpapers
  const getAllSaved = useCallback((): ClothingWorkpaper[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }, []);

  // Delete saved workpaper
  const deleteSaved = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved`);
      if (saved) {
        const savedList: ClothingWorkpaper[] = JSON.parse(saved);
        const filtered = savedList.filter(w => w.id !== id);
        localStorage.setItem(`${STORAGE_KEY}-saved`, JSON.stringify(filtered));
      }
    }
  }, []);

  return {
    workpaper,
    totals,
    validation,
    updateEmployeeInfo,
    setUseReasonableLaundryRate,
    addClothingExpense,
    updateClothingExpense,
    deleteClothingExpense,
    linkClothingReceipt,
    unlinkClothingReceipt,
    addLaundryExpense,
    updateLaundryExpense,
    deleteLaundryExpense,
    linkLaundryReceipt,
    unlinkLaundryReceipt,
    updateNotes,
    reset,
    exportData,
    save,
    load,
    getAllSaved,
    deleteSaved,
    reasonableLaundryRates: REASONABLE_LAUNDRY_RATES,
  };
}
