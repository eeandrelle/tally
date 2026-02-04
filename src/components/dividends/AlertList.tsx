/**
 * AlertList Component
 * 
 * Displays a list of dividend alerts with filtering and actions
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle,
  X,
  Download,
  RefreshCw,
  Bell,
  BellOff,
} from 'lucide-react';
import { AlertCard, AlertCardSkeleton } from './AlertCard';
import type { DividendAlert, AlertSeverity, AlertStatus, AlertType } from '@/lib/dividend-alerts';
import { getAlertTypeLabel } from '@/lib/dividend-alerts';

// ============================================================================
// TYPES
// ============================================================================

interface AlertListProps {
  alerts: DividendAlert[];
  isLoading?: boolean;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onDelete?: (alertId: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onSelectAlert?: (alert: DividendAlert) => void;
  showFilters?: boolean;
  showHeader?: boolean;
  title?: string;
  description?: string;
  maxHeight?: string;
  emptyState?: React.ReactNode;
}

// ============================================================================
// FILTER BADGE COMPONENT
// ============================================================================

function FilterBadge({ 
  label, 
  count, 
  active, 
  onClick 
}: { 
  label: string; 
  count: number; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`${active ? 'bg-primary-foreground/20' : 'bg-background'} px-1.5 py-0.5 rounded-full`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function DefaultEmptyState() {
  return (
    <div className="text-center py-12">
      <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium">No alerts found</h3>
      <p className="text-sm text-muted-foreground mt-1">
        You're all caught up! No dividend alerts to display.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertList({
  alerts,
  isLoading = false,
  onAcknowledge,
  onResolve,
  onDismiss,
  onDelete,
  onRefresh,
  onExport,
  onSelectAlert,
  showFilters = true,
  showHeader = true,
  title = 'Dividend Alerts',
  description,
  maxHeight = '600px',
  emptyState = <DefaultEmptyState />,
}: AlertListProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('active');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all');

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && alert.status !== 'active') return false;
        if (statusFilter !== 'active' && alert.status !== statusFilter) return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && alert.type !== typeFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = `${alert.companyName} ${alert.title} ${alert.message} ${alert.asxCode || ''}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by severity (critical first), then date
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts, statusFilter, severityFilter, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const byStatus = {
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved' || a.status === 'dismissed').length,
    };

    const bySeverity = {
      critical: alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved' && a.status !== 'dismissed').length,
      warning: alerts.filter(a => a.severity === 'warning' && a.status !== 'resolved' && a.status !== 'dismissed').length,
      info: alerts.filter(a => a.severity === 'info' && a.status !== 'resolved' && a.status !== 'dismissed').length,
    };

    return { byStatus, bySeverity };
  }, [alerts]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('active');
    setSeverityFilter('all');
    setTypeFilter('all');
  };

  const hasFilters = searchQuery || statusFilter !== 'active' || severityFilter !== 'all' || typeFilter !== 'all';

  // Loading state
  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <AlertCardSkeleton key={i} variant="compact" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      {showHeader && (
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {title}
              </CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button variant="outline" size="icon" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {onExport && (
                <Button variant="outline" size="icon" onClick={onExport}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mt-2">
            <FilterBadge
              label="Active"
              count={stats.byStatus.active}
              active={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
            />
            <FilterBadge
              label="Acknowledged"
              count={stats.byStatus.acknowledged}
              active={statusFilter === 'acknowledged'}
              onClick={() => setStatusFilter('acknowledged')}
            />
            <FilterBadge
              label="Resolved"
              count={stats.byStatus.resolved}
              active={statusFilter === 'resolved'}
              onClick={() => setStatusFilter('resolved')}
            />
          </div>

          {/* Severity filters */}
          {(stats.bySeverity.critical > 0 || stats.bySeverity.warning > 0 || stats.bySeverity.info > 0) && (
            <div className="flex flex-wrap gap-2">
              {stats.bySeverity.critical > 0 && (
                <button
                  onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    severityFilter === 'critical'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                  }`}
                >
                  <AlertCircle className="h-3 w-3" />
                  {stats.bySeverity.critical} Critical
                </button>
              )}
              {stats.bySeverity.warning > 0 && (
                <button
                  onClick={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    severityFilter === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {stats.bySeverity.warning} Warning
                </button>
              )}
              {stats.bySeverity.info > 0 && (
                <button
                  onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    severityFilter === 'info'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                  }`}
                >
                  <Info className="h-3 w-3" />
                  {stats.bySeverity.info} Info
                </button>
              )}
            </div>
          )}
        </CardHeader>
      )}

      {/* Search and filters */}
      {showFilters && (
        <div className="px-6 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredAlerts.length} of {alerts.length} alerts
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Alert list */}
      <CardContent className="p-0 flex-1">
        {filteredAlerts.length === 0 ? (
          <div className="p-6">
            {emptyState}
          </div>
        ) : (
          <ScrollArea className={maxHeight ? `h-[${maxHeight}]` : undefined}>
            <div className="p-4 space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  variant="compact"
                  onClick={() => onSelectAlert?.(alert)}
                  onAcknowledge={() => onAcknowledge?.(alert.id)}
                  onResolve={() => onResolve?.(alert.id)}
                  onDismiss={() => onDismiss?.(alert.id)}
                  onDelete={() => onDelete?.(alert.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ALERT LIST COMPACT
// ============================================================================

interface AlertListCompactProps {
  alerts: DividendAlert[];
  isLoading?: boolean;
  onSelectAlert?: (alert: DividendAlert) => void;
  maxItems?: number;
}

export function AlertListCompact({
  alerts,
  isLoading = false,
  onSelectAlert,
  maxItems = 5,
}: AlertListCompactProps) {
  const displayAlerts = alerts.slice(0, maxItems);
  const hasMore = alerts.length > maxItems;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <AlertCardSkeleton key={i} variant="compact" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-6">
        <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          variant="compact"
          onClick={() => onSelectAlert?.(alert)}
        />
      ))}
      {hasMore && (
        <p className="text-center text-sm text-muted-foreground">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
}

export default AlertList;
