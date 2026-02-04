import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  Plane, 
  Shirt, 
  BookOpen, 
  Briefcase, 
  Package, 
  TrendingUp, 
  Gift, 
  Calculator,
  PiggyBank,
  Globe,
  Home,
  Landmark,
  Rocket,
  Gem,
  type LucideIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import type { AtoCategory } from '@/lib/ato-categories';
import type { WorkpaperData } from '@/hooks/useWorkpaperLibrary';
import { formatCurrency } from '@/lib/utils';

// Map category codes to icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  D1: Car,
  D2: Plane,
  D3: Shirt,
  D4: BookOpen,
  D5: Briefcase,
  D6: Package,
  D7: TrendingUp,
  D8: Gift,
  D9: Calculator,
  D10: PiggyBank,
  D11: Globe,
  D12: Home,
  D13: Rocket,
  D14: Gem,
  D15: Landmark,
};

interface CategorySummaryProps {
  workpapers: { category: AtoCategory; workpaper: WorkpaperData }[];
  totalClaimed: number;
  totalEstimatedSavings: number;
  onViewAllClick?: () => void;
}

export function CategorySummary({ 
  workpapers, 
  totalClaimed, 
  totalEstimatedSavings,
  onViewAllClick 
}: CategorySummaryProps) {
  // Group by status for quick stats
  const completedCount = workpapers.filter(({ workpaper }) => workpaper.status === 'complete').length;
  const inProgressCount = workpapers.filter(({ workpaper }) => workpaper.status === 'in-progress').length;
  const notStartedCount = workpapers.filter(({ workpaper }) => workpaper.status === 'not-started').length;
  
  // Get categories with claims for highlighting
  const categoriesWithClaims = workpapers
    .filter(({ workpaper }) => workpaper.totalClaimed > 0)
    .sort((a, b) => b.workpaper.totalClaimed - a.workpaper.totalClaimed)
    .slice(0, 5);
  
  // Calculate completion rate
  const completionRate = workpapers.length > 0 
    ? Math.round((completedCount / workpapers.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary/80">Total Deductions</CardDescription>
            <CardTitle className="text-3xl text-primary">
              {formatCurrency(totalClaimed)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all workpaper categories
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600/80">Est. Tax Savings</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {formatCurrency(totalEstimatedSavings)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Based on 32.5% marginal rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-3xl">{completionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedCount} of {workpapers.length} complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status Overview</CardDescription>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {completedCount}
              </Badge>
              <Badge variant="default" className="bg-amber-500">
                <Clock className="h-3 w-3 mr-1" />
                {inProgressCount}
              </Badge>
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                {notStartedCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {inProgressCount > 0 ? `${inProgressCount} in progress` : 'No workpapers in progress'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Value Categories */}
      {categoriesWithClaims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              High Value Categories
            </CardTitle>
            <CardDescription>
              Categories with the highest deduction claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoriesWithClaims.map(({ category, workpaper }) => {
                const Icon = CATEGORY_ICONS[category.code] || Briefcase;
                const percentageOfTotal = totalClaimed > 0 
                  ? (workpaper.totalClaimed / totalClaimed) * 100 
                  : 0;
                
                return (
                  <div key={category.code} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(workpaper.totalClaimed)}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentageOfTotal.toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                    <Progress value={percentageOfTotal} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Group Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <CategoryGroupCard 
          title="Work-Related Expenses"
          description="D1 - D6"
          workpapers={workpapers.filter(({ category }) => 
            ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].includes(category.code)
          )}
          icon={Briefcase}
          color="blue"
        />
        <CategoryGroupCard 
          title="Investment Expenses"
          description="D7 - D8"
          workpapers={workpapers.filter(({ category }) => 
            ['D7', 'D8'].includes(category.code)
          )}
          icon={TrendingUp}
          color="green"
        />
        <CategoryGroupCard 
          title="Tax Offsets"
          description="D9 - D15"
          workpapers={workpapers.filter(({ category }) => 
            ['D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'].includes(category.code)
          )}
          icon={Calculator}
          color="purple"
        />
      </div>

      {onViewAllClick && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onViewAllClick} className="gap-2">
            View All Workpapers
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper component for category group cards
interface CategoryGroupCardProps {
  title: string;
  description: string;
  workpapers: { category: AtoCategory; workpaper: WorkpaperData }[];
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple';
}

function CategoryGroupCard({ title, description, workpapers, icon: Icon, color }: CategoryGroupCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/5 to-blue-500/10 border-blue-500/20 text-blue-600',
    green: 'from-green-500/5 to-green-500/10 border-green-500/20 text-green-600',
    purple: 'from-purple-500/5 to-purple-500/10 border-purple-500/20 text-purple-600',
  };

  const totalClaimed = workpapers.reduce((sum, { workpaper }) => sum + workpaper.totalClaimed, 0);
  const completedCount = workpapers.filter(({ workpaper }) => workpaper.status === 'complete').length;
  const inProgressCount = workpapers.filter(({ workpaper }) => workpaper.status === 'in-progress').length;
  const completionRate = workpapers.length > 0 
    ? Math.round((completedCount / workpapers.length) * 100) 
    : 0;

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{description}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {formatCurrency(totalClaimed)}
          </span>
          <span className="text-xs text-muted-foreground">claimed</span>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span>{completionRate}% ({completedCount}/{workpapers.length})</span>
          </div>
          <Progress value={completionRate} className="h-1.5" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {inProgressCount > 0 && (
            <Badge variant="default" className="bg-amber-500 text-xs">
              {inProgressCount} in progress
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="default" className="bg-green-500 text-xs">
              {completedCount} complete
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mini summary for dashboard use
export function CategorySummaryMini({ 
  workpapers, 
  totalClaimed, 
  totalEstimatedSavings 
}: CategorySummaryProps) {
  const completedCount = workpapers.filter(({ workpaper }) => workpaper.status === 'complete').length;
  const completionRate = workpapers.length > 0 
    ? Math.round((completedCount / workpapers.length) * 100) 
    : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardDescription>Deductions Workpapers</CardDescription>
        <CardTitle className="text-2xl">{formatCurrency(totalClaimed)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Est. Tax Savings</span>
          <span className="font-medium text-green-600">{formatCurrency(totalEstimatedSavings)}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Completion</span>
            <span>{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500 text-xs">
            {completedCount} complete
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {workpapers.length - completedCount} remaining
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
