import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FocusMode, FocusModeType, FocusModeStep } from '@/components/layout/FocusMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Storage key prefix for workflow progress
const WORKFLOW_STORAGE_PREFIX = 'tally_workflow_';

interface WorkflowStep extends FocusModeStep {
  /** Whether this step is optional */
  optional?: boolean;
  /** Validation function - return true if step is complete */
  isComplete?: () => boolean;
  /** Content to render for this step */
  content: ReactNode;
}

interface WorkflowPageProps {
  /** Unique identifier for this workflow */
  workflowId: string;
  /** Focus mode type for styling */
  mode: FocusModeType;
  /** Workflow title */
  title: string;
  /** Optional subtitle with context (e.g., "Q2 2025") */
  subtitle?: string;
  /** Workflow steps */
  steps: WorkflowStep[];
  /** Route to navigate to on exit */
  exitRoute: string;
  /** Route to navigate to on completion */
  completionRoute?: string;
  /** Callback when workflow is completed */
  onComplete?: () => void;
  /** Initial step (overrides persisted state) */
  initialStep?: number;
  /** Whether to persist progress to localStorage */
  persistProgress?: boolean;
}

export function WorkflowPage({
  workflowId,
  mode,
  title,
  subtitle,
  steps,
  exitRoute,
  completionRoute,
  onComplete,
  initialStep,
  persistProgress = true,
}: WorkflowPageProps) {
  const navigate = useNavigate();
  const storageKey = `${WORKFLOW_STORAGE_PREFIX}${workflowId}`;
  
  // Load initial step from storage or props
  const getInitialStep = () => {
    if (initialStep !== undefined) return initialStep;
    if (persistProgress) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.currentStep ?? 0;
        } catch {
          return 0;
        }
      }
    }
    return 0;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Persist progress
  useEffect(() => {
    if (persistProgress) {
      const data = {
        currentStep,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [currentStep, storageKey, persistProgress]);

  const handleExit = () => {
    navigate({ to: exitRoute });
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    const step = steps[currentStep];
    
    // Check if step is complete (if validation provided)
    if (step.isComplete && !step.isComplete() && !step.optional) {
      // Don't proceed if step is not complete
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete workflow
      handleComplete();
    }
  };

  const handleComplete = () => {
    // Clear persisted progress
    if (persistProgress) {
      localStorage.removeItem(storageKey);
    }
    
    // Call completion callback
    onComplete?.();
    
    // Navigate to completion route or exit route
    navigate({ to: completionRoute || exitRoute });
  };

  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];
  const canProceed = !currentStepData.isComplete || currentStepData.isComplete() || currentStepData.optional;

  return (
    <FocusMode
      mode={mode}
      title={title}
      subtitle={subtitle}
      steps={steps}
      currentStep={currentStep}
      onExit={handleExit}
      onPrevious={handlePrevious}
      onNext={handleNext}
      nextLabel={isLastStep ? 'Complete' : 'Continue'}
      nextDisabled={!canProceed}
    >
      {/* Step content */}
      {currentStepData.content}

      {/* Validation warning if step incomplete */}
      {currentStepData.isComplete && !currentStepData.isComplete() && !currentStepData.optional && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            Please complete this step before continuing. Required fields are marked with *.
          </div>
        </div>
      )}
    </FocusMode>
  );
}

// Step summary card for completion screen
interface StepSummaryProps {
  label: string;
  value: ReactNode;
  status?: 'complete' | 'incomplete' | 'warning';
}

export function StepSummary({ label, value, status = 'complete' }: StepSummaryProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {status === 'incomplete' && <AlertCircle className="w-4 h-4 text-amber-500" />}
        {status === 'warning' && <AlertCircle className="w-4 h-4 text-red-500" />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground text-right">{value}</div>
    </div>
  );
}

// Workflow card for dashboard
interface WorkflowCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  progress?: number;
  status?: 'not-started' | 'in-progress' | 'complete';
  href: string;
  className?: string;
}

export function WorkflowCard({
  title,
  description,
  icon,
  progress,
  status = 'not-started',
  href,
  className,
}: WorkflowCardProps) {
  const navigate = useNavigate();

  const statusColors = {
    'not-started': 'text-muted-foreground',
    'in-progress': 'text-amber-500',
    'complete': 'text-green-500',
  };

  const statusLabels = {
    'not-started': 'Not started',
    'in-progress': `${progress}% complete`,
    'complete': 'Complete',
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
        status === 'complete' && 'border-green-500/30 bg-green-500/5',
        className
      )}
      onClick={() => navigate({ to: href })}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <span className={cn('text-xs font-medium', statusColors[status])}>
            {statusLabels[status]}
          </span>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {status === 'in-progress' && progress !== undefined && (
        <CardContent className="pt-0">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export type { WorkflowStep };
