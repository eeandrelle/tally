/**
 * AlertDetailDialog Component
 * 
 * Detailed view of a dividend alert with full information and actions
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
  TrendingUp,
  TrendingDown,
  Repeat,
  User,
  FileText,
  History,
} from 'lucide-react';
import { useState } from 'react';
import type { DividendAlert, AlertSeverity, AlertType } from '@/lib/dividend-alerts';
import { getSeverityColor, getAlertTypeLabel, getStatusColor } from '@/lib/dividend-alerts';
import { format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface AlertDetailDialogProps {
  alert: DividendAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
  onResolve?: (notes?: string) => void;
  onDismiss?: (notes?: string) => void;
}

// ============================================================================
// ICON COMPONENTS
// ============================================================================

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  const iconClass = 'h-6 w-6';
  
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
  const iconClass = 'h-5 w-5';
  
  switch (type) {
    case 'missed_payment':
      return <Calendar className={iconClass} />;
    case 'frequency_change':
      return <Repeat className={iconClass} />;
    case 'amount_anomaly':
      return <DollarSign className={iconClass} />;
    case 'early_payment':
      return <TrendingUp className={iconClass} />;
    case 'late_payment':
      return <TrendingDown className={iconClass} />;
    default:
      return <Info className={iconClass} />;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AlertDetailDialog({
  alert,
  isOpen,
  onClose,
  onAcknowledge,
  onResolve,
  onDismiss,
}: AlertDetailDialogProps) {
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (!alert) return null;

  const isActive = alert.status === 'active';
  const isAcknowledged = alert.status === 'acknowledged';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${getSeverityColor(alert.severity).split(' ')[2]}`}>
              <SeverityIcon severity={alert.severity} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'default' : 'outline'}
                  className="capitalize"
                >
                  {alert.severity}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <TypeIcon type={alert.type} />
                  <span className="ml-1">{getAlertTypeLabel(alert.type)}</span>
                </Badge>
                <Badge variant="outline" className={getStatusColor(alert.status)}>
                  {alert.status}
                </Badge>
              </div>
              
              <DialogTitle className="text-xl mt-2">{alert.title}</DialogTitle>
              
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                {alert.companyName}
                {alert.asxCode && (
                  <Badge variant="secondary" className="text-xs">
                    {alert.asxCode}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6 py-4">
            {/* Alert message */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">{alert.message}</p>
            </div>

            {/* Expected vs Actual */}
            {(alert.expectedAmount !== undefined || alert.actualAmount !== undefined) && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Details
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {alert.expectedAmount !== undefined && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Expected Amount</p>
                        <p className="text-lg font-semibold">
                          {new Intl.NumberFormat('en-AU', {
                            style: 'currency',
                            currency: 'AUD',
                          }).format(alert.expectedAmount)}
                        </p>
                        {alert.expectedDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(alert.expectedDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {alert.actualAmount !== undefined && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Actual Amount</p>
                        <p className="text-lg font-semibold">
                          {new Intl.NumberFormat('en-AU', {
                            style: 'currency',
                            currency: 'AUD',
                          }).format(alert.actualAmount)}
                        </p>
                        {alert.actualDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(alert.actualDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deviation metrics */}
            {(alert.daysDeviation !== undefined || alert.amountDeviationPercent !== undefined) && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deviation Analysis
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {alert.daysDeviation !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Timing Deviation</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-semibold">
                            {alert.daysDeviation > 0 ? '+' : ''}{alert.daysDeviation} days
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.daysDeviation > 0 
                            ? 'Payment is overdue' 
                            : alert.daysDeviation < 0 
                              ? 'Payment arrived early' 
                              : 'On time'}
                        </p>
                      </div>
                    )}
                    
                    {alert.amountDeviationPercent !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Amount Deviation</p>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-semibold">
                            {alert.amountDeviationPercent > 0 ? '+' : ''}
                            {alert.amountDeviationPercent.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.amountDeviationPercent > 0 
                            ? 'Higher than expected' 
                            : alert.amountDeviationPercent < 0 
                              ? 'Lower than expected' 
                              : 'As expected'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pattern change */}
            {alert.previousPattern && alert.currentPattern && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Pattern Change Detected
                  </h4>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Previous Pattern</p>
                      <p className="font-medium line-through">{alert.previousPattern}</p>
                    </div>
                    
                    <div className="text-muted-foreground">
                      →
                    </div>
                    
                    <div className="flex-1 text-center p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Current Pattern</p>
                      <p className="font-medium text-primary">{alert.currentPattern}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            {alert.details && Object.keys(alert.details).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Details
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {alert.details.suggestedAction && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Suggested Action</span>
                        <span className="font-medium capitalize">
                          {String(alert.details.suggestedAction).replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    
                    {alert.details.historicalReliability !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Historical Reliability</span>
                        <span className="font-medium">
                          {(Number(alert.details.historicalReliability) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    {alert.details.lastPaymentDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Payment</span>
                        <span className="font-medium">
                          {format(new Date(String(alert.details.lastPaymentDate)), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    
                    {alert.details.averageAmount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Historical Average</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('en-AU', {
                            style: 'currency',
                            currency: 'AUD',
                          }).format(Number(alert.details.averageAmount))}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Alert History
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(alert.createdAt), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{format(new Date(alert.updatedAt), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  
                  {alert.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolved</span>
                      <span>{format(new Date(alert.resolvedAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  )}
                  
                  {alert.acknowledgedBy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acknowledged By</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {alert.acknowledgedBy}
                      </span>
                    </div>
                  )}
                  
                  {alert.notes && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Notes</span>
                      <p className="mt-1 text-sm">{alert.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes input */}
            {(isActive || isAcknowledged) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Notes</label>
                <Textarea
                  placeholder="Add notes about this alert..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {isActive && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onAcknowledge?.()}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onResolve?.(notes)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Resolve
                </Button>
              </>
            )}
            {isAcknowledged && (
              <Button
                variant="outline"
                onClick={() => onResolve?.(notes)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {(isActive || isAcknowledged) && (
              <Button
                variant="ghost"
                onClick={() => onDismiss?.(notes)}
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AlertDetailDialog;
