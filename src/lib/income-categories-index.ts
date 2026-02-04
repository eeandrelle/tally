/**
 * Income Categories Module - Index
 * 
 * Central export point for all income category functionality.
 */

// Core types and data
export {
  IncomeCategoryCode,
  IncomeFrequency,
  TaxTreatment,
  IncomeSource,
  IncomeSubcategory,
  IncomeCategory,
  incomeCategories
} from "./income-categories";

// Core functions
export {
  getAllIncomeCategories,
  getIncomeCategoryByCode,
  getIncomeCategoriesByPriority,
  getPrefillableIncomeCategories,
  getHighPriorityCategories,
  searchIncomeCategories,
  getSubcategoryByCode,
  getSubcategoriesForCategory,
  getAtoItemCodesSummary,
  getCategoriesWithWorkpapers,
  validateIncomeAmount
} from "./income-categories";

// Database types
export {
  IncomeCategorySetting,
  IncomeEntry,
  IncomeSummary
} from "./db-income-categories";

// Database functions
export {
  initIncomeCategoryTables,
  getIncomeCategorySettings,
  getVisibleIncomeCategorySettings,
  updateIncomeCategorySetting,
  createIncomeEntry,
  updateIncomeEntry,
  deleteIncomeEntry,
  getIncomeEntries,
  getIncomeEntryById,
  getIncomeSummaryByCategory,
  getTotalIncomeForYear,
  getUnreviewedIncomeEntries,
  markIncomeEntryReviewed,
  getIncomeEntriesBySource,
  importPrefilledIncome,
  getIncomeReconciliationReport,
  resetIncomeCategorySettings
} from "./db-income-categories";
