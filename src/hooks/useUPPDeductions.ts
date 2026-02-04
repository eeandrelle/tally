import { useState, useCallback } from 'react';

export type UPPType = 
  | 'foreign_pension'
  | 'foreign_annuity'
  | 'domestic_annuity'
  | 'super_income_stream';

export interface UPPEntry {
  id: string;
  type: UPPType;
  description: string;
  payerName: string;
  grossPayment: number;
  deductibleAmount: number;
  date: string;
  taxWithheld?: number;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d11_upp_deductions';

export function useUPPDeductions() {
  const [entries, setEntries] = useState<UPPEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveEntries = useCallback((newEntries: UPPEntry[]) => {
    setEntries(newEntries);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    }
  }, []);

  const addEntry = useCallback((entry: Omit<UPPEntry, 'id' | 'createdAt'>) => {
    const newEntry: UPPEntry = {
      ...entry,
      id: `d11-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...entries, newEntry];
    saveEntries(updated);
    return newEntry.id;
  }, [entries, saveEntries]);

  const updateEntry = useCallback((id: string, updates: Partial<UPPEntry>) => {
    const updated = entries.map(e => e.id === id ? { ...e, ...updates } : e);
    saveEntries(updated);
  }, [entries, saveEntries]);

  const deleteEntry = useCallback((id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
  }, [entries, saveEntries]);

  const getTotalDeductible = useCallback(() => {
    return entries.reduce((total, entry) => total + entry.deductibleAmount, 0);
  }, [entries]);

  const getTotalGross = useCallback(() => {
    return entries.reduce((total, entry) => total + entry.grossPayment, 0);
  }, [entries]);

  const getEntriesByType = useCallback((type: UPPType) => {
    return entries.filter(e => e.type === type);
  }, [entries]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getTotalDeductible,
    getTotalGross,
    getEntriesByType,
  };
}
