/**
 * Enhanced Bank Selector Component
 * Grid-based bank selection with logos for TAL-186
 */

import type { BankName } from '@/lib/bank-statement-types';
import { getSupportedBanks } from '@/lib/bank-parser-configs';
import { cn } from '@/lib/utils';
import { Check, Shield, Lock } from 'lucide-react';

interface BankOption {
  name: BankName;
  displayName: string;
  logoColor: string;
  popular?: boolean;
}

const bankOptions: BankOption[] = [
  { 
    name: 'commbank', 
    displayName: 'CommBank', 
    logoColor: '#FFCC00',
    popular: true 
  },
  { 
    name: 'nab', 
    displayName: 'NAB', 
    logoColor: '#BE0F34',
    popular: true 
  },
  { 
    name: 'westpac', 
    displayName: 'Westpac', 
    logoColor: '#D5002B',
    popular: true 
  },
  { 
    name: 'anz', 
    displayName: 'ANZ', 
    logoColor: '#0072AC',
    popular: true 
  },
  { 
    name: 'ing', 
    displayName: 'ING', 
    logoColor: '#FF6600' 
  },
];

interface EnhancedBankSelectorProps {
  selectedBank: BankName | null;
  onSelect: (bank: BankName) => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedBankSelector({
  selectedBank,
  onSelect,
  disabled = false,
  className,
}: EnhancedBankSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Popular banks section */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Popular Banks</p>
        <div className="grid grid-cols-2 gap-3">
          {bankOptions.filter(b => b.popular).map((bank) => (
            <BankCard
              key={bank.name}
              bank={bank}
              isSelected={selectedBank === bank.name}
              onClick={() => onSelect(bank.name)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Other banks section */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Other Banks</p>
        <div className="grid grid-cols-2 gap-3">
          {bankOptions.filter(b => !b.popular).map((bank) => (
            <BankCard
              key={bank.name}
              bank={bank}
              isSelected={selectedBank === bank.name}
              onClick={() => onSelect(bank.name)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 text-green-500" />
        <span>Bank-grade encryption & secure OAuth connection</span>
      </div>
    </div>
  );
}

interface BankCardProps {
  bank: BankOption;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function BankCard({ bank, isSelected, onClick, disabled }: BankCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200',
        'hover:border-primary/50 hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isSelected 
          ? 'border-primary bg-primary/5 shadow-sm' 
          : 'border-border bg-card',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Bank logo placeholder */}
      <div 
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold text-sm"
        style={{ 
          backgroundColor: `${bank.logoColor}20`,
          color: bank.logoColor 
        }}
      >
        {getBankInitials(bank.displayName)}
      </div>

      {/* Bank name */}
      <span className={cn(
        'font-medium',
        isSelected ? 'text-primary' : 'text-foreground'
      )}>
        {bank.displayName}
      </span>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-3 top-3">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </button>
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

// Simple dropdown version for compact spaces
interface CompactBankSelectorProps {
  value?: BankName | null;
  onChange: (bank: BankName | null) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactBankSelector({
  value,
  onChange,
  disabled = false,
  className,
}: CompactBankSelectorProps) {
  const banks = getSupportedBanks();
  
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Select Your Bank</label>
      <div className="grid gap-2">
        {bankOptions.map((bank) => {
          const isSelected = value === bank.name;
          return (
            <button
              key={bank.name}
              onClick={() => onChange(bank.name)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div 
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                style={{ 
                  backgroundColor: `${bank.logoColor}20`,
                  color: bank.logoColor 
                }}
              >
                {getBankInitials(bank.displayName)}
              </div>
              <span className="flex-1 text-left text-sm font-medium">
                {bank.displayName}
              </span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
      
      {/* Security badge */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>256-bit encryption</span>
      </div>
    </div>
  );
}
