/**
 * useStatementUpload Hook
 * React hook for handling bank statement file uploads with validation
 */

import { useState, useCallback, useRef } from 'react';
import type { BankName } from '../lib/bank-statement-types';
import { validatePDFBankStatement, detectBankFromPDF } from '../lib/bank-pdf-parser';

// Upload validation result
export interface UploadValidation {
  valid: boolean;
  bank?: BankName;
  errors: string[];
  warnings: string[];
}

// Upload state
export interface UploadState {
  file: File | null;
  bankName: BankName | null;
  isValidating: boolean;
  isUploading: boolean;
  validation: UploadValidation | null;
  error: Error | null;
}

// ============= HOOK: useStatementUpload =============

interface UseStatementUploadOptions {
  maxFileSize?: number; // in bytes, default 10MB
  allowedTypes?: string[];
  autoDetectBank?: boolean;
  validateOnSelect?: boolean;
}

interface UseStatementUploadReturn extends UploadState {
  // Actions
  selectFile: (file: File) => Promise<void>;
  selectBank: (bank: BankName) => void;
  clearFile: () => void;
  validate: () => Promise<UploadValidation | null>;
  
  // File info
  fileSize: number;
  fileSizeFormatted: string;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = ['application/pdf'];

export function useStatementUpload(
  options: UseStatementUploadOptions = {}
): UseStatementUploadReturn {
  const {
    maxFileSize = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    autoDetectBank = true,
    validateOnSelect = true,
  } = options;
  
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState<BankName | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validation, setValidation] = useState<UploadValidation | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if validation is in progress to prevent race conditions
  const validatingRef = useRef(false);
  
  // Format file size for display
  const fileSizeFormatted = file
    ? formatFileSize(file.size)
    : '0 B';
  
  // Validate file type
  const validateFileType = useCallback((file: File): boolean => {
    return allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });
  }, [allowedTypes]);
  
  // Validate file size
  const validateFileSize = useCallback((file: File): boolean => {
    return file.size <= maxFileSize;
  }, [maxFileSize]);
  
  // Detect bank from file
  const detectBank = useCallback(async (file: File): Promise<BankName | null> => {
    try {
      const buffer = await file.arrayBuffer();
      return await detectBankFromPDF(buffer);
    } catch {
      return null;
    }
  }, []);
  
  // Perform full validation
  const performValidation = useCallback(async (
    fileToValidate: File,
    expectedBank?: BankName
  ): Promise<UploadValidation> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check file type
    if (!validateFileType(fileToValidate)) {
      errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return { valid: false, errors, warnings };
    }
    
    // Check file size
    if (!validateFileSize(fileToValidate)) {
      errors.push(`File too large. Maximum size: ${formatFileSize(maxFileSize)}`);
      return { valid: false, errors, warnings };
    }
    
    // Validate PDF content
    try {
      const buffer = await fileToValidate.arrayBuffer();
      const validation = await validatePDFBankStatement(buffer, expectedBank);
      
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
      
      if (validation.bank && expectedBank && validation.bank !== expectedBank) {
        warnings.push(`Detected ${validation.bank} statement but ${expectedBank} was selected`);
      }
      
      return {
        valid: errors.length === 0,
        bank: validation.bank,
        errors,
        warnings,
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Validation failed');
      return { valid: false, errors, warnings };
    }
  }, [allowedTypes, maxFileSize, validateFileType, validateFileSize]);
  
  // Select file
  const selectFile = useCallback(async (selectedFile: File) => {
    if (validatingRef.current) return;
    
    validatingRef.current = true;
    setIsValidating(true);
    setError(null);
    setValidation(null);
    
    try {
      // Check file type immediately
      if (!validateFileType(selectedFile)) {
        setError(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
        validatingRef.current = false;
        setIsValidating(false);
        return;
      }
      
      // Check file size immediately
      if (!validateFileSize(selectedFile)) {
        setError(new Error(`File too large. Maximum size: ${formatFileSize(maxFileSize)}`));
        validatingRef.current = false;
        setIsValidating(false);
        return;
      }
      
      setFile(selectedFile);
      
      // Auto-detect bank if enabled
      if (autoDetectBank) {
        const detected = await detectBank(selectedFile);
        if (detected) {
          setBankName(detected);
        }
      }
      
      // Validate if enabled
      if (validateOnSelect) {
        const result = await performValidation(selectedFile, bankName || undefined);
        setValidation(result);
        
        if (!result.valid) {
          setError(new Error(result.errors.join(', ')));
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to select file');
      setError(error);
    } finally {
      validatingRef.current = false;
      setIsValidating(false);
    }
  }, [
    autoDetectBank,
    validateOnSelect,
    bankName,
    allowedTypes,
    maxFileSize,
    validateFileType,
    validateFileSize,
    detectBank,
    performValidation,
  ]);
  
  // Select bank
  const selectBank = useCallback((bank: BankName) => {
    setBankName(bank);
    
    // Re-validate if we have a file
    if (file && !validatingRef.current) {
      validatingRef.current = true;
      setIsValidating(true);
      
      performValidation(file, bank)
        .then(result => {
          setValidation(result);
          setError(result.valid ? null : new Error(result.errors.join(', ')));
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error('Validation failed'));
        })
        .finally(() => {
          validatingRef.current = false;
          setIsValidating(false);
        });
    }
  }, [file, performValidation]);
  
  // Clear file
  const clearFile = useCallback(() => {
    setFile(null);
    setBankName(null);
    setValidation(null);
    setError(null);
    validatingRef.current = false;
  }, []);
  
  // Manual validation
  const validate = useCallback(async (): Promise<UploadValidation | null> => {
    if (!file) return null;
    
    validatingRef.current = true;
    setIsValidating(true);
    
    try {
      const result = await performValidation(file, bankName || undefined);
      setValidation(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Validation failed');
      setError(error);
      return null;
    } finally {
      validatingRef.current = false;
      setIsValidating(false);
    }
  }, [file, bankName, performValidation]);
  
  return {
    file,
    bankName,
    isValidating,
    isUploading,
    validation,
    error,
    selectFile,
    selectBank,
    clearFile,
    validate,
    fileSize: file?.size || 0,
    fileSizeFormatted,
  };
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}
