import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  Sector
} from 'recharts';
import { Donut, TrendingUp, Receipt } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { atoCategories, AtoCategoryCode } from '@/lib/ato-categories';

// Color palette for ATO categories (D1-D15)
const CATEGORY_COLORS: Record<AtoCategoryCode, string> = {
  D1: '#8b5cf6',  // Violet - Car expenses
  D2: '#ec4899',  // Pink - Travel expenses
  D3: '#3b82f6',  // Blue - Clothing
  D4: '#10b981',  // Emerald - Self-education
  D5: '#f59e0b',  // Amber - Other work-related
  D6: '#ef4444',  // Red - Low value pool
  D7: '#06b6d4',  // Cyan - Interest/Dividends
  D8: '#84cc16',  // Lime - Gifts/Donations
  D9: '#f97316',  // Orange - Tax affairs
  D10: '#14b8a6', // Teal - Medical expenses
  D11: '#a855f7', // Purple - UPP
  D12: '#22c55e', // Green - Super contributions
  D13: '#6366f1', // Indigo - Project pool
  D14: '#eab308', // Yellow - Forestry
  D15: '#64748b', // Slate - Other deductions
};

// Short labels for categories
const CATEGORY_SHORT_LABELS: Record<AtoCategoryCode, string> = {
  D1: 'Car Expenses',
  D2: 'Travel',
  D3: 'Clothing',
  D4: 'Education',
  D5: 'Work Expenses',
  D6: 'Low Value Pool',
  D7: 'Interest/Divs',
  D8: 'Donations',
  D9: 'Tax Costs',
  D10: 'Medical',
  D11: 'UPP',
  D12: 'Super',
  D13: 'Project Pool',
  D14: 'Forestry',
  D15: 'Other',
};

export interface CategoryData {
  code: AtoCategoryCode;
  amount: number;
  count: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[];
  fiscalYear?: string; // e.g., "2024-25"
  className?: string;
  showLegend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Active shape for hover effect
const renderActiveShape = (props: any) => {
  const { 
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, 
    fill, payload, percent, value 
  } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-200"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 12}
        fill={fill}
        opacity={0.3}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="hsl(var(--foreground))" className="text-sm font-semibold">
        {CATEGORY_SHORT_LABELS[payload.code]}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="hsl(var(--foreground))" className="text-lg font-bold">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 32} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

// Default shape
const renderShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      className="transition-all duration-200 hover:opacity-80"
    />
  );
};

export function CategoryBreakdownChart({ 
  data, 
  fiscalYear,
  className,
  showLegend = true,
  size = 'md'
}: CategoryBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter out categories with zero amount and sort by amount descending
  const chartData = useMemo(() => {
    return data
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.amount, 0);
  }, [chartData]);

  // Calculate total receipts count
  const totalReceipts = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.count, 0);
  }, [chartData]);

  // Get chart dimensions based on size
  const chartHeight = size === 'sm' ? 200 : size === 'md' ? 280 : 360;
  const innerRadius = size === 'sm' ? 45 : size === 'md' ? 65 : 85;
  const outerRadius = size === 'sm' ? 70 : size === 'md' ? 100 : 130;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const item = payload[0].payload as CategoryData;
    const percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    const categoryInfo = atoCategories.find(c => c.code === item.code);
    
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: CATEGORY_COLORS[item.code] }}
          />
          <span className="font-semibold">{categoryInfo?.name || item.code}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{formatCurrency(item.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Percentage:</span>
            <span className="font-medium">{percentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receipts:</span>
            <span className="font-medium">{item.count}</span>
          </div>
        </div>
      </div>
    );
  };

  // Custom legend
  const CustomLegend = () => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item, index) => {
          const percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
          return (
            <button
              key={item.code}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200",
                "hover:bg-accent",
                activeIndex === index && "bg-accent ring-1 ring-primary"
              )}
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: CATEGORY_COLORS[item.code] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {CATEGORY_SHORT_LABELS[item.code]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.amount)} ({percentage.toFixed(0)}%)
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const hasData = chartData.length > 0 && totalAmount > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Donut className="h-5 w-5 text-primary" />
              Category Breakdown
            </CardTitle>
            <CardDescription>
              {fiscalYear ? `FY ${fiscalYear} deductions by category` : 'Deductions by ATO category'}
            </CardDescription>
          </div>
          {hasData && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                <TrendingUp className="h-4 w-4" />
                {formatCurrency(totalAmount)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Receipt className="h-3 w-3" />
                {totalReceipts} receipts
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className={cn("grid gap-4", showLegend && "lg:grid-cols-[1fr,220px]")}>
            <div className="relative">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex ?? undefined}
                    activeShape={renderActiveShape}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="code"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    animationDuration={400}
                    animationBegin={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.code]}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center label when no slice is active */}
              {activeIndex === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totalAmount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {chartData.length} categories
                  </span>
                </div>
              )}
            </div>
            
            {showLegend && <CustomLegend />}
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center text-muted-foreground"
            style={{ height: chartHeight }}
          >
            <Donut className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No deductions recorded</p>
            <p className="text-xs mt-1">Add receipts to see your category breakdown</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified version for dashboards/widgets
interface CategoryBreakdownMiniProps {
  data: CategoryData[];
  className?: string;
}

export function CategoryBreakdownMini({ data, className }: CategoryBreakdownMiniProps) {
  const chartData = useMemo(() => {
    return data
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 only
  }, [data]);

  const totalAmount = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.amount, 0);
  }, [chartData]);

  const hasData = chartData.length > 0 && totalAmount > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {hasData ? (
        <>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="code"
                  animationDuration={400}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_COLORS[entry.code]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {chartData.map((item) => {
              const percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
              return (
                <div key={item.code} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[item.code] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]">
                      {CATEGORY_SHORT_LABELS[item.code]}
                    </span>
                  </div>
                  <span className="font-medium">{percentage.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="h-[120px] flex flex-col items-center justify-center text-muted-foreground">
          <Donut className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-xs">No data</span>
        </div>
      )}
    </div>
  );
}

export default CategoryBreakdownChart;
