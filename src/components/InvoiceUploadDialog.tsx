import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/FileUpload'
import { parseInvoicePdf, parseInvoiceImage, validateInvoice, extractedInvoiceToDbInvoice, createInvoice, type ExtractedInvoice, type InvoiceValidationResult } from '@/lib/invoices'
import { createReceipt } from '@/lib/db'
import { toast } from 'sonner'
import { Loader2, FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface InvoiceUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvoiceCreated?: () => void
}

export function InvoiceUploadDialog({ open, onOpenChange, onInvoiceCreated }: InvoiceUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(null)
  const [validation, setValidation] = useState<InvoiceValidationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setExtractedData(null)
    setValidation(null)
    setProgress(0)
  }, [])

  const handleParse = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(10)

    try {
      // Convert file to path for Tauri
      // In a real app, we'd save the file first and get the path
      const filePath = URL.createObjectURL(file)
      
      let extracted: ExtractedInvoice
      
      setProgress(30)
      
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        extracted = await parseInvoicePdf(filePath)
      } else {
        extracted = await parseInvoiceImage(filePath)
      }
      
      setProgress(60)
      setExtractedData(extracted)
      
      // Validate the extracted data
      const validationResult = await validateInvoice(extracted)
      setValidation(validationResult)
      
      setProgress(100)
      
      if (validationResult.suggested_action === 'accept') {
        toast.success('Invoice parsed successfully with high confidence')
      } else if (validationResult.suggested_action === 'review') {
        toast.warning('Invoice parsed. Please review the extracted data.')
      } else {
        toast.error('Could not parse invoice accurately. Please enter manually.')
      }
    } catch (error) {
      console.error('Failed to parse invoice:', error)
      toast.error('Failed to parse invoice: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!extractedData || !file) return

    setIsSaving(true)
    
    try {
      // Save the document file first (in production, save to app directory)
      const filePath = `/invoices/${file.name}` // Mock path
      
      // Create invoice record
      const invoiceData = extractedInvoiceToDbInvoice(extractedData, filePath)
      await createInvoice(invoiceData)
      
      // Optionally create linked expense record
      if (extractedData.vendor_name && extractedData.total_amount) {
        await createReceipt({
          vendor: extractedData.vendor_name.value,
          amount: extractedData.total_amount.value,
          category: 'Other',
          date: extractedData.invoice_date?.value || new Date().toISOString().split('T')[0],
          notes: `Auto-created from invoice #${extractedData.invoice_number?.value || 'unknown'}`,
        })
      }
      
      toast.success('Invoice saved successfully')
      onInvoiceCreated?.()
      onOpenChange(false)
      
      // Reset state
      setFile(null)
      setExtractedData(null)
      setValidation(null)
      setProgress(0)
    } catch (error) {
      console.error('Failed to save invoice:', error)
      toast.error('Failed to save invoice')
    } finally {
      setIsSaving(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusIcon = (action: string) => {
    switch (action) {
      case 'accept':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'review':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Invoice
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or image of an invoice to automatically extract details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          {!extractedData && (
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg"
              maxSize={10 * 1024 * 1024} // 10MB
            />
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Parsing invoice... This may take a moment
              </p>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Extracted Data */}
          {extractedData && validation && !isProcessing && (
            <div className="space-y-4">
              {/* Validation Status */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                {getStatusIcon(validation.suggested_action)}
                <div className="flex-1">
                  <p className="font-medium">
                    {validation.suggested_action === 'accept' 
                      ? 'High confidence extraction' 
                      : validation.suggested_action === 'review'
                      ? 'Please review the extracted data'
                      : 'Low confidence - manual entry recommended'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {Math.round(extractedData.overall_confidence * 100)}%
                  </p>
                </div>
                <Badge variant={validation.is_valid ? 'default' : 'destructive'}>
                  {validation.is_valid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {validation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Fields */}
              {validation.missing_fields.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">Missing Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {validation.missing_fields.map((f) => (
                      <Badge key={f} variant="outline" className="border-red-300 text-red-700">
                        {f.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ABN</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={extractedData.abn?.value || ''} 
                      placeholder="Not detected"
                      readOnly
                    />
                    {extractedData.abn && (
                      <div 
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(extractedData.abn.confidence)}`}
                        title={`Confidence: ${Math.round(extractedData.abn.confidence * 100)}%`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={extractedData.invoice_number?.value || ''} 
                      placeholder="Not detected"
                      readOnly
                    />
                    {extractedData.invoice_number && (
                      <div 
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(extractedData.invoice_number.confidence)}`}
                        title={`Confidence: ${Math.round(extractedData.invoice_number.confidence * 100)}%`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={extractedData.invoice_date?.value || ''} 
                      placeholder="Not detected"
                      readOnly
                    />
                    {extractedData.invoice_date && (
                      <div 
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(extractedData.invoice_date.confidence)}`}
                        title={`Confidence: ${Math.round(extractedData.invoice_date.confidence * 100)}%`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={extractedData.due_date?.value || ''} 
                      placeholder="Not detected"
                      readOnly
                    />
                    {extractedData.due_date && (
                      <div 
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(extractedData.due_date.confidence)}`}
                        title={`Confidence: ${Math.round(extractedData.due_date.confidence * 100)}%`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={extractedData.vendor_name?.value || ''} 
                      placeholder="Not detected"
                      readOnly
                    />
                    {extractedData.vendor_name && (
                      <div 
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(extractedData.vendor_name.confidence)}`}
                        title={`Confidence: ${Math.round(extractedData.vendor_name.confidence * 100)}%`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={extractedData.total_amount?.value ? `$${extractedData.total_amount.value.toFixed(2)}` : ''} 
                      placeholder="Not detected"
                      readOnly
                    />
                    {extractedData.total_amount && (
                      <div 
                        className={`w-3 h-3 rounded-full ${getConfidenceColor(extractedData.total_amount.confidence)}`}
                        title={`Confidence: ${Math.round(extractedData.total_amount.confidence * 100)}%`}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>GST Amount</Label>
                  <Input 
                    value={extractedData.gst_amount?.value ? `$${extractedData.gst_amount.value.toFixed(2)}` : ''} 
                    placeholder="Not detected"
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input 
                    value={extractedData.payment_terms?.value || ''} 
                    placeholder="Not detected"
                    readOnly
                  />
                </div>
              </div>

              {/* Line Items */}
              {extractedData.line_items.length > 0 && (
                <div className="space-y-2">
                  <Label>Line Items ({extractedData.line_items.length})</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Unit Price</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.line_items.slice(0, 5).map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{item.description}</td>
                            <td className="p-2 text-right">{item.quantity || '-'}</td>
                            <td className="p-2 text-right">
                              {item.unit_price ? `$${item.unit_price.toFixed(2)}` : '-'}
                            </td>
                            <td className="p-2 text-right">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                        {extractedData.line_items.length > 5 && (
                          <tr>
                            <td colSpan={4} className="p-2 text-center text-muted-foreground">
                              ...and {extractedData.line_items.length - 5} more items
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!extractedData ? (
              <Button 
                onClick={handleParse} 
                disabled={!file || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Parse Invoice'
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                disabled={isSaving || validation?.suggested_action === 'manual_entry'}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Invoice'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
