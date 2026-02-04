/**
 * FrankingCreditSummary Component
 * 
 * Summary card showing franking credit totals and statistics
 */

import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/hooks/useFrankingCredits';
import type { AnnualFrankingSummary } from '@/lib/franking-credits';

interface FrankingCreditSummaryProps {
  summary: AnnualFrankingSummary | null;
  isLoading?: boolean;
}

export function FrankingCreditSummary({ summary, isLoading = false }: FrankingCreditSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Annual Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-lg p-4 h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Annual Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No dividend entries found for this tax year.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totalDividends, totalFrankingCredits, totalGrossedUpDividends, entries, taxYear } = summary;
  const entryCount = entries.length;
  
  // Calculate average franking percentage
  const avgFrankingPercentage = entryCount > 0
    ? entries.reduce((sum, e) => sum + e.frankingPercentage, 0) / entryCount
    : 0;

  // Calculate franking credit ratio
  const frankingRatio = totalDividends > 0
    ? (totalFrankingCredits / totalDividends) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Annual Summary
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              Financial Year: {taxYear}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{entryCount}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Dividends */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Dividends</p>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(totalDividends)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cash received
            </p>
          </div>

          {/* Total Franking Credits */}
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Total Franking Credits</p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalFrankingCredits)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tax already paid by companies
            </p>
          </div>

          {/* Grossed-Up Total */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Grossed-Up Total</p>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(totalGrossedUpDividends)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Amount to declare
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Average Franking % */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Franking %</p>
            <p className="text-xl font-semibold">
              {avgFrankingPercentage.toFixed(1)}%
            </p>
          </div>

          {/* Franking Ratio */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Credit Ratio</p>
            <p className="text-xl font-semibold">
              {frankingRatio.toFixed(1)}%
            </p>
          </div>

          {/* Credit per Entry */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Credit/Entry</p>
            <p className="text-xl font-semibold">
              {formatCurrency(entryCount > 0 ? totalFrankingCredits / entryCount : 0)}
            </p>
          </div>

          {/* Dividend per Entry */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Dividend/Entry</p>
            <p className="text-xl font-semibold">
              {formatCurrency(entryCount > 0 ? totalDividends / entryCount : 0)}
            </p>
          </div>
        </div>

        {/* Visual Breakdown */}
        {totalDividends > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Dividend Breakdown</p>
            <div className="h-8 rounded-full overflow-hidden flex">
              {/* Franked portion */}
              <div 
                className="bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground"
                style={{ width: `${avgFrankingPercentage}%` }}
              >
                {avgFrankingPercentage > 15 && `${avgFrankingPercentage.toFixed(0)}%`}
              </div>
              {/* Unfranked portion */}
              <div 
                className="bg-muted-foreground/30 flex items-center justify-center text-xs font-medium"
                style={{ width: `${100 - avgFrankingPercentage}%` }}
              >
                {avgFrankingPercentage < 85 && `${(100 - avgFrankingPercentage).toFixed(0)}%`}
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-primary" />
                Franked ({formatCurrency(totalDividends * (avgFrankingPercentage / 100))})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                Unfranked ({formatCurrency(totalDividends * ((100 - avgFrankingPercentage) / 100))})
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
