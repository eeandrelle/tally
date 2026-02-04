import { useState, useCallback } from 'react';

export type ForestryInvestmentType = 
  | 'establishment'
  | 'management'
  | 'maintenance'
  | 'environmental';

export interface ForestryEntry {
  id: string;
  schemeName: string;
  schemeManager: string;
  abn?: string;
  investmentType: ForestryInvestmentType;
  amount: number;
  date: string;
  managementFee?: number;
  isRegistered: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d14_forestry_mis';

export function useForestryMIS() {
  const [entries, setEntries] = useState<ForestryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveEntries = useCallback((newEntries: ForestryEntry[]) => {
    setEntries(newEntries);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    }
  }, []);

  const addEntry = useCallback((entry: Omit<ForestryEntry, 'id' | 'createdAt'>) => {
    const newEntry: ForestryEntry = {
      ...entry,
      id: `d14-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...entries, newEntry];
    saveEntries(updated);
    return newEntry.id;
  }, [entries, saveEntries]);

  const updateEntry = useCallback((id: string, updates: Partial<ForestryEntry>) => {
    const updated = entries.map(e => e.id === id ? { ...e, ...updates } : e);
    saveEntries(updated);
  }, [entries, saveEntries]);

  const deleteEntry = useCallback((id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
  }, [entries, saveEntries]);

  const getTotalInvestment = useCallback(() => {
    return entries.reduce((total, entry) => total + entry.amount, 0);
  }, [entries]);

  const getTotalManagementFees = useCallback(() => {
    return entries.reduce((total, entry) => total + (entry.managementFee || 0), 0);
  }, [entries]);

  const getTotalDeduction = useCallback(() => {
    return getTotalInvestment() + getTotalManagementFees();
  }, [getTotalInvestment, getTotalManagementFees]);

  const getEntriesByType = useCallback((type: ForestryInvestmentType) => {
    return entries.filter(e => e.investmentType === type);
  }, [entries]);

  const getRegisteredSchemes = useCallback(() => {
    return entries.filter(e => e.isRegistered);
  }, [entries]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getTotalInvestment,
    getTotalManagementFees,
    getTotalDeduction,
    getEntriesByType,
    getRegisteredSchemes,
  };
}
