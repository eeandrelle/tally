/**
 * StatementParserProgress Component
 * Parsing progress indicator
 */

import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileSearch,
  Database,
  Circle
} from 'lucide-react';
import type { ParserProgress } from '@/lib/bank-statement-types';
import { cn } from '@/lib/utils';

interface StatementParserProgressProps {
  progress: ParserProgress;
  className?: string;
}

const statusConfig = {
  idle: {
    icon: Circle,
    label: 'Ready',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  reading: {
    icon: FileText,
    label: 'Reading PDF',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  parsing: {
    icon: FileSearch,
    label: 'Parsing Statement',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  extracting: {
    icon: Loader2,
    label: 'Extracting Data',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  saving: {
    icon: Database,
    label: 'Saving Transactions',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Complete',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
};

export function StatementParserProgress({
  progress,
  className,
}: StatementParserProgressProps) {
  const config = statusConfig[progress.status];
  const Icon = config.icon;
  const isSpinning = progress.status === 'reading' || 
                     progress.status === 'parsing' || 
                     progress.status === 'extracting' ||
                     progress.status === 'saving';
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full shrink-0',
            config.bgColor
          )}>
            <Icon className={cn(
              'h-6 w-6',
              config.color,
              isSpinning && 'animate-spin'
            )} />
          </div>
          
          {/* Progress Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className={cn('font-medium', config.color)}>
                {config.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.progress}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <Progress 
              value={progress.progress} 
              className={cn(
                'h-2',
                progress.status === 'error' && 'bg-red-200',
                progress.status === 'complete' && 'bg-green-200'
              )}
            />
            
            {/* Message */}
            {progress.message && (
              <p className="text-sm text-muted-foreground mt-2 truncate">
                {progress.message}
              </p>
            )}
            
            {/* Page Info */}
            {progress.totalPages && progress.status === 'extracting' && (
              <p className="text-xs text-muted-foreground mt-1">
                Page {progress.currentPage} of {progress.totalPages}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
