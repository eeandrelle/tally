/**
 * Tax Optimization Engine - Index
 * 
 * Central export point for all tax optimization modules.
 */

// Core engine
export {
  runOptimizationEngine,
  checkOpportunityType,
  getTopOpportunities,
  exportOpportunitiesForAccountant,
  getMarginalTaxRate,
  calculateTaxSavings,
  allDetectionRules
} from './tax-optimization';

// Types
export type {
  UserProfile,
  ExpenseRecord,
  ExpenseHistory,
  OptimizationOpportunity,
  OptimizationResult,
  PatternMatch,
  DetectionRule
} from './tax-optimization';

// React hooks
export {
  useTaxOptimization,
  useOpportunityTracker,
  useOpportunityFilter
} from '../hooks/useTaxOptimization';

export type {
  UseTaxOptimizationOptions,
  UseTaxOptimizationReturn
} from '../hooks/useTaxOptimization';
