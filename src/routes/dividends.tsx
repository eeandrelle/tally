/**
 * Dividend Tracker Dashboard
 * 
 * Main dashboard component for tracking dividend income across all holdings.
 * Provides comprehensive view of dividend history, payment patterns, 
 * company performance, and annual tax summaries.
 * 
 * Updated: Integrated with Dividend Pattern Detection (TAL-141)
 */

import { useState, useCallback, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  Building2, 
  Calendar, 
  Search,
  Download,
  FileText,
  PieChart,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  History,
  Calculator,
  Landmark,
  Brain,
  Sparkles,
  Bell,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useDividendTracker, useCompanyDetail } from '@/hooks/useDividendTracker';
import { useDividendPatterns, useExpectedDividends } from '@/hooks/useDividendPatterns';
import { useAlertDashboard } from '@/hooks/useDividendAlerts';
import { DividendCharts } from '@/components/dividends/DividendCharts';
import { CompanyList } from '@/components/dividends/CompanyCard';
import { CompanyDetail } from '@/components/dividends/CompanyDetail';
import { PatternDetectionPanel } from '@/components/dividends/PatternDetectionPanel';
import { PatternHistoryChart } from '@/components/dividends/PatternHistoryChart';
import { PaymentPatternSummary } from '@/components/dividends/PaymentPatternBadge';
import { AlertListCompact } from '@/components/dividends/AlertList';
import { DividendHistoryChart } from '@/components/dividends/DividendHistoryChart';
import { ExpectedPayments } from '@/components/dividends/ExpectedPayments';
import { formatCurrency } from '@/lib/dividend-tracker';
import { getFinancialYear } from '@/lib/franking-credits';
import type { DividendPattern } from '@/lib/dividend-patterns';
import { getDividendPaymentHistory } from '@/lib/db-dividend-patterns';
import { Link } from '@tanstack/react-router';

// ============================================================================
// OVERVIEW STATS COMPONENT
// ============================================================================

function OverviewStats({ 
  overview, 
  isLoading,
  patternStats,
}: { 
  overview: ReturnType<typeof useDividendTracker>['overview'];
  isLoading: boolean;
  patternStats: ReturnType<typeof useDividendPatterns>['statistics'];
}) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Dividends (FY)',
      value: formatCurrency(overview.totalDividends),
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Franking Credits',
      value: formatCurrency(overview.totalFrankingCredits),
      icon: Receipt,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Dividend Holdings',
      value: overview.dividendPayingHoldings.toString(),
      subtext: patternStats ? `${patternStats.totalHoldings} with patterns` : undefined,
      icon: Building2,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'YoY Growth',
      value: `${overview.yearOverYearGrowth > 0 ? '+' : ''}${overview.yearOverYearGrowth.toFixed(1)}%`,
      subtext: overview.previousYearDividends > 0 
        ? `vs ${formatCurrency(overview.previousYearDividends)} last year`
        : 'No previous data',
      icon: overview.yearOverYearGrowth >= 0 ? ArrowUpRight : ArrowDownRight,
      color: overview.yearOverYearGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: overview.yearOverYearGrowth >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.subtext}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// PATTERN STATS COMPONENT
// ============================================================================

