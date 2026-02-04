/**
 * Bank Statements Route
 * Main page for bank statement parsing and management
 */

import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useBankStatementParser } from '@/hooks/useBankStatementParser';
import { useStatementTransactions } from '@/hooks/useStatementTransactions';
import type { BankName, ParsedStatement } from '@/lib/bank-statement-types';
import { BankStatementUpload } from '@/components/bank-statements/BankStatementUpload';
import { StatementParserProgress } from '@/components/bank-statements/StatementParserProgress';
import { StatementSummary } from '@/components/bank-statements/StatementSummary';
import { StatementTransactionList } from '@/components/bank-statements/StatementTransactionList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  List,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Route = createFileRoute('/bank-statements')({
  component: BankStatementsPage,
});

function BankStatementsPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [parsedStatement, setParsedStatement] = useState<ParsedStatement | null>(null);
  const [savedStatementId, setSavedStatementId] = useState<number | null>(null);
  
  const {
    result,
    progress,
    isParsing,
    isComplete,
    error,
    parsePDF,
    reset,
  } = useBankStatementParser();
  
  const {
    statement: savedStatement,
    transactions,
    filteredTransactions,
    stats,
    isLoading,
    isSaving,
    saveParsed,
    updateTransaction,
    deleteTransaction,
    deleteMultiple,
    loadStatement,
  } = useStatementTransactions(savedStatementId || undefined);
  
  // Handle file upload
  const handleUpload = useCallback(async (file: File, bankName: BankName | null) => {
    const statement = await parsePDF(file, bankName || undefined);
    
    if (statement) {
      setParsedStatement(statement);
      setActiveTab('review');
      toast.success(`Parsed ${statement.transactions.length} transactions`);
    } else if (error) {
      toast.error(error.message);
    }
  }, [parsePDF, error]);
  
  // Handle save to database
  const handleSave = useCallback(async () => {
    if (!parsedStatement) return;
    
    const result = await saveParsed(parsedStatement);
    
    if (result) {
      setSavedStatementId(result.statement.id);
      setActiveTab('transactions');
      toast.success(`Saved ${result.transactionsCreated} transactions`);
    }
  }, [parsedStatement, saveParsed]);
  
  // Handle reset
  const handleReset = useCallback(() => {
    setParsedStatement(null);
    setSavedStatementId(null);
    reset();
    setActiveTab('upload');
  }, [reset]);
  
  // Export transactions
  const handleExport = useCallback((format: 'csv' | 'json') => {
    const dataToExport = savedStatementId ? transactions : (parsedStatement?.transactions || []);
    
    if (dataToExport.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    
    if (format === 'csv') {
      const headers = ['Date', 'Description', 'Amount', 'Balance', 'Type', 'Category'];
      const rows = dataToExport.map(t => [
        t.transaction_date || (t as unknown as { date: string }).date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.balance || '',
        t.transaction_type,
        t.category || '',
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Exported to CSV');
    } else {
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Exported to JSON');
    }
  }, [savedStatementId, transactions, parsedStatement]);
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8" />
          Bank Statement Parser
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload and parse PDF bank statements from Australian banks. Extract transactions automatically.
        </p>
      </div>
      
      {/* Progress Indicator */}
      {(isParsing || progress.status !== 'idle') && (
        <div className="mb-6">
          <StatementParserProgress progress={progress} />
        </div>
      )}
      
      {/* Error Alert */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Parsing Error</p>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger 
            value="review" 
            disabled={!parsedStatement}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Review
            {parsedStatement && (
              <Badge variant="secondary" className="ml-1">
                {parsedStatement.transactions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="transactions" 
            disabled={!savedStatementId && transactions.length === 0}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Transactions
            {(savedStatementId || transactions.length > 0) && (
              <Badge variant="secondary" className="ml-1">
                {savedStatement?.transaction_count || transactions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <BankStatementUpload onUpload={handleUpload} />
          
          {/* Supported Banks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supported Banks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: 'CommBank', color: 'bg-yellow-500' },
                  { name: 'NAB', color: 'bg-red-600' },
                  { name: 'Westpac', color: 'bg-red-700' },
                  { name: 'ANZ', color: 'bg-blue-600' },
                  { name: 'ING', color: 'bg-orange-500' },
                ].map((bank) => (
                  <div 
                    key={bank.name}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                  >
                    <span className={cn('w-3 h-3 rounded-full', bank.color)} />
                    <span className="font-medium">{bank.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Review Tab */}
        <TabsContent value="review" className="space-y-6">
          {parsedStatement && (
            <>
              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setActiveTab('upload')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Upload
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save to Database
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Summary */}
              <StatementSummary statement={parsedStatement} />
              
              {/* Transactions Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Transaction Preview</span>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                      Export CSV
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StatementTransactionList
                    transactions={parsedStatement.transactions.map((t, i) => ({
                      id: i,
                      statement_id: 0,
                      transaction_date: t.date,
                      description: t.description,
                      raw_description: t.rawDescription,
                      amount: t.amount,
                      balance: t.balance,
                      transaction_type: t.transactionType,
                      category: t.category || null,
                      is_duplicate: t.isDuplicate ? 1 : 0,
                      created_at: new Date().toISOString(),
                    }))}
                    readOnly
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setActiveTab('review')}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Review
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Parse New Statement
              </Button>
            </div>
          </div>
          
          {/* Saved Statement Info */}
          {savedStatement && (
            <Card className="bg-green-50/50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Statement Saved Successfully
                    </p>
                    <p className="text-sm text-green-700">
                      {savedStatement.transaction_count} transactions saved to database
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <StatementTransactionList
                transactions={transactions}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
                onDeleteMultiple={deleteMultiple}
                onExport={handleExport}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper for className
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
