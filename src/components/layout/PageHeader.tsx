import { ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './Breadcrumbs';

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Show back button - can be boolean or specific path */
  back?: boolean | string;
  /** Override breadcrumb title */
  breadcrumbTitle?: string;
  /** Additional breadcrumb items */
  breadcrumbItems?: { label: string; href?: string }[];
  /** Action buttons to show on the right */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
  /** Content to show below header (e.g., tabs, filters) */
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  back,
  breadcrumbTitle,
  breadcrumbItems,
  actions,
  className,
  children,
}: PageHeaderProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (typeof back === 'string') {
      router.navigate({ to: back });
    } else {
      router.history.back();
    }
  };

  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      <Breadcrumbs 
        currentTitle={breadcrumbTitle} 
        items={breadcrumbItems}
        className="mb-4"
      />
      
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Back button */}
          {back && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="mt-0.5 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}
          
          {/* Title and description */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      
      {/* Additional content (tabs, filters, etc.) */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
