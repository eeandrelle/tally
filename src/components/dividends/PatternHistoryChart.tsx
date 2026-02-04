/**
 * PatternHistoryChart Component
 * 
 * Displays dividend payment history and detected patterns
 * Shows timeline of payments with pattern analysis overlay
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DividendPattern, DividendPaymentRecord } from '@/lib/dividend-patterns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Clock,
  DollarSign,
  BarChart3,
} from 'lucide-react';

interface PatternHistoryChartProps {
  pattern: DividendPattern;
  payments: DividendPaymentRecord[];
  className?: string;
}

export function PatternHistoryChart({ pattern, payments, className }: PatternHistoryChartProps) {
  // Sort and process payment data
  const chartData = useMemo(() => {
    const sorted = [...payments].sort((a, b) => 
      new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime()
    );

    return sorted.map((payment, index) => {
      const date = new Date(payment.dateReceived);
      const prevDate = index > 0 ? new Date(sorted[index - 1].dateReceived) : null;
      const interval = prevDate 
        ? Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        date: payment.dateReceived,
        dateObj: date,
        amount: payment.dividendAmount,
        month: date.toISOString().slice(0, 7),
        monthName: date.toLocaleString('en-AU', { month: 'short', year: '2-digit' }),
        year: date.getFullYear(),
        interval,
      };
    });
  }, [payments]);

  // Calculate trend data
  const trendData = useMemo(() => {
    if (chartData.length < 2) return [];
    
    const data = [...chartData];
    const movingAvg: { index: number; value: number }[] = [];
    
    // 3-point moving average
    for (let i = 1; i < data.length - 1; i++) {
      const avg = (data[i - 1].amount + data[i].amount + data[i + 1].amount) / 3;
      movingAvg.push({ index: i, value: avg });
    }
    
    return movingAvg;
  }, [chartData]);

  // Interval chart data
  const intervalData = useMemo(() => {
    return chartData
      .filter(d => d.interval !== null)
      .map((d, i) => ({
        index: i,
        interval: d.interval,
        date: d.monthName,
      }));
  }, [chartData]);

  // Average amount reference line
  const averageAmount = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.amount, 0) / chartData.length;
  }, [chartData]);

  // Average interval reference line
  const averageInterval = useMemo(() => {
    const intervals = intervalData.map(d => d.interval).filter((i): i is number => i !== null);
    if (intervals.length === 0) return 0;
    return intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  }, [intervalData]);

  const getTrendIcon = () => {
    switch (pattern.statistics.amountTrend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (pattern.statistics.amountTrend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Average Payment"
          value={`$${pattern.statistics.averageAmount.toFixed(2)}`}
          subtext={`${payments.length} payments`}
        />
        <StatCard
          icon={getTrendIcon()}
          label="Amount Trend"
          value={pattern.statistics.amountTrend.charAt(0).toUpperCase() + pattern.statistics.amountTrend.slice(1)}
          className={getTrendColor()}
        />
        <StatCard
          icon={Clock}
          label="Avg Interval"
          value={`${pattern.statistics.averageInterval} days`}
          subtext={`±${pattern.statistics.intervalStdDev.toFixed(0)} days`}
        />
        <StatCard
          icon={BarChart3}
          label="Seasonal Consistency"
          value={`${Math.round(pattern.statistics.seasonalConsistency * 100)}%`}
          subtext={pattern.statistics.coefficientOfVariation < 0.2 ? 'Very consistent' : 'Variable'}
        />
      </div>

      {/* Payment Amount Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Payment History
          </CardTitle>
          <CardDescription>
            Dividend payments over time with average
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="monthName" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                  labelFormatter={(label) => label}
                />
                <ReferenceLine 
                  y={averageAmount} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="3 3"
                  label={{ value: 'Avg', position: 'right', fontSize: 11 }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.amount > averageAmount ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                    />
                  ))}
                </Bar>
                {trendData.length > 0 && (
                  <Line
                    type="monotone"
                    data={trendData}
                    dataKey="value"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Interval Chart */}
      {intervalData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Payment Intervals
            </CardTitle>
            <CardDescription>
              Days between consecutive payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intervalData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}d`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value} days`, 'Interval']}
                  />
                  <ReferenceLine 
                    y={averageInterval} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="3 3"
                    label={{ value: 'Avg', position: 'right', fontSize: 11 }}
                  />
                  <Bar dataKey="interval" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              Target interval: {getTargetInterval(pattern.frequency)} days
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Distribution */}
      <MonthlyDistribution pattern={pattern} payments={payments} />
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ElementType | React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}

function StatCard({ icon: Icon, label, value, subtext, className }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {typeof Icon === 'function' ? (
          <Icon className="h-4 w-4 text-muted-foreground" />
        ) : (
          Icon
        )}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn('text-lg font-semibold', className)}>{value}</div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  );
}

interface MonthlyDistributionProps {
  pattern: DividendPattern;
  payments: DividendPaymentRecord[];
}

function MonthlyDistribution({ pattern, payments }: MonthlyDistributionProps) {
  const monthlyData = useMemo(() => {
    const counts = new Map<number, { count: number; total: number }>();
    
    for (let i = 1; i <= 12; i++) {
      counts.set(i, { count: 0, total: 0 });
    }
    
    for (const payment of payments) {
      const month = new Date(payment.dateReceived).getMonth() + 1;
      const current = counts.get(month)!;
      counts.set(month, {
        count: current.count + 1,
        total: current.total + payment.dividendAmount,
      });
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return Array.from(counts.entries()).map(([month, data]) => ({
      month,
      monthName: monthNames[month - 1],
      count: data.count,
      total: data.total,
    }));
  }, [payments]);

  const maxCount = Math.max(...monthlyData.map(d => d.count));
  
  // Highlight seasonal pattern months
  const seasonalMonths = pattern.seasonalPattern?.months || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Monthly Distribution</CardTitle>
        <CardDescription>
          When dividends are typically paid throughout the year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-24">
          {monthlyData.map(({ month, monthName, count }) => {
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isSeasonal = seasonalMonths.includes(month);
            
            return (
              <div
                key={month}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isSeasonal 
                      ? 'bg-primary' 
                      : count > 0 
                        ? 'bg-primary/50' 
                        : 'bg-muted'
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className={cn(
                  'text-[10px]',
                  isSeasonal ? 'font-medium text-primary' : 'text-muted-foreground'
                )}>
                  {monthName}
                </span>
              </div>
            );
          })}
        </div>
        
        {seasonalMonths.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>Recurring payment months</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTargetInterval(frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 91;
    case 'half-yearly':
      return 182;
    case 'yearly':
      return 365;
    default:
      return 0;
  }
}

export default PatternHistoryChart;
