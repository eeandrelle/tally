/**
 * Number Extraction Components (TAL-102)
 * 
 * UI components for displaying extracted numbers from documents
 */

export {
  NumberTypeBadge,
  ConfidenceIndicator,
  ExtractedNumberCard,
  ExtractedNumberList,
} from "./NumberBadges";

export {
  ExtractionSummaryCard,
  ExtractionResultView,
  EmptyExtractionState,
  ExtractingState,
} from "./ExtractionSummary";

export type {
  NumberTypeBadgeProps,
  ConfidenceIndicatorProps,
  ExtractedNumberCardProps,
  ExtractedNumberListProps,
} from "./NumberBadges";

export type {
  ExtractionSummaryCardProps,
  ExtractionResultViewProps,
  EmptyExtractionStateProps,
  ExtractingStateProps,
} from "./ExtractionSummary";
