import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkles, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface BetaBadgeProps {
  variant?: 'default' | 'subtle' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BetaBadge({ 
  variant = 'default', 
  size = 'md',
  className 
}: BetaBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-0.5',
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0',
    subtle: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    pulse: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 animate-pulse',
  };

  return (
    <Badge 
      className={cn(
        'font-semibold tracking-wide uppercase',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Sparkles className={cn(
        'mr-1',
        size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'
      )} />
      Beta
    </Badge>
  );
}

interface BetaBannerProps {
  className?: string;
  dismissible?: boolean;
}

export function BetaBanner({ className, dismissible = true }: BetaBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('tally-beta-banner-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('tally-beta-banner-dismissed');
      } else {
        setIsVisible(false);
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('tally-beta-banner-dismissed', Date.now().toString());
    setTimeout(() => setIsDismissed(true), 300);
  };

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600',
        'text-white px-4 py-2.5 transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full',
        className
      )}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      <div className="relative flex items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="font-medium">
            Tally Beta
          </span>
        </div>
        <span className="text-white/80 hidden sm:inline">
          You're using an early version. We'd love your feedback!
        </span>
        <span className="text-white/80 sm:hidden">
          Early version - share feedback!
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-0"
          onClick={() => {
            // Scroll to feedback button or open feedback
            const feedbackBtn = document.querySelector('[data-feedback-trigger]');
            if (feedbackBtn) {
              (feedbackBtn as HTMLButtonElement).click();
            }
          }}
        >
          Give Feedback
        </Button>

        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface BetaFeatureFlagProps {
  children: React.ReactNode;
  className?: string;
}

export function BetaFeatureFlag({ children, className }: BetaFeatureFlagProps) {
  return (
    <div className={cn('relative group', className)}>
      {children}
      <div className="absolute -top-1 -right-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
        </span>
      </div>
    </div>
  );
}

interface BetaTooltipProps {
  feature: string;
  description: string;
  className?: string;
}

export function BetaTooltip({ feature, description, className }: BetaTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="flex items-center gap-1 text-violet-400 cursor-help">
        <Info className="w-3.5 h-3.5" />
        <BetaBadge variant="subtle" size="sm" />
      </div>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50">
          <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="font-medium text-foreground mb-1">{feature}</div>
            <div className="text-muted-foreground text-xs">{description}</div>
            <div className="mt-2 pt-2 border-t text-xs text-violet-500">
              Beta feature - may change
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-popover" />
          </div>
        </div>
      )}
    </div>
  );
}
