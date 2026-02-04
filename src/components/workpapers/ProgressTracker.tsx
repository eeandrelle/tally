import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Target,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { AtoCategory } from '@/lib/ato-categories';
import type { WorkpaperData } from '@/hooks/useWorkpaperLibrary';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface ProgressTrackerProps {
  workpapers: { category: AtoCategory; workpaper: WorkpaperData }[];
  totalClaimed: number;
  totalEstimatedSavings: number;
  onContinueClick?: (categoryCode: string) => void;
}

export function ProgressTracker({ 
  workpapers, 
  totalClaimed, 
  totalEstimatedSavings,
  onContinueClick 
}: ProgressTrackerProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const total = workpapers.length;
    const complete = workpapers.filter(({ workpaper }) => workpaper.status === 'complete').length;
    const inProgress = workpapers.filter(({ workpaper }) => workpaper.status === 'in-progress').length;
    const notStarted = workpapers.filter(({ workpaper }) => workpaper.status === 'not-started').length;
    
    const overallProgress = total > 0 ? Math.round((complete / total) * 100) : 0;
    
    // Find in-progress workpapers for quick continue
    const inProgressWorkpapers = workpapers
      .filter(({ workpaper }) => workpaper.status === 'in-progress')
      .sort((a, b) => (b.workpaper.lastAccessed || '').localeCompare(a.workpaper.lastAccessed || ''));
    
    // Find high priority not started
    const highPriorityNotStarted = workpapers
      .filter(({ category, workpaper }) => 
        category.priority === 'high' && workpaper.status === 'not-started'
      );
    
    return {
      total,
      complete,
      inProgress,
      notStarted,
      overallProgress,
      inProgressWorkpapers,
      highPriorityNotStarted,
    };
  }, [workpapers]);

  // Get achievement level
  const getAchievementLevel = () => {
    if (stats.overallProgress >= 100) return { label: 'Master', color: 'text-yellow-500', icon: Award };
    if (stats.overallProgress >= 75) return { label: 'Expert', color: 'text-purple-500', icon: Sparkles };
    if (stats.overallProgress >= 50) return { label: 'Advanced', color: 'text-blue-500', icon: TrendingUp };
    if (stats.overallProgress >= 25) return { label: 'Intermediate', color: 'text-green-500', icon: Target };
    return { label: 'Beginner', color: 'text-gray-500', icon: Circle };
  };

  const achievement = getAchievementLevel();
  const AchievementIcon = achievement.icon;

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AchievementIcon className={`h-6 w-6 ${achievement.color}`} />
                Overall Progress
              </CardTitle>
              <CardDescription>
                Track your workpaper completion status
              </CardDescription>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${achievement.color}`}>{stats.overallProgress}%</p>
              <p className="text-xs text-muted-foreground">{achievement.label} Level</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <Progress value={stats.overallProgress} className="h-3" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{stats.complete} of {stats.total} workpapers complete</span>
              <span>{stats.inProgress} in progress</span>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <StatusCard 
              count={stats.complete}
              label="Complete"
              icon={CheckCircle2}
              color="green"
            />
            <StatusCard 
              count={stats.inProgress}
              label="In Progress"
              icon={Clock}
              color="amber"
            />
            <StatusCard 
              count={stats.notStarted}
              label="Not Started"
              icon={Circle}
              color="gray"
            />
          </div>

          {/* Tax Impact Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Deductions</p>
              <p className="text-xl font-semibold">{formatCurrency(totalClaimed)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Est. Tax Savings</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(totalEstimatedSavings)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Working Section */}
      {stats.inProgressWorkpapers.length > 0 && onContinueClick && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Continue Working
            </CardTitle>
            <CardDescription>
              Pick up where you left off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.inProgressWorkpapers.slice(0, 3).map(({ category, workpaper }) => (
                <div 
                  key={category.code}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => onContinueClick(category.code)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10">
                      <Progress value={workpaper.completionPercentage} className="h-2" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {workpaper.completionPercentage}%
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 gap-1">
                      Continue
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Priority Suggestions */}
      {stats.highPriorityNotStarted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              High Priority Categories
            </CardTitle>
            <CardDescription>
              These categories commonly apply to many taxpayers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.highPriorityNotStarted.slice(0, 3).map(({ category }) => (
                <div 
                  key={category.code}
                  className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  onClick={() => onContinueClick?.(category.code)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive" className="text-xs">
                      High Priority
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.shortDescription}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8">
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <MilestoneItem 
              label="First Workpaper Complete"
              achieved={stats.complete >= 1}
              description="Complete your first deduction workpaper"
            />
            <MilestoneItem 
              label="Halfway There"
              achieved={stats.complete >= Math.ceil(stats.total / 2)}
              description={`Complete ${Math.ceil(stats.total / 2)} workpapers`}
            />
            <MilestoneItem 
              label="All Work-Related Complete"
              achieved={workpapers.filter(({ category }) => 
                ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].includes(category.code)
              ).every(({ workpaper }) => workpaper.status === 'complete')}
              description="Complete all D1-D6 workpapers"
            />
            <MilestoneItem 
              label="Tax Champion"
              achieved={stats.complete === stats.total}
              description="Complete all workpapers"
            />
            <MilestoneItem 
              label="High Earner"
              achieved={totalClaimed >= 5000}
              description="Claim over $5,000 in deductions"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Status card component
interface StatusCardProps {
  count: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'amber' | 'gray';
}

function StatusCard({ count, label, icon: Icon, color }: StatusCardProps) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
    gray: 'bg-gray-500/10 text-gray-600',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]} text-center`}>
      <Icon className="h-5 w-5 mx-auto mb-1" />
      <p className="text-xl font-bold">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

// Milestone item component
interface MilestoneItemProps {
  label: string;
  achieved: boolean;
  description: string;
}

function MilestoneItem({ label, achieved, description }: MilestoneItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-full ${achieved ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className={`font-medium text-sm ${achieved ? 'text-green-600' : ''}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {achieved && (
        <Badge variant="default" className="bg-green-500">
          Achieved
        </Badge>
      )}
    </div>
  );
}

// Compact progress tracker for embedding in other components
export function ProgressTrackerCompact({ 
  workpapers, 
  totalClaimed 
}: Omit<ProgressTrackerProps, 'onContinueClick' | 'totalEstimatedSavings'>) {
  const completedCount = workpapers.filter(({ workpaper }) => workpaper.status === 'complete').length;
  const overallProgress = workpapers.length > 0 
    ? Math.round((completedCount / workpapers.length) * 100) 
    : 0;

  return (
    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Workpaper Progress</span>
          <span className="text-sm text-muted-foreground">{completedCount}/{workpapers.length}</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{formatCurrency(totalClaimed)}</p>
        <p className="text-xs text-muted-foreground">claimed</p>
      </div>
    </div>
  );
}
