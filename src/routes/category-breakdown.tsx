import React, { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CategoryBreakdownChart, 
  CategoryBreakdownMini,
  CategoryData 
} from '@/components/CategoryBreakdownChart';
import { 
  Donut, 
  TrendingUp, 
  LayoutDashboard, 
  PanelLeft,
  Download,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/category-breakdown')({
  component: CategoryBreakdownDemo,
});

// Mock data for demonstration
const MOCK_CATEGORY_DATA: CategoryData[] = [
  { code: 'D1', amount: 2850.00, count: 12 },   // Car expenses
  { code: 'D2', amount: 1250.50, count: 8 },    // Travel
  { code: 'D3', amount: 450.00, count: 5 },     // Clothing
  { code: 'D4', amount: 1850.00, count: 3 },    // Education
  { code: 'D5', amount: 2200.00, count: 15 },   // Other work
  { code: 'D6', amount: 0, count: 0 },          // Low value pool (empty)
  { code: 'D7', amount: 0, count: 0 },          // Interest/Divs (empty)
  { code: 'D8', amount: 500.00, count: 4 },     // Donations
  { code: 'D9', amount: 350.00, count: 2 },     // Tax costs
  { code: 'D10', amount: 0, count: 0 },         // Medical (empty)
  { code: 'D11', amount: 0, count: 0 },         // UPP (empty)
  { code: 'D12', amount: 5000.00, count: 2 },   // Super contributions
  { code: 'D13', amount: 0, count: 0 },         // Project pool (empty)
  { code: 'D14', amount: 0, count: 0 },         // Forestry (empty)
  { code: 'D15', amount: 180.00, count: 1 },    // Other
];

// Empty data for empty state demo
const EMPTY_DATA: CategoryData[] = [
  { code: 'D1', amount: 0, count: 0 },
  { code: 'D2', amount: 0, count: 0 },
  { code: 'D3', amount: 0, count: 0 },
  { code: 'D4', amount: 0, count: 0 },
  { code: 'D5', amount: 0, count: 0 },
  { code: 'D6', amount: 0, count: 0 },
  { code: 'D7', amount: 0, count: 0 },
  { code: 'D8', amount: 0, count: 0 },
  { code: 'D9', amount: 0, count: 0 },
  { code: 'D10', amount: 0, count: 0 },
  { code: 'D11', amount: 0, count: 0 },
  { code: 'D12', amount: 0, count: 0 },
  { code: 'D13', amount: 0, count: 0 },
  { code: 'D14', amount: 0, count: 0 },
  { code: 'D15', amount: 0, count: 0 },
];

function CategoryBreakdownDemo() {
  const [data, setData] = React.useState(MOCK_CATEGORY_DATA);
  const [isLoading, setIsLoading] = React.useState(false);

  const totalAmount = useMemo(() => {
    return data.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  const totalReceipts = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate data refresh
    setTimeout(() => {
      setData(prev => prev.map(item => ({
        ...item,
        amount: item.amount > 0 ? item.amount * (0.9 + Math.random() * 0.2) : 0
      })));
      setIsLoading(false);
    }, 500);
  };

  const handleExport = () => {
    const exportData = data
      .filter(item => item.amount > 0)
      .map(item => ({
        category: item.code,
        amount: item.amount,
        receipts: item.count
      }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'category-breakdown.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Donut className="h-8 w-8 text-primary" />
            Category Breakdown Demo
          </h1>
          <p className="text-muted-foreground mt-1">
            Interactive donut chart showing deductions by ATO category
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Across {data.filter(d => d.amount > 0).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Badge variant="secondary" className="text-xs">{totalReceipts}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceipts}</div>
            <p className="text-xs text-muted-foreground">
              Processed this financial year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {data.length > 0 
                ? data.reduce((max, item) => item.amount > max.amount ? item : max, data[0]).code
                : '-'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Highest deduction amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalReceipts > 0 
                ? formatCurrency(totalAmount / totalReceipts)
                : formatCurrency(0)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <CategoryBreakdownChart 
        data={data} 
        fiscalYear="2024-25"
        className="w-full"
      />

      {/* Variants Showcase */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Small Size */}
        <CategoryBreakdownChart 
          data={data} 
          fiscalYear="2024-25"
          size="sm"
          showLegend={false}
          className="w-full"
        />

        {/* Large Size */}
        <CategoryBreakdownChart 
          data={data} 
          fiscalYear="2024-25"
          size="lg"
          className="w-full"
        />
      </div>

      {/* Widget Demo Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Dashboard Widget
            </CardTitle>
            <CardDescription>
              Compact view for dashboard integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownMini data={data} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PanelLeft className="h-5 w-5" />
              Sidebar Widget
            </CardTitle>
            <CardDescription>
              For side panel or drawer views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownMini data={data} />
          </CardContent>
        </Card>

        {/* Empty State Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Empty State</CardTitle>
            <CardDescription>
              When no data is available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownMini data={EMPTY_DATA} />
          </CardContent>
        </Card>
      </div>

      {/* Documentation */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Component Features</CardTitle>
          <CardDescription>
            TAL-089: Category Breakdown Chart implementation details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Interactive Features</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Hover over slices for detailed tooltips</li>
                <li>Click legend items to highlight slices</li>
                <li>Animated transitions on data changes</li>
                <li>Center label shows total when idle</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Technical Details</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Built with Recharts library</li>
                <li>shadcn/ui Card component container</li>
                <li>Responsive container for all screen sizes</li>
                <li>TypeScript with full type safety</li>
              </ul>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">ATO Categories Supported</h4>
            <div className="flex flex-wrap gap-2">
              {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'].map(code => (
                <Badge key={code} variant="outline">{code}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CategoryBreakdownDemo;
