import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Receipt, ChevronLeft, Loader2, Trash2, X, Check, LayoutGrid, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TaxYearSelector } from '@/components/TaxYearSelector'
import { useTaxYear } from '@/contexts/TaxYearContext'
import { OcrScanButton } from '@/components/OcrScanButton'
import { AddReceiptDialog } from '@/components/AddReceiptDialog'
import { DeleteReceiptDialog } from '@/components/DeleteReceiptDialog'
import { ReviewStatusDialog } from '@/components/ReviewStatusDialog'
import { ReviewStatusBadge } from '@/components/ReviewStatusBadge'
import { 
  getReceiptsByDateRange, 
  getTotalDeductions, 
  getReceiptCount,
  deleteReceipt,
  updateReceipt,
  getReviewStatusCounts,
  type Receipt as DbReceipt,
  type ReviewStatus
} from '@/lib/db'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

// ATO Tax Deduction Categories
const ATO_CATEGORIES = [
  { value: 'vehicle', label: 'Vehicle & Travel' },
  { value: 'clothing', label: 'Clothing & Laundry' },
  { value: 'education', label: 'Education' },
  { value: 'home', label: 'Home Office' },
  { value: 'phone', label: 'Phone & Internet' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'other', label: 'Other' },
] as const

export const Route = createFileRoute('/receipts')({
  component: ReceiptsPage,
})

// Inline editing cell component
interface EditableCellProps {
  value: string | number
  onSave: (value: string | number) => void
  type?: 'text' | 'number' | 'date' | 'select'
  options?: { value: string; label: string }[]
  formatValue?: (value: string | number) => string
  parseValue?: (value: string) => string | number
}

