/**
 * Company Detail Component
 * 
 * Displays detailed information about a dividend-paying company:
 * - Dividend history table
 * - Payment pattern visualization
 * - Franking credit breakdown
 * - Annual totals by financial year
 * - Next expected payment estimate
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  TrendingUp, 
  Calendar, 
  Clock,
  ArrowLeft,
  Receipt,
  BarChart3,
  History,
  PieChart as PieChartIcon,
  DollarSign
} from 'lucide-react';
import type { CompanyDividendSummary, DividendPayment } from '@/lib/dividend-tracker';
import { formatCurrency, getFrequencyLabel } from '@/lib/dividend-tracker';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============================================================================
// DIVIDEND HISTORY TABLE
// ============================================================================

interface DividendHistoryTableProps {
  payments: DividendPayment[];
}

function DividendHistoryTable({ payments }: DividendHistoryTableProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No dividend payments recorded</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Financial Year</TableHead>
            <TableHead className="text-right">Dividend</TableHead>
            <TableHead className="text-right">Franking %</TableHead>
            <TableHead className="text-right">Franking Credits</TableHead>
            <TableHead className="text-right">Grossed-Up</TableHead>
            {payments.some(p => p.sharesHeld > 0) && (
              <TableHead className="text-right">Shares</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {new Date(payment.dateReceived).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  FY {payment.taxYear}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payment.dividendAmount)}
              </TableCell>
              <TableCell className="text-right">
                {payment.frankingPercentage}%
              </TableCell>
              <TableCell className="text-right text-green-600 dark:text-green-400">
                {formatCurrency(payment.frankingCredit)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(payment.grossedUpDividend)}
              </TableCell>
              {payments.some(p => p.sharesHeld > 0) && (
                <TableCell className="text-right text-muted-foreground">
                  {payment.sharesHeld > 0 ? payment.sharesHeld.toLocaleString() : '-'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

// ============================================================================
// PAYMENT PATTERN CHART
// ============================================================================

interface PaymentPatternChartProps {
  payments: DividendPayment[];
}

function PaymentPatternChart({ payments }: PaymentPatternChartProps) {
  const chartData = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(a.dateReceived).getTime() - new Date(b.dateReceived).getTime())
      .map(p => ({
        date: new Date(p.dateReceived).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
        amount: p.dividendAmount,
        frankingCredits: p.frankingCredit,
      }));
  }, [payments]);

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No payment data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload) return null;
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg">
                {payload.map((entry: any) => (
                  <p key={entry.dataKey} className="text-sm">
                    <span 
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name}: {formatCurrency(entry.value)}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Bar dataKey="amount" name="Dividend" fill="#D0BCFF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// FRANKING BREAKDOWN CHART
// ============================================================================

interface FrankingBreakdownProps {
  company: CompanyDividendSummary;
}

function FrankingBreakdown({ company }: FrankingBreakdownProps) {
  const chartData = [
    { name: 'Franked', value: company.totalFrankedAmount, color: '#D0BCFF' },
    { name: 'Unfranked', value: company.totalUnfrankedAmount, color: '#CCC2DC' },
  ];

  const total = company.totalDividends;
  const frankingPercentage = total > 0 ? (company.totalFrankedAmount / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Franked
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(company.totalFrankedAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {frankingPercentage.toFixed(1)}% of dividends
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Receipt className="h-4 w-4" />
              Franking Credits
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(company.totalFrankingCredits)}
            </p>
            <p className="text-xs text-muted-foreground">
              Tax offset value
            </p>
          </CardContent>
        </Card>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm">{formatCurrency(data.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        {((data.value / total) * 100).toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">{item.name}</span>
            <span className="text-sm text-muted-foreground">
              ({formatCurrency(item.value)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ANNUAL TOTALS TABLE
// ============================================================================

interface AnnualTotalsProps {
  payments: DividendPayment[];
}

function AnnualTotals({ payments }: AnnualTotalsProps) {
  const annualData = useMemo(() => {
    const byYear = new Map<string, { 
      totalDividends: number; 
      totalFrankingCredits: number;
      paymentCount: number;
    }>();

    for (const payment of payments) {
      const fy = payment.taxYear;
      const existing = byYear.get(fy);
      if (existing) {
        existing.totalDividends += payment.dividendAmount;
        existing.totalFrankingCredits += payment.frankingCredit;
        existing.paymentCount += 1;
      } else {
        byYear.set(fy, {
          totalDividends: payment.dividendAmount,
          totalFrankingCredits: payment.frankingCredit,
          paymentCount: 1,
        });
      }
    }

    return Array.from(byYear.entries())
      .map(([financialYear, data]) => ({
        financialYear,
        ...data,
      }))
      .sort((a, b) => a.financialYear.localeCompare(b.financialYear));
  }, [payments]);

  if (annualData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No annual data available</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Financial Year</TableHead>
          <TableHead className="text-right">Payments</TableHead>
          <TableHead className="text-right">Total Dividends</TableHead>
          <TableHead className="text-right">Franking Credits</TableHead>
          <TableHead className="text-right">Grossed-Up</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {annualData.map((year) => (
          <TableRow key={year.financialYear}>
            <TableCell>
              <Badge variant="outline">FY {year.financialYear}</Badge>
            </TableCell>
            <TableCell className="text-right">{year.paymentCount}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(year.totalDividends)}
            </TableCell>
            <TableCell className="text-right text-green-600 dark:text-green-400">
              {formatCurrency(year.totalFrankingCredits)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(year.totalDividends + year.totalFrankingCredits)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================================
// UPCOMING PAYMENT ESTIMATE
// ============================================================================

interface UpcomingPaymentProps {
  company: CompanyDividendSummary;
}

function UpcomingPayment({ company }: UpcomingPaymentProps) {
  if (!company.nextExpectedPayment) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Not enough data to estimate next payment</p>
        <p className="text-sm mt-1">
          Add more dividend payments to see predictions
        </p>
      </div>
    );
  }

  const { estimatedDate, estimatedAmount, confidence } = company.nextExpectedPayment;
  const daysUntil = Math.ceil((new Date(estimatedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-medium">Next Expected Payment</span>
            </div>
            <Badge 
              variant={confidence === 'high' ? 'default' : 'outline'}
              className={confidence === 'high' ? 'bg-green-500' : ''}
            >
              {confidence} confidence
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Date</p>
              <p className="text-xl font-bold">
                {new Date(estimatedDate).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {daysUntil > 0 
                  ? `${daysUntil} days from now`
                  : daysUntil === 0 
                    ? 'Today'
                    : `${Math.abs(daysUntil)} days ago`
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Estimated Amount</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(estimatedAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on {getFrequencyLabel(company.paymentFrequency).toLowerCase()} pattern
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Payment Pattern: {company.paymentPattern}
        </p>
        <p className="flex items-center gap-2 mt-2">
          <Calendar className="h-4 w-4" />
          Last Payment: {new Date(company.lastPaymentDate).toLocaleDateString('en-AU')}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CompanyDetailProps {
  company: CompanyDividendSummary;
  payments: DividendPayment[];
  onBack?: () => void;
}

export function CompanyDetail({ company, payments, onBack }: CompanyDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {company.asxCode ? (
              <span className="text-lg font-bold text-primary">{company.asxCode}</span>
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div>
            <h2 className="text-2xl font-bold">{company.companyName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {company.paymentPattern}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {company.dividendCount} payments since {new Date(company.firstPaymentDate).getFullYear()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Dividends</p>
            <p className="text-xl font-bold">{formatCurrency(company.totalDividends)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Franking Credits</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(company.totalFrankingCredits)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Average Payment</p>
            <p className="text-xl font-bold">{formatCurrency(company.averageDividend)}</p>
          </CardContent>
        </Card>
        
        {company.currentSharesHeld > 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Shares Held</p>
              <p className="text-xl font-bold">{company.currentSharesHeld.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto">
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="pattern" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Pattern
          </TabsTrigger>
          <TabsTrigger value="franking" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            Franking
          </TabsTrigger>
          <TabsTrigger value="annual" className="gap-2">
            <Calendar className="h-4 w-4" />
            Annual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Dividend History
              </CardTitle>
              <CardDescription>
                Complete history of all dividend payments from {company.companyName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DividendHistoryTable payments={payments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pattern" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Payment Pattern
              </CardTitle>
              <CardDescription>
                Visualization of dividend payment amounts over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentPatternChart payments={payments} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingPayment company={company} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="franking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Franking Credit Breakdown
              </CardTitle>
              <CardDescription>
                Analysis of franked vs unfranked dividends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FrankingBreakdown company={company} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Annual Totals
              </CardTitle>
              <CardDescription>
                Dividend totals grouped by financial year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnnualTotals payments={payments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CompanyDetail;
