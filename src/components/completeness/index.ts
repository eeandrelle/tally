/**
 * Completeness Checker Components
 * 
 * Export all components for the Tax Year Completeness Checker feature.
 */

export { ScoreCard, CompactScoreCard } from './ScoreCard';
export type { ScoreCardProps, CompactScoreCardProps } from './ScoreCard';

export { 
  ChecklistSection, 
  MissingDocumentsSection, 
  OptimizationSection 
} from './ChecklistSection';
export type { ChecklistSectionProps } from './ChecklistSection';

export { CompletenessDashboard } from './CompletenessDashboard';
export type { CompletenessDashboardProps } from './CompletenessDashboard';

export { default } from './CompletenessDashboard';