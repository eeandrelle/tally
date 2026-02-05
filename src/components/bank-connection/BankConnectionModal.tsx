/**
 * Bank Connection Modal Component
 * Main container for bank connection flow for TAL-186
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { BankName } from '@/lib/bank-statement-types';
import { EnhancedBankSelector } from './EnhancedBankSelector';
import { OAuthConsentScreen, type ConsentOptions } from './OAuthConsentScreen';
import { ConnectionStatusIndicator, type BankConnection } from './ConnectionStatusIndicator';
import { TransactionPreview, type TransactionPreviewData, type SyncedTransaction } from './TransactionPreview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Loader2, Building2, Shield, AlertCircle } from 'lucide-react';

export type ConnectionStep = 
  | 'select-bank' 
  | 'consent' 
  | 'connecting' 
  | 'preview' 
  | 'success' 
  | 'error';

interface BankConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (connection: BankConnection) => void;
  existingConnections?: BankConnection[];
  className?: string;
}

export function BankConnectionModal({
  open,
  onOpenChange,
  onComplete,
  existingConnections = [],
  className,
}: BankConnectionModalProps) {
  const [step, setStep] = useState<ConnectionStep>('select-bank');
  const [selectedBank, setSelectedBank] = useState<BankName | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<TransactionPreviewData | null>(null);
  const [newConnection, setNewConnection] = useState<BankConnection | null>(null);

  const handleBankSelect = useCallback((bank: BankName) => {
    setSelectedBank(bank);
    setStep('consent');
  }, []);

  const handleConsent = useCallback(async (options: ConsentOptions) => {
    if (!selectedBank) return;
    
    setStep('connecting');
    setConnectionError(null);

    try {
      // Simulate OAuth flow and data fetching
      await simulateConnection(selectedBank);
      
      // Generate preview data
      const preview = generatePreviewData(selectedBank);
      setPreviewData(preview);
      setStep('preview');
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setStep('error');
    }
  }, [selectedBank]);

  const handleImport = useCallback((transactionIds: string[]) => {
    if (!selectedBank || !previewData) return;

    // Create new connection
    const connection: BankConnection = {
      id: `conn-${Date.now()}`,
      bank: selectedBank,
      accountName: previewData.accountName,
      accountNumber: '****1234',
      status: 'connected',
      lastSync: new Date(),
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };

    setNewConnection(connection);
    setStep('success');
    onComplete?.(connection);
  }, [selectedBank, previewData, onComplete]);

  const handleBack = useCallback(() => {
    if (step === 'consent') {
      setStep('select-bank');
      setSelectedBank(null);
    } else if (step === 'error') {
      setStep('consent');
      setConnectionError(null);
    }
  }, [step]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setStep('select-bank');
      setSelectedBank(null);
      setConnectionError(null);
      setPreviewData(null);
      setNewConnection(null);
    }, 300);
  }, [onOpenChange]);

  const getStepProgress = () => {
    switch (step) {
      case 'select-bank': return 0;
      case 'consent': return 25;
      case 'connecting': return 50;
      case 'preview': return 75;
      case 'success': return 100;
      case 'error': return 50;
      default: return 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(step === 'consent' || step === 'error') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>{getStepTitle(step)}</DialogTitle>
          </div>
          <DialogDescription>{getStepDescription(step)}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        {step !== 'success' && (
          <Progress value={getStepProgress()} className="h-1" />
        )}

        {/* Step content */}
        <div className="py-2">
          {step === 'select-bank' && (
            <EnhancedBankSelector
              selectedBank={selectedBank}
              onSelect={handleBankSelect}
            />
          )}

          {step === 'consent' && selectedBank && (
            <OAuthConsentScreen
              bank={selectedBank}
              onConsent={handleConsent}
              onCancel={handleClose}
            />
          )}

          {step === 'connecting' && (
            <ConnectingState bank={selectedBank!} />
          )}

          {step === 'preview' && previewData && (
            <TransactionPreview
              data={previewData}
              onImport={handleImport}
              onSkip={handleClose}
              onViewAll={handleClose}
            />
          )}

          {step === 'success' && newConnection && (
            <SuccessState 
              connection={newConnection} 
              onDone={handleClose}
            />
          )}

          {step === 'error' && (
            <ErrorState 
              error={connectionError} 
              onRetry={() => selectedBank && handleConsent({
                readTransactions: true,
                readAccountInfo: true,
                readBalances: true,
                ongoingAccess: true,
              })}
              onBack={handleBack}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Connecting state
interface ConnectingStateProps {
  bank: BankName;
}

function ConnectingState({ bank }: ConnectingStateProps) {
  const bankNames: Record<BankName, string> = {
    commbank: 'Commonwealth Bank',
    nab: 'NAB',
    westpac: 'Westpac',
    anz: 'ANZ',
    ing: 'ING',
  };

  return (
    <div className="text-center py-8 space-y-4">
      <div className="relative flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 border-2 border-background">
          <Shield className="h-4 w-4 text-green-500" />
        </div>
      </div>
      
      <div className="space-y-1">
        <h4 className="font-medium">Connecting to {bankNames[bank]}</h4>
        <p className="text-sm text-muted-foreground">
          This may take a few moments...
        </p>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Establishing secure connection
        </p>
        <p className="flex items-center justify-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Authenticating with bank
        </p>
        <p className="flex items-center justify-center gap-2 opacity-50">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          Retrieving transactions
        </p>
      </div>
    </div>
  );
}

// Success state
interface SuccessStateProps {
  connection: BankConnection;
  onDone: () => void;
}

function SuccessState({ connection, onDone }: SuccessStateProps) {
  return (
    <div className="text-center py-6 space-y-5">
      <ConnectionStatusIndicator connection={connection} />
      
      <div className="space-y-2">
        <h4 className="font-medium">Connection Complete!</h4>
        <p className="text-sm text-muted-foreground">
          Your bank is now connected. We'll automatically sync new transactions daily.
        </p>
      </div>

      <Button onClick={onDone} className="w-full">
        Done
      </Button>
    </div>
  );
}

// Error state
interface ErrorStateProps {
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

function ErrorState({ error, onRetry, onBack }: ErrorStateProps) {
  return (
    <div className="text-center py-6 space-y-5">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium">Connection Failed</h4>
        <p className="text-sm text-muted-foreground">
          {error || 'Unable to connect to your bank. Please try again.'}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onRetry} className="flex-1">
          Try Again
        </Button>
      </div>
    </div>
  );
}

// Helper functions
function getStepTitle(step: ConnectionStep): string {
  switch (step) {
    case 'select-bank': return 'Connect Your Bank';
    case 'consent': return 'Authorize Access';
    case 'connecting': return 'Connecting...';
    case 'preview': return 'Review Transactions';
    case 'success': return 'Success!';
    case 'error': return 'Connection Error';
    default: return 'Connect Bank';
  }
}

function getStepDescription(step: ConnectionStep): string {
  switch (step) {
    case 'select-bank': return 'Select your bank to automatically import transactions';
    case 'consent': return 'Review and authorize access to your bank data';
    case 'connecting': return 'Establishing secure connection...';
    case 'preview': return 'Review and import your transactions';
    case 'success': return 'Your bank is now connected';
    case 'error': return 'We encountered an error';
    default: return '';
  }
}

// Simulate connection delay
async function simulateConnection(bank: BankName): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 10% chance of error for demo
      if (Math.random() < 0.1) {
        reject(new Error('Bank temporarily unavailable. Please try again later.'));
      } else {
        resolve();
      }
    }, 2500);
  });
}

