import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RentalPropertyWorkpaper,
  RentalProperty,
  RentalIncome,
  RentalExpense,
  PlantEquipmentItem,
  CapitalWorksEntry,
  DepreciationSchedule,
  RentalExpenseCategory,
  PropertySummary,
  createEmptyWorkpaper,
  createEmptyProperty,
  calculatePropertySummary,
  calculateWorkpaperTotals,
  generateId,
  EXPENSE_CATEGORIES,
  WorkpaperTotals,
} from '@/lib/rental-property';

const STORAGE_KEY = 'tally-rental-property';

export interface UseRentalPropertyReturn {
  // State
  workpaper: RentalPropertyWorkpaper;
  totals: WorkpaperTotals;
  selectedPropertyId: string | null;
  
  // Property management
  addProperty: (property: Omit<RentalProperty, 'id' | 'createdAt' | 'updatedAt'>) => RentalProperty;
  updateProperty: (id: string, updates: Partial<RentalProperty>) => void;
  deleteProperty: (id: string) => void;
  selectProperty: (id: string | null) => void;
  getSelectedProperty: () => RentalProperty | undefined;
  
  // Income management
  addIncome: (income: Omit<RentalIncome, 'id'>) => void;
  updateIncome: (id: string, updates: Partial<RentalIncome>) => void;
  deleteIncome: (id: string) => void;
  getIncomeByProperty: (propertyId: string) => RentalIncome[];
  
