import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  className?: string;
  variant?: 'default' | 'card' | 'page' | 'inline';
}

export function LoadingState({ className, variant = 'default' }: LoadingStateProps) {
  const variantClasses = {
    default: 'p-8',
    card: 'p-6 bg-card border rounded-xl',
    page: 'p-12 min-h-[60vh]',
    inline: 'p-4',
  };

  return (
    <div className={cn('flex items-center justify-center', variantClasses[variant], className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-10 h-10 border-4 border-transparent border-t-indigo-500/40 rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }} />
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
      </div>
    </div>
  );
}

// Skeleton layouts for common patterns

interface SkeletonCardProps {
  className?: string;
  hasHeader?: boolean;
  hasFooter?: boolean;
  rows?: number;
}

export function SkeletonCard({ 
  className, 
  hasHeader = true, 
  hasFooter = false,
  rows = 3 
}: SkeletonCardProps) {
  return (
    <div className={cn('bg-card border rounded-xl p-6 space-y-4', className)}>
      {hasHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" style={{ width: `${Math.random() * 30 + 70}%` }} />
        ))}
      </div>
      {hasFooter && (
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export function SkeletonStats({ count = 4, className }: SkeletonStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonListProps {
  rows?: number;
  className?: string;
  hasAvatar?: boolean;
  hasAction?: boolean;
}

export function SkeletonList({ 
  rows = 5, 
  className,
  hasAvatar = true,
  hasAction = true 
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-card border rounded-lg">
          {hasAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16" />
          {hasAction && <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted/50 p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full max-w-[100px]" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" style={{ maxWidth: j === 0 ? '200px' : '100px' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonDashboardProps {
  className?: string;
}

export function SkeletonDashboard({ className }: SkeletonDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats row */}
      <SkeletonStats count={4} />
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-48" />
          <SkeletonList rows={6} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <SkeletonCard hasHeader={false} rows={4} />
          <SkeletonCard hasHeader={false} rows={3} />
        </div>
      </div>
    </div>
  );
}

// Receipt-specific loading states

export function SkeletonReceiptCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card border rounded-xl p-4 space-y-3', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function SkeletonReceiptGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonReceiptCard key={i} />
      ))}
    </div>
  );
}

// Page loading states

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500/40 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
      </div>
      <h2 className="text-xl font-semibold mb-2">Tally</h2>
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

// Button loading state

interface LoadingButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function LoadingButtonContent({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  if (!loading) return <>{children}</>;
  
  return (
    <>
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      {children}
    </>
  );
}
