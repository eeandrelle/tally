import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  EyeOff, 
  RotateCcw, 
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { TaxImpactBadge, TaxImpactDetail } from './TaxImpactBadge';
import type { CategorizationSuggestion, SuggestionStatus, SuggestionType } from '@/lib/categorization-suggestions';

export interface SuggestionCardProps {
  suggestion: CategorizationSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onIgnore: (id: string) => void;
  onReset: (id: string) => void;
  className?: string;
  compact?: boolean;
}

const typeLabels: Record<SuggestionType, { label: string; icon: React.ReactNode; color: string }> = {
  d5_to_d6: { 
    label: 'Low-Value Pool', 
    icon: <Sparkles size={14} />, 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
  },
  immediate_to_depreciation: { 
    label: 'Set Up Depreciation', 
    icon: <Info size={14} />, 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
  },
  depreciation_to_immediate: { 
    label: 'Immediate Deduction', 
    icon: <Sparkles size={14} />, 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
  },
  home_office_method: { 
    label: 'Home Office', 
    icon: <Info size={14} />, 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
  },
  vehicle_method: { 
    label: 'Vehicle Method', 
    icon: <Info size={14} />, 
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' 
  },
  missing_depreciation: { 
    label: 'Missing Depreciation', 
    icon: <AlertTriangle size={14} />, 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
  },
  wrong_category: { 
    label: 'Better Category', 
    icon: <Lightbulb size={14} />, 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
  },
  split_expense: { 
    label: 'Split Expense', 
    icon: <Info size={14} />, 
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' 
  },
};

const priorityConfig = {
  critical: { color: 'bg-red-500', label: 'Critical' },
  high: { color: 'bg-orange-500', label: 'High' },
  medium: { color: 'bg-yellow-500', label: 'Medium' },
  low: { color: 'bg-blue-500', label: 'Low' },
};

const statusConfig: Record<SuggestionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pending', 
    className: 'border-amber-200 dark:border-amber-800',
    icon: <Info size={14} />
  },
  accepted: { 
    label: 'Accepted', 
    className: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10',
    icon: <Check size={14} />
  },
  rejected: { 
    label: 'Rejected', 
    className: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10',
    icon: <X size={14} />
  },
  ignored: { 
    label: 'Ignored', 
    className: 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50',
    icon: <EyeOff size={14} />
  },
};

/**
 * SuggestionCard - Displays a single categorization suggestion
 */
