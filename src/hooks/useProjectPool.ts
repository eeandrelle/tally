import { useState, useCallback } from 'react';

export interface ProjectPoolEntry {
  id: string;
  projectName: string;
  projectDescription: string;
  startDate: string;
  totalCost: number;
  deductionRate: number; // Usually 5% for project pools
  currentYearDeduction: number;
  writtenDownValue: number;
  createdAt: string;
}

const STORAGE_KEY = 'tally_d13_project_pool';
const DEFAULT_DEDUCTION_RATE = 5; // 5% per annum

export function useProjectPool() {
  const [entries, setEntries] = useState<ProjectPoolEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const saveEntries = useCallback((newEntries: ProjectPoolEntry[]) => {
    setEntries(newEntries);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    }
  }, []);

  const calculateDeduction = useCallback((totalCost: number, rate: number = DEFAULT_DEDUCTION_RATE) => {
    return (totalCost * rate) / 100;
  }, []);

  const addEntry = useCallback((entry: Omit<ProjectPoolEntry, 'id' | 'createdAt' | 'currentYearDeduction' | 'writtenDownValue'>) => {
    const deduction = calculateDeduction(entry.totalCost, entry.deductionRate);
    const newEntry: ProjectPoolEntry = {
      ...entry,
      currentYearDeduction: deduction,
      writtenDownValue: entry.totalCost - deduction,
      id: `d13-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...entries, newEntry];
    saveEntries(updated);
    return newEntry.id;
  }, [entries, saveEntries, calculateDeduction]);

  const updateEntry = useCallback((id: string, updates: Partial<ProjectPoolEntry>) => {
    const updated = entries.map(e => {
      if (e.id === id) {
        const newEntry = { ...e, ...updates };
        // Recalculate deduction if cost or rate changed
        if (updates.totalCost !== undefined || updates.deductionRate !== undefined) {
          newEntry.currentYearDeduction = calculateDeduction(newEntry.totalCost, newEntry.deductionRate);
          newEntry.writtenDownValue = newEntry.totalCost - newEntry.currentYearDeduction;
        }
        return newEntry;
      }
      return e;
    });
    saveEntries(updated);
  }, [entries, saveEntries, calculateDeduction]);

  const deleteEntry = useCallback((id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveEntries(updated);
  }, [entries, saveEntries]);

  const getTotalDeduction = useCallback(() => {
    return entries.reduce((total, entry) => total + entry.currentYearDeduction, 0);
  }, [entries]);

  const getTotalPoolValue = useCallback(() => {
    return entries.reduce((total, entry) => total + entry.totalCost, 0);
  }, [entries]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getTotalDeduction,
    getTotalPoolValue,
    calculateDeduction,
    DEFAULT_DEDUCTION_RATE,
  };
}
