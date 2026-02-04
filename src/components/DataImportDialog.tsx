import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tally receipt fields for mapping
const TALLY_FIELDS = [
  { value: 'vendor', label: 'Vendor/Merchant', required: true },
  { value: 'amount', label: 'Amount', required: true },
  { value: 'date', label: 'Date', required: true },
  { value: 'category', label: 'Category', required: false },
  { value: 'description', label: 'Description', required: false },
  { value: 'gst', label: 'GST Amount', required: false },
  { value: 'ignore', label: 'Ignore Column', required: false },
] as const

type TallyField = typeof TALLY_FIELDS[number]['value']

interface CSVRow {
  [key: string]: string
}

interface ColumnMapping {
  [csvColumn: string]: TallyField
}

interface ImportError {
  row: number
  message: string
}

interface DataImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: (count: number) => void
}

export function DataImportDialog({ open, onOpenChange, onImportComplete }: DataImportDialogProps) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [importProgress, setImportProgress] = useState(0)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importComplete, setImportComplete] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [parsedCount, setParsedCount] = useState(0)

  const resetState = () => {
    setStep(1)
    setFile(null)
    setCsvData([])
    setCsvHeaders([])
    setColumnMapping({})
    setImportProgress(0)
    setImportErrors([])
    setIsImporting(false)
    setImportComplete(false)
    setParsedCount(0)
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetState, 300)
  }

  // Step 1: File Upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const parseCSV = (content: string): { headers: string[]; data: CSVRow[] } => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { headers: [], data: [] }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const data: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }

    return { headers, data }
  }

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setImportErrors([{ row: 0, message: 'Please select a valid CSV file' }])
      return
    }

    setFile(selectedFile)
    setImportErrors([])

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const { headers, data } = parseCSV(content)
      setCsvHeaders(headers)
      setCsvData(data)
      setParsedCount(data.length)

      // Auto-suggest mappings based on header names
      const suggestedMapping: ColumnMapping = {}
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader.includes('vendor') || lowerHeader.includes('merchant') || lowerHeader.includes('store')) {
          suggestedMapping[header] = 'vendor'
        } else if (lowerHeader.includes('amount') || lowerHeader.includes('total') || lowerHeader.includes('cost')) {
          suggestedMapping[header] = 'amount'
        } else if (lowerHeader.includes('date') || lowerHeader.includes('day')) {
          suggestedMapping[header] = 'date'
        } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
          suggestedMapping[header] = 'category'
        } else if (lowerHeader.includes('desc') || lowerHeader.includes('note') || lowerHeader.includes('memo')) {
          suggestedMapping[header] = 'description'
        } else if (lowerHeader.includes('gst') || lowerHeader.includes('tax')) {
          suggestedMapping[header] = 'gst'
        } else {
          suggestedMapping[header] = 'ignore'
        }
      })
      setColumnMapping(suggestedMapping)
      setStep(2)
    }
    reader.readAsText(selectedFile)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  // Step 2: Column Mapping validation
  const isMappingValid = () => {
    const mappedFields = Object.values(columnMapping)
    const requiredFields = TALLY_FIELDS.filter(f => f.required).map(f => f.value)
    return requiredFields.every(field => mappedFields.includes(field as TallyField))
  }

  // Step 3 & 4: Import
  const handleImport = async () => {
    setStep(4)
    setIsImporting(true)
    setImportProgress(0)
    setImportErrors([])

    const errors: ImportError[] = []
    const reversedMapping: { [tallyField: string]: string } = {}
    Object.entries(columnMapping).forEach(([csvCol, tallyField]) => {
      if (tallyField !== 'ignore') {
        reversedMapping[tallyField] = csvCol
      }
    })

    // Simulate import with progress
    const totalRows = csvData.length
    for (let i = 0; i < totalRows; i++) {
      await new Promise(resolve => setTimeout(resolve, 50))
      setImportProgress(Math.round(((i + 1) / totalRows) * 100))

      const row = csvData[i]
      const amountCol = reversedMapping['amount']
      const dateCol = reversedMapping['date']
      const vendorCol = reversedMapping['vendor']

      // Validate required fields
      if (amountCol) {
        const amount = parseFloat(row[amountCol].replace(/[$,]/g, ''))
        if (isNaN(amount) || amount <= 0) {
          errors.push({ row: i + 2, message: `Invalid amount: "${row[amountCol]}"` })
        }
      }

      if (dateCol && row[dateCol]) {
        const date = new Date(row[dateCol])
        if (isNaN(date.getTime())) {
          errors.push({ row: i + 2, message: `Invalid date: "${row[dateCol]}"` })
        }
      }

      if (vendorCol && !row[vendorCol]?.trim()) {
        errors.push({ row: i + 2, message: 'Missing vendor name' })
      }
    }

    setImportErrors(errors)
    setIsImporting(false)
    setImportComplete(true)

    if (errors.length === 0 && onImportComplete) {
      onImportComplete(totalRows)
    }
  }

  const getFieldLabel = (value: string) => {
    return TALLY_FIELDS.find(f => f.value === value)?.label || value
  }

  // Render steps
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              s < step && 'bg-primary text-primary-foreground',
              s === step && 'bg-primary text-primary-foreground ring-2 ring-primary/20',
              s > step && 'bg-muted text-muted-foreground'
            )}
          >
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < 4 && (
            <div
              className={cn(
                'w-12 h-0.5 mx-1 transition-colors',
                s < step ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium mb-2">
            Drop your CSV file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports CSV files from banks, credit cards, and other apps
          </p>
        </label>
      </div>

      {importErrors.length > 0 && !file && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{importErrors[0].message}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-2">Expected CSV format:</p>
        <code className="block bg-muted p-3 rounded-lg text-xs">
          Date,Vendor,Amount,Category,Description<br />
          2024-01-15,Office Works,45.99,Office Supplies,Printer paper<br />
          2024-01-16,Shell,65.50,Vehicle Fuel,Company car
        </code>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertTitle>Map Your Columns</AlertTitle>
        <AlertDescription>
          Match your CSV columns to Tally fields. Required fields are marked with *.
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CSV Column</TableHead>
              <TableHead>Tally Field</TableHead>
              <TableHead>Sample Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {csvHeaders.map((header) => (
              <TableRow key={header}>
                <TableCell className="font-medium">{header}</TableCell>
                <TableCell>
                  <Select
                    value={columnMapping[header] || 'ignore'}
                    onValueChange={(value: TallyField) => {
                      setColumnMapping(prev => ({ ...prev, [header]: value }))
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TALLY_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                  {csvData[0]?.[header] || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm">
        <p className="font-medium mb-1">Current mapping:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(columnMapping)
            .filter(([, value]) => value !== 'ignore')
            .map(([csvCol, tallyField]) => (
              <span
                key={csvCol}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
              >
                {csvCol} → {getFieldLabel(tallyField)}
              </span>
            ))}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const reversedMapping: { [tallyField: string]: string } = {}
    Object.entries(columnMapping).forEach(([csvCol, tallyField]) => {
      if (tallyField !== 'ignore') {
        reversedMapping[tallyField] = csvCol
      }
    })

    const previewRows = csvData.slice(0, 5)
    const previewHeaders = Object.entries(columnMapping)
      .filter(([, value]) => value !== 'ignore')
      .map(([csvCol, tallyField]) => ({ csvCol, tallyField }))

    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Preview</AlertTitle>
          <AlertDescription>
            Review the first 5 rows before importing {parsedCount} total receipts.
          </AlertDescription>
        </Alert>

        <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {previewHeaders.map(({ tallyField }) => (
                  <TableHead key={tallyField}>
                    {getFieldLabel(tallyField)}
                    <span className="text-muted-foreground text-xs ml-1">
                      ({columnMapping[tallyField]})
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow key={idx}>
                  {previewHeaders.map(({ csvCol, tallyField }) => (
                    <TableCell key={tallyField} className="truncate max-w-[150px]">
                      {tallyField === 'amount' && row[csvCol]
                        ? `$${parseFloat(row[csvCol].replace(/[$,]/g, '') || '0').toFixed(2)}`
                        : row[csvCol] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {csvData.length > 5 && (
          <p className="text-sm text-muted-foreground text-center">
            ... and {csvData.length - 5} more rows
          </p>
        )}
      </div>
    )
  }

  const renderStep4 = () => (
    <div className="space-y-6 py-4">
      {!importComplete ? (
        <>
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Importing receipts...</h3>
            <p className="text-muted-foreground">
              Processing {Math.round((importProgress / 100) * csvData.length)} of {csvData.length} rows
            </p>
          </div>
          <Progress value={importProgress} className="w-full" />
        </>
      ) : (
        <div className="text-center">
          {importErrors.length === 0 ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
              <p className="text-muted-foreground">
                Successfully imported {csvData.length} receipts.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Import Finished with Errors</h3>
              <p className="text-muted-foreground mb-4">
                {csvData.length - importErrors.length} of {csvData.length} receipts imported.
              </p>
            </>
          )}
        </div>
      )}

      {importErrors.length > 0 && importComplete && (
        <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Row</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importErrors.map((error, idx) => (
                <TableRow key={idx} className="bg-destructive/5">
                  <TableCell className="font-medium">{error.row}</TableCell>
                  <TableCell className="text-destructive">{error.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Receipts</DialogTitle>
          <DialogDescription>
            Import receipts from CSV files or other apps
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="flex-1 overflow-auto">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        <DialogFooter className="flex justify-between items-center border-t pt-4">
          <div>
            {step > 1 && step < 4 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={isImporting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {importComplete ? (
              <Button onClick={handleClose}>
                {importErrors.length > 0 ? 'Close & Review' : 'Done'}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancel
                </Button>
                {step === 2 && (
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!isMappingValid()}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {step === 3 && (
                  <Button onClick={handleImport}>
                    Import {parsedCount} Receipts
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
