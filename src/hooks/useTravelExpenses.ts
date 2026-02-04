import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  TravelExpenseWorkpaper,
  TripDetails,
  AccommodationExpense,
  MealExpense,
  TransportExpense,
  createEmptyWorkpaper,
  calculateSummary,
  validateWorkpaper,
  calculateNights,
  generateId,
  exportForTax,
  TravelExpenseSummary,
  ValidationResult,
} from '@/lib/travel-expenses';

const STORAGE_KEY = 'tally-travel-expenses';

export interface UseTravelExpensesReturn {
  // State
  workpaper: TravelExpenseWorkpaper;
  summary: TravelExpenseSummary;
  validation: ValidationResult;

  // Trip details
  updateTripName: (name: string) => void;
  updateTripDetails: (details: Partial<TripDetails>) => void;

  // Accommodation
  addAccommodation: (expense: Omit<AccommodationExpense, 'id'>) => void;
  updateAccommodation: (id: string, updates: Partial<AccommodationExpense>) => void;
  deleteAccommodation: (id: string) => void;
  linkAccommodationReceipt: (id: string, receiptId: string, receiptUrl?: string) => void;
  unlinkAccommodationReceipt: (id: string) => void;

  // Meals
  addMeal: (expense: Omit<MealExpense, 'id'>) => void;
  updateMeal: (id: string, updates: Partial<MealExpense>) => void;
  deleteMeal: (id: string) => void;
  linkMealReceipt: (id: string, receiptId: string, receiptUrl?: string) => void;
  unlinkMealReceipt: (id: string) => void;

  // Transport
  addTransport: (expense: Omit<TransportExpense, 'id'>) => void;
  updateTransport: (id: string, updates: Partial<TransportExpense>) => void;
  deleteTransport: (id: string) => void;
  linkTransportReceipt: (id: string, receiptId: string, receiptUrl?: string) => void;
  unlinkTransportReceipt: (id: string) => void;

  // Notes
  updateNotes: (notes: string) => void;

  // Actions
  reset: () => void;
  exportData: () => object;
  save: () => void;
  load: (id: string) => void;
  getAllSaved: () => TravelExpenseWorkpaper[];
  deleteSaved: (id: string) => void;
}

