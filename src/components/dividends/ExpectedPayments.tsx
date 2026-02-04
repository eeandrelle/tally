/**
 * Expected Payments Component
 * 
 * Displays upcoming expected dividends based on historical patterns
 * - List of upcoming expected dividends
 * - Date, estimated amount, company
 * - Visual indicator if payment is overdue
 * - Confidence levels based on pattern detection
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Calendar,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Percent,
  Sparkles,
  Brain,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { format, differenceInDays, isPast, isToday, addDays } from 'date-fns';
import type { DividendPattern, ExpectedDividend } from '@/lib/dividend-patterns';

// ============================================================================
// TYPES
// ============================================================================

interface ExpectedPaymentsProps {
  expectedDividends: ExpectedDividend[];
  patterns: DividendPattern[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onViewPattern?: (pattern: DividendPattern) => void;
  maxItems?: number;
}

interface PaymentStatus {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  color: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPaymentStatus(expectedDate: string, confidence: string): PaymentStatus {
  const date = new Date(expectedDate);
  const daysUntil = differenceInDays(date, new Date());
  
  if (isToday(date)) {
    return {
      label: 'Due Today',
      variant: 'default',
      icon: <AlertCircle className="h-3 w-3" />,
      color: 'text-blue-600 bg-blue-500/10',
    };
  }
  
  if (isPast(date) && !isToday(date)) {
    return {
      label: `Overdue by ${Math.abs(daysUntil)} days`,
      variant: 'destructive',
      icon: <AlertTriangle className="h-3 w-3" />,
      color: 'text-red-600 bg-red-500/10',
    };
  }
  
  if (daysUntil <= 7) {
    return {
      label: `Due in ${daysUntil} days`,
      variant: 'default',
      icon: <Clock className="h-3 w-3" />,
      color: 'text-amber-600 bg-amber-500/10',
    };
  }
  
  if (confidence === 'high') {
    return {
      label: `Expected in ${daysUntil} days`,
      variant: 'secondary',
      icon: <CheckCircle className="h-3 w-3" />,
      color: 'text-green-600 bg-green-500/10',
    };
  }
  
  return {
    label: `Projected in ${daysUntil} days`,
    variant: 'outline',
    icon: <Calendar className="h-3 w-3" />,
    color: 'text-muted-foreground',
  };
}

function getConfidenceBadge(confidence: string) {
  switch (confidence) {
    case 'high':
      return (
        <Badge variant="default" className="bg-green-600 text-white text-[10px]">
          <Sparkles className="h-3 w-3 mr-1" />
          High Confidence
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="default" className="bg-amber-500 text-white text-[10px]">
          Medium Confidence
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="outline" className="text-[10px]">
          Low Confidence
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          Estimated
        </Badge>
      );
  }
}

function getFrequencyBadge(frequency: string) {
  const colors: Record<string, string> = {
    monthly: 'bg-blue-500/10 text-blue-600',
    quarterly: 'bg-purple-500/10 text-purple-600',
    'half-yearly': 'bg-amber-500/10 text-amber-600',
    yearly: 'bg-green-500/10 text-green-600',
    irregular: 'bg-gray-500/10 text-gray-600',
  };
  
  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", colors[frequency] || '')}>
      {frequency.replace('-', ' ')}
    </Badge>
  );
}

// ============================================================================
// PAYMENT ITEM COMPONENT
// ============================================================================

interface PaymentItemProps {
  dividend: ExpectedDividend;
  pattern?: DividendPattern;
  onViewPattern?: (pattern: DividendPattern) => void;
}

function PaymentItem({ dividend, pattern, onViewPattern }: PaymentItemProps) {
  const status = getPaymentStatus(dividend.estimatedPaymentDate, dividend.confidence);
  const grossedUpAmount = dividend.estimatedAmount + dividend.estimatedFrankingCredits;
  
  return (
    <Card className="hover:bg-muted/50 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Company Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {dividend.asxCode ? (
                <span className="text-sm font-bold text-primary">{dividend.asxCode}</span>
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{dividend.companyName}</p>
                {getConfidenceBadge(dividend.confidence)}
              </div>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", status.color)}>
                  {status.icon}
                  {status.label}
                </span>
                {pattern && getFrequencyBadge(pattern.frequency)}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                Based on {dividend.basedOn} historical payment{dividend.basedOn !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {/* Amount Info */}
          <div className="text-right shrink-0">
            <p className="font-semibold text-lg">~{formatCurrency(dividend.estimatedAmount)}</p>
            
            {dividend.estimatedFrankingCredits > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="text-green-600">+{formatCurrency(dividend.estimatedFrankingCredits)}</span> credits
                {' '}({dividend.estimatedFrankingPercentage}% franked)
              </div>
            )}
            
            <div className="text-xs text-muted-foreground mt-1">
              Gross: {formatCurrency(grossedUpAmount)}
            </div>
          </div>
        </div>
        
        {/* Pattern Analysis Link */}
        {pattern && onViewPattern && (
          <>
            <Separator className="my-3" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-xs h-8"
              onClick={() => onViewPattern(pattern)}
            >
              <span className="flex items-center gap-2">
                <Brain className="h-3 w-3" />
                View Pattern Analysis
              </span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Expected Payments</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
          We don&apos;t have enough dividend history to predict upcoming payments. 
          Add more dividend entries or run pattern detection.
        </p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Predictions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
              <div className="h-6 bg-muted rounded w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExpectedPayments({
  expectedDividends,
  patterns,
  isLoading = false,
  onRefresh,
  onViewPattern,
  maxItems = 10,
}: ExpectedPaymentsProps) {
  // Sort by date and filter to max items
  const sortedDividends = useMemo(() => {
    return [...expectedDividends]
      .sort((a, b) => new Date(a.estimatedPaymentDate).getTime() - new Date(b.estimatedPaymentDate).getTime())
      .slice(0, maxItems);
  }, [expectedDividends, maxItems]);
  
  // Group by timeframe
  const grouped = useMemo(() => {
    const groups: Record<string, ExpectedDividend[]> = {
      overdue: [],
      thisWeek: [],
      thisMonth: [],
      future: [],
    };
    
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    const monthFromNow = addDays(now, 30);
    
    sortedDividends.forEach(dividend => {
      const date = new Date(dividend.estimatedPaymentDate);
      
      if (isPast(date) && !isToday(date)) {
        groups.overdue.push(dividend);
      } else if (differenceInDays(date, now) <= 7) {
        groups.thisWeek.push(dividend);
      } else if (differenceInDays(date, now) <= 30) {
        groups.thisMonth.push(dividend);
      } else {
        groups.future.push(dividend);
      }
    });
    
    return groups;
  }, [sortedDividends]);
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const total = sortedDividends.reduce((sum, d) => sum + d.estimatedAmount, 0);
    const frankingCredits = sortedDividends.reduce((sum, d) => sum + d.estimatedFrankingCredits, 0);
    const highConfidence = sortedDividends.filter(d => d.confidence === 'high').length;
    
    return { total, frankingCredits, highConfidence, count: sortedDividends.length };
  }, [sortedDividends]);
  
  // Find pattern for a dividend
  const getPatternForDividend = (dividend: ExpectedDividend) => {
    return patterns.find(p => p.id === dividend.id);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <LoadingState />
        </CardContent>
      </Card>
    );
  }
  
  if (sortedDividends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Expected Payments
          </CardTitle>
          <CardDescription>Upcoming dividend predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState onRefresh={onRefresh} />
        </CardContent>
      </Card>
    );
  }
  
  const renderGroup = (title: string, dividends: ExpectedDividend[], icon: React.ReactNode) => {
    if (dividends.length === 0) return null;
    
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="outline" className="text-[10px] ml-1">{dividends.length}</Badge>
        </h4>
        <div className="space-y-3">
          {dividends.map(dividend => (
            <PaymentItem
              key={`${dividend.id}-${dividend.estimatedPaymentDate}`}
              dividend={dividend}
              pattern={getPatternForDividend(dividend)}
              onViewPattern={onViewPattern}
            />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Expected Payments
            </CardTitle>
            <CardDescription>
              {stats.count} upcoming dividend{stats.count !== 1 ? 's' : ''} predicted
            </CardDescription>
          </div>
          
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{formatCurrency(stats.total)}</span>
              {' '}expected
            </span>
          </div>
          
          {stats.frankingCredits > 0 && (
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                <span className="font-semibold text-green-600">+{formatCurrency(stats.frankingCredits)}</span>
                {' '}credits
              </span>
            </div>
          )}
          
          {stats.highConfidence > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">
                {stats.highConfidence} high confidence
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {renderGroup('Overdue', grouped.overdue, <AlertTriangle className="h-4 w-4 text-red-500" />)}
          {renderGroup('This Week', grouped.thisWeek, <Clock className="h-4 w-4 text-amber-500" />)}
          {renderGroup('This Month', grouped.thisMonth, <Calendar className="h-4 w-4 text-blue-500" />)}
          {renderGroup('Future', grouped.future, <TrendingUp className="h-4 w-4 text-green-500" />)}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ExpectedPayments;
