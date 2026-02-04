/**
 * useStatementTransactions Hook
 * React hook for CRUD operations on statement transactions
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  BankStatement,
  StatementTransaction,
  TransactionType,
} from '../lib/bank-statement-types';
import {
  getBankStatementById,
  getTransactionsByStatementId,
  updateStatementTransaction,
  deleteStatementTransaction,
  getTransactionStats,
  searchTransactions,
  saveParsedStatement,
  type saveParsedStatement as SaveParsedStatementType,
} from '../lib/db-bank-statements';
import type { ParsedStatement } from '../lib/bank-statement-types';

// ============= HOOK: useStatementTransactions =============

interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  transactionType?: TransactionType;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}

interface TransactionStats {
  totalCount: number;
  totalDebits: number;
  totalCredits: number;
  typeBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}

interface UseStatementTransactionsReturn {
  // Data
  statement: BankStatement | null;
  transactions: StatementTransaction[];
  filteredTransactions: StatementTransaction[];
  stats: TransactionStats | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: Error | null;
  
  // Filters
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
  
  // Actions
  loadStatement: (statementId: number) => Promise<void>;
  saveParsed: (parsed: ParsedStatement) => Promise<{ statement: BankStatement; transactionsCreated: number } | null>;
  updateTransaction: (id: number, updates: UpdateTransactionInput) => Promise<StatementTransaction | null>;
  deleteTransaction: (id: number) => Promise<void>;
  deleteMultiple: (ids: number[]) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  
  // Search
  search: (query: string) => Promise<StatementTransaction[]>;
}

interface UpdateTransactionInput {
  description?: string;
  category?: string;
  transactionType?: TransactionType;
  isDuplicate?: boolean;
}

export function useStatementTransactions(
  statementId?: number
): UseStatementTransactionsReturn {
  // State
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<StatementTransaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({});
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Load statement and transactions
  const loadStatement = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [statementData, transactionsData, statsData] = await Promise.all([
        getBankStatementById(id),
        getTransactionsByStatementId(id),
        getTransactionStats(id),
      ]);
      
      if (!statementData) {
        throw new Error('Statement not found');
      }
      
      setStatement(statementData);
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
      setStats(statsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load statement');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Apply filters
  useEffect(() => {
    let result = [...transactions];
    
    if (filters.startDate) {
      result = result.filter(t => t.transaction_date >= filters.startDate!);
    }
    
    if (filters.endDate) {
      result = result.filter(t => t.transaction_date <= filters.endDate!);
    }
    
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }
    
    if (filters.transactionType) {
      result = result.filter(t => t.transaction_type === filters.transactionType);
    }
    
    if (filters.minAmount !== undefined) {
      result = result.filter(t => t.amount >= filters.minAmount!);
    }
    
    if (filters.maxAmount !== undefined) {
      result = result.filter(t => t.amount <= filters.maxAmount!);
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.raw_description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredTransactions(result);
  }, [transactions, filters]);
  
  // Auto-load if statementId provided
  useEffect(() => {
    if (statementId) {
      loadStatement(statementId);
    }
  }, [statementId, loadStatement]);
  
  // Save parsed statement
  const saveParsed = useCallback(async (
    parsed: ParsedStatement
  ): Promise<{ statement: BankStatement; transactionsCreated: number } | null> => {
    setIsSaving(true);
    setError(null);
    
    try {
      const result = await saveParsedStatement(parsed);
      
      // Load the newly saved statement
      await loadStatement(result.statement.id);
      
      return {
        statement: result.statement,
        transactionsCreated: result.transactionsCreated,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save statement');
      setError(error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [loadStatement]);
  
  // Update transaction
  const updateTransaction = useCallback(async (
    id: number,
    updates: UpdateTransactionInput
  ): Promise<StatementTransaction | null> => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const updated = await updateStatementTransaction(id, {
        description: updates.description,
        category: updates.category,
        transactionType: updates.transactionType,
        isDuplicate: updates.isDuplicate,
      });
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === id ? updated : t)
      );
      
      // Refresh stats
      if (statement) {
        const newStats = await getTransactionStats(statement.id);
        setStats(newStats);
      }
      
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update transaction');
      setError(error);
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [statement]);
  
  // Delete transaction
  const deleteTransaction = useCallback(async (id: number) => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteStatementTransaction(id);
      
      // Update local state
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // Refresh stats
      if (statement) {
        const newStats = await getTransactionStats(statement.id);
        setStats(newStats);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete transaction');
      setError(error);
    } finally {
      setIsDeleting(false);
    }
  }, [statement]);
  
  // Delete multiple transactions
  const deleteMultiple = useCallback(async (ids: number[]) => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await Promise.all(ids.map(id => deleteStatementTransaction(id)));
      
      // Update local state
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      
      // Refresh stats
      if (statement) {
        const newStats = await getTransactionStats(statement.id);
        setStats(newStats);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete transactions');
      setError(error);
    } finally {
      setIsDeleting(false);
    }
  }, [statement]);
  
  // Refresh data
  const refresh = useCallback(async () => {
    if (statement) {
      await loadStatement(statement.id);
    }
  }, [statement, loadStatement]);
  
  // Clear all data
  const clear = useCallback(() => {
    setStatement(null);
    setTransactions([]);
    setFilteredTransactions([]);
    setStats(null);
    setFilters({});
    setError(null);
  }, []);
  
  // Search transactions
  const search = useCallback(async (query: string): Promise<StatementTransaction[]> => {
    try {
      return await searchTransactions(query, {
        statementId: statement?.id,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      setError(error);
      return [];
    }
  }, [statement]);
  
  return {
    statement,
    transactions,
    filteredTransactions,
    stats,
    isLoading,
    isSaving,
    isUpdating,
    isDeleting,
    error,
    filters,
    setFilters,
    loadStatement,
    saveParsed,
    updateTransaction,
    deleteTransaction,
    deleteMultiple,
    refresh,
    clear,
    search,
  };
}
