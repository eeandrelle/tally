import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { TrendingUp, AlertCircle, Info, ChevronRight } from 'lucide-react';
import type { TaxBracket } from '@/lib/tax-calculator';
import type { UseTaxCalculatorReturn } from '@/hooks/useTaxCalculator';
import { TAX_BRACKETS } from '@/lib/tax-calculator';

// ============= COMPONENT =============

interface TaxBracketChartProps {
  calculator: UseTaxCalculatorReturn;
}

export function TaxBracketChart({ calculator }: TaxBracketChartProps) {
  const {
    taxableIncome,
    marginalRate,
    bracketData,
    remainingInBracket,
    formatCurrency,
    formatPercent,
  } = calculator;

  // Prepare data for the bracket bar chart
  const bracketChartData = TAX_BRACKETS.map((bracket, index) => {
    const isCurrentBracket = index === calculator.taxResult.bracketIndex;
    const maxDisplay = bracket.max === Infinity ? Math.max(taxableIncome * 1.2, 250000) : bracket.max;
    const amount = Math.min(taxableIncome, maxDisplay) - bracket.min;
    
    return {
      name: bracket.max === Infinity ? `$${(bracket.min / 1000).toFixed(0)}k+` : `$${(bracket.min / 1000).toFixed(0)}k-$${(bracket.max / 1000).toFixed(0)}k`,
      rate: bracket.rate,
      income: Math.max(0, amount),
      fullRange: maxDisplay - bracket.min,
      isCurrent: isCurrentBracket,
      bracket,
      index,
    };
  });

  // Prepare data for tax breakdown pie chart
  const taxBreakdownData = [
    { name: 'Income Tax', value: calculator.taxResult.taxPayable, color: '#3b82f6' },
    { name: 'Medicare Levy', value: calculator.taxResult.medicareLevy, color: '#22c55e' },
    { name: 'MLS', value: calculator.taxResult.medicareLevySurcharge, color: '#ef4444' },
    { name: 'Net Income', value: Math.max(0, taxableIncome - calculator.taxResult.totalTax), color: '#10b981' },
  ].filter(item => item.value > 0);

  // Custom tooltip for bracket chart
  const BracketTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Rate: {formatPercent(data.rate)}
          </p>
          {data.isCurrent && (
            <p className="text-sm text-primary font-medium mt-1">
              Your current bracket
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-lg font-bold">
            {formatCurrency(data.value as number)}
          </p>
          <p className="text-sm text-muted-foreground">
            {((data.percent as number) || 0).toFixed(1)}% of income
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Current Tax Position Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxable Income</p>
              <p className="text-2xl font-bold">{formatCurrency(taxableIncome)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Marginal Rate</p>
              <p className="text-2xl font-bold text-primary">{formatPercent(marginalRate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Tax</p>
              <p className="text-xl font-semibold">{formatCurrency(calculator.taxResult.totalTax)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(taxableIncome - calculator.taxResult.totalTax)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Bracket Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tax Bracket Visualization
          </CardTitle>
          <CardDescription>
            See how your income is distributed across tax brackets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bracket Progress Bars */}
          <div className="space-y-3">
            {TAX_BRACKETS.map((bracket, index) => {
              const isCurrentBracket = index === calculator.taxResult.bracketIndex;
              const maxDisplay = bracket.max === Infinity ? Math.max(taxableIncome * 1.2, 250000) : bracket.max;
              const incomeInBracket = Math.min(taxableIncome, maxDisplay) - bracket.min;
              const percentage = maxDisplay > bracket.min 
                ? Math.max(0, Math.min(100, (incomeInBracket / (maxDisplay - bracket.min)) * 100))
                : 0;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {bracket.max === Infinity 
                          ? `$${(bracket.min / 1000).toFixed(0)}k+`
                          : `$${(bracket.min / 1000).toFixed(0)}k - $${(bracket.max / 1000).toFixed(0)}k`
                        }
                      </span>
                      <Badge variant={isCurrentBracket ? 'default' : 'secondary'} className="text-xs">
                        {formatPercent(bracket.rate)}
                      </Badge>
                      {isCurrentBracket && (
                        <span className="text-xs text-primary font-medium">← You are here</span>
                      )}
                    </div>
                    {isCurrentBracket && incomeInBracket > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(incomeInBracket)} in this bracket
                      </span>
                    )}
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCurrentBracket ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Bracket Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bracketChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis 
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<BracketTooltip />} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {bracketChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isCurrent ? '#3b82f6' : '#94a3b8'}
                    />
                  ))}
                </Bar>
                <ReferenceLine 
                  y={marginalRate} 
                  stroke="#3b82f6" 
                  strokeDasharray="3 3"
                  label={{ value: 'Your Rate', fill: '#3b82f6', fontSize: 10, position: 'right' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tax Breakdown Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tax Breakdown</CardTitle>
          <CardDescription>
            Where your tax dollars go
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {taxBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Next Bracket Alert */}
      {remainingInBracket.nextBracketRate && (
        <Card className={remainingInBracket.remaining < 10000 ? 'border-yellow-500/50 bg-yellow-50/50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {remainingInBracket.remaining < 10000 ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <Info className="h-5 w-5 text-primary" />
              )}
              Next Tax Bracket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Room in current bracket</p>
                <p className="text-xl font-semibold">
                  {remainingInBracket.remaining === Infinity 
                    ? 'Unlimited' 
                    : formatCurrency(remainingInBracket.remaining)
                  }
                </p>
              </div>
              {remainingInBracket.remaining !== Infinity && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next bracket rate</p>
                  <p className="text-xl font-semibold text-primary">
                    {formatPercent(remainingInBracket.nextBracketRate)}
                  </p>
                </div>
              )}
            </div>
            
            {remainingInBracket.remaining !== Infinity && remainingInBracket.remaining < 20000 && (
              <div className="rounded-lg bg-yellow-100/50 p-3 text-sm text-yellow-800">
                <p className="font-medium">Heads up!</p>
                <p>
                  You&apos;re approaching the next tax bracket. Additional income above{' '}
                  {formatCurrency(remainingInBracket.nextBracketMin || 0)} will be taxed at{' '}
                  {formatPercent(remainingInBracket.nextBracketRate)} instead of {formatPercent(marginalRate)}.
                </p>
              </div>
            )}

            {/* Deduction Impact */}
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-sm">How deductions help</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">$1,000 deduction saves</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(1000 * marginalRate)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">$5,000 deduction saves</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(5000 * marginalRate)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
