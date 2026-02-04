import { useState, useCallback } from 'react';

export type TaxExpenseType = 
  | 'agent_fees'
  | 'tax_software'
  | 'tax_books'
  | 'travel_to_agent'
  | 'litigation'
  | 'valuation'
  | 'advice'
  | 'other';

export interface TaxExpense {
  id: string;
  type: TaxExpenseType;
  description: string;
  amount: number;
  date: string;
  agentName?: string;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d9_tax_affairs';

export function useTaxAffairs() {
  const [expenses, setExpenses] = useState<TaxExpense[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveExpenses = useCallback((newExpenses: TaxExpense[]) => {
    setExpenses(newExpenses);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpenses));
    }
  }, []);

  const addExpense = useCallback((expense: Omit<TaxExpense, 'id' | 'createdAt'>) => {
    const newExpense: TaxExpense = {
      ...expense,
      id: `d9-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...expenses, newExpense];
    saveExpenses(updated);
    return newExpense.id;
  }, [expenses, saveExpenses]);

  const updateExpense = useCallback((id: string, updates: Partial<TaxExpense>) => {
    const updated = expenses.map(e => e.id === id ? { ...e, ...updates } : e);
    saveExpenses(updated);
  }, [expenses, saveExpenses]);

  const deleteExpense = useCallback((id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    saveExpenses(updated);
  }, [expenses, saveExpenses]);

  const getTotalExpenses = useCallback(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const getExpensesByType = useCallback((type: TaxExpenseType) => {
    return expenses.filter(e => e.type === type);
  }, [expenses]);

  const getTotalByType = useCallback((type: TaxExpenseType) => {
    return getExpensesByType(type).reduce((total, e) => total + e.amount, 0);
  }, [getExpensesByType]);

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses,
    getExpensesByType,
    getTotalByType,
  };
}
