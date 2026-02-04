/**
 * ATO Categories Module - Index
 * 
 * Central export for all ATO category related functionality.
 * 
 * Usage:
 *   import { 
 *     getCategoryByCode, 
 *     validateReceipt,
 *     createWorkpaper 
 *   } from '$lib/ato-categories-index';
 */

// Metadata and definitions
export {
  // Types
  type AtoCategory,
  type AtoCategoryCode,
  type ReceiptRequirement,
  type RecordKeepingPeriod,
  
  // Data
  atoCategories,
  
  // Lookup functions
  getCategoryByCode,
  getAllCategories,
  getCategoriesByPriority,
  getRelatedCategories,
  searchCategories,
  getCategoriesByUsage,
  requiresReceipts,
  getCategoryCount,
  getCategoryStats,
} from './ato-categories';

// Database operations
export {
  // Category settings
  getAtoCategorySettings,
  getAtoCategorySetting,
  setAtoCategoryEnabled,
  updateAtoCategoryNotes,
  updateAtoCategoryCustomDescription,
  
  // Receipt linking
  updateReceiptAtoCategory,
  getReceiptsByAtoCategory,
  getReceiptsWithoutAtoCategory,
  
  // Workpapers
  createWorkpaper,
  getWorkpapers,
  getWorkpapersByCategory,
  getWorkpapersByTaxYear,
  getWorkpaperById,
  updateWorkpaper,
  deleteWorkpaper,
  finalizeWorkpaper,
  
  // Receipt-workpaper links
  linkReceiptToWorkpaper,
  unlinkReceiptFromWorkpaper,
  getReceiptsForWorkpaper,
  getWorkpapersForReceipt,
  
  // Category claims
  getCategoryClaim,
  setCategoryClaim,
  addToCategoryClaim,
  getClaimsForTaxYear,
  
  // Validation
  validateAtoCategoryCode,
  validateReceipt,
  validateWorkpaper,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  
  // Migration
  migrateReceiptsToAtoCategories,
  
  // Summary
  getAtoCategorySummary,
} from './db';

// Re-export types from db
export type {
  Workpaper,
  ReceiptWorkpaperLink,
  AtoCategorySetting,
} from './db';
