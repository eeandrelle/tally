/**
 * DeadlineDetailDialog
 * 
 * Full event details dialog with actions for managing deadlines.
 * Allows marking complete, dismissing, and viewing history.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Bell,
  FileText,
  AlertCircle,
  Building2,
  User,
  Info,
} from 'lucide-react';
import { 
  type TaxDeadline, 
  type DeadlineType,
  getDeadlineTypeLabel,
  formatDeadlineDate,
  getDaysUntilDeadline,
} from '@/lib/tax-calendar';

interface DeadlineDetailDialogProps {
  deadline: TaxDeadline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  onReopen: (id: string) => void;
  isLoading?: boolean;
}

export function DeadlineDetailDialog({
  deadline,
  open,
  onOpenChange,
  onMarkComplete,
  onDismiss,
  onReopen,
  isLoading = false,
}: DeadlineDetailDialogProps) {
  if (!deadline) return null;
  
  const daysUntil = getDaysUntilDeadline(deadline.dueDate);
  const isOverdue = daysUntil < 0;
  
  const getTypeIcon = (type: DeadlineType) => {
    switch (type) {
      case 'BAS':
        return <Building2 className="h-5 w-5" />;
      case 'PAYG':
        return <User className="h-5 w-5" />;
      case 'TAX_RETURN':
        return <FileText className="h-5 w-5" />;
      case 'CUSTOM':
        return <Calendar className="h-5 w-5" />;
    }
  };
  
  const getTypeColor = (type: DeadlineType) => {
    switch (type) {
      case 'BAS':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'PAYG':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'TAX_RETURN':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'CUSTOM':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  const getStatusBadge = (status: TaxDeadline['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'dismissed':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Dismissed
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      case 'due_soon':
        return (
          <Badge variant="default" className="bg-amber-500">
            <Clock className="h-3 w-3 mr-1" />
            Due Soon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Upcoming
          </Badge>
        );
    }
  };
  
  const getUrgencyIndicator = () => {
    if (deadline.status === 'completed') {
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Completed</span>
          {deadline.completedAt && (
            <span className="text-sm text-muted-foreground">
              on {formatDeadlineDate(deadline.completedAt)}
            </span>
          )}
        </div>
      );
    }
    
    if (deadline.status === 'dismissed') {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Dismissed</span>
        </div>
      );
    }
    
    if (isOverdue) {
      return (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">
            {Math.abs(daysUntil) === 1 ? '1 day overdue' : `${Math.abs(daysUntil)} days overdue`}
          </span>
        </div>
      );
    }
    
    if (daysUntil === 0) {
      return (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Due today</span>
        </div>
      );
    }
    
    if (daysUntil === 1) {
      return (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Clock className="h-5 w-5" />
          <span className="font-medium">Due tomorrow</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
        <Clock className="h-5 w-5" />
        <span className="font-medium">Due in {daysUntil} days</span>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getTypeColor(deadline.type)}`}>
              {getTypeIcon(deadline.type)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg leading-tight">
                {deadline.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {getStatusBadge(deadline.status)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4">
            {/* Urgency Indicator */}
            <div className="bg-muted/50 rounded-lg p-4">
              {getUrgencyIndicator()}
            </div>
            
            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className={getTypeColor(deadline.type)}>
                  {getDeadlineTypeLabel(deadline.type)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="font-medium">
                  {formatDeadlineDate(deadline.dueDate)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Financial Year</span>
                <span className="font-medium">
                  FY {deadline.financialYear}/{deadline.financialYear + 1}
                </span>
              </div>
              
              {deadline.quarter && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quarter</span>
                  <span className="font-medium">Q{deadline.quarter}</span>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Description
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {deadline.description}
              </p>
            </div>
            
            {/* Reminders Sent */}
            {deadline.remindersSent.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminders Sent
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {deadline.remindersSent.map((days) => (
                      <Badge key={days} variant="secondary" className="text-xs">
                        {days} days before
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="gap-2">
          {deadline.status === 'completed' ? (
            <Button
              variant="outline"
              onClick={() => onReopen(deadline.id)}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reopen
            </Button>
          ) : deadline.status === 'dismissed' ? (
            <>
              <Button
                variant="outline"
                onClick={() => onReopen(deadline.id)}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
              <Button
                onClick={() => onMarkComplete(deadline.id)}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onDismiss(deadline.id)}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
              <Button
                onClick={() => onMarkComplete(deadline.id)}
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
