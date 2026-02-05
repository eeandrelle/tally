/**
 * OAuth Consent Screen Component
 * Bank connection consent for TAL-186
 */

import { cn } from '@/lib/utils';
import type { BankName } from '@/lib/bank-statement-types';
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface OAuthConsentScreenProps {
  bank: BankName;
  onConsent: (options: ConsentOptions) => void;
  onCancel: () => void;
  className?: string;
}

export interface ConsentOptions {
  readTransactions: boolean;
  readAccountInfo: boolean;
  readBalances: boolean;
  ongoingAccess: boolean;
}

const bankInfo: Record<BankName, { name: string; color: string }> = {
  commbank: { name: 'Commonwealth Bank', color: '#FFCC00' },
  nab: { name: 'NAB', color: '#BE0F34' },
  westpac: { name: 'Westpac', color: '#D5002B' },
  anz: { name: 'ANZ', color: '#0072AC' },
  ing: { name: 'ING', color: '#FF6600' },
};

export function OAuthConsentScreen({
  bank,
  onConsent,
  onCancel,
  className,
}: OAuthConsentScreenProps) {
  const [options, setOptions] = useState<ConsentOptions>({
    readTransactions: true,
    readAccountInfo: true,
    readBalances: true,
    ongoingAccess: true,
  });
  const [accepted, setAccepted] = useState(false);

  const bankDetails = bankInfo[bank];

  const handleConsent = () => {
    if (accepted) {
      onConsent(options);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with bank branding */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm"
            style={{ backgroundColor: `${bankDetails.color}15` }}
          >
            <span 
              className="text-2xl font-bold"
              style={{ color: bankDetails.color }}
            >
              {getBankInitials(bankDetails.name)}
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Connect to {bankDetails.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tally uses Basiq to securely connect to your bank
          </p>
        </div>
      </div>

      {/* Security badges */}
      <div className="flex justify-center gap-4">
        <SecurityBadge icon={Shield} label="CDR Compliant" />
        <SecurityBadge icon={Lock} label="256-bit SSL" />
        <SecurityBadge icon={Eye} label="Read-only" />
      </div>

      {/* Data access section */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b">
          <Database className="h-4 w-4 text-primary" />
          <span className="font-medium">Data Tally Can Access</span>
        </div>

        <div className="space-y-3">
          <PermissionItem
            icon={RefreshCw}
            title="Transaction History"
            description="View your transactions for tax deduction tracking"
            checked={options.readTransactions}
            onCheckedChange={(checked) => 
              setOptions(prev => ({ ...prev, readTransactions: checked }))
            }
            required
          />
          <PermissionItem
            icon={CheckCircle2}
            title="Account Information"
            description="Account names and numbers for identification"
            checked={options.readAccountInfo}
            onCheckedChange={(checked) => 
              setOptions(prev => ({ ...prev, readAccountInfo: checked }))
            }
            required
          />
          <PermissionItem
            icon={CheckCircle2}
            title="Account Balances"
            description="Current and available balances"
            checked={options.readBalances}
            onCheckedChange={(checked) => 
              setOptions(prev => ({ ...prev, readBalances: checked }))
            }
          />
        </div>
      </div>

      {/* Ongoing access */}
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
        <Checkbox
          id="ongoing"
          checked={options.ongoingAccess}
          onCheckedChange={(checked) => 
            setOptions(prev => ({ ...prev, ongoingAccess: checked as boolean }))
          }
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="ongoing"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Keep connection active
          </label>
          <p className="text-xs text-muted-foreground">
            Automatically sync new transactions. You can disconnect anytime in settings.
          </p>
        </div>
      </div>

      {/* Terms acceptance */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="terms"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked as boolean)}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I agree to share this data
          </label>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Data Sharing Agreement</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 gap-2"
          disabled={!accepted}
          onClick={handleConsent}
        >
          Connect Securely
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Learn more link */}
      <p className="text-center text-xs text-muted-foreground">
        <a href="#" className="hover:text-primary hover:underline">
          How does Tally keep my data safe?
        </a>
      </p>
    </div>
  );
}

interface SecurityBadgeProps {
  icon: React.ElementType;
  label: string;
}

function SecurityBadge({ icon: Icon, label }: SecurityBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
        <Icon className="h-4 w-4 text-green-500" />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface PermissionItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
}

function PermissionItem({ 
  icon: Icon, 
  title, 
  description, 
  checked, 
  onCheckedChange,
  required 
}: PermissionItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          {required && (
            <span className="text-xs text-muted-foreground">(Required)</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c as boolean)}
        disabled={required}
      />
    </div>
  );
}

function getBankInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
