import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type WfhWorkpaper,
  type WfhMethod,
  type WfhExpense,
  type WorkAreaType,
  type DiaryEntry,
  createEmptyWfhWorkpaper,
  calculateFixedMethod,
  calculateShortcutMethod,
  calculateActualMethod,
  compareMethods,
  generateWfhSummary,
  validateWfhWorkpaper,
  WFH_RATES,
} from '@/lib/wfh-expenses';

const STORAGE_KEY = 'tally-wfh-workpaper';

interface UseWfhExpensesReturn {
  // State
  workpaper: WfhWorkpaper;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
  
  // Calculations
  comparison: ReturnType<typeof compareMethods> | null;
  isValid: boolean;
  
  // Actions
  setWorkAreaType: (type: WorkAreaType) => void;
  setFloorArea: (workAreaSqm: number, totalHomeSqm: number) => void;
  setWorkAreaDescription: (description: string) => void;
  setRegularHours: (hoursPerWeek: number) => void;
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id'>) => void;
  removeDiaryEntry: (id: string) => void;
  addExpense: (expense: Omit<WfhExpense, 'id'>) => void;
  removeExpense: (id: string) => void;
  setSelectedMethod: (method: WfhMethod) => void;
  setAdditionalExpenses: (amount: number) => void;
  setActualMethodPercentages: (floorAreaPct: number, workRelatedPct: number) => void;
  setNotes: (notes: string) => void;
  saveWorkpaper: () => void;
  resetWorkpaper: () => void;
  exportSummary: () => string;
  
  // Computed values
  totalHoursFromDiary: number;
  totalExpenses: number;
  recommendedMethod: WfhMethod | null;
  potentialDeductions: Record<WfhMethod, number>;
}

