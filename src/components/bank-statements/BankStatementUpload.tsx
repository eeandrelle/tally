/**
 * BankStatementUpload Component
 * Drag-and-drop upload with bank selector
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { BankName } from '@/lib/bank-statement-types';
import { useStatementUpload } from '@/hooks/useStatementUpload';
import { BankSelector } from './BankSelector';
import { StatementParserProgress } from './StatementParserProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankStatementUploadProps {
  onUpload?: (file: File, bankName: BankName | null) => void;
  onValidate?: (valid: boolean) => void;
  className?: string;
}

export function BankStatementUpload({
  onUpload,
  onValidate,
  className,
}: BankStatementUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const {
    file,
    bankName,
    isValidating,
    validation,
    error,
    selectFile,
    selectBank,
    clearFile,
    fileSizeFormatted,
  } = useStatementUpload({
    autoDetectBank: true,
    validateOnSelect: true,
  });
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await selectFile(acceptedFiles[0]);
    }
    setIsDragging(false);
  }, [selectFile]);
  
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    noClick: !!file,
    noKeyboard: !!file,
  });
  
  const handleBankSelect = (bank: BankName | null) => {
    if (bank) {
      selectBank(bank);
    }
  };
  
  const handleUpload = () => {
    if (file && validation?.valid) {
      onUpload?.(file, bankName);
    }
  };
  
  const isValid = validation?.valid ?? false;
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Bank Statement
        </CardTitle>
        <CardDescription>
          Upload your PDF bank statement to automatically extract transactions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Bank Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Select Bank
          </label>
          <BankSelector
            value={bankName}
            onChange={handleBankSelect}
            placeholder="Select your bank (optional - we'll try to auto-detect)"
          />
          {bankName && validation?.bank && validation.bank !== bankName && (
            <Alert variant="warning" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Detected {validation.bank} statement but {bankName} is selected
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* File Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
            isDragActive && 'border-primary bg-primary/5',
            isDragging && 'border-primary bg-primary/10',
            file && 'border-green-500 bg-green-50/50 cursor-default',
            error && !file && 'border-red-500 bg-red-50/50',
            !file && !error && 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
        >
          <input {...getInputProps()} />
          
          {file ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fileSizeFormatted}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isValidating ? (
                  <Badge variant="secondary" className="animate-pulse">
                    Validating...
                  </Badge>
                ) : isValid ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Valid
                  </Badge>
                ) : validation ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Invalid
                  </Badge>
                ) : null}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  {isDragActive ? (
                    <FileCheck className="h-8 w-8 text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <p className="text-lg font-medium mb-1">
                {isDragActive ? 'Drop your statement here' : 'Drag & drop your PDF statement'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files
              </p>
              
              <Button type="button" variant="outline" onClick={open}>
                Select PDF File
              </Button>
              
              <p className="text-xs text-muted-foreground mt-4">
                Supported: PDF bank statements from CommBank, NAB, Westpac, ANZ, ING
              </p>
            </div>
          )}
        </div>
        
        {/* Validation Errors */}
        {validation && validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Validation Warnings */}
        {validation && validation.warnings.length > 0 && (
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <ul className="list-disc list-inside text-sm">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Upload Button */}
        {file && isValid && (
          <Button 
            onClick={handleUpload}
            className="w-full"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Parse Statement
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
