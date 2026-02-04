import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  ArrowRight, 
  Download,
  Sparkles,
  Wallet,
  Receipt
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { UseTaxCalculatorReturn } from '@/hooks/useTaxCalculator';

// ============= COMPONENT =============

interface SavingsDisplayProps {
  calculator: UseTaxCalculatorReturn;
}

export function SavingsDisplay({ calculator }: SavingsDisplayProps) {
  const {
    currentScenario,
    comparison,
    totalDeductions,
    taxResult,
    savedScenarios,
    compareWithBaseline,
    compareTwoScenarios,
    clearComparison,
    calculateImpact,
    getSavingsForDeduction,
    formatCurrency,
    formatPercent,
  } = calculator;

  // Ensure we have a comparison to show
  React.useEffect(() => {
    if (!comparison && totalDeductions > 0) {
      compareWithBaseline();
    }
  }, [totalDeductions, comparison, compareWithBaseline]);

  // Calculate additional deduction impacts
  const deductionImpacts = React.useMemo(() => {
    const amounts = [500, 1000, 2500, 5000, 10000];
    return amounts.map((amount) => ({
      amount,
      impact: calculateImpact(amount),
      savings: getSavingsForDeduction(amount),
    }));
  }, [calculateImpact, getSavingsForDeduction]);

  // Prepare chart data for comparison
  const comparisonChartData = React.useMemo(() => {
    if (!comparison) return [];
    
    return [
      {
        name: 'Taxable Income',
        baseline: comparison.baselineResult.taxableIncome,
        scenario: comparison.scenarioResult.taxableIncome,
      },
      {
        name: 'Tax Payable',
        baseline: comparison.baselineResult.taxPayable,
        scenario: comparison.scenarioResult.taxPayable,
      },
      {
        name: 'Medicare Levy',
        baseline: comparison.baselineResult.medicareLevy,
        scenario: comparison.scenarioResult.medicareLevy,
      },
      {
        name: 'Total Tax',
        baseline: comparison.baselineResult.totalTax,
        scenario: comparison.scenarioResult.totalTax,
      },
    ];
  }, [comparison]);

  // Prepare savings breakdown data
  const savingsBreakdownData = React.useMemo(() => {
    if (!comparison) return [];
    
    return [
      {
        name: 'Federal Tax',
        value: comparison.savingsBreakdown.federalTaxSavings,
        color: '#3b82f6',
      },
      {
        name: 'Medicare',
        value: comparison.savingsBreakdown.medicareLevySavings,
        color: '#22c55e',
      },
      {
        name: 'MLS',
        value: comparison.savingsBreakdown.mlsSavings,
        color: '#f59e0b',
      },
    ].filter((item) => item.value > 0);
  }, [comparison]);

  // Custom tooltip for charts
  const ComparisonTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value as number)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const SavingsTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold" style={{ color: data.color }}>
            {data.name}
          </p>
          <p className="text-lg font-bold">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle CSV export
  const handleExport = () => {
    const csv = calculator.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-savings-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Total Savings Card */}
      {comparison && (
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-green-500/20">
                  <PiggyBank className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tax Savings</p>
                  <p className="text-3xl font-bold text-green-700">
                    {formatCurrency(comparison.savingsBreakdown.totalSavings)}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-white/50 p-3">
                <p className="text-xs text-muted-foreground">Federal Tax</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(comparison.savingsBreakdown.federalTaxSavings)}
                </p>
              </div>
              <div className="rounded-lg bg-white/50 p-3">
                <p className="text-xs text-muted-foreground">Medicare Levy</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(comparison.savingsBreakdown.medicareLevySavings)}
                </p>
              </div>
              <div className="rounded-lg bg-white/50 p-3">
                <p className="text-xs text-muted-foreground">MLS Savings</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(comparison.savingsBreakdown.mlsSavings)}
                </p>
              </div>
              <div className="rounded-lg bg-white/50 p-3">
                <p className="text-xs text-muted-foreground">Est. Refund</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(comparison.savingsBreakdown.refundEstimate)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>
                Effective deduction rate: {formatPercent(comparison.savingsBreakdown.effectiveDeductionRate)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deduction Impact Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Additional Deduction Impact
          </CardTitle>
          <CardDescription>
            See how much more you could save with additional deductions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deductionImpacts.map(({ amount, savings }) => (
              <div
                key={amount}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{formatCurrency(amount)} deduction</p>
                    <p className="text-xs text-muted-foreground">
                      Would reduce taxable income to {formatCurrency(currentScenario.taxableIncome - totalDeductions - amount)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">
                    Save {formatCurrency(savings.totalSavings)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(savings.effectiveDeductionRate)} effective rate
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      {comparison && comparisonChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Before vs After Comparison</CardTitle>
            <CardDescription>
              Compare your tax position with and without deductions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<ComparisonTooltip />} />
                  <Bar dataKey="baseline" name="Before Deductions" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scenario" name="After Deductions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings Breakdown Chart */}
      {comparison && savingsBreakdownData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Savings Breakdown</CardTitle>
            <CardDescription>
              Where your tax savings come from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={savingsBreakdownData} 
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={70}
                  />
                  <Tooltip content={<SavingsTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {savingsBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Scenarios Comparison */}
      {savedScenarios.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Compare Saved Scenarios
            </CardTitle>
            <CardDescription>
              Compare different deduction scenarios side by side
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedScenarios.slice(0, 3).map((scenario) => {
                const scenarioDeductions = scenario.deductions
                  .filter((d) => d.method === 'immediate')
                  .reduce((sum, d) => sum + d.amount, 0);
                const scenarioTaxableIncome = Math.max(0, scenario.taxableIncome - scenarioDeductions);

                return (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{scenario.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(scenarioDeductions)} in deductions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(scenarioTaxableIncome)}</p>
                      <p className="text-xs text-muted-foreground">Taxable income</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
