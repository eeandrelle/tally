/**
 * Weekly Optimization Digest Hook
 * 
 * Provides personalized weekly summaries including:
 * - Optimization opportunities
 * - Spending patterns
 * - Dividend updates
 * - Upcoming deadlines
 * 
 * @example
 * ```tsx
 * const { digest, isLoading, refresh } = useWeeklyDigest();
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, subDays } from 'date-fns';
import { useTaxYear } from '@/contexts/TaxYearContext';
import { useTaxOptimization } from './useTaxOptimization';
import { useDividendPatterns } from './useDividendPatterns';
import { useTaxCalendar } from './useTaxCalendar';
import { getReceiptsByDateRange, getTotalDeductions, type Receipt } from '@/lib/db';

export interface WeeklySpendingPattern {
  category: string;
  amount: number;
  changeFromLastWeek: number;
  trend: 'up' | 'down' | 'stable';
  receiptCount: number;
}

export interface DividendUpdate {
  company: string;
  ticker?: string;
  amount: number;
  paymentDate: Date;
  isNew: boolean;
  pattern: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
}

export interface OptimizationHighlight {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  date: Date;
  daysUntil: number;
  type: 'tax' | 'bas' | 'payg' | 'custom';
  isUrgent: boolean;
}

export interface WeeklyDigest {
  weekStarting: Date;
  weekEnding: Date;
  generatedAt: Date;
  summary: {
    totalSpending: number;
    totalDeductions: number;
    receiptCount: number;
    optimizationOpportunities: number;
    potentialTaxSavings: number;
  };
  spendingPatterns: WeeklySpendingPattern[];
  topCategories: string[];
  dividendUpdates: DividendUpdate[];
  optimizationHighlights: OptimizationHighlight[];
  upcomingDeadlines: UpcomingDeadline[];
  insights: string[];
}

interface UseWeeklyDigestOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWeeklyDigest(options: UseWeeklyDigestOptions = {}) {
  const { autoRefresh = true, refreshInterval = 1000 * 60 * 60 } = options; // Default 1 hour
  const { selectedYear, getYearDates } = useTaxYear();
  
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Get optimization data
  const { 
    opportunities, 
    totalSavings, 
    runAnalysis,
    isAnalyzing 
  } = useTaxOptimization();

  // Get dividend data
  const { patterns } = useDividendPatterns();

  // Get calendar data
  const { events } = useTaxCalendar();

  const generateDigest = useCallback(async (): Promise<WeeklyDigest> => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(weekStart, 1);
    const lastWeekEnd = subWeeks(weekEnd, 1);

    const { startDate, endDate } = getYearDates();

    // Fetch current week receipts
    const currentWeekReceipts = await getReceiptsByDateRange(
      format(weekStart, 'yyyy-MM-dd'),
      format(weekEnd, 'yyyy-MM-dd')
    );

    // Fetch last week receipts for comparison
    const lastWeekReceipts = await getReceiptsByDateRange(
      format(lastWeekStart, 'yyyy-MM-dd'),
      format(lastWeekEnd, 'yyyy-MM-dd')
    );

    // Calculate spending by category
    const categorySpending = new Map<string, { amount: number; count: number }>();
    const lastWeekCategorySpending = new Map<string, number>();

    currentWeekReceipts.forEach((receipt: Receipt) => {
      const category = receipt.category || 'Uncategorized';
      const existing = categorySpending.get(category) || { amount: 0, count: 0 };
      categorySpending.set(category, {
        amount: existing.amount + receipt.amount,
        count: existing.count + 1
      });
    });

    lastWeekReceipts.forEach((receipt: Receipt) => {
      const category = receipt.category || 'Uncategorized';
      lastWeekCategorySpending.set(
        category, 
        (lastWeekCategorySpending.get(category) || 0) + receipt.amount
      );
    });

    // Build spending patterns
    const spendingPatterns: WeeklySpendingPattern[] = Array.from(categorySpending.entries())
      .map(([category, data]) => {
        const lastWeekAmount = lastWeekCategorySpending.get(category) || 0;
        const change = lastWeekAmount > 0 
          ? ((data.amount - lastWeekAmount) / lastWeekAmount) * 100 
          : 0;
        
        return {
          category,
          amount: data.amount,
          changeFromLastWeek: change,
          trend: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
          receiptCount: data.count
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Get top categories
    const topCategories = spendingPatterns.map(p => p.category);

    // Calculate totals
    const totalSpending = currentWeekReceipts.reduce((sum: number, r: Receipt) => sum + r.amount, 0);
    const totalDeductions = await getTotalDeductions(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));

    // Build optimization highlights from opportunities
    const optimizationHighlights: OptimizationHighlight[] = opportunities
      .slice(0, 3)
      .map(opp => ({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        potentialSavings: opp.estimatedSavings,
        priority: opp.priority,
        actionRequired: opp.priority === 'critical' || opp.priority === 'high'
      }));

    // Get upcoming deadlines from calendar events
    const upcomingDeadlines: UpcomingDeadline[] = events
      .filter(e => e.status === 'pending')
      .map(event => {
        const daysUntil = Math.ceil((new Date(event.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: event.id,
          title: event.title,
          date: new Date(event.date),
          daysUntil,
          type: event.type,
          isUrgent: daysUntil <= 7
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);

    // Generate dividend updates (mock based on patterns)
    const dividendUpdates: DividendUpdate[] = patterns
      .filter(p => p.nextExpectedDate && isWithinInterval(new Date(p.nextExpectedDate), { start: weekStart, end: subDays(weekEnd, -7) }))
      .slice(0, 3)
      .map(p => ({
        company: p.companyName,
        ticker: p.ticker,
        amount: p.lastAmount || 0,
        paymentDate: new Date(p.nextExpectedDate!),
        isNew: p.confidence > 0.8,
        pattern: p.frequency
      }));

    // Generate insights
    const insights: string[] = [];
    
    if (optimizationHighlights.length > 0) {
      const topOpp = optimizationHighlights[0];
      insights.push(`💡 Top opportunity: ${topOpp.title} could save you $${topOpp.potentialSavings.toFixed(0)}`);
    }
    
    if (upcomingDeadlines.some(d => d.isUrgent)) {
      insights.push(`⏰ You have ${upcomingDeadlines.filter(d => d.isUrgent).length} urgent deadline(s) this week`);
    }
    
    if (spendingPatterns.length > 0) {
      const topSpending = spendingPatterns[0];
      insights.push(`💰 Highest spending category: ${topSpending.category} ($${topSpending.amount.toFixed(2)})`);
    }

    if (dividendUpdates.length > 0) {
      const totalDividends = dividendUpdates.reduce((sum, d) => sum + d.amount, 0);
      insights.push(`📈 ${dividendUpdates.length} dividend payment(s) expected soon (total: $${totalDividends.toFixed(2)})`);
    }

    return {
      weekStarting: weekStart,
      weekEnding: weekEnd,
      generatedAt: now,
      summary: {
        totalSpending,
        totalDeductions,
        receiptCount: currentWeekReceipts.length,
        optimizationOpportunities: opportunities.length,
        potentialTaxSavings: totalSavings
      },
      spendingPatterns,
      topCategories,
      dividendUpdates,
      optimizationHighlights,
      upcomingDeadlines,
      insights
    };
  }, [selectedYear, getYearDates, opportunities, totalSavings, events, patterns]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Run optimization analysis first
      await runAnalysis();
      
      const newDigest = await generateDigest();
      setDigest(newDigest);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate digest');
    } finally {
      setIsLoading(false);
    }
  }, [generateDigest, runAnalysis]);

  // Auto-refresh on mount and when dependencies change
  useEffect(() => {
    if (autoRefresh) {
      refresh();
    }
  }, [autoRefresh, selectedYear]);

  // Periodic refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    digest,
    isLoading: isLoading || isAnalyzing,
    error,
    refresh,
    lastRefreshed
  };
}

export function useDigestHistory() {
  const [history, setHistory] = useState<WeeklyDigest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('tally_weekly_digests');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed.map((d: any) => ({
          ...d,
          weekStarting: new Date(d.weekStarting),
          weekEnding: new Date(d.weekEnding),
          generatedAt: new Date(d.generatedAt),
          dividendUpdates: d.dividendUpdates.map((u: any) => ({
            ...u,
            paymentDate: new Date(u.paymentDate)
          })),
          upcomingDeadlines: d.upcomingDeadlines.map((d: any) => ({
            ...d,
            date: new Date(d.date)
          }))
        })));
      } catch {
        setHistory([]);
      }
    }
    setIsLoading(false);
  }, []);

  const saveDigest = useCallback((digest: WeeklyDigest) => {
    setHistory(prev => {
      const newHistory = [digest, ...prev.filter(h => 
        h.weekStarting.getTime() !== digest.weekStarting.getTime()
      )].slice(0, 12); // Keep last 12 weeks
      
      localStorage.setItem('tally_weekly_digests', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  return {
    history,
    isLoading,
    saveDigest
  };
}