function PatternStats({ 
  statistics, 
  isLoading 
}: { 
  statistics: ReturnType<typeof useDividendPatterns>['statistics'];
  isLoading: boolean;
}) {
  if (isLoading || !statistics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-6 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Patterns',
      value: statistics.totalHoldings,
      icon: Brain,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Avg Confidence',
      value: `${statistics.averageConfidence}%`,
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Upcoming (90d)',
      value: statistics.upcomingPaymentsCount,
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'High Confidence',
      value: statistics.byConfidence.high,
      icon: Sparkles,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// UPCOMING DIVIDENDS COMPONENT
// ============================================================================

function UpcomingDividends({ 
  dividends, 
  isLoading,
  expectedDividends,
}: { 
  dividends: ReturnType<typeof useDividendTracker>['upcomingDividends'];
  isLoading: boolean;
  expectedDividends: ReturnType<typeof useExpectedDividends>['expectedDividends'];
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Merge expected dividends with pattern-based predictions
  const allUpcoming = [...dividends];
  
  // Add expected dividends from patterns if not already included
  for (const expected of expectedDividends.slice(0, 3)) {
    const exists = allUpcoming.find(d => d.companyId === expected.id);
    if (!exists) {
      allUpcoming.push({
        companyId: expected.id,
        companyName: expected.companyName,
        asxCode: expected.asxCode,
        estimatedPaymentDate: expected.estimatedPaymentDate,
        estimatedAmount: expected.estimatedAmount,
        estimatedFrankingCredits: expected.estimatedFrankingCredits,
        estimatedFrankingPercentage: expected.estimatedFrankingPercentage,
        confidence: expected.confidence,
        basedOn: expected.basedOn,
      });
    }
  }

  // Sort by date
  allUpcoming.sort((a, b) => 
    new Date(a.estimatedPaymentDate).getTime() - new Date(b.estimatedPaymentDate).getTime()
  );

  if (allUpcoming.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No upcoming dividends expected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run pattern detection to see predictions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {allUpcoming.slice(0, 5).map((dividend) => {
        const daysUntil = Math.ceil(
          (new Date(dividend.estimatedPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return (
          <Card key={dividend.companyId} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {dividend.asxCode ? (
                      <span className="text-sm font-bold text-primary">{dividend.asxCode}</span>
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{dividend.companyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(dividend.estimatedPaymentDate).toLocaleDateString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' • '}
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">~{formatCurrency(dividend.estimatedAmount)}</p>
                  <Badge 
                    variant="outline" 
                    className="text-[10px] h-5"
                  >
                    {dividend.confidence} confidence
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// ANNUAL SUMMARY COMPONENT
// ============================================================================

function AnnualSummary({ 
  summary, 
  taxSummary,
  isLoading,
  onExport,
}: { 
  summary: ReturnType<typeof useDividendTracker>['annualSummary'];
  taxSummary: ReturnType<typeof useDividendTracker>['taxSummary'];
  isLoading: boolean;
  onExport: () => void;
}) {
  if (isLoading || !summary || !taxSummary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasPreviousYear = summary.previousYear && summary.previousYear.totalDividends > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Summary - FY {summary.financialYear}
          </CardTitle>
          <CardDescription>
            Dividend income and franking credit tax implications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Dividends</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalDividends)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Franking Credits</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(summary.totalFrankingCredits)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grossed-Up Amount</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(summary.totalGrossedUpDividends)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Companies</p>
              <p className="text-xl font-bold">{summary.companyCount}</p>
            </div>
          </div>

          <Separator />

          {/* Tax Impact at Different Rates */}
          <div>
            <h4 className="text-sm font-medium mb-3">Tax Impact at Different Marginal Rates</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {taxSummary.taxImpactAtRates.map((rate) => (
                <Card key={rate.rate} className="bg-muted/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{(rate.rate * 100).toFixed(0)}% Rate</p>
                    <p className={`text-sm font-semibold ${rate.netTaxPosition < 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {rate.netTaxPosition < 0 ? 'Refund' : 'Payable'}
                    </p>
                    <p className="text-xs">
                      {formatCurrency(Math.abs(rate.netTaxPosition))}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Year-over-Year */}
          {hasPreviousYear && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Year-over-Year Change</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      {summary.previousYear!.growthRate > 0 ? '+' : ''}
                      {summary.previousYear!.growthRate.toFixed(1)}%
                    </p>
                    <Badge variant={summary.previousYear!.growthRate >= 0 ? 'default' : 'destructive'}>
                      {summary.previousYear!.growthRate >= 0 ? 'Growth' : 'Decline'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Previous Year (FY {summary.previousYear!.financialYear})</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.previousYear!.totalDividends)}</p>
                </div>
              </div>
            </>
          )}

          {/* Export Button */}
          <Button onClick={onExport} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Export Annual Summary for Tax Filing
          </Button>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {summary.monthlyBreakdown.map((month) => (
              <Card key={month.month} className={`${month.totalDividends > 0 ? 'bg-primary/5' : ''}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{month.monthName}</p>
                  <p className={`text-sm font-semibold ${month.totalDividends > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {formatCurrency(month.totalDividends)}
                  </p>
                  {month.payments.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {month.payments.length} payment{month.payments.length > 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPANY PATTERN DETAIL DIALOG
// ============================================================================

function CompanyPatternDialog({
  pattern,
  isOpen,
  onClose,
}: {
  pattern: DividendPattern | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getDividendPaymentHistory>>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pattern && isOpen) {
      setIsLoading(true);
      getDividendPaymentHistory(pattern.id)
        .then(setPayments)
        .finally(() => setIsLoading(false));
    }
  }, [pattern, isOpen]);

  if (!pattern) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Pattern Analysis: {pattern.companyName}
          </DialogTitle>
          <DialogDescription>
            Detailed payment pattern and history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <PaymentPatternSummary pattern={pattern} />
          
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : payments.length > 0 ? (
            <PatternHistoryChart 
              pattern={pattern} 
              payments={payments.map(p => ({
                id: p.id,
                companyName: p.companyName,
                asxCode: p.asxCode,
                dividendAmount: p.dividendAmount,
                frankingPercentage: p.frankingPercentage,
                dateReceived: p.dateReceived,
                taxYear: p.taxYear,
              }))}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No payment history available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ACTIVE ALERTS WIDGET (TAL-142 Integration)
// ============================================================================

function ActiveAlertsWidget() {
  const { summary, isLoading, refresh } = useAlertDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalActive === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Dividend Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="text-muted-foreground">No active alerts</p>
          <p className="text-sm text-muted-foreground mt-1">
            All dividend payments on track
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/dividend-alerts">View Alert Center</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Active Alerts
            {summary.totalActive > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                {summary.totalActive}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dividend-alerts">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AlertListCompact 
          alerts={summary.recentAlerts} 
          maxItems={3}
        />
        {(summary.criticalCount > 0 || summary.warningCount > 0) && (
          <div className="flex gap-2 mt-4">
            {summary.criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {summary.criticalCount} Critical
              </Badge>
            )}
            {summary.warningCount > 0 && (
              <Badge variant="default" className="text-xs bg-amber-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {summary.warningCount} Warning
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export const Route = createFileRoute('/dividends')({
  component: DividendTrackerPage,
});

function DividendTrackerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showCompanyDetail, setShowCompanyDetail] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<DividendPattern | null>(null);
  const [showPatternDialog, setShowPatternDialog] = useState(false);

  const {
    overview,
    companies,
    chartData,
    annualSummary,
    upcomingDividends,
    taxSummary,
    financialYear,
    availableYears,
    selectedCompanyId,
    isLoading,
    isExporting,
    setFinancialYear,
    setSelectedCompanyId,
    refreshData,
    exportToCSV,
    exportAnnualTaxSummary,
    getCompanyById,
  } = useDividendTracker({ autoLoad: true });

  const {
    patterns,
    statistics: patternStats,
    isLoading: patternsLoading,
    syncFromEntries,
  } = useDividendPatterns({ autoLoad: true });

  const {
    expectedDividends,
    isLoading: expectedLoading,
  } = useExpectedDividends({ autoLoad: true });

  const selectedCompany = selectedCompanyId ? getCompanyById(selectedCompanyId) : null;

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setShowCompanyDetail(true);
  };

  const handleBackToCompanies = () => {
    setShowCompanyDetail(false);
    setSelectedCompanyId(null);
  };

  const handlePatternSelect = useCallback((pattern: DividendPattern) => {
    setSelectedPattern(pattern);
    setShowPatternDialog(true);
  }, []);

  const handleExportCSV = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividends-${financialYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleExportTaxSummary = () => {
    const summary = exportAnnualTaxSummary();
    const blob = new Blob([summary], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividend-tax-summary-${financialYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tax summary exported successfully');
  };

  const handleSyncPatterns = useCallback(async () => {
    await syncFromEntries();
    await refreshData();
  }, [syncFromEntries, refreshData]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Landmark className="h-8 w-8" />
            Dividend Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze your dividend income across all holdings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncPatterns} disabled={isLoading}>
            <Brain className="h-4 w-4 mr-2" />
            Sync Patterns
          </Button>
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Financial Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length === 0 && (
                <SelectItem value={getFinancialYear()}>FY {getFinancialYear()}</SelectItem>
              )}
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  FY {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <OverviewStats 
        overview={overview} 
        isLoading={isLoading}
        patternStats={patternStats}
      />

      {/* Pattern Stats (only show if patterns exist) */}
      {patternStats && patternStats.totalHoldings > 0 && (
        <PatternStats statistics={patternStats} isLoading={patternsLoading} />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Companies</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dividend Overview
                  </CardTitle>
                  <CardDescription>
                    Your dividend income at a glance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DividendCharts chartData={chartData} isLoading={isLoading} />
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              {/* Active Alerts Widget */}
              <ActiveAlertsWidget />
              
              {/* Expected Payments - New Component */}
              <ExpectedPayments
                expectedDividends={expectedDividends}
                patterns={patterns}
                isLoading={isLoading || expectedLoading}
                onRefresh={refreshData}
                onViewPattern={handlePatternSelect}
                maxItems={5}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dividend-Paying Companies
                </CardTitle>
                <CardDescription>
                  {companies.length} companies in your portfolio
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showCompanyDetail && selectedCompany ? (
                <CompanyDetail
                  company={selectedCompany}
                  payments={[]} // Would need to be populated from filtered payments
                  onBack={handleBackToCompanies}
                />
              ) : (
                <CompanyList
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={handleCompanySelect}
                  isLoading={isLoading}
                  searchQuery={searchQuery}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <PatternDetectionPanel 
            onPatternSelect={handlePatternSelect}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <DividendHistoryChart
            payments={allPayments}
            companies={companies}
            isLoading={isLoading}
            onExport={handleExportCSV}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <DividendCharts chartData={chartData} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <AnnualSummary
            summary={annualSummary}
            taxSummary={taxSummary}
            isLoading={isLoading}
            onExport={handleExportTaxSummary}
          />
        </TabsContent>
      </Tabs>

      {/* Pattern Detail Dialog */}
      <CompanyPatternDialog
        pattern={selectedPattern}
        isOpen={showPatternDialog}
        onClose={() => setShowPatternDialog(false)}
      />
    </div>
  );
}

export default DividendTrackerPage;
