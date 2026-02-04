/**
 * BankSelector Component
 * Dropdown for selecting bank type
 */

import type { BankName } from '@/lib/bank-statement-types';
import { getSupportedBanks } from '@/lib/bank-parser-configs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankSelectorProps {
  value?: BankName | null;
  onChange: (bank: BankName | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const bankLogos: Record<BankName, string> = {
  commbank: 'CBA',
  nab: 'NAB',
  westpac: 'WBC',
  anz: 'ANZ',
  ing: 'ING',
};

export function BankSelector({
  value,
  onChange,
  placeholder = 'Select bank...',
  disabled = false,
  className,
}: BankSelectorProps) {
  const banks = getSupportedBanks();
  
  return (
    <Select
      value={value || ''}
      onValueChange={(val) => onChange(val as BankName || null)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Landmark className="h-4 w-4" />
            <span>{placeholder}</span>
          </div>
        }>
          {value && (
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                {bankLogos[value]}
              </span>
              <span>{banks.find(b => b.name === value)?.displayName}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {banks.map((bank) => (
          <SelectItem key={bank.name} value={bank.name}>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                {bankLogos[bank.name]}
              </span>
              <span>{bank.displayName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
