/**
 * Franking Credits Components Index
 * 
 * Components for calculating, displaying, and managing franking credits
 * per ATO rules and regulations.
 */

// Core calculator components
export { FrankingCalculator } from './FrankingCalculator';
export { TaxImpactDisplay } from './TaxImpactDisplay';
export { FrankingRefundEstimator, type RefundEstimate } from './FrankingRefundEstimator';

// Entry management components
export { DividendEntryForm } from './DividendEntryForm';
export { DividendEntryList } from './DividendEntryList';
export { FrankingCreditSummary } from './FrankingCreditSummary';

// Display components
export { 
  FrankingCreditBadge, 
  FrankingCreditBadgeCompact,
  FrankingCreditAmountBadge 
} from './FrankingCreditBadge';
export { 
  DividendWithFrankingRow,
  DividendWithFrankingHeader 
} from './DividendWithFrankingRow';
