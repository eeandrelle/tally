import { ReactNode } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Optional content to render when this step is active */
  content?: ReactNode;
}

interface StepperProps {
  /** List of steps */
  steps: StepperStep[];
  /** Current active step index (0-based) */
  currentStep: number;
  /** Callback when step is clicked (for non-linear navigation) */
  onStepClick?: (stepIndex: number) => void;
  /** Allow clicking on completed steps */
  allowStepNavigation?: boolean;
  /** Orientation of stepper */
  orientation?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: {
    circle: 'w-6 h-6 text-xs',
    connector: 'h-0.5',
    verticalConnector: 'w-0.5 min-h-4',
    label: 'text-xs',
    description: 'text-[10px]',
    gap: 'gap-2',
  },
  md: {
    circle: 'w-8 h-8 text-sm',
    connector: 'h-0.5',
    verticalConnector: 'w-0.5 min-h-6',
    label: 'text-sm',
    description: 'text-xs',
    gap: 'gap-3',
  },
  lg: {
    circle: 'w-10 h-10 text-base',
    connector: 'h-1',
    verticalConnector: 'w-1 min-h-8',
    label: 'text-base',
    description: 'text-sm',
    gap: 'gap-4',
  },
};

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  allowStepNavigation = false,
  orientation = 'horizontal',
  size = 'md',
  className,
}: StepperProps) {
  const sizes = sizeClasses[size];
  const isHorizontal = orientation === 'horizontal';

  const handleStepClick = (index: number) => {
    if (!onStepClick || !allowStepNavigation) return;
    // Only allow clicking completed steps or the next step
    if (index <= currentStep || index === currentStep + 1) {
      onStepClick(index);
    }
  };

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'items-start' : 'flex-col',
        sizes.gap,
        className
      )}
      role="navigation"
      aria-label="Progress steps"
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = allowStepNavigation && onStepClick && (isCompleted || index === currentStep + 1);

        return (
          <div
            key={step.id}
            className={cn(
              'flex',
              isHorizontal ? 'flex-1 items-start' : 'items-start gap-3',
              index === steps.length - 1 && isHorizontal && 'flex-none'
            )}
          >
            {/* Step indicator */}
            <div className={cn('flex', isHorizontal ? 'flex-col items-center' : 'flex-col items-center')}>
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center justify-center rounded-full font-medium transition-all',
                  sizes.circle,
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                  isClickable && 'cursor-pointer hover:opacity-80',
                  !isClickable && 'cursor-default'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : step.icon ? (
                  step.icon
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>

              {/* Vertical connector */}
              {!isHorizontal && index < steps.length - 1 && (
                <div
                  className={cn(
                    'mt-2',
                    sizes.verticalConnector,
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn('flex-1', isHorizontal ? 'mt-2 text-center' : 'pb-6')}>
              <div
                className={cn(
                  'font-medium',
                  sizes.label,
                  isCurrent ? 'text-foreground' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </div>
              {step.description && (
                <div className={cn('text-muted-foreground mt-0.5', sizes.description)}>
                  {step.description}
                </div>
              )}
            </div>

            {/* Horizontal connector */}
            {isHorizontal && index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 mt-4 mx-2',
                  sizes.connector,
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact inline stepper variant
interface InlineStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function InlineStepper({ steps, currentStep, className }: InlineStepperProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                isCompleted && 'bg-primary/20 text-primary',
                isCurrent && 'bg-primary text-primary-foreground',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="w-3 h-3" />
              ) : (
                <Circle className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{step}</span>
              <span className="sm:hidden">{index + 1}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-4 h-0.5',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
