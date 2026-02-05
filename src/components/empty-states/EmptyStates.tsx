import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'page';
  illustration?: 'receipts' | 'documents' | 'search' | 'inbox' | 'chart' | 'custom';
}

const illustrations = {
  receipts: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <rect x="30" y="20" width="60" height="80" rx="4" fill="currentColor" fillOpacity="0.1" />
      <rect x="40" y="35" width="40" height="4" rx="2" fill="currentColor" fillOpacity="0.3" />
      <rect x="40" y="45" width="30" height="4" rx="2" fill="currentColor" fillOpacity="0.2" />
      <rect x="40" y="55" width="35" height="4" rx="2" fill="currentColor" fillOpacity="0.2" />
      <rect x="40" y="70" width="25" height="4" rx="2" fill="currentColor" fillOpacity="0.3" />
      <circle cx="85" cy="85" r="15" fill="currentColor" fillOpacity="0.1" />
      <path d="M80 85l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <rect x="25" y="15" width="50" height="70" rx="4" fill="currentColor" fillOpacity="0.1" />
      <rect x="35" y="30" width="30" height="3" rx="1.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="35" y="40" width="25" height="3" rx="1.5" fill="currentColor" fillOpacity="0.2" />
      <rect x="35" y="50" width="28" height="3" rx="1.5" fill="currentColor" fillOpacity="0.2" />
      <rect x="50" y="35" width="45" height="60" rx="4" fill="currentColor" fillOpacity="0.15" />
      <rect x="60" y="50" width="25" height="3" rx="1.5" fill="currentColor" fillOpacity="0.25" />
      <rect x="60" y="60" width="20" height="3" rx="1.5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <circle cx="55" cy="55" r="30" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <circle cx="55" cy="55" r="20" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      <line x1="78" y1="78" x2="100" y2="100" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      <circle cx="55" cy="55" r="8" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <rect x="20" y="35" width="80" height="60" rx="6" fill="currentColor" fillOpacity="0.1" />
      <path d="M20 45l40 25 40-25" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
      <circle cx="95" cy="30" r="12" fill="currentColor" fillOpacity="0.15" />
      <path d="M91 30l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <rect x="20" y="20" width="80" height="80" rx="4" fill="currentColor" fillOpacity="0.1" />
      <rect x="35" y="65" width="12" height="25" rx="2" fill="currentColor" fillOpacity="0.3" />
      <rect x="54" y="45" width="12" height="45" rx="2" fill="currentColor" fillOpacity="0.4" />
      <rect x="73" y="55" width="12" height="35" rx="2" fill="currentColor" fillOpacity="0.25" />
      <line x1="30" y1="95" x2="90" y2="95" stroke="currentColor" strokeWidth="2" opacity="0.2" />
    </svg>
  ),
  custom: null,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  variant = 'default',
  illustration = 'custom',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'p-6',
      icon: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      title: 'text-sm',
      description: 'text-xs',
      illustration: 'w-20 h-20',
    },
    md: {
      container: 'p-8',
      icon: 'w-14 h-14',
      iconInner: 'w-7 h-7',
      title: 'text-base',
      description: 'text-sm',
      illustration: 'w-28 h-28',
    },
    lg: {
      container: 'p-12',
      icon: 'w-20 h-20',
      iconInner: 'w-10 h-10',
      title: 'text-xl',
      description: 'text-base',
      illustration: 'w-36 h-36',
    },
  };

  const variantClasses = {
    default: '',
    card: 'bg-card border rounded-xl shadow-sm',
    page: 'min-h-[60vh]',
  };

  const Illustration = illustrations[illustration];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses[size].container,
        variantClasses[variant],
        className
      )}
    >
      {Illustration && illustration !== 'custom' ? (
        <div 
          className={cn(
            'text-muted-foreground/50 mb-6',
            sizeClasses[size].illustration
          )}
        >
          {Illustration}
        </div>
      ) : Icon ? (
        <div 
          className={cn(
            'rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mb-4',
            sizeClasses[size].icon
          )}
        >
          <Icon className={cn('text-violet-500', sizeClasses[size].iconInner)} />
        </div>
      ) : null}
      
      <h3 className={cn('font-semibold text-foreground mb-1', sizeClasses[size].title)}>
        {title}
      </h3>
      
      {description && (
        <p className={cn('text-muted-foreground max-w-sm mb-4', sizeClasses[size].description)}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

// Specialized empty states for common scenarios

interface EmptyReceiptsProps {
  onAddReceipt?: () => void;
  className?: string;
}

export function EmptyReceipts({ onAddReceipt, className }: EmptyReceiptsProps) {
  return (
    <EmptyState
      illustration="receipts"
      title="No receipts yet"
      description="Start tracking your tax deductions by adding your first receipt."
      action={
        <Button onClick={onAddReceipt} className="bg-violet-600">
          Add Receipt
        </Button>
      }
      className={className}
    />
  );
}

interface EmptySearchProps {
  query?: string;
  onClear?: () => void;
  className?: string;
}

export function EmptySearch({ query, onClear, className }: EmptySearchProps) {
  return (
    <EmptyState
      illustration="search"
      title={query ? `No results for "${query}"` : 'No matches found'}
      description="Try adjusting your search terms or filters to find what you're looking for."
      action={
        onClear && (
          <Button variant="outline" onClick={onClear}>
            Clear Filters
          </Button>
        )
      }
      className={className}
    />
  );
}

interface EmptyDocumentsProps {
  onUpload?: () => void;
  className?: string;
}

export function EmptyDocuments({ onUpload, className }: EmptyDocumentsProps) {
  return (
    <EmptyState
      illustration="documents"
      title="No documents uploaded"
      description="Upload tax documents, invoices, or statements to keep everything organized."
      action={
        <Button onClick={onUpload} className="bg-violet-600">
          Upload Document
        </Button>
      }
      className={className}
    />
  );
}

interface EmptyInboxProps {
  message?: string;
  className?: string;
}

export function EmptyInbox({ message = "You're all caught up!", className }: EmptyInboxProps) {
  return (
    <EmptyState
      illustration="inbox"
      title="No new notifications"
      description={message}
      className={className}
    />
  );
}

interface EmptyChartProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyChart({ 
  title = 'No data to display', 
  description = 'Add some receipts to see your spending insights.',
  className 
}: EmptyChartProps) {
  return (
    <EmptyState
      illustration="chart"
      title={title}
      description={description}
      size="sm"
      className={className}
    />
  );
}

// Beta-specific empty state
interface BetaEmptyStateProps {
  feature: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function BetaEmptyState({ feature, description, action, className }: BetaEmptyStateProps) {
  return (
    <EmptyState
      illustration="documents"
      title={feature}
      description={description}
      action={
        <>
          {action}
          <Badge variant="outline" className="text-violet-500 border-violet-500/20 bg-violet-500/5">
            Beta Feature
          </Badge>
        </>
      }
      className={className}
    />
  );
}
