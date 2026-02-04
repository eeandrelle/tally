/**
 * StatementTransactionList Component
 * Table view with editing for statement transactions
 */

import { useState, useMemo } from 'react';
import type { StatementTransaction, TransactionType } from '@/lib/bank-statement-types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  Tag,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  FileDown
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface StatementTransactionListProps {
  transactions: StatementTransaction[];
  onUpdate?: (id: number, updates: Partial<StatementTransaction>) => void;
  onDelete?: (id: number) => void;
  onDeleteMultiple?: (ids: number[]) => void;
  onExport?: (format: 'csv' | 'json') => void;
  readOnly?: boolean;
  className?: string;
}

type SortField = 'date' | 'description' | 'amount' | 'type' | 'category';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 25;

const transactionTypeLabels: Record<TransactionType, string> = {
  payment: 'Payment',
  transfer: 'Transfer',
  fee: 'Fee',
  interest: 'Interest',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  direct_debit: 'Direct Debit',
  direct_credit: 'Direct Credit',
  atm: 'ATM',
  card_purchase: 'Card Purchase',
  unknown: 'Unknown',
};

const transactionTypeColors: Record<TransactionType, string> = {
  payment: 'bg-blue-100 text-blue-700 border-blue-200',
  transfer: 'bg-purple-100 text-purple-700 border-purple-200',
  fee: 'bg-red-100 text-red-700 border-red-200',
  interest: 'bg-green-100 text-green-700 border-green-200',
  deposit: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  withdrawal: 'bg-orange-100 text-orange-700 border-orange-200',
  direct_debit: 'bg-amber-100 text-amber-700 border-amber-200',
  direct_credit: 'bg-teal-100 text-teal-700 border-teal-200',
  atm: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  card_purchase: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  unknown: 'bg-gray-100 text-gray-700 border-gray-200',
};

const categories = [
  'Income',
  'Groceries',
  'Transport',
  'Utilities',
  'Entertainment',
  'Dining',
  'Shopping',
  'Healthcare',
  'Insurance',
  'Rent/Mortgage',
  'Investments',
  'Fees',
  'Other',
];

export function StatementTransactionList({
  transactions,
  onUpdate,
  onDelete,
  onDeleteMultiple,
  onExport,
  readOnly = false,
  className,
}: StatementTransactionListProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<StatementTransaction>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.raw_description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.transaction_type.localeCompare(b.transaction_type);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [transactions, searchQuery, sortField, sortDirection]);
  
  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  
  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTransactions.map(t => t.id)));
    }
  };
  
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  // Edit handlers
  const startEdit = (transaction: StatementTransaction) => {
    setEditingId(transaction.id);
    setEditForm({
      description: transaction.description,
      category: transaction.category,
      transaction_type: transaction.transaction_type,
    });
  };
  
  const saveEdit = () => {
    if (editingId && onUpdate) {
      onUpdate(editingId, editForm);
    }
    setEditingId(null);
    setEditForm({});
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };
  
  // Delete handlers
  const confirmDelete = (id: number) => {
    setDeleteConfirmId(id);
  };
  
  const executeDelete = () => {
    if (deleteConfirmId && onDelete) {
      onDelete(deleteConfirmId);
    }
    setDeleteConfirmId(null);
  };
  
  const deleteSelected = () => {
    if (onDeleteMultiple && selectedIds.size > 0) {
      onDeleteMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };
  
  // Export handler
  const handleExport = (format: 'csv' | 'json') => {
    onExport?.(format);
  };
  
  if (transactions.length === 0) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground', className)}>
        <p>No transactions to display</p>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && !readOnly && (
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedIds.size}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </p>
      
      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {!readOnly && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      paginatedTransactions.length > 0 &&
                      paginatedTransactions.every(t => selectedIds.has(t.id))
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="cursor-pointer" onClick={() => toggleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('description')}>
                <div className="flex items-center gap-1">
                  Description
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  Amount
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('type')}>
                <div className="flex items-center gap-1">
                  Type
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('category')}>
                <div className="flex items-center gap-1">
                  Category
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              {!readOnly && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((transaction) => (
              <TableRow 
                key={transaction.id}
                className={cn(
                  transaction.is_duplicate && 'bg-amber-50/50',
                  selectedIds.has(transaction.id) && 'bg-muted'
                )}
              >
                {!readOnly && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(transaction.id)}
                      onCheckedChange={() => toggleSelect(transaction.id)}
                    />
                  </TableCell>
                )}
                
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {formatDate(transaction.transaction_date)}
                </TableCell>
                
                <TableCell>
                  {editingId === transaction.id ? (
                    <Input
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.raw_description !== transaction.description && (
                        <p className="text-xs text-muted-foreground">
                          {transaction.raw_description}
                        </p>
                      )}
                    </div>
                  )}
                </TableCell>
                
                <TableCell className={cn(
                  'text-right font-mono font-medium',
                  transaction.amount < 0 ? 'text-red-600' : 'text-emerald-600'
                )}>
                  {formatCurrency(transaction.amount)}
                </TableCell>
                
                <TableCell>
                  {editingId === transaction.id ? (
                    <select
                      value={editForm.transaction_type || ''}
                      onChange={(e) => setEditForm({ ...editForm, transaction_type: e.target.value as TransactionType })}
                      className="h-8 px-2 rounded border"
                    >
                      {Object.entries(transactionTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs capitalize',
                        transactionTypeColors[transaction.transaction_type]
                      )}
                    >
                      {transactionTypeLabels[transaction.transaction_type]}
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell>
                  {editingId === transaction.id ? (
                    <select
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="h-8 px-2 rounded border"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    transaction.category ? (
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )
                  )}
                </TableCell>
                
                {!readOnly && (
                  <TableCell>
                    {editingId === transaction.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={saveEdit}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={cancelEdit}
                        >
                          <span className="text-red-600">×</span>
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(transaction)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {}}>
                            <Tag className="h-4 w-4 mr-2" />
                            Categorize
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => confirmDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
