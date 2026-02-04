/**
 * AlertCard Component
 * 
 * Displays a single dividend alert with actions
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Clock,
  Calendar,
  DollarSign,
  Building2,
  ChevronRight,
} from 'lucide-react';
import type { DividendAlert, AlertSeverity, AlertStatus, AlertType } from '@/lib/dividend-alerts';
import { getSeverityColor, getAlertTypeLabel, getStatusColor } from '@/lib/dividend-alerts';
import { formatDistanceToNow, format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface AlertCardProps {
  alert: DividendAlert;
  variant?: 'compact' | 'full';
  showActions?: boolean;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  onDismiss?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
}

// ============================================================================
// ICON COMPONENT
// ============================================================================

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  const iconClass = 'h-5 w-5';
  
  switch (severity) {
    case 'critical':
      return <AlertCircle className={`${iconClass} text-red-600 dark:text-red-400`} />;
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
    case 'info':
      return <Info className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
    default:
      return <Info className={iconClass} />;
  }
}

function TypeIcon({ type }: { type: AlertType }) {
  const iconClass = 'h-4 w-4 text-muted-foreground';
  
  switch (type) {
    case 'missed_payment':
      return <Calendar className={iconClass} />;
    case 'frequency_change':
      return <Clock className={iconClass} />;
    case 'amount_anomaly':
      return <DollarSign className={iconClass} />;
    case 'early_payment':
    case 'late_payment':
      return <Clock className={iconClass} />;
    default:
      return <Info className={iconClass} />;
  }
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

function CompactAlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
  onClick,
}: AlertCardProps) {
  const isResolved = alert.status === 'resolved' || alert.status === 'dismissed';
  
  return (
    <Card 
      className={`transition-all hover:shadow-md cursor-pointer ${
        isResolved ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity).split(' ')[2]}`}>
            <SeverityIcon severity={alert.severity} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">
                {alert.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                <TypeIcon type={alert.type} />
                <span className="ml-1">{getAlertTypeLabel(alert.type)}</span>
              </Badge>
              {alert.asxCode && (
                <Badge variant="secondary" className="text-[10px]">
                  {alert.asxCode}
                </Badge>
              )}
            </div>
            
            <p className="font-medium mt-1 truncate">{alert.title}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">{alert.message}</p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </span>
              
              {alert.status !== 'active' && (
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(alert.status)}`}>
                  {alert.status}
                </Badge>
              )}
            </div>
          </div>
          
          <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FULL VARIANT
// ============================================================================

function FullAlertCard({
  alert,
  showActions = true,
  onAcknowledge,
  onResolve,
  onDismiss,
  onDelete,
}: AlertCardProps) {
  const isActive = alert.status === 'active';
  const isAcknowledged = alert.status === 'acknowledged';
  
  return (
    <Card className={`${!isActive ? 'opacity-80' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity).split(' ')[2]}`}>
              <SeverityIcon severity={alert.severity} />
            </div>
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {alert.severity}
                </Badge>
                <Badge variant="outline">
                  {getAlertTypeLabel(alert.type)}
                </Badge>
                {alert.status !== 'active' && (
                  <Badge variant="outline" className={getStatusColor(alert.status)}>
                    {alert.status}
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mt-2">{alert.title}</h3>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                {alert.companyName}
                {alert.asxCode && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {alert.asxCode}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {showActions && isActive && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onAcknowledge}
                title="Acknowledge"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onDismiss}
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        <p className="text-sm">{alert.message}</p>
        
        {/* Expected vs Actual */}
        {(alert.expectedAmount !== undefined || alert.actualAmount !== undefined) && (
          <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-lg">
            {alert.expectedAmount !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Expected Amount</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  }).format(alert.expectedAmount)}
                </p>
                {alert.expectedDate && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alert.expectedDate), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
            
            {alert.actualAmount !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Actual Amount</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  }).format(alert.actualAmount)}
                </p>
                {alert.actualDate && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alert.actualDate), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Deviation metrics */}
        {(alert.daysDeviation !== undefined || alert.amountDeviationPercent !== undefined) && (
          <div className="flex gap-4">
            {alert.daysDeviation !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {alert.daysDeviation > 0 ? '+' : ''}{alert.daysDeviation} days
                </span>
              </div>
            )}
            
            {alert.amountDeviationPercent !== undefined && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {alert.amountDeviationPercent > 0 ? '+' : ''}
                  {alert.amountDeviationPercent.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Pattern change info */}
        {alert.previousPattern && alert.currentPattern && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Frequency Change</p>
            <p className="text-sm">
              <span className="line-through text-muted-foreground">{alert.previousPattern}</span>
              {' → '}
              <span className="font-medium">{alert.currentPattern}</span>
            </p>
          </div>
        )}
        
        {/* Details */}
        {alert.details && Object.keys(alert.details).length > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            {alert.details.suggestedAction && (
              <p className="text-muted-foreground">
                Suggested action: <span className="font-medium capitalize">{String(alert.details.suggestedAction).replace(/_/g, ' ')}</span>
              </p>
            )}
            {alert.details.historicalReliability !== undefined && (
              <p className="text-muted-foreground">
                Historical reliability: <span className="font-medium">{(Number(alert.details.historicalReliability) * 100).toFixed(0)}%</span>
              </p>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            {alert.acknowledgedBy && ` • Acknowledged by ${alert.acknowledgedBy}`}
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              {isActive && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onAcknowledge}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Acknowledge
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onResolve}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Resolve
                  </Button>
                </>
              )}
              {isAcknowledged && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onResolve}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Resolve
                </Button>
              )}
              {(isActive || isAcknowledged) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onDelete}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertCard(props: AlertCardProps) {
  const { variant = 'compact' } = props;

  if (variant === 'compact') {
    return <CompactAlertCard {...props} />;
  }

  return <FullAlertCard {...props} />;
}

// ============================================================================
// SKELETON
// ============================================================================

export function AlertCardSkeleton({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  if (variant === 'compact') {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-muted rounded-lg" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-5 bg-muted rounded w-3/4 mb-1" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-muted rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-6 bg-muted rounded w-3/4 mb-1" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-20 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

export default AlertCard;
