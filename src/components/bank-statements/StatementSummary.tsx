/**
 * StatementSummary Component
 * Account summary and statistics display
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { ParsedStatement, TransactionType } from '@/lib/bank-statement-types';
import { calculateStatementStats } from '@/lib/bank-statement-parser';
import { bankConfigs } from '@/lib/bank-parser-configs';
import { 
  Banknote, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale,
  Calendar,
  FileText,
  CreditCard,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface StatementSummaryProps {
  statement: ParsedStatement;
  className?: string;
}

const transactionTypeIcons: Record<TransactionType, typeof Banknote> = {
  payment: Banknote,
  transfer: ArrowUpRight,
  fee: AlertTriangle,
  interest: Banknote,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  direct_debit: ArrowUpRight,
  direct_credit: ArrowDownLeft,
  atm: CreditCard,
  card_purchase: CreditCard,
  unknown: FileText,
};

const transactionTypeColors: Record<TransactionType, string> = {
  payment: 'bg-blue-100 text-blue-700',
  transfer: 'bg-purple-100 text-purple-700',
  fee: 'bg-red-100 text-red-700',
  interest: 'bg-green-100 text-green-700',
  deposit: 'bg-emerald-100 text-emerald-700',
  withdrawal: 'bg-orange-100 text-orange-700',
  direct_debit: 'bg-amber-100 text-amber-700',
  direct_credit: 'bg-teal-100 text-teal-700',
  atm: 'bg-cyan-100 text-cyan-700',
  card_purchase: 'bg-indigo-100 text-indigo-700',
  unknown: 'bg-gray-100 text-gray-700',
};

export function StatementSummary({ statement, className }: StatementSummaryProps) {
  const stats = calculateStatementStats(statement);
  const config = bankConfigs[statement.bankName];
  
  const duplicates = statement.transactions.filter(t => t.isDuplicate).length;
  const duplicatesPercentage = stats.transactionCount > 0 
    ? (duplicates / stats.transactionCount) * 100 
    : 0;
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-sm font-bold text-primary">
                  {config.displayName.substring(0, 3).toUpperCase()}
                </span>
                {config.displayName} Statement
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {statement.filename}
              </p>
            </div>
            <Badge variant="outline" className="font-mono">
              {statement.currency}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Account Number */}
            {statement.accountNumber && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Account</p>
                <p className="font-mono text-sm">•••• {statement.accountNumber.slice(-4)}</p>
              </div>
            )}
            
            {/* Period */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Period</p>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(statement.statementPeriodStart)}</span>
                <span className="text-muted-foreground">→</span>
                <span>{formatDate(statement.statementPeriodEnd)}</span>
              </div>
            </div>
            
            {/* Transactions Count */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Transactions</p>
              <p className="text-lg font-semibold">{stats.transactionCount}</p>
            </div>
            
            {/* Pages */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pages</p>
              <p className="text-lg font-semibold">{statement.pageCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Credits */}
        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Credits</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(stats.totalCredits)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Debits */}
        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Total Debits</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(stats.totalDebits)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Net Change */}
        <Card className={cn(
          stats.netChange >= 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-amber-50/50 border-amber-200'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  stats.netChange >= 0 ? 'text-blue-600' : 'text-amber-600'
                )}>
                  Net Change
                </p>
                <p className={cn(
                  'text-2xl font-bold',
                  stats.netChange >= 0 ? 'text-blue-700' : 'text-amber-700'
                )}>
                  {formatCurrency(stats.netChange)}
                </p>
              </div>
              <div className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center',
                stats.netChange >= 0 ? 'bg-blue-100' : 'bg-amber-100'
              )}>
                <Scale className={cn(
                  'h-6 w-6',
                  stats.netChange >= 0 ? 'text-blue-600' : 'text-amber-600'
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Balance Info */}
      {(statement.openingBalance !== undefined || statement.closingBalance !== undefined) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Balance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Opening Balance</p>
                <p className="text-lg font-semibold">
                  {statement.openingBalance !== undefined 
                    ? formatCurrency(statement.openingBalance)
                    : 'N/A'}
                </p>
              </div>
              
              <div className="flex-1 mx-4">
                <div className="h-px bg-border relative">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">
                    {statement.transactions.length} transactions
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Closing Balance</p>
                <p className="text-lg font-semibold">
                  {statement.closingBalance !== undefined 
                    ? formatCurrency(statement.closingBalance)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Transaction Types */}
      {Object.keys(stats.transactionTypes).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Transaction Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.transactionTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const Icon = transactionTypeIcons[type as TransactionType];
                  const percentage = (count / stats.transactionCount) * 100;
                  
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              'capitalize gap-1',
                              transactionTypeColors[type as TransactionType]
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {type.replace('_', ' ')}
                          </Badge>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Duplicates Warning */}
      {duplicates > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-900">Duplicate Transactions Detected</p>
                <p className="text-sm text-amber-700">
                  {duplicates} potential duplicate{duplicates !== 1 ? 's' : ''} found ({duplicatesPercentage.toFixed(1)}% of total)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
