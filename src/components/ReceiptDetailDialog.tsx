import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Download,
  Edit,
  Trash2,
  Save,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Store,
  DollarSign,
  Calendar,
  FileText,
  Receipt,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'

// ATO Tax Categories
const ATO_CATEGORIES: Record<string, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  vehicle: { label: 'Vehicle & Travel', color: 'default' },
  clothing: { label: 'Clothing & Laundry', color: 'secondary' },
  education: { label: 'Education', color: 'outline' },
  home: { label: 'Home Office', color: 'default' },
  phone: { label: 'Phone & Internet', color: 'secondary' },
  tools: { label: 'Tools & Equipment', color: 'outline' },
  other: { label: 'Other', color: 'destructive' },
}

// Receipt data type
export interface Receipt {
  id: string
  vendor: string
  amount: number
  date: string
  category: string
  notes?: string
  imagePath?: string
  createdAt: string
}

interface ReceiptDetailDialogProps {
  receipt: Receipt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (receipt: Receipt) => void
  onDelete?: (receipt: Receipt) => void
  onDownload?: (receipt: Receipt) => void
}

export function ReceiptDetailDialog({
  receipt,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDownload,
}: ReceiptDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [imageZoom, setImageZoom] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  
  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Receipt>>({})

  // Reset edit state when receipt changes
  React.useEffect(() => {
    if (receipt) {
      setEditForm({ ...receipt })
      setImageZoom(1)
      setImageRotation(0)
      setIsEditing(false)
    }
  }, [receipt, open])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateForInput = (dateString: string) => {
    return dateString
  }

  const handleZoomIn = useCallback(() => {
    setImageZoom((prev) => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setImageZoom((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    setImageRotation((prev) => (prev + 90) % 360)
  }, [])

  const handleResetImage = useCallback(() => {
    setImageZoom(1)
    setImageRotation(0)
  }, [])

  const handleSave = () => {
    if (receipt && editForm) {
      const updatedReceipt = { ...receipt, ...editForm } as Receipt
      onEdit?.(updatedReceipt)
      setIsEditing(false)
      toast.success('Receipt updated successfully')
    }
  }

  const handleCancelEdit = () => {
    if (receipt) {
      setEditForm({ ...receipt })
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (receipt) {
      onDelete?.(receipt)
      setShowDeleteConfirm(false)
      onOpenChange(false)
      toast.success('Receipt deleted')
    }
  }

  const handleDownload = () => {
    if (receipt) {
      onDownload?.(receipt)
      toast.success('Receipt download started')
    }
  }

  if (!receipt) return null

  const categoryInfo = ATO_CATEGORIES[receipt.category] || ATO_CATEGORIES.other

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipt Details
              </DialogTitle>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row h-[calc(90vh-80px)]">
            {/* Image Section */}
            <div className="flex-1 bg-muted/30 border-r flex flex-col">
              {/* Image Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
                <span className="text-sm text-muted-foreground">Receipt Image</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleZoomOut}
                    disabled={imageZoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleZoomIn}
                    disabled={imageZoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRotate}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetImage}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Image Display */}
              <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
                <div
                  className="relative transition-transform duration-200 ease-out"
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  }}
                >
                  {receipt.imagePath ? (
                    <img
                      src={receipt.imagePath}
                      alt={`Receipt from ${receipt.vendor}`}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      style={{ maxHeight: '60vh' }}
                    />
                  ) : (
                    <div className="w-[400px] h-[500px] bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No image available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="w-full lg:w-[380px] bg-background flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Receipt ID */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Receipt ID</span>
                  <Badge variant="outline">{receipt.id}</Badge>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    {/* Vendor */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <Store className="h-4 w-4" />
                        Vendor
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editForm.vendor || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, vendor: e.target.value }))
                          }
                          placeholder="Enter vendor name"
                        />
                      ) : (
                        <p className="text-lg font-semibold">{receipt.vendor}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Amount
                      </Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.amount || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              amount: parseFloat(e.target.value),
                            }))
                          }
                          placeholder="0.00"
                        />
                      ) : (
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(receipt.amount)}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Date
                      </Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editForm.date ? formatDateForInput(editForm.date) : ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, date: e.target.value }))
                          }
                        />
                      ) : (
                        <p className="font-medium">{formatDate(receipt.date)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    ATO Category
                  </Label>
                  {isEditing ? (
                    <Select
                      value={editForm.category}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ATO_CATEGORIES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={categoryInfo.color} className="text-sm px-3 py-1">
                      {categoryInfo.label}
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notes
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.notes || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Add any additional notes..."
                      rows={4}
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-md min-h-[80px]">
                      {receipt.notes ? (
                        <p className="text-sm">{receipt.notes}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No notes added</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(receipt.createdAt).toLocaleString('en-AU')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the receipt from {receipt.vendor} for{' '}
              {formatCurrency(receipt.amount)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ReceiptDetailDialog
