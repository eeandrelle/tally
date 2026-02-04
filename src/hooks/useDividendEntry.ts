/**
 * useDividendEntry Hook
 * 
 * React hook for CRUD operations on dividend entries
 */

import { useState, useCallback } from 'react';
import type { DividendEntry } from '../lib/franking-credits';
import {
  createDividendEntry,
  updateDividendEntry,
  deleteDividendEntry,
  getDividendEntry,
  getDividendEntriesByTaxYear,
  bulkCreateDividendEntries,
  deleteDividendEntries,
} from '../lib/db-franking-credits';

// ============= HOOK: useDividendEntry =============

interface CreateDividendEntryInput {
  companyName: string;
  dividendAmount: number;
  frankingPercentage: number;
  dateReceived: string;
  notes?: string;
  taxYear?: string;
}

interface UpdateDividendEntryInput {
  companyName?: string;
  dividendAmount?: number;
  frankingPercentage?: number;
  dateReceived?: string;
  notes?: string;
  taxYear?: string;
}

interface UseDividendEntryReturn {
  // Current entry
  entry: DividendEntry | null;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: Error | null;
  
  // CRUD operations
  create: (input: CreateDividendEntryInput) => Promise<DividendEntry>;
  update: (id: number, updates: UpdateDividendEntryInput) => Promise<DividendEntry>;
  delete: (id: number) => Promise<void>;
  deleteMany: (ids: number[]) => Promise<void>;
  getById: (id: number) => Promise<DividendEntry | null>;
  getByTaxYear: (taxYear: string) => Promise<DividendEntry[]>;
  bulkCreate: (inputs: CreateDividendEntryInput[]) => Promise<DividendEntry[]>;
  
  // State management
  clearError: () => void;
  clearEntry: () => void;
}