  // Expense management
  addExpense: (expense: Omit<RentalExpense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<RentalExpense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByProperty: (propertyId: string) => RentalExpense[];
  
  // Division 40 (Plant & Equipment) management
  addPlantEquipment: (item: Omit<PlantEquipmentItem, 'id' | 'currentYearDeduction' | 'closingAdjustableValue'>) => PlantEquipmentItem;
  updatePlantEquipment: (id: string, updates: Partial<PlantEquipmentItem>) => void;
  deletePlantEquipment: (id: string) => void;
  getPlantEquipmentByProperty: (propertyId: string) => PlantEquipmentItem[];
  
  // Division 43 (Capital Works) management
  addCapitalWorks: (entry: Omit<CapitalWorksEntry, 'id'>) => void;
  updateCapitalWorks: (id: string, updates: Partial<CapitalWorksEntry>) => void;
  deleteCapitalWorks: (id: string) => void;
  getCapitalWorksByProperty: (propertyId: string) => CapitalWorksEntry[];
  
  // Depreciation schedule
  getDepreciationSchedule: (propertyId: string) => DepreciationSchedule | undefined;
  calculateDepreciation: (propertyId: string) => void;
  
  // Property summary
  getPropertySummary: (propertyId: string) => PropertySummary | undefined;
  
  // Receipt linking
  linkIncomeReceipt: (incomeId: string, receiptId: string, receiptUrl?: string) => void;
  unlinkIncomeReceipt: (incomeId: string) => void;
  linkExpenseReceipt: (expenseId: string, receiptId: string, receiptUrl?: string) => void;
  unlinkExpenseReceipt: (expenseId: string) => void;
  
  // Notes
  updateNotes: (notes: string) => void;
  
  // Actions
  reset: () => void;
  exportData: () => object;
  save: () => void;
  load: (id: string) => void;
  getAllSaved: () => RentalPropertyWorkpaper[];
  deleteSaved: (id: string) => void;
  duplicateProperty: (propertyId: string) => void;
}

export function useRentalProperty(taxYear: string): UseRentalPropertyReturn {
  // Initialize state
  const [workpaper, setWorkpaper] = useState<RentalPropertyWorkpaper>(() => {
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
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Calculate derived values
  const totals = useMemo(() => calculateWorkpaperTotals(workpaper), [workpaper]);

  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}-current-${taxYear}`, JSON.stringify(workpaper));
    }
  }, [workpaper, taxYear]);

  // Update helpers
  const updateWorkpaper = useCallback((updates: Partial<RentalPropertyWorkpaper>) => {
    setWorkpaper(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Property management
  const addProperty = useCallback((property: Omit<RentalProperty, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProperty: RentalProperty = {
      ...property,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateWorkpaper({
      properties: [...workpaper.properties, newProperty],
    });
    // Auto-select new property
    setSelectedPropertyId(newProperty.id);
    return newProperty;
  }, [workpaper.properties, updateWorkpaper]);

  const updateProperty = useCallback((id: string, updates: Partial<RentalProperty>) => {
    updateWorkpaper({
      properties: workpaper.properties.map(property =>
        property.id === id ? { ...property, ...updates, updatedAt: new Date().toISOString() } : property
      ),
    });
  }, [workpaper.properties, updateWorkpaper]);

  const deleteProperty = useCallback((id: string) => {
    // Remove property and all associated data
    updateWorkpaper({
      properties: workpaper.properties.filter(p => p.id !== id),
      income: workpaper.income.filter(i => i.propertyId !== id),
      expenses: workpaper.expenses.filter(e => e.propertyId !== id),
      depreciationSchedules: workpaper.depreciationSchedules.filter(d => d.propertyId !== id),
    });
    if (selectedPropertyId === id) {
      setSelectedPropertyId(null);
    }
  }, [workpaper, updateWorkpaper, selectedPropertyId]);

  const selectProperty = useCallback((id: string | null) => {
    setSelectedPropertyId(id);
  }, []);

  const getSelectedProperty = useCallback(() => {
    return workpaper.properties.find(p => p.id === selectedPropertyId);
  }, [workpaper.properties, selectedPropertyId]);

  // Income management
  const addIncome = useCallback((income: Omit<RentalIncome, 'id'>) => {
    const newIncome: RentalIncome = {
      ...income,
      id: generateId(),
    };
    updateWorkpaper({
      income: [...workpaper.income, newIncome],
    });
  }, [workpaper.income, updateWorkpaper]);

  const updateIncome = useCallback((id: string, updates: Partial<RentalIncome>) => {
    updateWorkpaper({
      income: workpaper.income.map(income =>
        income.id === id ? { ...income, ...updates } : income
      ),
    });
  }, [workpaper.income, updateWorkpaper]);

  const deleteIncome = useCallback((id: string) => {
    updateWorkpaper({
      income: workpaper.income.filter(income => income.id !== id),
    });
  }, [workpaper.income, updateWorkpaper]);

  const getIncomeByProperty = useCallback((propertyId: string) => {
    return workpaper.income.filter(i => i.propertyId === propertyId);
  }, [workpaper.income]);

  // Expense management
  const addExpense = useCallback((expense: Omit<RentalExpense, 'id'>) => {
    const newExpense: RentalExpense = {
      ...expense,
      id: generateId(),
    };
    updateWorkpaper({
      expenses: [...workpaper.expenses, newExpense],
    });
  }, [workpaper.expenses, updateWorkpaper]);

  const updateExpense = useCallback((id: string, updates: Partial<RentalExpense>) => {
    updateWorkpaper({
      expenses: workpaper.expenses.map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      ),
    });
  }, [workpaper.expenses, updateWorkpaper]);

  const deleteExpense = useCallback((id: string) => {
    updateWorkpaper({
      expenses: workpaper.expenses.filter(expense => expense.id !== id),
    });
  }, [workpaper.expenses, updateWorkpaper]);

  const getExpensesByProperty = useCallback((propertyId: string) => {
    return workpaper.expenses.filter(e => e.propertyId === propertyId);
  }, [workpaper.expenses]);

  // Plant & Equipment (Division 40) management
  const addPlantEquipment = useCallback((item: Omit<PlantEquipmentItem, 'id' | 'currentYearDeduction' | 'closingAdjustableValue'>) => {
    // Calculate depreciation
    const taxableUsePercent = item.taxableUsePercent ?? (100 - item.privateUsePercent);
    const rate = item.method === 'diminishing-value' 
      ? (2 / item.effectiveLife) 
      : (1 / item.effectiveLife);
    const currentYearDeduction = item.openingAdjustableValue * rate * (taxableUsePercent / 100);
    const closingAdjustableValue = item.openingAdjustableValue - currentYearDeduction;
    
    const newItem: PlantEquipmentItem = {
      ...item,
      id: generateId(),
      taxableUsePercent,
      currentYearDeduction,
      closingAdjustableValue,
    };
    
    // Add to depreciation schedule
    const existingSchedule = workpaper.depreciationSchedules.find(d => d.propertyId === item.propertyId);
    if (existingSchedule) {
      updateWorkpaper({
        depreciationSchedules: workpaper.depreciationSchedules.map(d =>
          d.propertyId === item.propertyId
            ? { ...d, plantEquipment: [...d.plantEquipment, newItem] }
            : d
        ),
      });
    } else {
      updateWorkpaper({
        depreciationSchedules: [
          ...workpaper.depreciationSchedules,
          {
            propertyId: item.propertyId,
            taxYear: workpaper.taxYear,
            plantEquipment: [newItem],
            capitalWorks: [],
            totalDivision40: currentYearDeduction,
            totalDivision43: 0,
            totalDepreciation: currentYearDeduction,
          },
        ],
      });
    }
    return newItem;
  }, [workpaper.depreciationSchedules, workpaper.taxYear, updateWorkpaper]);

  const updatePlantEquipment = useCallback((id: string, updates: Partial<PlantEquipmentItem>) => {
    updateWorkpaper({
      depreciationSchedules: workpaper.depreciationSchedules.map(schedule => ({
        ...schedule,
        plantEquipment: schedule.plantEquipment.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      })),
    });
  }, [workpaper.depreciationSchedules, updateWorkpaper]);

  const deletePlantEquipment = useCallback((id: string) => {
    updateWorkpaper({
      depreciationSchedules: workpaper.depreciationSchedules.map(schedule => ({
        ...schedule,
        plantEquipment: schedule.plantEquipment.filter(item => item.id !== id),
      })),
    });
  }, [workpaper.depreciationSchedules, updateWorkpaper]);

  const getPlantEquipmentByProperty = useCallback((propertyId: string) => {
    const schedule = workpaper.depreciationSchedules.find(d => d.propertyId === propertyId);
    return schedule?.plantEquipment || [];
  }, [workpaper.depreciationSchedules]);

  // Capital Works (Division 43) management
  const addCapitalWorks = useCallback((entry: Omit<CapitalWorksEntry, 'id'>) => {
    const newEntry: CapitalWorksEntry = {
      ...entry,
      id: generateId(),
    };
    
    const existingSchedule = workpaper.depreciationSchedules.find(d => d.propertyId === entry.propertyId);
    if (existingSchedule) {
      updateWorkpaper({
        depreciationSchedules: workpaper.depreciationSchedules.map(d =>
          d.propertyId === entry.propertyId
            ? { ...d, capitalWorks: [...d.capitalWorks, newEntry] }
            : d
        ),
      });
    } else {
      updateWorkpaper({
        depreciationSchedules: [
          ...workpaper.depreciationSchedules,
          {
            propertyId: entry.propertyId,
            taxYear: workpaper.taxYear,
            plantEquipment: [],
            capitalWorks: [newEntry],
            totalDivision40: 0,
            totalDivision43: entry.deductionAmount,
            totalDepreciation: entry.deductionAmount,
          },
        ],
      });
    }
  }, [workpaper.depreciationSchedules, workpaper.taxYear, updateWorkpaper]);

  const updateCapitalWorks = useCallback((id: string, updates: Partial<CapitalWorksEntry>) => {
    updateWorkpaper({
      depreciationSchedules: workpaper.depreciationSchedules.map(schedule => ({
        ...schedule,
        capitalWorks: schedule.capitalWorks.map(entry =>
          entry.id === id ? { ...entry, ...updates } : entry
        ),
      })),
    });
  }, [workpaper.depreciationSchedules, updateWorkpaper]);

  const deleteCapitalWorks = useCallback((id: string) => {
    updateWorkpaper({
      depreciationSchedules: workpaper.depreciationSchedules.map(schedule => ({
        ...schedule,
        capitalWorks: schedule.capitalWorks.filter(entry => entry.id !== id),
      })),
    });
  }, [workpaper.depreciationSchedules, updateWorkpaper]);

  const getCapitalWorksByProperty = useCallback((propertyId: string) => {
    const schedule = workpaper.depreciationSchedules.find(d => d.propertyId === propertyId);
    return schedule?.capitalWorks || [];
  }, [workpaper.depreciationSchedules]);

  // Depreciation schedule
  const getDepreciationSchedule = useCallback((propertyId: string) => {
    return workpaper.depreciationSchedules.find(d => d.propertyId === propertyId);
  }, [workpaper.depreciationSchedules]);

  const calculateDepreciation = useCallback((propertyId: string) => {
    const schedule = workpaper.depreciationSchedules.find(d => d.propertyId === propertyId);
    if (!schedule) return;
    
    const totalDivision40 = schedule.plantEquipment.reduce((sum, item) => sum + item.currentYearDeduction, 0);
    const totalDivision43 = schedule.capitalWorks.reduce((sum, entry) => sum + entry.deductionAmount, 0);
    
    updateWorkpaper({
      depreciationSchedules: workpaper.depreciationSchedules.map(d =>
        d.propertyId === propertyId
          ? { ...d, totalDivision40, totalDivision43, totalDepreciation: totalDivision40 + totalDivision43 }
          : d
      ),
    });
  }, [workpaper.depreciationSchedules, updateWorkpaper]);

  // Property summary
  const getPropertySummary = useCallback((propertyId: string): PropertySummary | undefined => {
    const property = workpaper.properties.find(p => p.id === propertyId);
    if (!property) return undefined;
    
    const schedule = workpaper.depreciationSchedules.find(d => d.propertyId === propertyId);
    return calculatePropertySummary(property, workpaper.income, workpaper.expenses, schedule);
  }, [workpaper.properties, workpaper.income, workpaper.expenses, workpaper.depreciationSchedules]);

  // Receipt linking
  const linkIncomeReceipt = useCallback((incomeId: string, receiptId: string, receiptUrl?: string) => {
    updateIncome(incomeId, { receiptUrl: receiptUrl || receiptId });
  }, [updateIncome]);

  const unlinkIncomeReceipt = useCallback((incomeId: string) => {
    updateIncome(incomeId, { receiptUrl: undefined });
  }, [updateIncome]);

  const linkExpenseReceipt = useCallback((expenseId: string, receiptId: string, receiptUrl?: string) => {
    updateExpense(expenseId, { receiptUrl: receiptUrl || receiptId });
  }, [updateExpense]);

  const unlinkExpenseReceipt = useCallback((expenseId: string) => {
    updateExpense(expenseId, { receiptUrl: undefined });
  }, [updateExpense]);

  // Notes
  const updateNotes = useCallback((notes: string) => {
    updateWorkpaper({ notes });
  }, [updateWorkpaper]);

  // Reset
  const reset = useCallback(() => {
    setWorkpaper(createEmptyWorkpaper(taxYear));
    setSelectedPropertyId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}-current-${taxYear}`);
    }
  }, [taxYear]);

  // Export
  const exportData = useCallback(() => {
    return {
      taxYear: workpaper.taxYear,
      properties: workpaper.properties.map(p => getPropertySummary(p.id)),
      totals,
    };
  }, [workpaper, totals, getPropertySummary]);

  // Save to saved workpapers list
  const save = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved`);
      const savedList: RentalPropertyWorkpaper[] = saved ? JSON.parse(saved) : [];
      
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
        const savedList: RentalPropertyWorkpaper[] = JSON.parse(saved);
        const found = savedList.find(w => w.id === id);
        if (found) {
          setWorkpaper(found);
          setSelectedPropertyId(found.properties[0]?.id || null);
        }
      }
    }
  }, []);

  // Get all saved workpapers
  const getAllSaved = useCallback((): RentalPropertyWorkpaper[] => {
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
        const savedList: RentalPropertyWorkpaper[] = JSON.parse(saved);
        const filtered = savedList.filter(w => w.id !== id);
        localStorage.setItem(`${STORAGE_KEY}-saved`, JSON.stringify(filtered));
      }
    }
  }, []);

  // Duplicate property
  const duplicateProperty = useCallback((propertyId: string) => {
    const property = workpaper.properties.find(p => p.id === propertyId);
    if (!property) return;
    
    const newProperty: RentalProperty = {
      ...property,
      id: generateId(),
      address: { ...property.address, street: `${property.address.street} (Copy)` },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Duplicate associated data
    const propertyIncome = workpaper.income
      .filter(i => i.propertyId === propertyId)
      .map(i => ({ ...i, id: generateId(), propertyId: newProperty.id }));
    
    const propertyExpenses = workpaper.expenses
      .filter(e => e.propertyId === propertyId)
      .map(e => ({ ...e, id: generateId(), propertyId: newProperty.id }));
    
    const propertySchedule = workpaper.depreciationSchedules.find(d => d.propertyId === propertyId);
    const newSchedule: DepreciationSchedule | undefined = propertySchedule ? {
      ...propertySchedule,
      propertyId: newProperty.id,
      plantEquipment: propertySchedule.plantEquipment.map(p => ({ ...p, id: generateId(), propertyId: newProperty.id })),
      capitalWorks: propertySchedule.capitalWorks.map(c => ({ ...c, id: generateId(), propertyId: newProperty.id })),
    } : undefined;
    
    updateWorkpaper({
      properties: [...workpaper.properties, newProperty],
      income: [...workpaper.income, ...propertyIncome],
      expenses: [...workpaper.expenses, ...propertyExpenses],
      depreciationSchedules: newSchedule 
        ? [...workpaper.depreciationSchedules, newSchedule]
        : workpaper.depreciationSchedules,
    });
    
    setSelectedPropertyId(newProperty.id);
  }, [workpaper, updateWorkpaper]);

  return {
    workpaper,
    totals,
    selectedPropertyId,
    addProperty,
    updateProperty,
    deleteProperty,
    selectProperty,
    getSelectedProperty,
    addIncome,
    updateIncome,
    deleteIncome,
    getIncomeByProperty,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByProperty,
    addPlantEquipment,
    updatePlantEquipment,
    deletePlantEquipment,
    getPlantEquipmentByProperty,
    addCapitalWorks,
    updateCapitalWorks,
    deleteCapitalWorks,
    getCapitalWorksByProperty,
    getDepreciationSchedule,
    calculateDepreciation,
    getPropertySummary,
    linkIncomeReceipt,
    unlinkIncomeReceipt,
    linkExpenseReceipt,
    unlinkExpenseReceipt,
    updateNotes,
    reset,
    exportData,
    save,
    load,
    getAllSaved,
    deleteSaved,
    duplicateProperty,
  };
}
