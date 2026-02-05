/**
 * Connection Status Indicator Component
 * Shows bank connection status for TAL-186
 */

import { cn } from '@/lib/utils';
import type { BankName } from '@/lib/bank-statement-types';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Unplug,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ConnectionStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'connecting' 
  | 'error' 
  | 'syncing'
  | 'expiring';

export interface BankConnection {
  id: string;
  bank: BankName;
  accountName: string;
  accountNumber: string;
  status: ConnectionStatus;
  lastSync?: Date;
  nextSync?: Date;
  expiresAt?: Date;
  errorMessage?: string;
}

interface ConnectionStatusIndicatorProps {
  connection: BankConnection;
  onSync?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  className?: string;
}

const bankInfo: Record<BankName, { name: string; color: string }> = {
  commbank: { name: 'CommBank', color: '#FFCC00' },
  nab: { name: 'NAB', color: '#BE0F34' },
  westpac: { name: 'Westpac', color: '#D5002B' },
  anz: { name: 'ANZ', color: '#0072AC' },
  ing: { name: 'ING', color: '#FF6600' },
};

export function ConnectionStatusIndicator({
  connection,
  onSync,
  onDisconnect,
  onReconnect,
  className,
}: ConnectionStatusIndicatorProps) {
  const bank = bankInfo[connection.bank];
  const statusConfig = getStatusConfig(connection.status);

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border bg-card p-4',
      className
    )}>
      {/* Bank logo */}
      <div 
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${bank.color}15` }}
      >
        <span 
          className="text-lg font-bold"
          style={{ color: bank.color }}
        >
          {getBankInitials(bank.name)}
        </span>
      </div>

      {/* Connection info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{bank.name}</span>
          <StatusBadge status={connection.status} />
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {connection.accountName} ••••{connection.accountNumber.slice(-4)}
        </p>
        {connection.lastSync && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Last synced {formatTimeAgo(connection.lastSync)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {connection.status === 'connected' && onSync && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSync}
            title="Sync now"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        {(connection.status === 'error' || connection.status === 'expiring') && onReconnect && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onReconnect}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconnect
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {connection.status === 'connected' && onSync && (
              <DropdownMenuItem onClick={onSync}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Clock className="h-4 w-4 mr-2" />
              View Sync History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onDisconnect && (
              <DropdownMenuItem 
                onClick={onDisconnect}
                className="text-destructive focus:text-destructive"
              >
                <Unplug className="h-4 w-4 mr-2" />
                Disconnect
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Compact version for lists
interface CompactConnectionStatusProps {
  status: ConnectionStatus;
  className?: string;
}

export function CompactConnectionStatus({ 
  status, 
  className 
}: CompactConnectionStatusProps) {
  const config = getStatusConfig(status);
  
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <config.icon className={cn('h-3.5 w-3.5', config.color)} />
      <span className={cn('text-xs', config.textColor)}>{config.label}</span>
    </div>
  );
}

// Status badge component
interface StatusBadgeProps {
  status: ConnectionStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      config.badgeClass
    )}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// Status configuration
function getStatusConfig(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return {
        label: 'Connected',
        icon: CheckCircle2,
        color: 'text-green-500',
        textColor: 'text-green-600',
        badgeClass: 'bg-green-500/10 text-green-600',
      };
    case 'disconnected':
      return {
        label: 'Disconnected',
        icon: Unplug,
        color: 'text-gray-400',
        textColor: 'text-muted-foreground',
        badgeClass: 'bg-gray-500/10 text-muted-foreground',
      };
    case 'connecting':
      return {
        label: 'Connecting...',
        icon: Loader2,
        color: 'text-blue-500',
        textColor: 'text-blue-600',
        badgeClass: 'bg-blue-500/10 text-blue-600',
      };
    case 'syncing':
      return {
        label: 'Syncing...',
        icon: RefreshCw,
        color: 'text-blue-500',
        textColor: 'text-blue-600',
        badgeClass: 'bg-blue-500/10 text-blue-600',
      };
    case 'error':
      return {
        label: 'Error',
        icon: XCircle,
        color: 'text-red-500',
        textColor: 'text-red-600',
        badgeClass: 'bg-red-500/10 text-red-600',
      };
    case 'expiring':
      return {
        label: 'Expiring Soon',
        icon: AlertTriangle,
        color: 'text-amber-500',
        textColor: 'text-amber-600',
        badgeClass: 'bg-amber-500/10 text-amber-600',
      };
    default:
      return {
        label: 'Unknown',
        icon: AlertTriangle,
        color: 'text-gray-400',
        textColor: 'text-muted-foreground',
        badgeClass: 'bg-gray-500/10 text-muted-foreground',
      };
  }
}

// Connection status list
interface ConnectionListProps {
  connections: BankConnection[];
  onSync?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  onReconnect?: (id: string) => void;
  className?: string;
}

export function ConnectionList({
  connections,
  onSync,
  onDisconnect,
  onReconnect,
  className,
}: ConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Unplug className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No bank connections yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your bank to automatically import transactions
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {connections.map((connection) => (
        <ConnectionStatusIndicator
          key={connection.id}
          connection={connection}
          onSync={() => onSync?.(connection.id)}
          onDisconnect={() => onDisconnect?.(connection.id)}
          onReconnect={() => onReconnect?.(connection.id)}
        />
      ))}
    </div>
  );
}

// Helper functions
function getBankInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}
