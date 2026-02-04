import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  Scale, 
  Calculator, 
  TrendingUp, 
  Clock, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import type { UseTaxCalculatorReturn } from '@/hooks/useTaxCalculator';

// ============= COMPONENT =============

interface ComparisonViewProps {
  calculator: UseTaxCalculatorReturn;
}

export function ComparisonView({ calculator }: ComparisonViewProps) {
  const {
    methodComparison,
    compareMethods,
    clearMethodComparison,
    currentScenario,
    formatCurrency,
    formatPercent,
  } = calculator;

  // Form state
  const [assetValue, setAssetValue] = useState<number>(5000);
  const [assetName, setAssetName] = useState<string>('');
  const [years, setYears] = useState<number>(5);
  const [hasCompared, setHasCompared] = useState(false);

  // Handle compare
  const handleCompare = () => {
    if (assetValue > 0) {
      compareMethods(assetValue, assetName || 'Asset', years);
      setHasCompared(true);
    }
  };

  // Prepare chart data for year-by-year comparison
  const yearByYearData = React.useMemo(() => {
    if (!methodComparison) return [];

    const data = [];
    let cumulativeImmediate = methodComparison.immediate.taxSavings;
    let cumulativeDepreciation = 0;

    for (let year = 1; year <= years; year++) {
      const yearData = methodComparison.depreciation.schedule.find((s) => s.year === year);
      const yearSavings = yearData?.taxSavings || 0;
      cumulativeDepreciation += yearSavings;

      data.push({
        year: `Year ${year}`,
        immediate: 0, // All in year 1
        depreciation: yearSavings,
        cumulativeImmediate,
        cumulativeDepreciation,
        breakEven: cumulativeDepreciation >= cumulativeImmediate,
      });
    }

    // Add year 1 immediate
    if (data.length > 0) {
      data[0].immediate = methodComparison.immediate.taxSavings;
    }

    return data;
  }, [methodComparison, years]);

  // Custom tooltip
  const TooltipContent = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
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

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-primary" />
            Deduction Method Comparison
          </CardTitle>
          <CardDescription>
            Compare immediate deduction vs depreciation over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Asset Description (Optional)</Label>
              <Input
                id="asset-name"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g., Laptop Computer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-value">Asset Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="asset-value"
                  type="number"
                  min={300}
                  step={100}
                  value={assetValue || ''}
                  onChange={(e) => setAssetValue(Number(e.target.value))}
                  className="pl-7"
                  placeholder="5000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comparison-years">Comparison Period (Years)</Label>
            <Input
              id="comparison-years"
              type="number"
              min={2}
              max={10}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Compare tax savings over {years} years
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCompare} className="flex-1">
              <Calculator className="h-4 w-4 mr-2" />
              Compare Methods
            </Button>
            {methodComparison && (
              <Button variant="outline" onClick={clearMethodComparison}>
                Clear
              </Button>
            )}
          </div>

          {assetValue < 300 && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <p>
                Assets under $300 can be immediately deducted without depreciation. 
                Consider increasing the value to see meaningful comparisons.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {methodComparison && (
        <>
          {/* Recommendation Card */}
          <Card className={`border-2 ${
            methodComparison.recommendation === 'immediate' 
              ? 'border-green-500/50 bg-green-50/30' 
              : methodComparison.recommendation === 'depreciation'
              ? 'border-blue-500/50 bg-blue-50/30'
              : 'border-yellow-500/50 bg-yellow-50/30'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  methodComparison.recommendation === 'immediate' 
                    ? 'bg-green-500/20' 
                    : methodComparison.recommendation === 'depreciation'
                    ? 'bg-blue-500/20'
                    : 'bg-yellow-500/20'
                }`}>
                  <Sparkles className={`h-6 w-6 ${
                    methodComparison.recommendation === 'immediate' 
                      ? 'text-green-600' 
                      : methodComparison.recommendation === 'depreciation'
                      ? 'text-blue-600'
                      : 'text-yellow-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">Recommendation</h3>
                    <Badge variant={
                      methodComparison.recommendation === 'immediate' 
                        ? 'default' 
                        : methodComparison.recommendation === 'depreciation'
                        ? 'secondary'
                        : 'outline'
                    }>
                      {methodComparison.recommendation === 'immediate' && 'Immediate Deduction'}
                      {methodComparison.recommendation === 'depreciation' && 'Depreciation'}
                      {methodComparison.recommendation === 'either' && 'Either Method'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{methodComparison.explanation}</p>
                  
                  {methodComparison.breakEvenYear && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Break-even point: Year {methodComparison.breakEvenYear}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Method Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Immediate Deduction */}
                <div className={`rounded-lg border-2 p-4 ${
                  methodComparison.recommendation === 'immediate' 
                    ? 'border-green-500 bg-green-50/30' 
                    : 'border-border'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className={`h-5 w-5 ${
                      methodComparison.recommendation === 'immediate' ? 'text-green-600' : 'text-muted-foreground'
                    }`} />
                    <h4 className="font-semibold">Immediate Deduction</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Deduction</span>
                      <span className="font-medium">{formatCurrency(methodComparison.immediate.totalDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tax Savings</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(methodComparison.immediate.taxSavings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Effective Rate</span>
                      <span className="font-medium">{formatPercent(methodComparison.immediate.effectiveRate)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">All received in Year 1</span>
                    </div>
                  </div>
                </div>

                {/* Depreciation */}
                <div className={`rounded-lg border-2 p-4 ${
                  methodComparison.recommendation === 'depreciation' 
                    ? 'border-blue-500 bg-blue-50/30' 
                    : 'border-border'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className={`h-5 w-5 ${
                      methodComparison.recommendation === 'depreciation' ? 'text-blue-600' : 'text-muted-foreground'
                    }`} />
                    <h4 className="font-semibold">Depreciation ({years} years)</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Deduction</span>
                      <span className="font-medium">{formatCurrency(methodComparison.depreciation.totalDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tax Savings</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(methodComparison.depreciation.taxSavings)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Effective Rate</span>
                      <span className="font-medium">{formatPercent(methodComparison.depreciation.effectiveRate)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Spread over {years} years</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Difference */}
              <div className="mt-4 rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Difference in tax savings</span>
                  <span className={`text-lg font-bold ${
                    methodComparison.immediate.taxSavings > methodComparison.depreciation.taxSavings
                      ? 'text-green-600'
                      : methodComparison.immediate.taxSavings < methodComparison.depreciation.taxSavings
                      ? 'text-blue-600'
                      : ''
                  }`}>
                    {formatCurrency(
                      Math.abs(methodComparison.immediate.taxSavings - methodComparison.depreciation.taxSavings)
                    )}
                    {' '}
                    {methodComparison.immediate.taxSavings > methodComparison.depreciation.taxSavings
                      ? 'favoring immediate'
                      : methodComparison.immediate.taxSavings < methodComparison.depreciation.taxSavings
                      ? 'favoring depreciation'
                      : '(equal)'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Year-by-Year Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Year-by-Year Tax Savings</CardTitle>
              <CardDescription>
                Compare cumulative tax savings over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="cumulative" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cumulative">Cumulative Savings</TabsTrigger>
                  <TabsTrigger value="annual">Annual Savings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cumulative" className="mt-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearByYearData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis 
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={<TooltipContent />} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="cumulativeImmediate" 
                          name="Immediate Deduction" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cumulativeDepreciation" 
                          name="Depreciation" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        {methodComparison.breakEvenYear && (
                          <ReferenceLine 
                            x={`Year ${methodComparison.breakEvenYear}`} 
                            stroke="#f59e0b" 
                            strokeDasharray="3 3"
                            label={{ value: 'Break Even', fill: '#f59e0b', fontSize: 10 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="annual" className="mt-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearByYearData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis 
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={<TooltipContent />} />
                        <Legend />
                        <Bar dataKey="immediate" name="Immediate Deduction" fill="#22c55e" />
                        <Bar dataKey="depreciation" name="Depreciation" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Depreciation Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Depreciation Schedule</CardTitle>
              <CardDescription>
                Detailed breakdown of depreciation over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Year</th>
                      <th className="text-right py-2 px-2">Opening Value</th>
                      <th className="text-right py-2 px-2">Depreciation</th>
                      <th className="text-right py-2 px-2">Closing Value</th>
                      <th className="text-right py-2 px-2">Tax Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodComparison.depreciation.schedule.map((year) => (
                      <tr key={year.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">Year {year.year}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(year.openingValue)}</td>
                        <td className="text-right py-2 px-2 text-blue-600">
                          {formatCurrency(year.depreciationAmount)}
                        </td>
                        <td className="text-right py-2 px-2">{formatCurrency(year.closingValue)}</td>
                        <td className="text-right py-2 px-2 font-medium text-green-600">
                          {formatCurrency(year.taxSavings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
