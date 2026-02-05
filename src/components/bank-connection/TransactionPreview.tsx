/**
 * Transaction Preview Component
 * Shows synced transactions after bank connection for TAL-186
 */

import { cn } from '@/lib/utils';
import type { BankName } from '@/lib/bank-statement-types';
import { 
  CheckCircle2, 
  ArrowDownLeft, 
  ArrowUpRight,
  Calendar,
  Tag,
  Filter,
  Download,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

export interface SyncedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  isDeduction: boolean;
  confidence?: number;
  selected?: boolean;
}

export interface TransactionPreviewData {
  bank: BankName;
  accountName: string;
  syncDate: Date;
  transactions: SyncedTransaction[];
  totalImported: number;
  potentialDeductions: number;
  estimatedTaxSavings: number;
}

interface TransactionPreviewProps {
  data: TransactionPreviewData;
  onImport: (transactionIds: string[]) => void;
  onSkip: () => void;
  onViewAll: () => void;
  className?: string;
}

const bankInfo: Record<BankName, { name: string; color: string }> = {
  commbank: { name: 'CommBank', color: '#FFCC00' },
  nab: { name: 'NAB', color: '#BE0F34' },
  westpac: { name: 'Westpac', color: '#D5002B' },
  anz: { name: 'ANZ', color: '#0072AC' },
  ing: { name: 'ING', color: '#FF6600' },
};

// ATO deduction categories
const deductionCategories: Record<string, { label: string; color: string }> = {
  'vehicle': { label: 'Vehicle', color: 'bg-blue-500/10 text-blue-600' },
  'travel': { label: 'Travel', color: 'bg-green-500/10 text-green-600' },
  'meals': { label: 'Meals', color: 'bg-orange-500/10 text-orange-600' },
  'home-office': { label: 'Home Office', color: 'bg-purple-500/10 text-purple-600' },
  'equipment': { label: 'Equipment', color: 'bg-pink-500/10 text-pink-600' },
  'professional': { label: 'Professional', color: 'bg-indigo-500/10 text-indigo-600' },
  'other': { label: 'Other', color: 'bg-gray-500/10 text-gray-600' },
};

export function TransactionPreview({
  data,
  onImport,
  onSkip,
  onViewAll,
  className,
}: TransactionPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(data.transactions.filter(t => t.isDeduction).map(t => t.id))
  );
  const [showDeductionsOnly, setShowDeductionsOnly] = useState(false);

  const bank = bankInfo[data.bank];
  const filteredTransactions = showDeductionsOnly 
    ? data.transactions.filter(t => t.isDeduction)
    : data.transactions;

  const handleToggleAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleToggleTransaction = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedCount = selectedIds.size;
  const selectedDeductions = data.transactions
    .filter(t => selectedIds.has(t.id) && t.isDeduction)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Success header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Successfully Connected!</h3>
          <p className="text-sm text-muted-foreground">
            Found {data.totalImported} transactions from {bank.name}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Transactions"
          value={data.totalImported.toString()}
          icon={Receipt}
        />
        <StatCard
          label="Deductions"
          value={data.potentialDeductions.toString()}
          icon={Tag}
          highlight
        />
        <StatCard
          label="Est. Tax Savings"
          value={`$${data.estimatedTaxSavings.toLocaleString()}`}
          icon={Sparkles}
          highlight
        />
      </div>

      {/* Transactions list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
              onCheckedChange={handleToggleAll}
            />
            <span className="font-medium text-sm">
              {selectedCount} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5',
                showDeductionsOnly && 'bg-primary/10 text-primary'
              )}
              onClick={() => setShowDeductionsOnly(!showDeductionsOnly)}
            >
              <Filter className="h-3.5 w-3.5" />
              {showDeductionsOnly ? 'Show All' : 'Deductions Only'}
            </Button>
          </div>
        </div>

        {/* Transaction items */}
        <div className="max-h-[280px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTransactions.slice(0, 5).map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  selected={selectedIds.has(transaction.id)}
                  onToggle={() => handleToggleTransaction(transaction.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* View all link */}
        {filteredTransactions.length > 5 && (
          <div className="px-4 py-2 border-t bg-muted/30 text-center">
            <button 
              onClick={onViewAll}
              className="text-sm text-primary hover:underline"
            >
              View all {filteredTransactions.length} transactions
            </button>
          </div>
        )}
      </div>

      {/* AI suggestion banner */}
      {data.potentialDeductions > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-3 border border-primary/10">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">AI has identified potential deductions</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We've pre-selected {data.potentialDeductions} transactions that may be tax deductible. 
              Review and import them to track your deductions.
            </p>
          </div>
        </div>
      )}

      {/* Summary footer */}
      {selectedDeductions > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-sm text-muted-foreground">Selected deductions</p>
            <p className="text-lg font-semibold">${selectedDeductions.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Est. tax savings</p>
            <p className="text-lg font-semibold text-green-600">
              ${Math.round(selectedDeductions * 0.3).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onSkip}
        >
          Skip for Now
        </Button>
        <Button 
          className="flex-1 gap-2"
          onClick={() => onImport(Array.from(selectedIds))}
          disabled={selectedCount === 0}
        >
          <Download className="h-4 w-4" />
          Import {selectedCount} Transactions
        </Button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}

function StatCard({ label, value, icon: Icon, highlight }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl border p-3 text-center',
      highlight ? 'border-primary/20 bg-primary/5' : 'bg-card'
    )}>
      <Icon className={cn(
        'h-4 w-4 mx-auto mb-1.5',
        highlight ? 'text-primary' : 'text-muted-foreground'
      )} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface TransactionItemProps {
  transaction: SyncedTransaction;
  selected: boolean;
  onToggle: () => void;
}

function TransactionItem({ transaction, selected, onToggle }: TransactionItemProps) {
  const isIncome = transaction.amount > 0;
  const category = transaction.category ? deductionCategories[transaction.category] : null;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 transition-colors',
      selected && 'bg-primary/5'
    )}>
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      
      {/* Transaction icon */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
      )}>
        {isIncome ? (
          <ArrowDownLeft className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Transaction details */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{transaction.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(transaction.date).toLocaleDateString()}
          </span>
          {category && (
            <Badge variant="secondary" className={cn('text-xs', category.color)}>
              {category.label}
            </Badge>
          )}
          {transaction.confidence && transaction.confidence > 0.8 && (
            <Sparkles className="h-3 w-3 text-amber-500" />
          )}
        </div>
      </div>

      {/* Amount */}
      <div className={cn(
        'text-right font-medium',
        isIncome ? 'text-green-600' : 'text-red-600'
      )}>
        {isIncome ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
      </div>
    </div>
  );
}

// Mini preview for dashboard widget
interface MiniTransactionPreviewProps {
  recentTransactions: SyncedTransaction[];
  onViewAll: () => void;
  className?: string;
}

export function MiniTransactionPreview({
  recentTransactions,
  onViewAll,
  className,
}: MiniTransactionPreviewProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Recent Transactions</h4>
        <button 
          onClick={onViewAll}
          className="text-xs text-primary hover:underline"
        >
          View all
        </button>
      </div>
      
      <div className="space-y-2">
        {recentTransactions.slice(0, 3).map((transaction) => {
          const isIncome = transaction.amount > 0;
          return (
            <div 
              key={transaction.id}
              className="flex items-center gap-2 rounded-lg border p-2.5"
            >
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
              )}>
                {isIncome ? (
                  <ArrowDownLeft className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{transaction.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <span className={cn(
                'text-sm font-medium',
                isIncome ? 'text-green-600' : 'text-foreground'
              )}>
                {isIncome ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
