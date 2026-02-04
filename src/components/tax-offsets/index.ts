// Tax Offset & Credits Engine - Component Exports

export { TaxOffsetCard } from './TaxOffsetCard';
export { FrankingCreditForm } from './FrankingCreditForm';
export { TaxOffsetSummaryDisplay } from './TaxOffsetSummary';
export { TaxOffsetCalculator } from './TaxOffsetCalculator';

// Re-export types from the core library
export type {
  TaxPayerProfile,
  FrankingCredit,
  TaxOffsetSummary,
  TaxOffsetResult,
  CalculateTaxOffsetsInput
} from '@/lib/tax-offsets';

export type {
  TaxProfileInput,
  TaxOffsetRecord
} from '@/lib/db-tax-offsets';
