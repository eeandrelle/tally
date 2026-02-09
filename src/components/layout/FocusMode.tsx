import { ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppShell } from './AppShell';

export type FocusModeType = 'bas' | 'tax-return' | 'receipt-capture' | 'custom';

interface FocusModeStep {
  id: string;
  label: string;
  description?: string;
}

interface FocusModeProps {
  /** Mode type for styling */
  mode: FocusModeType;
  /** Title shown in header */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Steps for progress indicator */
  steps?: FocusModeStep[];
  /** Current step index (0-based) */
  currentStep?: number;
  /** Callback when user clicks exit */
  onExit: () => void;
  /** Callback when user clicks previous */
  onPrevious?: () => void;
  /** Callback when user clicks next */
  onNext?: () => void;
  /** Previous button label */
  previousLabel?: string;
  /** Next button label */
  nextLabel?: string;
  /** Disable previous button */
  previousDisabled?: boolean;
  /** Disable next button */
  nextDisabled?: boolean;
  /** Hide navigation buttons */
  hideNavigation?: boolean;
  /** Page content */
  children: ReactNode;
  /** Additional className for main content */
  className?: string;
}

// Mode-specific colors
const modeColors: Record<FocusModeType, { bg: string; accent: string; text: string }> = {
  'bas': {
    bg: 'bg-blue-950/20',
    accent: 'bg-blue-500',
    text: 'text-blue-400',
  },
  'tax-return': {
    bg: 'bg-purple-950/20',
    accent: 'bg-purple-500',
    text: 'text-purple-400',
  },
  'receipt-capture': {
    bg: 'bg-emerald-950/20',
    accent: 'bg-emerald-500',
    text: 'text-emerald-400',
  },
  'custom': {
    bg: 'bg-background',
    accent: 'bg-primary',
    text: 'text-primary',
  },
};

export function FocusMode({
  mode,
  title,
  subtitle,
  steps = [],
  currentStep = 0,
  onExit,
  onPrevious,
  onNext,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  previousDisabled = false,
  nextDisabled = false,
  hideNavigation = false,
  children,
  className,
}: FocusModeProps) {
  const { setFocusMode } = useAppShell();
  const colors = modeColors[mode];
  
  // Enable focus mode on mount, disable on unmount
  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [setFocusMode]);

  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className={cn('min-h-screen flex flex-col', colors.bg)}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Exit button and title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Exit {mode === 'bas' ? 'BAS Mode' : mode === 'tax-return' ? 'Tax Return Mode' : 'Focus Mode'}</span>
              </Button>
              
              <div className="h-6 w-px bg-border hidden sm:block" />
              
              <div>
                <h1 className="font-semibold text-lg">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Step indicator (compact) */}
            {steps.length > 0 && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className={cn('font-medium', colors.text)}>
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="text-muted-foreground">—</span>
                <span className="text-foreground font-medium">
                  {steps[currentStep]?.label}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {steps.length > 0 && (
            <div className="mt-3">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      </header>

      {/* Step navigation pills (mobile) */}
      {steps.length > 0 && (
        <div className="md:hidden overflow-x-auto px-4 py-2 bg-card/50 border-b border-border">
          <div className="flex gap-2 min-w-max">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  index === currentStep
                    ? cn(colors.accent, 'text-white')
                    : index < currentStep
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/50 text-muted-foreground'
                )}
              >
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {index + 1}
                </span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={cn('flex-1 py-6', className)}>
        <div className="max-w-5xl mx-auto px-4">
          {/* Step header */}
          {steps.length > 0 && steps[currentStep] && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">
                {steps[currentStep].label}
              </h2>
              {steps[currentStep].description && (
                <p className="text-muted-foreground">
                  {steps[currentStep].description}
                </p>
              )}
            </div>
          )}

          {/* Page content */}
          <div className="bg-card rounded-xl border border-border p-6">
            {children}
          </div>
        </div>
      </main>

      {/* Footer navigation */}
      {!hideNavigation && steps.length > 0 && (
        <footer className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={isFirstStep || previousDisabled}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {previousLabel}
              </Button>

              {/* Step dots (desktop) */}
              <div className="hidden md:flex items-center gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      index === currentStep
                        ? colors.accent
                        : index < currentStep
                        ? 'bg-muted-foreground/50'
                        : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              <Button
                onClick={onNext}
                disabled={nextDisabled}
                className={cn('gap-2', isLastStep && 'bg-green-600 hover:bg-green-700')}
              >
                {isLastStep ? 'Complete' : nextLabel}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// Export step type for consumers
export type { FocusModeStep };
