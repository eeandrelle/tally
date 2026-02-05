import { Link, useRouter } from '@tanstack/react-router';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// Route to readable name mapping
const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/receipts': 'Receipts',
  '/invoices': 'Invoices',
  '/bank-statements': 'Bank Sync',
  '/ato-categories': 'Categories',
  '/review-queue': 'Review Queue',
  '/categorization-suggestions': 'Suggestions',
  '/gst-summary': 'BAS',
  '/tax-report': 'Tax Return',
  '/workpapers': 'Workpapers',
  '/analytics': 'Analytics',
  '/accountant-portal': 'Accountant Portal',
  '/exports': 'Downloads',
  '/settings': 'Settings',
  '/gallery': 'Gallery',
  '/documents': 'Documents',
  '/income': 'Income',
  '/category-breakdown': 'Category Breakdown',
};

// Parent route mapping for hierarchy
const routeParents: Record<string, string> = {
  '/receipts': '/dashboard',
  '/invoices': '/dashboard',
  '/bank-statements': '/dashboard',
  '/ato-categories': '/dashboard',
  '/review-queue': '/dashboard',
  '/categorization-suggestions': '/dashboard',
  '/gst-summary': '/dashboard',
  '/tax-report': '/dashboard',
  '/workpapers': '/dashboard',
  '/analytics': '/dashboard',
  '/accountant-portal': '/dashboard',
  '/exports': '/dashboard',
  '/settings': '/dashboard',
  '/gallery': '/receipts',
  '/documents': '/dashboard',
  '/income': '/dashboard',
  '/category-breakdown': '/analytics',
};

interface BreadcrumbsProps {
  className?: string;
  /** Override the current page title */
  currentTitle?: string;
  /** Additional breadcrumb items to append */
  items?: { label: string; href?: string }[];
}

export function Breadcrumbs({ className, currentTitle, items = [] }: BreadcrumbsProps) {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  // Build breadcrumb trail
  const trail: { label: string; href?: string }[] = [];
  
  // Always start with Dashboard
  if (pathname !== '/dashboard') {
    trail.push({ label: 'Dashboard', href: '/dashboard' });
  }

  // Find parent if exists
  const basePath = '/' + pathname.split('/')[1];
  const parent = routeParents[basePath];
  
  if (parent && parent !== '/dashboard') {
    trail.push({
      label: routeNames[parent] || parent.slice(1),
      href: parent,
    });
  }

  // Add current page (without link)
  const currentPageName = currentTitle || routeNames[basePath] || basePath.slice(1);
  trail.push({ label: currentPageName });

  // Add any additional items
  items.forEach((item) => {
    // Remove current page name, add item
    if (trail.length > 0 && !trail[trail.length - 1].href) {
      trail[trail.length - 1].href = pathname;
    }
    trail.push(item);
  });

  // Don't show breadcrumbs on dashboard
  if (pathname === '/dashboard' && items.length === 0) {
    return null;
  }

  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              {crumb.href && !isLast ? (
                <Link
                  to={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {index === 0 && trail[0].label === 'Dashboard' ? (
                    <span className="flex items-center gap-1">
                      <Home className="w-4 h-4" />
                      <span className="sr-only md:not-sr-only">{crumb.label}</span>
                    </span>
                  ) : (
                    crumb.label
                  )}
                </Link>
              ) : (
                <span className={cn(isLast ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