export function useWfhExpenses(taxYear: string): UseWfhExpensesReturn {
  const [workpaper, setWorkpaper] = useState<WfhWorkpaper>(() => createEmptyWfhWorkpaper(taxYear));
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Load from localStorage on mount
  useEffect(() => {
    const loadSaved = () => {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}-${taxYear}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge with empty to ensure all fields exist
          setWorkpaper({
            ...createEmptyWfhWorkpaper(taxYear),
            ...parsed,
            taxYear,
          });
        }
      } catch (error) {
        console.error('Failed to load WFH workpaper:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSaved();
  }, [taxYear]);
  
  // Recalculate all methods when inputs change
  useEffect(() => {
    setWorkpaper(prev => {
      const hours = prev.hoursWorked.totalHoursForYear;
      
      // Calculate Fixed Method
      const fixed = calculateFixedMethod(hours, prev.methods.fixed.additionalExpenses);
      
      // Calculate Shortcut Method
      const shortcut = calculateShortcutMethod(hours);
      
      // Calculate Actual Method
      const actual = calculateActualMethod(
        prev.methods.actual.expenses,
        prev.methods.actual.floorAreaPercentage,
        prev.methods.actual.workRelatedPercentage
      );
      
      return {
        ...prev,
        methods: { fixed, shortcut, actual },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [
    workpaper.hoursWorked.totalHoursForYear,
    workpaper.methods.fixed.additionalExpenses,
    workpaper.methods.actual.expenses.length,
    workpaper.methods.actual.floorAreaPercentage,
    workpaper.methods.actual.workRelatedPercentage,
  ]);
  
  // Track unsaved changes
  const updateWorkpaper = useCallback((updater: (prev: WfhWorkpaper) => WfhWorkpaper) => {
    setWorkpaper(prev => {
      const updated = updater(prev);
      return { ...updated, updatedAt: new Date().toISOString() };
    });
    setHasUnsavedChanges(true);
  }, []);
  
  // Set work area type
  const setWorkAreaType = useCallback((type: WorkAreaType) => {
    updateWorkpaper(prev => ({
      ...prev,
      workArea: { ...prev.workArea, type },
    }));
  }, [updateWorkpaper]);
  
  // Set floor area measurements
  const setFloorArea = useCallback((floorAreaSqm: number, totalHomeAreaSqm: number) => {
    updateWorkpaper(prev => {
      const floorAreaPercentage = totalHomeAreaSqm > 0 
        ? Math.round((floorAreaSqm / totalHomeAreaSqm) * 100 * 100) / 100
        : 0;
      
      return {
        ...prev,
        workArea: {
          ...prev.workArea,
          floorAreaSqm,
          totalHomeAreaSqm,
        },
        methods: {
          ...prev.methods,
          actual: {
            ...prev.methods.actual,
            floorAreaPercentage,
          },
        },
      };
    });
  }, [updateWorkpaper]);
  
  // Set work area description
  const setWorkAreaDescription = useCallback((description: string) => {
    updateWorkpaper(prev => ({
      ...prev,
      workArea: { ...prev.workArea, description },
    }));
  }, [updateWorkpaper]);
  
  // Set regular hours (calculates total for year)
  const setRegularHours = useCallback((hoursPerWeek: number) => {
    updateWorkpaper(prev => {
      // Assume 48 working weeks per year (accounting for leave)
      const totalHours = Math.round(hoursPerWeek * 48);
      return {
        ...prev,
        hoursWorked: {
          ...prev.hoursWorked,
          regularHours: hoursPerWeek,
          totalHoursForYear: totalHours,
        },
      };
    });
  }, [updateWorkpaper]);
  
  // Add diary entry
  const addDiaryEntry = useCallback((entry: Omit<DiaryEntry, 'id'>) => {
    updateWorkpaper(prev => {
      const newEntry: DiaryEntry = {
        ...entry,
        id: `diary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      const updatedDiary = [...prev.hoursWorked.diaryRecords, newEntry];
      const totalFromDiary = updatedDiary.reduce((sum, e) => sum + e.hours, 0);
      
      return {
        ...prev,
        hoursWorked: {
          ...prev.hoursWorked,
          diaryRecords: updatedDiary,
          totalHoursForYear: totalFromDiary,
        },
      };
    });
  }, [updateWorkpaper]);
  
  // Remove diary entry
  const removeDiaryEntry = useCallback((id: string) => {
    updateWorkpaper(prev => {
      const updatedDiary = prev.hoursWorked.diaryRecords.filter(e => e.id !== id);
      const totalFromDiary = updatedDiary.reduce((sum, e) => sum + e.hours, 0);
      
      return {
        ...prev,
        hoursWorked: {
          ...prev.hoursWorked,
          diaryRecords: updatedDiary,
          totalHoursForYear: totalFromDiary,
        },
      };
    });
  }, [updateWorkpaper]);
  
  // Add expense (for actual cost method)
  const addExpense = useCallback((expense: Omit<WfhExpense, 'id'>) => {
    updateWorkpaper(prev => {
      const newExpense: WfhExpense = {
        ...expense,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      return {
        ...prev,
        methods: {
          ...prev.methods,
          actual: {
            ...prev.methods.actual,
            expenses: [...prev.methods.actual.expenses, newExpense],
          },
        },
      };
    });
  }, [updateWorkpaper]);
  
  // Remove expense
  const removeExpense = useCallback((id: string) => {
    updateWorkpaper(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        actual: {
          ...prev.methods.actual,
          expenses: prev.methods.actual.expenses.filter(e => e.id !== id),
        },
      },
    }));
  }, [updateWorkpaper]);
  
  // Set selected method
  const setSelectedMethod = useCallback((method: WfhMethod) => {
    updateWorkpaper(prev => ({
      ...prev,
      selectedMethod: method,
    }));
  }, [updateWorkpaper]);
  
  // Set additional expenses (for fixed method)
  const setAdditionalExpenses = useCallback((amount: number) => {
    updateWorkpaper(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        fixed: {
          ...prev.methods.fixed,
          additionalExpenses: amount,
        },
      },
    }));
  }, [updateWorkpaper]);
  
  // Set actual method percentages
  const setActualMethodPercentages = useCallback((floorAreaPct: number, workRelatedPct: number) => {
    updateWorkpaper(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        actual: {
          ...prev.methods.actual,
          floorAreaPercentage: floorAreaPct,
          workRelatedPercentage: workRelatedPct,
        },
      },
    }));
  }, [updateWorkpaper]);
  
  // Set notes
  const setNotes = useCallback((notes: string) => {
    updateWorkpaper(prev => ({ ...prev, notes }));
  }, [updateWorkpaper]);
  
  // Save to localStorage
  const saveWorkpaper = useCallback(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}-${taxYear}`, JSON.stringify(workpaper));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save WFH workpaper:', error);
    }
  }, [workpaper, taxYear]);
  
  // Reset to empty
  const resetWorkpaper = useCallback(() => {
    setWorkpaper(createEmptyWfhWorkpaper(taxYear));
    setHasUnsavedChanges(true);
  }, [taxYear]);
  
  // Export summary
  const exportSummary = useCallback(() => {
    return generateWfhSummary(workpaper);
  }, [workpaper]);
  
  // Computed values
  const totalHoursFromDiary = useMemo(() => {
    return workpaper.hoursWorked.diaryRecords.reduce((sum, e) => sum + e.hours, 0);
  }, [workpaper.hoursWorked.diaryRecords]);
  
  const totalExpenses = useMemo(() => {
    return workpaper.methods.actual.expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [workpaper.methods.actual.expenses]);
  
  const comparison = useMemo(() => {
    return compareMethods(
      workpaper.methods.fixed,
      workpaper.methods.shortcut,
      workpaper.methods.actual
    );
  }, [workpaper.methods]);
  
  const recommendedMethod = useMemo(() => comparison.recommended, [comparison]);
  
  const potentialDeductions = useMemo(() => ({
    fixed: workpaper.methods.fixed.totalDeduction,
    shortcut: workpaper.methods.shortcut.totalDeduction,
    actual: workpaper.methods.actual.totalDeduction,
  }), [workpaper.methods]);
  
  const validation = useMemo(() => validateWfhWorkpaper(workpaper), [workpaper]);
  
  return {
    workpaper,
    isLoading,
    hasUnsavedChanges,
    validationErrors: validation.errors,
    comparison,
    isValid: validation.valid,
    setWorkAreaType,
    setFloorArea,
    setWorkAreaDescription,
    setRegularHours,
    addDiaryEntry,
    removeDiaryEntry,
    addExpense,
    removeExpense,
    setSelectedMethod,
    setAdditionalExpenses,
    setActualMethodPercentages,
    setNotes,
    saveWorkpaper,
    resetWorkpaper,
    exportSummary,
    totalHoursFromDiary,
    totalExpenses,
    recommendedMethod,
    potentialDeductions,
  };
}
