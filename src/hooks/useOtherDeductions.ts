import { useState, useCallback } from 'react';

export type OtherDeductionType = 
  | 'election_expenses'
  | 'foreign_pension'
  | 'personal_super'
  | 'sunset_industry'
  | 'income_protection'
  | 'crowdfunding'
  | 'other';

export interface OtherDeduction {
  id: string;
  type: OtherDeductionType;
  description: string;
  amount: number;
  date: string;
  notes?: string;
  requiresDocumentation: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d15_other_deductions';

export function useOtherDeductions() {
  const [deductions, setDeductions] = useState<OtherDeduction[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveDeductions = useCallback((newDeductions: OtherDeduction[]) => {
    setDeductions(newDeductions);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDeductions));
    }
  }, []);

  const addDeduction = useCallback((deduction: Omit<OtherDeduction, 'id' | 'createdAt'>) => {
    const newDeduction: OtherDeduction = {
      ...deduction,
      id: `d15-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...deductions, newDeduction];
    saveDeductions(updated);
    return newDeduction.id;
  }, [deductions, saveDeductions]);

  const updateDeduction = useCallback((id: string, updates: Partial<OtherDeduction>) => {
    const updated = deductions.map(d => d.id === id ? { ...d, ...updates } : d);
    saveDeductions(updated);
  }, [deductions, saveDeductions]);

  const deleteDeduction = useCallback((id: string) => {
    const updated = deductions.filter(d => d.id !== id);
    saveDeductions(updated);
  }, [deductions, saveDeductions]);

  const getTotalDeductions = useCallback(() => {
    return deductions.reduce((total, deduction) => total + deduction.amount, 0);
  }, [deductions]);

  const getDeductionsByType = useCallback((type: OtherDeductionType) => {
    return deductions.filter(d => d.type === type);
  }, [deductions]);

  const getTotalByType = useCallback((type: OtherDeductionType) => {
    return getDeductionsByType(type).reduce((total, d) => total + d.amount, 0);
  }, [getDeductionsByType]);

  const getDeductionsNeedingDocumentation = useCallback(() => {
    return deductions.filter(d => d.requiresDocumentation);
  }, [deductions]);

  return {
    deductions,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    getTotalDeductions,
    getDeductionsByType,
    getTotalByType,
    getDeductionsNeedingDocumentation,
  };
}
