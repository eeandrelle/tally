import { useState, useCallback } from 'react';

export type InvestmentType = 
  | 'account_fees'
  | 'investment_advice'
  | 'interest_loan'
  | 'management_fees'
  | 'share_registry'
  | 'publications'
  | 'internet'
  | 'other';

export interface InvestmentExpense {
  id: string;
  type: InvestmentType;
  description: string;
  amount: number;
  date: string;
  investmentAccount?: string;
  workRelatedPercent: number;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d7_investment_expenses';

export function useInterestDividendDeductions() {
  const [expenses, setExpenses] = useState<InvestmentExpense[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveExpenses = useCallback((newExpenses: InvestmentExpense[]) => {
    setExpenses(newExpenses);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpenses));
    }
  }, []);

  const addExpense = useCallback((expense: Omit<InvestmentExpense, 'id' | 'createdAt'>) => {
    const newExpense: InvestmentExpense = {
      ...expense,
      id: `d7-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...expenses, newExpense];
    saveExpenses(updated);
    return newExpense.id;
  }, [expenses, saveExpenses]);

  const updateExpense = useCallback((id: string, updates: Partial<InvestmentExpense>) => {
    const updated = expenses.map(e => e.id === id ? { ...e, ...updates } : e);
    saveExpenses(updated);
  }, [expenses, saveExpenses]);

  const deleteExpense = useCallback((id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    saveExpenses(updated);
  }, [expenses, saveExpenses]);

  const getTotalDeductions = useCallback(() => {
    return expenses.reduce((total, expense) => {
      return total + (expense.amount * (expense.workRelatedPercent / 100));
    }, 0);
  }, [expenses]);

  const getExpensesByType = useCallback((type: InvestmentType) => {
    return expenses.filter(e => e.type === type);
  }, [expenses]);

  const getTotalByType = useCallback((type: InvestmentType) => {
    return getExpensesByType(type).reduce((total, e) => {
      return total + (e.amount * (e.workRelatedPercent / 100));
    }, 0);
  }, [getExpensesByType]);

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalDeductions,
    getExpensesByType,
    getTotalByType,
  };
}
