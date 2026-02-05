import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Camera, 
  FileText, 
  Calculator, 
  Share2, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Receipt,
  TrendingUp,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tally Beta!',
    description: 'Your personal tax assistant is ready to help you maximize deductions.',
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Smart Tax Management</h3>
          <p className="text-sm text-muted-foreground">
            Capture receipts, track deductions, and prepare your tax return with AI-powered assistance.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Camera className="w-5 h-5 mx-auto mb-1 text-violet-500" />
            <p className="text-xs text-muted-foreground">Scan Receipts</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Calculator className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-xs text-muted-foreground">Auto Calculate</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Share2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Share with Accountant</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'capture',
    title: 'Capture Your First Receipt',
    description: 'Use your camera or upload photos to automatically extract receipt details.',
    icon: Camera,
    content: (
      <div className="space-y-4">
        <div className="relative bg-muted rounded-xl overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 border-2 border-dashed border-violet-500/50 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Camera className="w-8 h-8 text-violet-500" />
              </div>
              <p className="text-sm text-muted-foreground">Point camera at receipt</p>
            </div>
          </div>
          {/* Corner brackets for scanner effect */}
          <div className="absolute inset-4 border-2 border-violet-500/30 rounded-lg">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-violet-500 -translate-x-px -translate-y-px" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-violet-500 translate-x-px -translate-y-px" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-violet-500 -translate-x-px translate-y-px" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-violet-500 translate-x-px translate-y-px" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-violet-500">1</span>
            </div>
            <p className="text-sm">Tap the camera button to scan a receipt</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-violet-500">2</span>
            </div>
            <p className="text-sm">AI automatically extracts vendor, amount, and date</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-violet-500">3</span>
            </div>
            <p className="text-sm">Review and save - it's that easy!</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'categories',
    title: 'Smart Categorization',
    description: 'Tally automatically categorizes your expenses for tax deductions.',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <div className="bg-muted rounded-xl p-4 space-y-3">
          {[
            { name: 'Vehicle & Travel', amount: '$1,245.00', icon: '🚗', color: 'bg-blue-500/10 text-blue-500' },
            { name: 'Home Office', amount: '$890.50', icon: '🏠', color: 'bg-emerald-500/10 text-emerald-500' },
            { name: 'Work Meals', amount: '$456.25', icon: '🍽️', color: 'bg-amber-500/10 text-amber-500' },
          ].map((cat, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <div>
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">Auto-detected</p>
                </div>
              </div>
              <span className={cn("text-sm font-medium px-2 py-1 rounded", cat.color)}>
                {cat.amount}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>AI learns from your edits to improve accuracy</span>
        </div>
      </div>
    ),
  },
  {
    id: 'tax-time',
    title: 'Ready for Tax Time',
    description: 'Generate professional reports and share with your accountant.',
    icon: Calculator,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-500">$2,592</div>
              <div className="text-xs text-muted-foreground">Total Deductions</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/5 to-violet-500/10 border-violet-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-violet-500">24</div>
              <div className="text-xs text-muted-foreground">Receipts Saved</div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="w-5 h-5 text-violet-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">PDF Tax Report</p>
              <p className="text-xs text-muted-foreground">Professional formatted report</p>
            </div>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Share2 className="w-5 h-5 text-indigo-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Accountant Portal</p>
              <p className="text-xs text-muted-foreground">Secure share with your accountant</p>
            </div>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Shield className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">ATO Compliance</p>
              <p className="text-xs text-muted-foreground">Valid deduction categories</p>
            </div>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>
    ),
  },
];

interface OnboardingFlowProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingFlow({ forceShow = false, onComplete }: OnboardingFlowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('tally-onboarding-completed');
    setHasSeenOnboarding(!!seen);
    
    if (forceShow || !seen) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tally-onboarding-completed', Date.now().toString());
    setIsOpen(false);
    
    // Celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8B5CF6', '#6366F1', '#10B981', '#F59E0B'],
    });

    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('tally-onboarding-completed', Date.now().toString());
    setIsOpen(false);
    onComplete?.();
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-violet-500" />
            </div>
            <DialogTitle className="text-xl">{step.title}</DialogTitle>
            <DialogDescription>{step.description}</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {step.content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-violet-600 to-indigo-600"
              >
                {currentStep === onboardingSteps.length - 1 ? (
                  <>
                    Get Started
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {onboardingSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  i === currentStep 
                    ? 'w-6 bg-violet-500' 
                    : i < currentStep 
                      ? 'bg-violet-500/50' 
                      : 'bg-muted-foreground/20 hover:bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick onboarding tip component for contextual hints
interface OnboardingTipProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function OnboardingTip({ id, title, description, children, placement = 'bottom' }: OnboardingTipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`tally-tip-${id}`);
    setHasBeenSeen(!!seen);
  }, [id]);

  const dismiss = () => {
    localStorage.setItem(`tally-tip-${id}`, 'true');
    setIsVisible(false);
    setHasBeenSeen(true);
  };

  if (hasBeenSeen) return <>{children}</>;

  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className={cn(
          'absolute z-50 w-64 p-3 bg-popover border rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-200',
          placement === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
          placement === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
          placement === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
          placement === 'right' && 'left-full ml-2 top-1/2 -translate-y-1/2',
        )}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" onClick={dismiss}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-white text-xs animate-pulse"
        >
          ?
        </button>
      )}
    </div>
  );
}

export function RestartOnboardingButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRestart = () => {
    localStorage.removeItem('tally-onboarding-completed');
    window.location.reload();
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Replay Onboarding
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart Onboarding?</DialogTitle>
            <DialogDescription>
              This will show the welcome tour again. You can skip it at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestart} className="bg-violet-600">
              Restart Tour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