// Generate mock preview data
function generatePreviewData(bank: BankName): TransactionPreviewData {
  const mockTransactions: SyncedTransaction[] = [
    { id: '1', date: '2026-02-01', description: 'Officeworks - Stationery', amount: -85.50, category: 'equipment', isDeduction: true, confidence: 0.95 },
    { id: '2', date: '2026-01-28', description: 'Uber Eats - Client lunch', amount: -45.20, category: 'meals', isDeduction: true, confidence: 0.88 },
    { id: '3', date: '2026-01-25', description: 'Shell Service Station', amount: -78.90, category: 'vehicle', isDeduction: true, confidence: 0.92 },
    { id: '4', date: '2026-01-24', description: 'Monthly Software Subscription', amount: -49.00, category: 'professional', isDeduction: true, confidence: 0.97 },
    { id: '5', date: '2026-01-22', description: 'Client Payment', amount: 2500.00, isDeduction: false },
    { id: '6', date: '2026-01-20', description: 'Coles Supermarket', amount: -156.40, isDeduction: false },
  ];

  const deductions = mockTransactions.filter(t => t.isDeduction);
  const totalDeductions = deductions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    bank,
    accountName: 'Everyday Account',
    syncDate: new Date(),
    transactions: mockTransactions,
    totalImported: mockTransactions.length,
    potentialDeductions: deductions.length,
    estimatedTaxSavings: Math.round(totalDeductions * 0.3),
  };
}