export function useTravelExpenses(taxYear: string): UseTravelExpensesReturn {
  // Initialize state
  const [workpaper, setWorkpaper] = useState<TravelExpenseWorkpaper>(() => {
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
  
  // Calculate derived values
  const summary = useMemo(() => calculateSummary(workpaper), [workpaper]);
  const validation = useMemo(() => validateWorkpaper(workpaper), [workpaper]);
  
  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}-current-${taxYear}`, JSON.stringify(workpaper));
    }
  }, [workpaper, taxYear]);
  
  // Update helpers
  const updateWorkpaper = useCallback((updates: Partial<TravelExpenseWorkpaper>) => {
    setWorkpaper(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  // Trip details actions
  const updateTripName = useCallback((name: string) => {
    updateWorkpaper({ tripName: name });
  }, [updateWorkpaper]);
  
  const updateTripDetails = useCallback((details: Partial<TripDetails>) => {
    setWorkpaper(prev => {
      const updatedDetails = { ...prev.tripDetails, ...details };
      
      // Auto-calculate nights if dates change
      if (updatedDetails.departureDate && updatedDetails.returnDate) {
        updatedDetails.nightsAway = calculateNights(
          updatedDetails.departureDate,
          updatedDetails.returnDate
        );
      }
      
      return {
        ...prev,
        tripDetails: updatedDetails,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);
  
  // Accommodation actions
  const addAccommodation = useCallback((expense: Omit<AccommodationExpense, 'id'>) => {
    const newExpense: AccommodationExpense = { ...expense, id: generateId() };
    setWorkpaper(prev => ({
      ...prev,
      accommodation: [...prev.accommodation, newExpense],
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const updateAccommodation = useCallback((id: string, updates: Partial<AccommodationExpense>) => {
    setWorkpaper(prev => ({
      ...prev,
      accommodation: prev.accommodation.map(exp =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const deleteAccommodation = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      accommodation: prev.accommodation.filter(exp => exp.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  // Meal actions
  const addMeal = useCallback((expense: Omit<MealExpense, 'id'>) => {
    const newExpense: MealExpense = { ...expense, id: generateId() };
    setWorkpaper(prev => ({
      ...prev,
      meals: [...prev.meals, newExpense],
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const updateMeal = useCallback((id: string, updates: Partial<MealExpense>) => {
    setWorkpaper(prev => ({
      ...prev,
      meals: prev.meals.map(exp =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const deleteMeal = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      meals: prev.meals.filter(exp => exp.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  // Transport actions
  const addTransport = useCallback((expense: Omit<TransportExpense, 'id'>) => {
    const newExpense: TransportExpense = { ...expense, id: generateId() };
    setWorkpaper(prev => ({
      ...prev,
      transport: [...prev.transport, newExpense],
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const updateTransport = useCallback((id: string, updates: Partial<TransportExpense>) => {
    setWorkpaper(prev => ({
      ...prev,
      transport: prev.transport.map(exp =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const deleteTransport = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      transport: prev.transport.filter(exp => exp.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Receipt linking
  const linkAccommodationReceipt = useCallback((id: string, receiptId: string, receiptUrl?: string) => {
    setWorkpaper(prev => ({
      ...prev,
      accommodation: prev.accommodation.map(exp =>
        exp.id === id ? { ...exp, receiptId, receiptUrl } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const unlinkAccommodationReceipt = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      accommodation: prev.accommodation.map(exp =>
        exp.id === id ? { ...exp, receiptId: undefined, receiptUrl: undefined } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const linkMealReceipt = useCallback((id: string, receiptId: string, receiptUrl?: string) => {
    setWorkpaper(prev => ({
      ...prev,
      meals: prev.meals.map(exp =>
        exp.id === id ? { ...exp, receiptId, receiptUrl } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const unlinkMealReceipt = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      meals: prev.meals.map(exp =>
        exp.id === id ? { ...exp, receiptId: undefined, receiptUrl: undefined } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const linkTransportReceipt = useCallback((id: string, receiptId: string, receiptUrl?: string) => {
    setWorkpaper(prev => ({
      ...prev,
      transport: prev.transport.map(exp =>
        exp.id === id ? { ...exp, receiptId, receiptUrl } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const unlinkTransportReceipt = useCallback((id: string) => {
    setWorkpaper(prev => ({
      ...prev,
      transport: prev.transport.map(exp =>
        exp.id === id ? { ...exp, receiptId: undefined, receiptUrl: undefined } : exp
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Notes
  const updateNotes = useCallback((notes: string) => {
    updateWorkpaper({ notes });
  }, [updateWorkpaper]);
  
  // Actions
  const reset = useCallback(() => {
    setWorkpaper(createEmptyWorkpaper(taxYear));
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}-current-${taxYear}`);
    }
  }, [taxYear]);
  
  const exportData = useCallback(() => {
    return exportForTax(workpaper);
  }, [workpaper]);
  
  const save = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved-${taxYear}`);
      const savedList: TravelExpenseWorkpaper[] = saved ? JSON.parse(saved) : [];
      
      // Update or add
      const existingIndex = savedList.findIndex(w => w.id === workpaper.id);
      if (existingIndex >= 0) {
        savedList[existingIndex] = workpaper;
      } else {
        savedList.push(workpaper);
      }
      
      localStorage.setItem(`${STORAGE_KEY}-saved-${taxYear}`, JSON.stringify(savedList));
    }
  }, [workpaper, taxYear]);
  
  const load = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved-${taxYear}`);
      if (saved) {
        const savedList: TravelExpenseWorkpaper[] = JSON.parse(saved);
        const found = savedList.find(w => w.id === id);
        if (found) {
          setWorkpaper(found);
        }
      }
    }
  }, [taxYear]);
  
  const getAllSaved = useCallback((): TravelExpenseWorkpaper[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved-${taxYear}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }, [taxYear]);
  
  const deleteSaved = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved-${taxYear}`);
      if (saved) {
        const savedList: TravelExpenseWorkpaper[] = JSON.parse(saved);
        const filtered = savedList.filter(w => w.id !== id);
        localStorage.setItem(`${STORAGE_KEY}-saved-${taxYear}`, JSON.stringify(filtered));
      }
    }
  }, [taxYear]);
  
  return {
    workpaper,
    summary,
    validation,
    updateTripName,
    updateTripDetails,
    addAccommodation,
    updateAccommodation,
    deleteAccommodation,
    linkAccommodationReceipt,
    unlinkAccommodationReceipt,
    addMeal,
    updateMeal,
    deleteMeal,
    linkMealReceipt,
    unlinkMealReceipt,
    addTransport,
    updateTransport,
    deleteTransport,
    linkTransportReceipt,
    unlinkTransportReceipt,
    updateNotes,
    reset,
    exportData,
    save,
    load,
    getAllSaved,
    deleteSaved,
  };
}
