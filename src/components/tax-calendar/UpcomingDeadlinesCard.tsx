/**
 * UpcomingDeadlinesCard
 * 
 * Dashboard widget showing the next 5 upcoming deadlines.
 * Displays urgency levels and quick actions.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarDays, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Bell
} from 'lucide-react';
import { useUpcomingDeadlines } from '@/hooks/useTaxCalendar';
import { Link } from '@tanstack/react-router';

interface UpcomingDeadlinesCardProps {
  limit?: number;
  showViewAll?: boolean;
}

export function UpcomingDeadlinesCard({ 
  limit = 5, 
  showViewAll = true 
}: UpcomingDeadlinesCardProps) {
  const { deadlines, isLoading, error, criticalCount, highCount } = useUpcomingDeadlines({ limit });
  
  const getUrgencyIcon = (urgency: typeof deadlines[0]['urgency']) => {
    switch (urgency) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getUrgencyBadge = (urgency: typeof deadlines[0]['urgency'], isOverdue: boolean) => {
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="text-xs">
          Overdue
        </Badge>
      );
    }
    
    switch (urgency) {
      case 'critical':
        return (
          <Badge variant="destructive" className="text-xs">
            {urgency === 'critical' ? 'Due Soon' : 'Critical'}
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="default" className="bg-amber-500 text-xs">
            Due Soon
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="text-xs">
            Upcoming
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-xs">
            Later
          </Badge>
        );
    }
  };
  
  const formatRelativeTime = (daysUntil: number, isOverdue: boolean) => {
    if (isOverdue) {
      return daysUntil === 1 ? '1 day overdue' : `${daysUntil} days overdue`;
    }
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load deadlines</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const hasUrgentItems = criticalCount > 0 || highCount > 0;
  
  return (
    <Card className={hasUrgentItems ? 'border-amber-200 dark:border-amber-800' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Upcoming Deadlines
            {hasUrgentItems && (
              <Bell className="h-4 w-4 text-amber-500 animate-pulse" />
            )}
          </CardTitle>
          {hasUrgentItems && (
            <Badge variant="default" className="bg-amber-500">
              {criticalCount + highCount} urgent
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No upcoming deadlines
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((item) => (
              <div
                key={item.deadline.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                  item.isOverdue 
                    ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' 
                    : item.urgency === 'critical' || item.urgency === 'high'
                    ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">
                    {getUrgencyIcon(item.urgency)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.deadline.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.daysUntil, item.isOverdue)}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {getUrgencyBadge(item.urgency, item.isOverdue)}
                </div>
              </div>
            ))}
            
            {showViewAll && (
              <Link to="/tax-calendar">
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 text-sm"
                >
                  View Calendar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