export function useDividendEntry(): UseDividendEntryReturn {
  const [entry, setEntry] = useState<DividendEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Create new entry
  const create = useCallback(async (input: CreateDividendEntryInput): Promise<DividendEntry> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const created = await createDividendEntry({
        companyName: input.companyName,
        dividendAmount: input.dividendAmount,
        frankingPercentage: input.frankingPercentage,
        dateReceived: input.dateReceived,
        notes: input.notes,
        taxYear: input.taxYear,
      });
      
      setEntry(created);
      return created;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create dividend entry');
      setError(error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);
  
  // Update existing entry
  const update = useCallback(async (
    id: number, 
    updates: UpdateDividendEntryInput
  ): Promise<DividendEntry> => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const updated = await updateDividendEntry(id, {
        companyName: updates.companyName,
        dividendAmount: updates.dividendAmount,
        frankingPercentage: updates.frankingPercentage,
        dateReceived: updates.dateReceived,
        notes: updates.notes,
        taxYear: updates.taxYear,
      });
      
      setEntry(updated);
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update dividend entry');
      setError(error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);
  
  // Delete entry
  const deleteEntry = useCallback(async (id: number): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteDividendEntry(id);
      
      if (entry?.id === id) {
        setEntry(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete dividend entry');
      setError(error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [entry]);
  
  // Delete multiple entries
  const deleteMany = useCallback(async (ids: number[]): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteDividendEntries(ids);
      
      if (entry?.id && ids.includes(entry.id)) {
        setEntry(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete dividend entries');
      setError(error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [entry]);
  
  // Get entry by ID
  const getById = useCallback(async (id: number): Promise<DividendEntry | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const found = await getDividendEntry(id);
      setEntry(found);
      return found;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dividend entry');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Get entries by tax year
  const getByTaxYear = useCallback(async (taxYear: string): Promise<DividendEntry[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const entries = await getDividendEntriesByTaxYear(taxYear);
      return entries;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dividend entries');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Bulk create entries
  const bulkCreate = useCallback(async (
    inputs: CreateDividendEntryInput[]
  ): Promise<DividendEntry[]> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const created = await bulkCreateDividendEntries(inputs);
      return created;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to bulk create dividend entries');
      setError(error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Clear current entry
  const clearEntry = useCallback(() => {
    setEntry(null);
  }, []);
  
  return {
    entry,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    create,
    update,
    delete: deleteEntry,
    deleteMany,
    getById,
    getByTaxYear,
    bulkCreate,
    clearError,
    clearEntry,
  };
}

// ============= HOOK: useDividendEntryForm =============

interface FormState {
  companyName: string;
  dividendAmount: string;
  frankingPercentage: string;
  dateReceived: string;
  notes: string;
}

interface FormErrors {
  companyName?: string;
  dividendAmount?: string;
  frankingPercentage?: string;
  dateReceived?: string;
}

interface UseDividendEntryFormOptions {
  initialValues?: Partial<FormState>;
  onSubmit?: (values: CreateDividendEntryInput) => void;
  onSuccess?: () => void;
}

interface UseDividendEntryFormReturn {
  // Form state
  values: FormState;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
  
  // Field setters
  setCompanyName: (value: string) => void;
  setDividendAmount: (value: string) => void;
  setFrankingPercentage: (value: string) => void;
  setDateReceived: (value: string) => void;
  setNotes: (value: string) => void;
  
  // Actions
  handleSubmit: () => Promise<boolean>;
  reset: () => void;
  validate: () => boolean;
  clearErrors: () => void;
  
  // Parsed values
  parsedDividendAmount: number;
  parsedFrankingPercentage: number;
}

const defaultInitialValues: FormState = {
  companyName: '',
  dividendAmount: '',
  frankingPercentage: '100',
  dateReceived: new Date().toISOString().split('T')[0],
  notes: '',
};

export function useDividendEntryForm(
  options: UseDividendEntryFormOptions = {}
): UseDividendEntryFormReturn {
  const { initialValues = {}, onSubmit, onSuccess } = options;
  
  const [values, setValues] = useState<FormState>({
    ...defaultInitialValues,
    ...initialValues,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Parse numeric values
  const parsedDividendAmount = useMemo(() => {
    const parsed = parseFloat(values.dividendAmount);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [values.dividendAmount]);
  
  const parsedFrankingPercentage = useMemo(() => {
    const parsed = parseFloat(values.frankingPercentage);
    return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
  }, [values.frankingPercentage]);
  
  // Field setters
  const setCompanyName = useCallback((value: string) => {
    setValues(prev => ({ ...prev, companyName: value }));
    if (errors.companyName) {
      setErrors(prev => ({ ...prev, companyName: undefined }));
    }
  }, [errors.companyName]);
  
  const setDividendAmount = useCallback((value: string) => {
    setValues(prev => ({ ...prev, dividendAmount: value }));
    if (errors.dividendAmount) {
      setErrors(prev => ({ ...prev, dividendAmount: undefined }));
    }
  }, [errors.dividendAmount]);
  
  const setFrankingPercentage = useCallback((value: string) => {
    setValues(prev => ({ ...prev, frankingPercentage: value }));
    if (errors.frankingPercentage) {
      setErrors(prev => ({ ...prev, frankingPercentage: undefined }));
    }
  }, [errors.frankingPercentage]);
  
  const setDateReceived = useCallback((value: string) => {
    setValues(prev => ({ ...prev, dateReceived: value }));
    if (errors.dateReceived) {
      setErrors(prev => ({ ...prev, dateReceived: undefined }));
    }
  }, [errors.dateReceived]);
  
  const setNotes = useCallback((value: string) => {
    setValues(prev => ({ ...prev, notes: value }));
  }, []);
  
  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    if (!values.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    const dividendAmount = parseFloat(values.dividendAmount);
    if (isNaN(dividendAmount) || dividendAmount < 0) {
      newErrors.dividendAmount = 'Please enter a valid amount (0 or greater)';
    }
    
    const frankingPercentage = parseFloat(values.frankingPercentage);
    if (isNaN(frankingPercentage) || frankingPercentage < 0 || frankingPercentage > 100) {
      newErrors.frankingPercentage = 'Percentage must be between 0 and 100';
    }
    
    if (!values.dateReceived) {
      newErrors.dateReceived = 'Date received is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);
  
  // Form submission
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!validate()) {
      return false;
    }
    
    setIsSubmitting(true);
    
    try {
      const input: CreateDividendEntryInput = {
        companyName: values.companyName.trim(),
        dividendAmount: parsedDividendAmount,
        frankingPercentage: parsedFrankingPercentage,
        dateReceived: values.dateReceived,
        notes: values.notes.trim() || undefined,
      };
      
      if (onSubmit) {
        await onSubmit(input);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, values, parsedDividendAmount, parsedFrankingPercentage, onSubmit, onSuccess]);
  
  // Reset form
  const reset = useCallback(() => {
    setValues({
      ...defaultInitialValues,
      ...initialValues,
    });
    setErrors({});
  }, [initialValues]);
  
  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);
  
  // Check if form is valid
  const isValid = Object.keys(errors).length === 0 && values.companyName.trim() !== '';
  
  return {
    values,
    errors,
    isSubmitting,
    isValid,
    setCompanyName,
    setDividendAmount,
    setFrankingPercentage,
    setDateReceived,
    setNotes,
    handleSubmit,
    reset,
    validate,
    clearErrors,
    parsedDividendAmount,
    parsedFrankingPercentage,
  };
}

// Import useMemo
import { useMemo } from 'react';