function EditableCell({ 
  value, 
  onSave, 
  type = 'text',
  options = [],
  formatValue = (v) => String(v),
  parseValue = (v) => v
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditValue(String(value))
  }

  const handleSave = () => {
    const parsed = parseValue(editValue)
    onSave(parsed)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    if (type === 'select' && options.length > 0) {
      return (
        <Select
          value={editValue}
          onValueChange={(val) => {
            setEditValue(val)
            onSave(val)
            setIsEditing(false)
          }}
          open
        >
          <SelectTrigger className="h-8 w-[180px]" autoFocus>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 w-full"
          step={type === 'number' ? '0.01' : undefined}
        />
      </div>
    )
  }

  return (
    <span 
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
      title="Double-click to edit"
    >
      {formatValue(value)}
    </span>
  )
}

function ReceiptsPage() {
  const { selectedYear, getYearDates, isViewingCurrentYear } = useTaxYear()
  const [receipts, setReceipts] = useState<DbReceipt[]>([])
  const [filteredReceipts, setFilteredReceipts] = useState<DbReceipt[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    average: 0,
  })
  const [reviewCounts, setReviewCounts] = useState({
    none: 0,
    pending: 0,
    in_review: 0,
    reviewed: 0,
    dismissed: 0,
  })

  // Bulk selection state
  const [selectedReceipts, setSelectedReceipts] = useState<Set<number>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [receiptToDelete, setReceiptToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Review status dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [receiptToReview, setReceiptToReview] = useState<DbReceipt | null>(null)

  const formatYear = (year: number) => `${year}-${String(year + 1).slice(-2)}`

  const loadData = async () => {
    try {
      setIsLoading(true)
      const { startDate, endDate } = getYearDates()
      
      const [receiptsData, total, count, reviewStatusCounts] = await Promise.all([
        getReceiptsByDateRange(startDate, endDate),
        getTotalDeductions(startDate, endDate),
        getReceiptCount(startDate, endDate),
        getReviewStatusCounts(),
      ])

      setReceipts(receiptsData)
      setFilteredReceipts(receiptsData)
      setStats({
        total,
        count,
        average: count > 0 ? total / count : 0,
      })
      setReviewCounts(reviewStatusCounts)
      // Clear selection when data reloads
      setSelectedReceipts(new Set())
    } catch (error) {
      console.error('Failed to load receipts:', error)
      toast.error('Failed to load receipts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedYear])

  // Filter receipts based on search query and review status
  useEffect(() => {
    let filtered = receipts

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.vendor.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.notes?.toLowerCase().includes(query) ||
          r.review_notes?.toLowerCase().includes(query)
      )
    }

    // Filter by review status
    if (reviewFilter !== 'all') {
      filtered = filtered.filter(
        (r) => (r.review_status || 'none') === reviewFilter
      )
    }

    setFilteredReceipts(filtered)
  }, [searchQuery, receipts, reviewFilter])

  // Inline update handlers
  const handleUpdateVendor = async (id: number, vendor: string) => {
    try {
      await updateReceipt(id, { vendor })
      toast.success('Vendor updated')
      await loadData()
    } catch (error) {
      console.error('Failed to update vendor:', error)
      toast.error('Failed to update vendor')
    }
  }

  const handleUpdateCategory = async (id: number, category: string) => {
    try {
      await updateReceipt(id, { category })
      toast.success('Category updated')
      await loadData()
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error('Failed to update category')
    }
  }

  const handleUpdateDate = async (id: number, date: string) => {
    try {
      await updateReceipt(id, { date })
      toast.success('Date updated')
      await loadData()
    } catch (error) {
      console.error('Failed to update date:', error)
      toast.error('Failed to update date')
    }
  }

  const handleUpdateAmount = async (id: number, amount: number) => {
    try {
      await updateReceipt(id, { amount })
      toast.success('Amount updated')
      await loadData()
    } catch (error) {
      console.error('Failed to update amount:', error)
      toast.error('Failed to update amount')
    }
  }

  // Delete handlers
  const handleDeleteClick = (id: number) => {
    setReceiptToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!receiptToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteReceipt(receiptToDelete)
      toast.success('Receipt deleted')
      await loadData()
    } catch (error) {
      console.error('Failed to delete receipt:', error)
      toast.error('Failed to delete receipt')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setReceiptToDelete(null)
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedReceipts.size === 0) return
    
    setIsDeleting(true)
    try {
      const ids = Array.from(selectedReceipts)
      await Promise.all(ids.map(id => deleteReceipt(id)))
      toast.success(`${ids.length} receipt${ids.length > 1 ? 's' : ''} deleted`)
      await loadData()
    } catch (error) {
      console.error('Failed to delete receipts:', error)
      toast.error('Failed to delete receipts')
    } finally {
      setIsDeleting(false)
      setSelectedReceipts(new Set())
    }
  }

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedReceipts.size === filteredReceipts.length) {
      setSelectedReceipts(new Set())
    } else {
      setSelectedReceipts(new Set(filteredReceipts.map(r => r.id!).filter(Boolean)))
    }
  }

  const toggleSelectReceipt = (id: number) => {
    const newSelection = new Set(selectedReceipts)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedReceipts(newSelection)
  }

  // Review status handlers
  const handleReviewClick = (receipt: DbReceipt) => {
    setReceiptToReview(receipt)
    setReviewDialogOpen(true)
  }

  const handleReviewStatusUpdated = () => {
    loadData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const allSelected = filteredReceipts.length > 0 && selectedReceipts.size === filteredReceipts.length
  const someSelected = selectedReceipts.size > 0 && selectedReceipts.size < filteredReceipts.length

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="bg-primary/10 p-2 rounded-lg">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Receipts</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your tax deductible receipts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TaxYearSelector showIndicator={false} />
              <Link to="/gallery">
                <Button variant="outline" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Gallery
                </Button>
              </Link>
              <AddReceiptDialog onReceiptCreated={loadData} />
              <OcrScanButton onReceiptCreated={loadData} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Year indicator banner */}
        {!isViewingCurrentYear && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
            <Badge variant="outline" className="border-amber-500/50 text-amber-600">
              FY {formatYear(selectedYear)}
            </Badge>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You're viewing receipts from a past tax year. Switch to the current year to add new receipts.
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Receipts</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? '-' : stats.count}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">In FY {formatYear(selectedYear)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Amount</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? '-' : formatCurrency(stats.total)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tax deductions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Receipt</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? '-' : formatCurrency(stats.average)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Receipts Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  All Receipts
                  {!isViewingCurrentYear && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                      FY {formatYear(selectedYear)}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} found
                  {selectedReceipts.size > 0 && (
                    <span className="ml-2 text-primary">({selectedReceipts.size} selected)</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Review Status Filter */}
                <Select
                  value={reviewFilter}
                  onValueChange={(value) => setReviewFilter(value as ReviewStatus | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <SelectValue placeholder="Review Filter" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Receipts</SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center justify-between w-full">
                        <span>Needs Review</span>
                        {reviewCounts.pending > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">{reviewCounts.pending}</Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="in_review">
                      <div className="flex items-center justify-between w-full">
                        <span>In Review</span>
                        {reviewCounts.in_review > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">{reviewCounts.in_review}</Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="reviewed">
                      <div className="flex items-center justify-between w-full">
                        <span>Reviewed</span>
                        {reviewCounts.reviewed > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">{reviewCounts.reviewed}</Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="dismissed">
                      <div className="flex items-center justify-between w-full">
                        <span>Dismissed</span>
                        {reviewCounts.dismissed > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">{reviewCounts.dismissed}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search receipts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedReceipts.size > 0 && (
              <div className="mt-4 flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {selectedReceipts.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReceipts(new Set())}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? 'No matching receipts' : 'No receipts yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : isViewingCurrentYear
                    ? 'Scan your first receipt to get started'
                    : `No receipts found for FY ${formatYear(selectedYear)}`}
                </p>
                {isViewingCurrentYear && !searchQuery && (
                  <div className="flex gap-3 justify-center">
                    <AddReceiptDialog onReceiptCreated={loadData} />
                    <OcrScanButton onReceiptCreated={loadData} />
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={allSelected}
                          data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all receipts"
                        />
                      </TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-32">Review Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt) => (
                      <TableRow 
                        key={receipt.id}
                        className={selectedReceipts.has(receipt.id!) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedReceipts.has(receipt.id!)}
                            onCheckedChange={() => receipt.id && toggleSelectReceipt(receipt.id)}
                            aria-label={`Select receipt from ${receipt.vendor}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <EditableCell
                            value={receipt.vendor}
                            onSave={(value) => receipt.id && handleUpdateVendor(receipt.id, String(value))}
                            type="text"
                          />
                          {receipt.review_notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-1">
                              {receipt.review_notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={receipt.category}
                            onSave={(value) => receipt.id && handleUpdateCategory(receipt.id, String(value))}
                            type="select"
                            options={ATO_CATEGORIES}
                            formatValue={(v) => {
                              const cat = ATO_CATEGORIES.find(c => c.value === v)
                              return cat?.label || String(v)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={receipt.date}
                            onSave={(value) => receipt.id && handleUpdateDate(receipt.id, String(value))}
                            type="date"
                            formatValue={(v) => formatDate(String(v))}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <EditableCell
                            value={receipt.amount}
                            onSave={(value) => receipt.id && handleUpdateAmount(receipt.id, Number(value))}
                            type="number"
                            formatValue={(v) => formatCurrency(Number(v))}
                            parseValue={(v) => parseFloat(v) || 0}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleReviewClick(receipt)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title="Click to update review status"
                          >
                            <ReviewStatusBadge status={receipt.review_status || 'none'} size="sm" />
                          </button>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => receipt.id && handleDeleteClick(receipt.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Help text */}
            {filteredReceipts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Double-click any cell to edit. Press Enter to save, Escape to cancel.
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <DeleteReceiptDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Review Status Dialog */}
      <ReviewStatusDialog
        receipt={receiptToReview}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onStatusUpdated={handleReviewStatusUpdated}
      />
    </div>
  )
}

export default ReceiptsPage
