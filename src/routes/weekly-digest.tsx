/**
 * WeeklyDigestPage Component
 * 
 * Full-page view of the weekly optimization digest with detailed sections:
 * - Summary dashboard
 * - Spending patterns with charts
 * - Optimization opportunities
 * - Dividend updates
 * - Upcoming deadlines
 * 
 * Route: /weekly-digest
 */

import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown,
  Minus,
  Calendar, 
  Lightbulb, 
  RefreshCw,
  Receipt,
  DollarSign,
  Clock,
  Target,
  PieChart,
  FileText,
  TrendingUpIcon,
  AlertCircle,
  CheckCircle2,
  Download,
  Share2,
  ChevronRight
} from 'lucide-react';
import { useWeeklyDigest, useDigestHistory, type WeeklyDigest } from '@/hooks/useWeeklyDigest';
import { format, differenceInDays } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  color = 'primary'
}: { 
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${
                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                 trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                 <Minus className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpendingPatternChart({ patterns }: { patterns: WeeklyDigest['spendingPatterns'] }) {
  const data = patterns.map(p => ({
    name: p.category.length > 12 ? p.category.slice(0, 12) + '...' : p.category,
    amount: p.amount,
    trend: p.trend
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
          <XAxis type="number" tickFormatter={(v) => `$${v}`} />
          <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
            contentStyle={{ borderRadius: 8 }}
          />
          <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryPieChart({ patterns }: { patterns: WeeklyDigest['spendingPatterns'] }) {
  const data = patterns.slice(0, 5).map((p, i) => ({
    name: p.category,
    value: p.amount,
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({ 
  opportunity 
}: { 
  opportunity: WeeklyDigest['optimizationHighlights'][0] 
}) {
  const priorityConfig = {
    critical: { color: 'destructive', bg: 'bg-red-50 dark:bg-red-950/20', icon: AlertCircle },
    high: { color: 'default', bg: 'bg-orange-50 dark:bg-orange-950/20', icon: AlertCircle },
    medium: { color: 'secondary', bg: 'bg-blue-50 dark:bg-blue-950/20', icon: Lightbulb },
    low: { color: 'outline', bg: 'bg-gray-50 dark:bg-gray-900/20', icon: Lightbulb }
  };

  const config = priorityConfig[opportunity.priority];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} border-opacity-20`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-medium">{opportunity.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{opportunity.description}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge variant={config.color as any}>
            ${opportunity.potentialSavings.toFixed(0)}
          </Badge>
          {opportunity.actionRequired && (
            <p className="text-xs text-amber-600 mt-1">Action needed</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineCard({ deadline }: { deadline: WeeklyDigest['upcomingDeadlines'][0] }) {
  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${
      deadline.isUrgent ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900' : 'bg-muted/30'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${deadline.isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-muted'}`}>
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium">{deadline.title}</p>
          <p className="text-xs text-muted-foreground">{format(deadline.date, 'EEEE, MMMM d')}</p>
        </div>
      </div>
      <Badge variant={deadline.isUrgent ? 'destructive' : 'outline'}>
        {deadline.daysUntil === 0 ? 'Today' : deadline.daysUntil === 1 ? 'Tomorrow' : `${deadline.daysUntil} days`}
      </Badge>
    </div>
  );
}

function DigestContent({ digest }: { digest: WeeklyDigest }) {
  const { summary, spendingPatterns, optimizationHighlights, upcomingDeadlines, insights, dividendUpdates } = digest;

  const handleExport = () => {
    const report = JSON.stringify(digest, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-digest-${format(digest.weekStarting, 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Optimization Digest</h1>
          <p className="text-muted-foreground">
            Week of {format(digest.weekStarting, 'MMMM d')} - {format(digest.weekEnding, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receipts This Week"
          value={summary.receiptCount.toString()}
          subtitle="Total processed"
          icon={Receipt}
          color="primary"
        />
        <StatCard
          title="Total Spending"
          value={`$${summary.totalSpending.toFixed(0)}`}
          subtitle="This week"
          icon={DollarSign}
          color="warning"
        />
        <StatCard
          title="Total Deductions"
          value={`$${summary.totalDeductions.toFixed(0)}`}
          subtitle="Year to date"
          icon={FileText}
          color="success"
        />
        <StatCard
          title="Potential Savings"
          value={`$${summary.potentialTaxSavings.toFixed(0)}`}
          subtitle="From opportunities"
          icon={Target}
          trend="up"
          trendValue={`${summary.optimizationOpportunities} opportunities`}
          color="success"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                This Week&apos;s Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.length > 0 ? (
                  insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No insights for this week yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Opportunities Preview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUpIcon className="h-5 w-5 text-primary" />
                    Top Opportunities
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-8" asChild>
                    <Link to="/optimization">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {optimizationHighlights.length > 0 ? (
                  <div className="space-y-3">
                    {optimizationHighlights.slice(0, 3).map(opp => (
                      <div key={opp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            opp.priority === 'critical' ? 'bg-red-500' :
                            opp.priority === 'high' ? 'bg-orange-500' :
                            opp.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm font-medium">{opp.title}</span>
                        </div>
                        <Badge variant="secondary">${opp.potentialSavings.toFixed(0)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No optimization opportunities found.</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines Preview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    Upcoming Deadlines
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-8" asChild>
                    <Link to="/tax-calendar">View Calendar</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingDeadlines.slice(0, 3).map(deadline => (
                      <DeadlineCard key={deadline.id} deadline={deadline} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No upcoming deadlines.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Spending Tab */}
        <TabsContent value="spending" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Top spending categories this week</CardDescription>
              </CardHeader>
              <CardContent>
                {spendingPatterns.length > 0 ? (
                  <SpendingPatternChart patterns={spendingPatterns} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">No spending data for this week.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Distribution of spending</CardDescription>
              </CardHeader>
              <CardContent>
                {spendingPatterns.length > 0 ? (
                  <CategoryPieChart patterns={spendingPatterns} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">No spending data for this week.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Spending Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {spendingPatterns.length > 0 ? (
                <div className="divide-y">
                  {spendingPatterns.map((pattern, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-8 text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium">{pattern.category}</span>
                        <Badge variant="outline" className="text-xs">
                          {pattern.receiptCount} receipts
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        {pattern.changeFromLastWeek !== 0 && (
                          <span className={`text-sm flex items-center gap-1 ${
                            pattern.trend === 'up' ? 'text-red-500' : 
                            pattern.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground'
                          }`}>
                            {pattern.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                             pattern.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                             <Minus className="h-3 w-3" />}
                            {Math.abs(pattern.changeFromLastWeek).toFixed(0)}%
                          </span>
                        )}
                        <span className="font-semibold w-20 text-right">${pattern.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No spending data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Tax Optimization Opportunities
              </CardTitle>
              <CardDescription>
                Opportunities to maximize your tax savings this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizationHighlights.length > 0 ? (
                <div className="space-y-3">
                  {optimizationHighlights.map(opp => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-lg font-medium">All caught up!</h3>
                  <p className="text-muted-foreground">No optimization opportunities found at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dividend Updates */}
          {dividendUpdates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-emerald-500" />
                  Dividend Updates
                </CardTitle>
                <CardDescription>Expected payments and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dividendUpdates.map((div, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                          <DollarSign className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">{div.company}</p>
                          <p className="text-xs text-muted-foreground">{div.pattern} dividend</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${div.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(div.paymentDate, 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Tax Deadlines
              </CardTitle>
              <CardDescription>
                Important dates to keep in mind
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-3">
                  {upcomingDeadlines.map(deadline => (
                    <DeadlineCard key={deadline.id} deadline={deadline} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No upcoming deadlines</h3>
                  <p className="text-muted-foreground">You&apos;re all set for now!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function WeeklyDigestPage() {
  const { digest, isLoading, error, refresh } = useWeeklyDigest();
  const { history } = useDigestHistory();

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !digest) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-semibold mb-2">Failed to Load Digest</h1>
          <p className="text-muted-foreground mb-4">{error || 'Unable to generate weekly digest'}</p>
          <Button onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4">
      {/* Back Navigation */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <DigestContent digest={digest} />
    </div>
  );
}

export const Route = createFileRoute("/weekly-digest")({
  component: WeeklyDigestPage,
});
