import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  type LucideIcon
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

// Status badge variants
const STATUS_VARIANTS = {
  'not-started': { variant: 'secondary' as const, label: 'Not Started', className: '' },
  'in-progress': { variant: 'default' as const, label: 'In Progress', className: 'bg-amber-500 hover:bg-amber-600' },
  'complete': { variant: 'default' as const, label: 'Complete', className: 'bg-green-500 hover:bg-green-600' },
};

// Priority colors
const PRIORITY_COLORS = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
};

export interface WorkpaperCardProps {
  category: AtoCategory;
  workpaper: WorkpaperData;
  onClick?: () => void;
  compact?: boolean;
}

export function WorkpaperCard({ category, workpaper, onClick, compact = false }: WorkpaperCardProps) {
  const Icon = CATEGORY_ICONS[category.code] || Briefcase;
  const statusConfig = STATUS_VARIANTS[workpaper.status];
  
  // Get route path for the workpaper
  const getRoutePath = (): string => {
    const routeMap: Record<string, string> = {
      D1: '/car-expenses',
      D2: '/travel-expenses',
      D3: '/clothing-expenses',
      D4: '/self-education',
      D5: '/d5-expenses',
      D6: '/low-value-pool',
    };
    return routeMap[category.code] || `/workpapers/${category.code.toLowerCase()}`;
  };

  if (compact) {
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{category.name}</p>
                <Badge variant="outline" className="text-xs shrink-0">{category.code}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={statusConfig.variant}
                  className={`text-xs ${statusConfig.className}`}
                >
                  {statusConfig.label}
                </Badge>
                {workpaper.totalClaimed > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(workpaper.totalClaimed)}
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={workpaper.completionPercentage} 
              className="w-12 h-1.5"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group h-full flex flex-col"
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header with icon and code */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <Badge variant="outline" className="text-xs mb-1">{category.code}</Badge>
              <p className={`text-xs font-medium ${PRIORITY_COLORS[category.priority]}`}>
                {category.priority.charAt(0).toUpperCase() + category.priority.slice(1)} Priority
              </p>
            </div>
          </div>
          <Badge 
            variant={statusConfig.variant}
            className={statusConfig.className}
          >
            {statusConfig.label}
          </Badge>
        </div>

        {/* Title and description */}
        <div className="mb-4 flex-1">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">{category.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {category.shortDescription}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">{workpaper.completionPercentage}%</span>
          </div>
          <Progress 
            value={workpaper.completionPercentage} 
            className="h-2"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Total Claimed</p>
            <p className="font-semibold text-sm">
              {workpaper.totalClaimed > 0 ? formatCurrency(workpaper.totalClaimed) : '-'}
            </p>
          </div>
          <div className="bg-muted rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Tax Savings</p>
            <p className="font-semibold text-sm text-green-600">
              {workpaper.estimatedTaxSavings > 0 ? formatCurrency(workpaper.estimatedTaxSavings) : '-'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {workpaper.itemsCount > 0 ? (
              <span>{workpaper.itemsCount} item{workpaper.itemsCount !== 1 ? 's' : ''}</span>
            ) : (
              <span>No items</span>
            )}
          </div>
          <Link to={getRoutePath()} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-8 gap-1">
              Open
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// List view variant of the card
export function WorkpaperListItem({ category, workpaper, onClick }: WorkpaperCardProps) {
  const Icon = CATEGORY_ICONS[category.code] || Briefcase;
  const statusConfig = STATUS_VARIANTS[workpaper.status];
  
  const getRoutePath = (): string => {
    const routeMap: Record<string, string> = {
      D1: '/car-expenses',
      D2: '/travel-expenses',
      D3: '/clothing-expenses',
      D4: '/self-education',
      D5: '/d5-expenses',
      D6: '/low-value-pool',
    };
    return routeMap[category.code] || `/workpapers/${category.code.toLowerCase()}`;
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon className="h-5 w-5" />
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium">{category.name}</span>
              <Badge variant="outline" className="text-xs">{category.code}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {category.shortDescription}
            </p>
          </div>
          
          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Claimed</p>
              <p className="font-medium">
                {workpaper.totalClaimed > 0 ? formatCurrency(workpaper.totalClaimed) : '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tax Savings</p>
              <p className="font-medium text-green-600">
                {workpaper.estimatedTaxSavings > 0 ? formatCurrency(workpaper.estimatedTaxSavings) : '-'}
              </p>
            </div>
          </div>
          
          {/* Status & Progress */}
          <div className="flex items-center gap-4">
            <div className="w-24">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground hidden sm:inline">Progress</span>
                <span className="font-medium">{workpaper.completionPercentage}%</span>
              </div>
              <Progress value={workpaper.completionPercentage} className="h-1.5" />
            </div>
            <Badge 
              variant={statusConfig.variant}
              className={`hidden sm:inline-flex ${statusConfig.className}`}
            >
              {statusConfig.label}
            </Badge>
            <Link to={getRoutePath()} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" className="h-8">
                Open
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
