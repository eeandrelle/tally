/**
 * Dividend Charts Component
 * 
 * Interactive charts for visualizing dividend data:
 * - Annual dividend bar chart
 * - Dividend income pie chart by company
 * - Franking credits vs unfranked amounts
 * - Monthly dividend timeline
 * - Cumulative dividend growth line chart
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { DividendChartData, MonthlyDividend } from '@/lib/dividend-tracker';
import { formatCurrency } from '@/lib/dividend-tracker';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar, Activity } from 'lucide-react';

// ============================================================================
// COLOR PALETTE
// ============================================================================

const COLORS = [
  '#D0BCFF', // Primary
  '#CCC2DC', // Secondary
  '#EFB8C8', // Tertiary
  '#A8DAB5', // Success
  '#FFD599', // Warning
  '#F2B8B5', // Error
  '#7FCDBB',
  '#41B6C4',
  '#1D91C0',
  '#225EA8',
];

const CHART_COLORS = {
  dividend: '#D0BCFF',
  frankingCredit: '#A8DAB5',
  franked: '#D0BCFF',
  unfranked: '#CCC2DC',
  grid: 'hsl(var(--border))',
  text: 'hsl(var(--muted-foreground))',
};

// ============================================================================
// CHART COMPONENTS
// ============================================================================

interface AnnualChartProps {
  data: DividendChartData['annualData'];
}

function AnnualDividendChart({ data }: AnnualChartProps) {
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      formattedDividends: formatCurrency(d.dividends),
      formattedFranking: formatCurrency(d.frankingCredits),
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis 
          dataKey="financialYear" 
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
        />
        <YAxis 
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload) return null;
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg">
                <p className="font-medium mb-2">FY {label}</p>
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
        <Legend />
        <Bar 
          dataKey="dividends" 
          name="Dividends" 
          fill={CHART_COLORS.dividend}
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="frankingCredits" 
          name="Franking Credits" 
          fill={CHART_COLORS.frankingCredit}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================

interface CompanyDistributionChartProps {
  data: DividendChartData['companyDistribution'];
}

function CompanyDistributionChart({ data }: CompanyDistributionChartProps) {
  const chartData = useMemo(() => {
    // Show top 7 companies, group rest as "Others"
    if (data.length <= 7) return data;
    
    const topCompanies = data.slice(0, 7);
    const othersAmount = data.slice(7).reduce((sum, d) => sum + d.amount, 0);
    
    return [
      ...topCompanies,
      {
        companyName: 'Others',
        asxCode: undefined,
        amount: othersAmount,
        percentage: data.slice(7).reduce((sum, d) => sum + d.percentage, 0),
      },
    ];
  }, [data]);

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="amount"
            nameKey="companyName"
            label={({ companyName, percentage }) => 
              percentage > 5 ? `${companyName.split(' ')[0]} (${percentage}%)` : ''
            }
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="font-medium">{data.companyName}</p>
                  {data.asxCode && (
                    <p className="text-xs text-muted-foreground">ASX: {data.asxCode}</p>
                  )}
                  <p className="text-sm mt-1">{formatCurrency(data.amount)}</p>
                  <p className="text-xs text-muted-foreground">{data.percentage}% of total</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-[200px]">
        {chartData.map((item, index) => (
          <div key={item.companyName} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm truncate flex-1">{item.companyName}</span>
            <span className="text-sm text-muted-foreground">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================

interface FrankingBreakdownChartProps {
  data: DividendChartData['frankingBreakdown'];
}

function FrankingBreakdownChart({ data }: FrankingBreakdownChartProps) {
  const chartData = [
    { name: 'Franked Amount', value: data.franked, color: CHART_COLORS.franked },
    { name: 'Unfranked Amount', value: data.unfranked, color: CHART_COLORS.unfranked },
  ];

  const total = data.franked + data.unfranked;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Dividends</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Franked Amount</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(data.franked)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Franking Credits</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(data.frankingCredits)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={[{ name: 'Breakdown', ...data }]} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
          <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" hide />
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
          <Bar dataKey="franked" name="Franked" stackId="a" fill={CHART_COLORS.franked} radius={[4, 0, 0, 4]} />
          <Bar dataKey="unfranked" name="Unfranked" stackId="a" fill={CHART_COLORS.unfranked} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Percentage Labels */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.franked }} />
          <span>Franked: {total > 0 ? ((data.franked / total) * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.unfranked }} />
          <span>Unfranked: {total > 0 ? ((data.unfranked / total) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================

interface MonthlyTimelineChartProps {
  data: MonthlyDividend[];
}

function MonthlyTimelineChart({ data }: MonthlyTimelineChartProps) {
  const chartData = useMemo(() => {
    return data.map(m => ({
      ...m,
      shortMonth: m.monthName.split(' ')[0],
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorDividends" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.dividend} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={CHART_COLORS.dividend} stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorFranking" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.frankingCredit} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={CHART_COLORS.frankingCredit} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="shortMonth" 
          tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
        />
        <YAxis 
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload) return null;
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg">
                <p className="font-medium mb-2">{label}</p>
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
        <Legend />
        <Area 
          type="monotone" 
          dataKey="totalDividends" 
          name="Dividends" 
          stroke={CHART_COLORS.dividend}
          fillOpacity={1} 
          fill="url(#colorDividends)" 
        />
        <Area 
          type="monotone" 
          dataKey="frankingCredits" 
          name="Franking Credits" 
          stroke={CHART_COLORS.frankingCredit}
          fillOpacity={1} 
          fill="url(#colorFranking)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================

interface CumulativeGrowthChartProps {
  data: DividendChartData['cumulativeGrowth'];
}

function CumulativeGrowthChart({ data }: CumulativeGrowthChartProps) {
  const chartData = useMemo(() => {
    // Sample every nth point to avoid too many data points
    const sampleRate = Math.max(1, Math.floor(data.length / 50));
    return data.filter((_, index) => index % sampleRate === 0 || index === data.length - 1);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis 
          dataKey="date" 
          tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
          }}
        />
        <YAxis 
          tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload[0]) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg">
                <p className="font-medium">
                  {new Date(data.date).toLocaleDateString('en-AU', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </p>
                <p className="text-sm text-primary">
                  Cumulative: {formatCurrency(data.cumulativeAmount)}
                </p>
              </div>
            );
          }}
        />
        <Line 
          type="monotone" 
          dataKey="cumulativeAmount" 
          stroke={CHART_COLORS.dividend}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: CHART_COLORS.dividend }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DividendChartsProps {
  chartData: DividendChartData | null;
  isLoading?: boolean;
}

export function DividendCharts({ chartData, isLoading }: DividendChartsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-[400px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="animate-pulse bg-muted w-full h-[300px] rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No dividend data available for charts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="annual" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
        <TabsTrigger value="annual" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Annual</span>
        </TabsTrigger>
        <TabsTrigger value="companies" className="gap-2">
          <PieChartIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Companies</span>
        </TabsTrigger>
        <TabsTrigger value="franking" className="gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Franking</span>
        </TabsTrigger>
        <TabsTrigger value="monthly" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Monthly</span>
        </TabsTrigger>
        <TabsTrigger value="growth" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Growth</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="annual" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Annual Dividend History
            </CardTitle>
            <CardDescription>
              Dividend income and franking credits by financial year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnnualDividendChart data={chartData.annualData} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="companies" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Dividend Distribution by Company
            </CardTitle>
            <CardDescription>
              Share of total dividend income by company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyDistributionChart data={chartData.companyDistribution} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="franking" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Franking Credit Breakdown
            </CardTitle>
            <CardDescription>
              Franked vs unfranked dividend amounts and credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FrankingBreakdownChart data={chartData.frankingBreakdown} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monthly" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Dividend Timeline
            </CardTitle>
            <CardDescription>
              Dividend income throughout the financial year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyTimelineChart data={chartData.monthlyTimeline} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="growth" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cumulative Dividend Growth
            </CardTitle>
            <CardDescription>
              Running total of all dividend payments over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CumulativeGrowthChart data={chartData.cumulativeGrowth} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default DividendCharts;
