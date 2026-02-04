import { useState, useEffect, useCallback } from 'react';
import type {
  D5Workpaper,
  D5Expense,
  D5ExpenseType,
  D5ClaimMethod,
  D5Summary,
} from '@/lib/other-work-expenses';
import {
  createD5Workpaper,
  calculateD5Summary,
  validateD5Workpaper,
  exportD5Workpaper,
  D5_EXPENSE_TYPES,
} from '@/lib/other-work-expenses';

const STORAGE_KEY = 'tally_d5_workpaper';

export interface UseD5ExpensesReturn {
  workpaper: D5Workpaper;
  summary: D5Summary;
  validation: { valid: boolean; errors: string[]; warnings: string[] };
  
  // Actions
  addExpense: (expense: Omit<D5Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<D5Expense>) => void;
  deleteExpense: (id: string) => void;
  linkReceipt: (expenseId: string, receiptId: string, receiptUrl?: string) => void;
  unlinkReceipt: (expenseId: string) => void;
  updateNotes: (notes: string) => void;
  reset: () => void;
  save: () => void;
  exportData: () => object;
}

export function useD5Expenses(taxYear: string): UseD5ExpensesReturn {
  const [workpaper, setWorkpaper] = useState<D5Workpaper>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${taxYear}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return createD5Workpaper(taxYear);
        }
      }
    }
    return createD5Workpaper(taxYear);
  });

  // Calculate summary and validation
  const summary = calculateD5Summary(workpaper);
  const validation = validateD5Workpaper(workpaper);

  // Save to localStorage whenever workpaper changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}_${taxYear}`, JSON.stringify(workpaper));
    }
  }, [workpaper, taxYear]);

  const addExpense = useCallback((expense: Omit<D5Expense, 'id'>) => {
    const newExpense: D5Expense = {
      ...expense,
      id: crypto.randomUUID(),
    };
    setWorkpaper(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense],
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<D5Expense>) => {
    setWorkpaper(prev => ({
      ...prev,
      expenses: prev.expenses.map(e =>
        e.id === id ? { ...e, ...updates } : e
      ),
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id),
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const linkReceipt = useCallback((expenseId: string, receiptId: string, receiptUrl?: string) => {
    setWorkpaper(prev => ({
      ...prev,
      expenses: prev.expenses.map(e =>
        e.id === expenseId ? { ...e, receiptId, receiptUrl } : e
      ),
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const unlinkReceipt = useCallback((expenseId: string) => {
    setWorkpaper(prev => ({
      ...prev,
      expenses: prev.expenses.map(e =>
        e.id === expenseId ? { ...e, receiptId: undefined, receiptUrl: undefined } : e
      ),
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const updateNotes = useCallback((notes: string) => {
    setWorkpaper(prev => ({
      ...prev,
      notes,
      lastModified: new Date().toISOString(),
    }));
  }, []);

  const reset = useCallback(() => {
    setWorkpaper(createD5Workpaper(taxYear));
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}_${taxYear}`);
    }
  }, [taxYear]);

  const save = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}_${taxYear}`, JSON.stringify(workpaper));
    }
  }, [workpaper, taxYear]);

  const exportData = useCallback(() => {
    return exportD5Workpaper(workpaper);
  }, [workpaper]);

  return {
    workpaper,
    summary,
    validation,
    addExpense,
    updateExpense,
    deleteExpense,
    linkReceipt,
    unlinkReceipt,
    updateNotes,
    reset,
    save,
    exportData,
  };
}

export { D5_EXPENSE_TYPES };
export type { D5Expense, D5ExpenseType, D5Workpaper, D5Summary };