export function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  onIgnore,
  onReset,
  className,
  compact = false,
}: SuggestionCardProps) {
  const typeInfo = typeLabels[suggestion.suggestionType];
  const priorityInfo = priorityConfig[suggestion.priority];
  const statusInfo = statusConfig[suggestion.status];
  const isProcessed = suggestion.status !== 'pending';

  if (compact) {
    return (
      <Card className={cn(
        'transition-all',
        statusInfo.className,
        isProcessed && 'opacity-75',
        className
      )}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={cn('text-xs', typeInfo.color)}>
                  <span className="flex items-center gap-1">
                    {typeInfo.icon}
                    {typeInfo.label}
                  </span>
                </Badge>
                <TaxImpactBadge amount={suggestion.taxImpact} size="sm" showIcon={false} />
              </div>
              <p className="text-sm font-medium truncate">{suggestion.itemDescription}</p>
              <p className="text-xs text-muted-foreground">
                {suggestion.currentCategory} → {suggestion.suggestedCategory}
              </p>
            </div>
            
            {!isProcessed ? (
              <div className="flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                  onClick={() => onAccept(suggestion.id)}
                >
                  <Check size={14} />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                  onClick={() => onReject(suggestion.id)}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => onReset(suggestion.id)}
              >
                <RotateCcw size={14} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'transition-all',
      statusInfo.className,
      isProcessed && 'opacity-90',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={cn('text-xs', typeInfo.color)}>
                <span className="flex items-center gap-1">
                  {typeInfo.icon}
                  {typeInfo.label}
                </span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                <span className="flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', priorityInfo.color)} />
                  {priorityInfo.label} Priority
                </span>
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {suggestion.confidence === 'high' ? 'High Confidence' : 
                 suggestion.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-lg">{suggestion.title}</h3>
            <p className="text-muted-foreground text-sm mt-1">{suggestion.description}</p>
          </div>
          
          <TaxImpactBadge amount={suggestion.taxImpact} size="lg" showLabel />
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-4">
        {/* Category Change */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Current Category</div>
            <div className="font-medium">{suggestion.currentCategory}</div>
            {suggestion.metadata?.originalCategoryName && (
              <div className="text-xs text-muted-foreground">{suggestion.metadata.originalCategoryName}</div>
            )}
          </div>
          <ArrowRight className="text-muted-foreground" size={20} />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Suggested Category</div>
            <div className="font-medium text-green-600 dark:text-green-400">{suggestion.suggestedCategory}</div>
            {suggestion.metadata?.suggestedCategoryName && (
              <div className="text-xs text-muted-foreground">{suggestion.metadata.suggestedCategoryName}</div>
            )}
          </div>
        </div>

        {/* Item Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Item:</span>
            <span className="ml-2 font-medium">{suggestion.itemDescription}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Amount:</span>
            <span className="ml-2 font-medium">
              {new Intl.NumberFormat('en-AU', {
                style: 'currency',
                currency: 'AUD',
              }).format(suggestion.amount)}
            </span>
          </div>
        </div>

        {/* Tax Impact Detail */}
        <TaxImpactDetail
          currentBenefit={suggestion.currentTaxBenefit}
          suggestedBenefit={suggestion.suggestedTaxBenefit}
          difference={suggestion.taxImpact}
        />

        {/* Reason */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-blue-800 dark:text-blue-300">Why this suggestion?</div>
              <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">{suggestion.reason}</div>
            </div>
          </div>
        </div>

        {/* ATO Reference */}
        {suggestion.atoReference && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">ATO Reference:</span> {suggestion.atoReference}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t gap-2">
        {!isProcessed ? (
          <>
            <Button 
              variant="default" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept(suggestion.id)}
            >
              <Check size={16} className="mr-2" />
              Accept
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onReject(suggestion.id)}
            >
              <X size={16} className="mr-2" />
              Reject
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onIgnore(suggestion.id)}
              title="Ignore"
            >
              <EyeOff size={16} />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1">
              {statusInfo.icon}
              <span className={cn(
                'font-medium',
                suggestion.status === 'accepted' && 'text-green-600 dark:text-green-400',
                suggestion.status === 'rejected' && 'text-red-600 dark:text-red-400',
                suggestion.status === 'ignored' && 'text-gray-600 dark:text-gray-400',
              )}>
                {statusInfo.label}
              </span>
              {suggestion.reviewedAt && (
                <span className="text-xs text-muted-foreground">
                  on {suggestion.reviewedAt.toLocaleDateString()}
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onReset(suggestion.id)}
            >
              <RotateCcw size={14} className="mr-2" />
              Reset
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Mini card for summary lists
 */
export function SuggestionMiniCard({
  suggestion,
  onClick,
  className,
}: {
  suggestion: CategorizationSuggestion;
  onClick?: () => void;
  className?: string;
}) {
  const typeInfo = typeLabels[suggestion.suggestionType];
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors',
        suggestion.status === 'accepted' && 'border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-900/10',
        suggestion.status === 'rejected' && 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/10',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn('flex-shrink-0', typeInfo.color)}>{typeInfo.icon}</span>
          <span className="text-sm font-medium truncate">{suggestion.itemDescription}</span>
        </div>
        <TaxImpactCompact amount={suggestion.taxImpact} />
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        <span>{suggestion.currentCategory} → {suggestion.suggestedCategory}</span>
      </div>
    </div>
  );
}

// Import for compact version
import { TaxImpactCompact } from './TaxImpactBadge';