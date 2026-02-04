/**
 * WeeklyDigestCard Component
 * 
 * Dashboard widget showing a preview of the weekly optimization digest.
 * Displays key metrics, insights, and a quick link to the full digest.
 * 
 * @example
 * ```tsx
 * <WeeklyDigestCard />
 * ```
 */

import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Calendar, 
  Lightbulb, 
  ArrowRight,
  Receipt,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useWeeklyDigest } from '@/hooks/useWeeklyDigest';
import { format } from 'date-fns';

export function WeeklyDigestCard() {
  const { digest, isLoading, error } = useWeeklyDigest({ autoRefresh: true });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !digest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Digest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>Failed to load weekly digest</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, insights, optimizationHighlights, upcomingDeadlines } = digest;
  const urgentDeadlines = upcomingDeadlines.filter(d => d.isUrgent);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Optimization Digest
            </CardTitle>
            <CardDescription>
              Week of {format(digest.weekStarting, 'MMM d')} - {format(digest.weekEnding, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Link to="/weekly-digest">
            <Button variant="ghost" size="sm" className="gap-1">
              View Full
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Receipt className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-semibold">{summary.receiptCount}</p>
            <p className="text-xs text-muted-foreground">Receipts</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-semibold">${summary.totalSpending.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Spent</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-xl font-semibold text-emerald-600">${summary.potentialTaxSavings.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Savings</p>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              This Week&apos;s Insights
            </h4>
            <div className="space-y-1.5">
              {insights.slice(0, 2).map((insight, idx) => (
                <p key={idx} className="text-sm text-muted-foreground pl-6">
                  {insight}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Optimization Opportunities */}
        {optimizationHighlights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top Opportunities
            </h4>
            <div className="space-y-1.5">
              {optimizationHighlights.slice(0, 2).map(opp => (
                <div key={opp.id} className="flex items-center justify-between text-sm pl-6">
                  <span className="text-muted-foreground truncate flex-1">{opp.title}</span>
                  <Badge 
                    variant={opp.priority === 'critical' ? 'destructive' : 'secondary'}
                    className="ml-2 text-xs"
                  >
                    ${opp.potentialSavings.toFixed(0)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Urgent Deadlines */}
        {urgentDeadlines.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900">
            <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Clock className="h-4 w-4" />
              Urgent Deadlines
            </h4>
            <div className="mt-1 space-y-1">
              {urgentDeadlines.map(deadline => (
                <div key={deadline.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-300">{deadline.title}</span>
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    {deadline.daysUntil === 0 ? 'Today' : `${deadline.daysUntil} days`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
