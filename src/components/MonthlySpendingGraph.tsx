import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

// ATO Tax Categories with colors
const CATEGORY_COLORS: Record<string, string> = {
  vehicle: '#8b5cf6',      // Violet
  clothing: '#ec4899',     // Pink
  education: '#3b82f6',    // Blue
  home: '#10b981',         // Emerald
  phone: '#f59e0b',        // Amber
  tools: '#ef4444',        // Red
  other: '#6b7280',        // Gray
};

const CATEGORY_LABELS: Record<string, string> = {
  vehicle: 'Vehicle & Travel',
  clothing: 'Clothing & Laundry',
  education: 'Education',
  home: 'Home Office',
  phone: 'Phone & Internet',
  tools: 'Tools & Equipment',
  other: 'Other',
};

export interface Receipt {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
  createdAt: string;
}

interface MonthlySpendingGraphProps {
  receipts: Receipt[];
  fiscalYearStart?: number; // e.g., 2024 for FY 2024-25
  className?: string;
}

type ViewMode = 'grouped' | 'stacked';

export function MonthlySpendingGraph({ 
  receipts, 
  fiscalYearStart,
  className 
}: MonthlySpendingGraphProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  // Generate months for the current or specified fiscal year
  const months = useMemo(() => {
    const startYear = fiscalYearStart || new Date().getFullYear();
    const fyMonths = [];
    // Australian FY: July to June
    for (let i = 0; i < 12; i++) {
      const monthIndex = i < 6 ? i + 6 : i - 6; // 6 = July, 7 = Aug, etc.
      const year = i < 6 ? startYear : startYear + 1;
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString('en-AU', { 
        month: 'short' 
      });
      fyMonths.push({ key: monthKey, label: monthLabel, year, monthIndex });
    }
    return fyMonths;
  }, [fiscalYearStart]);

  // Aggregate data by month and category
  const chartData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    // Initialize all months with zero for each category
    months.forEach(month => {
      data[month.key] = {};
      Object.keys(CATEGORY_COLORS).forEach(cat => {
        data[month.key][cat] = 0;
      });
    });

    // Aggregate receipts
    receipts.forEach(receipt => {
      const date = new Date(receipt.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (data[monthKey] && data[monthKey][receipt.category] !== undefined) {
        data[monthKey][receipt.category] += receipt.amount;
      }
    });

    // Transform to chart format
    return months.map(month => ({
      month: month.label,
      ...data[month.key],
      total: Object.values(data[month.key]).reduce((sum, val) => sum + val, 0),
    }));
  }, [receipts, months]);

  // Get active categories (those with data)
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    receipts.forEach(r => cats.add(r.category));
    return Array.from(cats).filter(cat => CATEGORY_COLORS[cat]);
  }, [receipts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    // Filter out zero values and sort by amount
    const sortedPayload = payload
      .filter((p: any) => p.value > 0)
      .sort((a: any, b: any) => b.value - a.value);

    if (sortedPayload.length === 0) return null;

    const total = sortedPayload.reduce((sum: number, p: any) => sum + p.value, 0);

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[180px]">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          {sortedPayload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {CATEGORY_LABELS[entry.dataKey] || entry.dataKey}
                </span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t mt-2 pt-2 flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-sm font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };

  const hasData = receipts.length > 0;

  return (
    <Card className={cn("col-span-full", className)}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Monthly Spending</CardTitle>
          <CardDescription>
            Deductions by month and category for FY {fiscalYearStart || new Date().getFullYear()}-{String((fiscalYearStart || new Date().getFullYear()) + 1).slice(-2)}
          </CardDescription>
        </div>
        <ToggleGroup 
          type="single" 
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="grouped" aria-label="Grouped view">
            <BarChart3 className="h-4 w-4 mr-1" />
            Grouped
          </ToggleGroupItem>
          <ToggleGroupItem value="stacked" aria-label="Stacked view">
            <Layers className="h-4 w-4 mr-1" />
            Stacked
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `$${value}`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => CATEGORY_LABELS[value] || value}
              />
              {activeCategories.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  name={category}
                  fill={CATEGORY_COLORS[category]}
                  stroke={CATEGORY_COLORS[category]}
                  radius={viewMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  stackId={viewMode === 'stacked' ? 'total' : undefined}
                  animationDuration={300}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No receipts available for this period</p>
            <p className="text-xs mt-1">Add receipts to see your spending breakdown</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
