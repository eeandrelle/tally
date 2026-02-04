/**
 * Dividend History Chart Component
 * 
 * Interactive timeline view of all dividend payments
 * - Stacked bar chart showing franked vs unfranked amounts
 * - Filter by company, date range, financial year
 * - Interactive tooltips with payment details
 */

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { 
  CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Filter,
  Download,
  Clock
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { DividendPayment, CompanyDividendSummary } from '@/lib/dividend-tracker';

// ============================================================================
// TYPES
// ============================================================================

interface DividendHistoryChartProps {
  payments: DividendPayment[];
  companies: CompanyDividendSummary[];
  isLoading?: boolean;
  onExport?: () => void;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  franked: number;
  unfranked: number;
  total: number;
  companyName: string;
  asxCode?: string;
  frankingCredits: number;
  dividendPerShare: number;
  sharesHeld: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupPaymentsByDate(payments: DividendPayment[]): ChartDataPoint[] {
  const grouped = new Map<string, DividendPayment[]>();
  
  payments.forEach(payment => {
    const dateKey = payment.dateReceived;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(payment);
  });
  
  // Convert to array and sort by date
  const sortedDates = Array.from(grouped.keys()).sort();
  
  return sortedDates.map(date => {
    const datePayments = grouped.get(date)!;
    const franked = datePayments
      .filter(p => p.frankingPercentage > 0)
      .reduce((sum, p) => sum + p.dividendAmount, 0);
    const unfranked = datePayments
      .filter(p => p.frankingPercentage === 0)
      .reduce((sum, p) => sum + p.dividendAmount, 0);
    
    const mainPayment = datePayments[0];
    
    return {
      date,
      displayDate: format(parseISO(date), 'dd MMM yyyy'),
      franked,
      unfranked,
      total: franked + unfranked,
      companyName: mainPayment.companyName,
      asxCode: mainPayment.asxCode,
      frankingCredits: datePayments.reduce((sum, p) => sum + (p.frankingCredit || 0), 0),
      dividendPerShare: mainPayment.dividendPerShare || 0,
      sharesHeld: mainPayment.sharesHeld || 0,
    };
  });
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

function PaymentTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  
  const data: ChartDataPoint = payload[0].payload;
  const totalFranking = data.frankingCredits;
  const grossedUp = data.total + totalFranking;
  
  return (
    <div className="bg-background border rounded-lg p-4 shadow-lg min-w-[240px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
          {data.asxCode ? (
            <span className="text-xs font-bold text-primary">{data.asxCode}</span>
          ) : (
            <Building2 className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">{data.companyName}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      
      <div className="space-y-2 mt-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Dividend</span>
          <span className="font-medium">{formatCurrency(data.total)}</span>
        </div>
        
        {data.franked > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Franked
            </span>
            <span className="font-medium">{formatCurrency(data.franked)}</span>
          </div>
        )}
        
        {data.unfranked > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              Unfranked
            </span>
            <span className="font-medium">{formatCurrency(data.unfranked)}</span>
          </div>
        )}
        
        {totalFranking > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Franking Credits</span>
            <span className="font-medium text-green-600">+{formatCurrency(totalFranking)}</span>
          </div>
        )}
        
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Grossed-Up</span>
            <span className="font-semibold">{formatCurrency(grossedUp)}</span>
          </div>
        </div>
        
        {data.sharesHeld > 0 && (
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            {data.sharesHeld.toLocaleString()} shares @ {formatCurrency(data.dividendPerShare)}/share
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DividendHistoryChart({ 
  payments, 
  companies, 
  isLoading = false,
  onExport 
}: DividendHistoryChartProps) {
  // Filter states
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
  
  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Company filter
      if (selectedCompany !== 'all' && payment.companyName !== selectedCompany) {
        return false;
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        const paymentDate = parseISO(payment.dateReceived);
        const from = dateRange.from;
        const to = dateRange.to;
        
        if (from && to) {
          if (!isWithinInterval(paymentDate, { start: from, end: to })) {
            return false;
          }
        } else if (from && paymentDate < from) {
          return false;
        } else if (to && paymentDate > to) {
          return false;
        }
      }
      
      return true;
    });
  }, [payments, selectedCompany, dateRange]);
  
  // Generate chart data
  const chartData = useMemo(() => {
    return groupPaymentsByDate(filteredPayments);
  }, [filteredPayments]);
  
  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredPayments.reduce((sum, p) => sum + p.dividendAmount, 0);
    const franked = filteredPayments
      .filter(p => p.frankingPercentage > 0)
      .reduce((sum, p) => sum + p.dividendAmount, 0);
    const unfranked = filteredPayments
      .filter(p => p.frankingPercentage === 0)
      .reduce((sum, p) => sum + p.dividendAmount, 0);
    const frankingCredits = filteredPayments
      .reduce((sum, p) => sum + (p.frankingCredit || 0), 0);
    
    return {
      total,
      franked,
      unfranked,
      frankingCredits,
      count: filteredPayments.length,
      companies: new Set(filteredPayments.map(p => p.companyName)).size,
    };
  }, [filteredPayments]);
  
  // Calculate growth (comparing first half to second half of data)
  const growth = useMemo(() => {
    if (chartData.length < 4) return null;
    
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint).reduce((sum, d) => sum + d.total, 0);
    const secondHalf = chartData.slice(midPoint).reduce((sum, d) => sum + d.total, 0);
    
    if (firstHalf === 0) return null;
    return ((secondHalf - firstHalf) / firstHalf) * 100;
  }, [chartData]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Dividend History Timeline
            </CardTitle>
            <CardDescription>
              {stats.count} payments from {stats.companies} companies
            </CardDescription>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Company Filter */}
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[160px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.companyName}>
                    {company.asxCode || company.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            {/* Export Button */}
            {onExport && (
              <Button variant="outline" size="icon" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg font-semibold">
              {formatCurrency(stats.total)}
            </Badge>
            <span className="text-sm text-muted-foreground">Total Dividends</span>
          </div>
          
          {stats.franked > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary text-primary-foreground">
                {formatCurrency(stats.franked)} Franked
              </Badge>
            </div>
          )}
          
          {stats.unfranked > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {formatCurrency(stats.unfranked)} Unfranked
              </Badge>
            </div>
          )}
          
          {stats.frankingCredits > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 text-white">
                +{formatCurrency(stats.frankingCredits)} Credits
              </Badge>
            </div>
          )}
          
          {growth !== null && (
            <div className="flex items-center gap-2 ml-auto">
              {growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(
                "text-sm font-medium",
                growth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% trend
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No dividend payments found</p>
            <p className="text-sm">Try adjusting your filters or add dividend entries</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<PaymentTooltip />} />
              <Legend />
              
              <Bar 
                dataKey="franked" 
                name="Franked Dividends" 
                stackId="a"
                fill="hsl(var(--primary))"
                radius={[0, 0, 4, 4]}
              />
              <Bar 
                dataKey="unfranked" 
                name="Unfranked Dividends" 
                stackId="a"
                fill="hsl(var(--muted-foreground))"
                radius={[4, 4, 0, 0]}
              />
              
              {/* Average line */}
              <ReferenceLine 
                y={stats.total / chartData.length} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'Avg', 
                  position: 'right',
                  fill: 'hsl(var(--destructive))',
                  fontSize: 12
                }} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default DividendHistoryChart;
