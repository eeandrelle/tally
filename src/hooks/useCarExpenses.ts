import { useState, useCallback, useMemo } from 'react';
import type {
  CarExpenseWorkpaper,
  LogbookEntry,
  CarExpense,
  CentsPerKmCalculation,
  LogbookMethodCalculation,
  MethodComparison,
  LogbookValidation,
  WorkpaperExport,
} from '@/lib/car-expenses';
import {
  calculateCentsPerKmClaim,
  calculateLogbookMethodClaim,
  calculateTotalBusinessPercentage,
  calculateExpensesByCategory,
  calculateTotalExpenses,
  compareMethods,
  validateLogbook,
  exportWorkpaper,
  calculateBusinessPercentage,
  MAX_CENTS_PER_KM_KILOMETRES,
  CENTS_PER_KM_RATE,
} from '@/lib/car-expenses';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface UseCarExpensesOptions {
  initialWorkpaper?: CarExpenseWorkpaper;
  taxYear?: string;
  storageKey?: string;
}

export function useCarExpenses(options: UseCarExpensesOptions = {}) {
  const { 
    taxYear = new Date().getFullYear().toString(),
    storageKey = `tally-car-expenses-${taxYear}`
  } = options;

  // Initialize workpaper state
  const [workpaper, setWorkpaper] = useState<CarExpenseWorkpaper>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall through to default
        }
      }
    }
    
    return {
      id: generateId(),
      taxYear,
      vehicleDescription: '',
      selectedMethod: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Save to localStorage whenever workpaper changes
  const updateWorkpaper = useCallback((updates: Partial<CarExpenseWorkpaper>) => {
    setWorkpaper(prev => {
      const updated = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      
      return updated;
    });
  }, [storageKey]);

  // Vehicle information
  const setVehicleInfo = useCallback((info: { 
    vehicleDescription: string; 
    registrationNumber?: string;
    engineCapacity?: 'small' | 'medium' | 'large';
  }) => {
    updateWorkpaper(info);
  }, [updateWorkpaper]);

  // Method selection
  const selectMethod = useCallback((method: 'cents-per-km' | 'logbook') => {
    updateWorkpaper({ selectedMethod: method });
  }, [updateWorkpaper]);

  // Cents per km methods
  const setCentsPerKmData = useCallback((data: { 
    workKilometres: number; 
    reasonForClaim: string;
  }) => {
    updateWorkpaper({
      centsPerKmData: data,
    });
  }, [updateWorkpaper]);

  const centsPerKmCalculation = useMemo<CentsPerKmCalculation | null>(() => {
    if (!workpaper.centsPerKmData) return null;
    return calculateCentsPerKmClaim(workpaper.centsPerKmData.workKilometres);
  }, [workpaper.centsPerKmData]);

  // Logbook methods
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>(() => {
    return workpaper.logbookData?.entries || [];
  });

  const [expenses, setExpenses] = useState<CarExpense[]>(() => {
    return workpaper.logbookData?.expenses || [];
  });

  const [odometerRecords, setOdometerRecords] = useState({
    startOfYear: workpaper.logbookData?.odometerStartOfYear || 0,
    endOfYear: workpaper.logbookData?.odometerEndOfYear || 0,
  });

  // Sync logbook data to workpaper
  const syncLogbookData = useCallback(() => {
    updateWorkpaper({
      logbookData: {
        entries: logbookEntries,
        expenses,
        odometerStartOfYear: odometerRecords.startOfYear,
        odometerEndOfYear: odometerRecords.endOfYear,
      },
    });
  }, [logbookEntries, expenses, odometerRecords, updateWorkpaper]);

  // Logbook entry management
  const addLogbookEntry = useCallback((entry: Omit<LogbookEntry, 'id' | 'businessPercentage'>) => {
    const businessPercentage = calculateBusinessPercentage(entry);
    const newEntry: LogbookEntry = {
      ...entry,
      id: generateId(),
      businessPercentage,
    };
    setLogbookEntries(prev => [...prev, newEntry]);
  }, []);

  const updateLogbookEntry = useCallback((id: string, updates: Partial<LogbookEntry>) => {
    setLogbookEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      const updated = { ...entry, ...updates };
      // Recalculate business percentage if relevant fields changed
      if (updates.businessKms !== undefined || updates.totalKms !== undefined) {
        updated.businessPercentage = calculateBusinessPercentage(updated);
      }
      return updated;
    }));
  }, []);

  const deleteLogbookEntry = useCallback((id: string) => {
    setLogbookEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  // Expense management
  const addExpense = useCallback((expense: Omit<CarExpense, 'id'>) => {
    const newExpense: CarExpense = {
      ...expense,
      id: generateId(),
    };
    setExpenses(prev => [...prev, newExpense]);
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<CarExpense>) => {
    setExpenses(prev => prev.map(expense => 
      expense.id === id ? { ...expense, ...updates } : expense
    ));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
  }, []);

  // Odometer records
  const setOdometerStartOfYear = useCallback((value: number) => {
    setOdometerRecords(prev => ({ ...prev, startOfYear: value }));
  }, []);

  const setOdometerEndOfYear = useCallback((value: number) => {
    setOdometerRecords(prev => ({ ...prev, endOfYear: value }));
  }, []);

  // Calculations
  const businessUsePercentage = useMemo(() => {
    return calculateTotalBusinessPercentage(logbookEntries);
  }, [logbookEntries]);

  const expensesByCategory = useMemo(() => {
    return calculateExpensesByCategory(expenses);
  }, [expenses]);

  const totalExpenses = useMemo(() => {
    return calculateTotalExpenses(expenses);
  }, [expenses]);

  const logbookCalculation = useMemo<LogbookMethodCalculation | null>(() => {
    if (logbookEntries.length === 0 && expenses.length === 0) return null;
    return calculateLogbookMethodClaim(
      logbookEntries,
      expenses,
      odometerRecords.startOfYear,
      odometerRecords.endOfYear
    );
  }, [logbookEntries, expenses, odometerRecords]);

  // Validation
  const logbookValidation = useMemo<LogbookValidation>(() => {
    return validateLogbook(logbookEntries);
  }, [logbookEntries]);

  // Method comparison
  const methodComparison = useMemo<MethodComparison | null>(() => {
    if (!workpaper.centsPerKmData) return null;
    return compareMethods(
      workpaper.centsPerKmData.workKilometres,
      logbookEntries,
      expenses,
      odometerRecords.startOfYear,
      odometerRecords.endOfYear
    );
  }, [workpaper.centsPerKmData, logbookEntries, expenses, odometerRecords]);

  // Export
  const exportData = useMemo<WorkpaperExport | null>(() => {
    // Create temporary workpaper with current state
    const currentWorkpaper: CarExpenseWorkpaper = {
      ...workpaper,
      logbookData: {
        entries: logbookEntries,
        expenses,
        odometerStartOfYear: odometerRecords.startOfYear,
        odometerEndOfYear: odometerRecords.endOfYear,
      },
    };
    return exportWorkpaper(currentWorkpaper);
  }, [workpaper, logbookEntries, expenses, odometerRecords]);

  // Reset
  const reset = useCallback(() => {
    setWorkpaper({
      id: generateId(),
      taxYear,
      vehicleDescription: '',
      selectedMethod: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setLogbookEntries([]);
    setExpenses([]);
    setOdometerRecords({ startOfYear: 0, endOfYear: 0 });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [taxYear, storageKey]);

  // Summary stats
  const stats = useMemo(() => ({
    totalLogbookEntries: logbookEntries.length,
    totalExpenses: expenses.length,
    totalReceipts: expenses.filter(e => e.receiptUrl).length,
    isComplete: workpaper.selectedMethod === 'cents-per-km' 
      ? !!workpaper.centsPerKmData && workpaper.centsPerKmData.workKilometres > 0
      : logbookValidation.isValid && expenses.length > 0,
  }), [logbookEntries.length, expenses, workpaper.selectedMethod, workpaper.centsPerKmData, logbookValidation.isValid]);

  return {
    // Workpaper state
    workpaper,
    updateWorkpaper,
    setVehicleInfo,
    selectMethod,
    
    // Cents per km
    centsPerKmData: workpaper.centsPerKmData,
    setCentsPerKmData,
    centsPerKmCalculation,
    
    // Logbook
    logbookEntries,
    addLogbookEntry,
    updateLogbookEntry,
    deleteLogbookEntry,
    
    // Expenses
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    expensesByCategory,
    totalExpenses,
    
    // Odometer
    odometerRecords,
    setOdometerStartOfYear,
    setOdometerEndOfYear,
    
    // Calculations
    businessUsePercentage,
    logbookCalculation,
    logbookValidation,
    methodComparison,
    
    // Export & persistence
    exportData,
    syncLogbookData,
    reset,
    stats,
    
    // Constants
    maxCentsPerKmKilometres: MAX_CENTS_PER_KM_KILOMETRES,
    centsPerKmRate: CENTS_PER_KM_RATE,
  };
}

export type UseCarExpensesReturn = ReturnType<typeof useCarExpenses>;
