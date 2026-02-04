import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutGrid,
  List,
  ChevronLeft,
  Loader2,
  Search,
  Filter,
  X,
  Calendar,
  Tag,
  FileText,
  MoreVertical,
  Download,
  Trash2,
  FolderOpen,
  CheckSquare,
  Square,
  Eye,
  Receipt,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  Image,
} from 'lucide-react'
import { toast } from 'sonner'
import { TaxYearSelector } from '@/components/TaxYearSelector'
import { useTaxYear } from '@/contexts/TaxYearContext'
import {
  getReceiptsByDateRange,
  deleteReceipt,
  type Receipt as DbReceipt,
} from '@/lib/db'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/documents')({
  component: DocumentsLibraryPage,
})

// Document type definitions
type DocumentType = 'all' | 'receipt' | 'invoice' | 'bank_statement' | 'dividend' | 'other'
type ViewMode = 'grid' | 'list'
type SortBy = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'merchant'

interface Filters {
  search: string
  type: DocumentType
  category: string
  hasImage: boolean | null
  minAmount: string
  maxAmount: string
}

const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Types', icon: <FolderOpen className="h-4 w-4" /> },
  { value: 'receipt', label: 'Receipts', icon: <Receipt className="h-4 w-4" /> },
  { value: 'invoice', label: 'Invoices', icon: <FileText className="h-4 w-4" /> },
  { value: 'bank_statement', label: 'Bank Statements', icon: <Building2 className="h-4 w-4" /> },
  { value: 'dividend', label: 'Dividend Statements', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <FileSpreadsheet className="h-4 w-4" /> },
]

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'work_from_home', label: 'Work from Home' },
  { value: 'vehicle', label: 'Vehicle Expenses' },
  { value: 'self_education', label: 'Self-Education' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'travel', label: 'Travel' },
  { value: 'car', label: 'Car Expenses' },
  { value: 'medical', label: 'Medical' },
  { value: 'donations', label: 'Donations' },
  { value: 'bank_fees', label: 'Bank Fees' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
]

function DocumentsLibraryPage() {
  const { selectedYear, getYearDates, isViewingCurrentYear } = useTaxYear()
  const [receipts, setReceipts] = useState<DbReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [previewReceipt, setPreviewReceipt] = useState<DbReceipt | null>(null)
  const [showFilters, setShowFilters] = useState(true)

  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    category: 'all',
    hasImage: null,
    minAmount: '',
    maxAmount: '',
  })

  const formatYear = (year: number) => `${year}-${String(year + 1).slice(-2)}`

  const loadData = async () => {
    try {
      setIsLoading(true)
      const { startDate, endDate } = getYearDates()
      const receiptsData = await getReceiptsByDateRange(startDate, endDate)
      setReceipts(receiptsData)
    } catch (error) {
      console.error('Failed to load receipts:', error)
      toast.error('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedYear])

  // Filter and sort receipts
  const filteredReceipts = useMemo(() => {
    let result = [...receipts]

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(
        (r) =>
          r.merchant?.toLowerCase().includes(search) ||
          r.category?.toLowerCase().includes(search) ||
          r.notes?.toLowerCase().includes(search) ||
          r.amount?.toString().includes(search)
      )
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter((r) => r.category === filters.category)
    }

    // Has image filter
    if (filters.hasImage !== null) {
      result = result.filter((r) =>
        filters.hasImage ? !!r.image_path : !r.image_path
      )
    }

    // Amount range filter
    if (filters.minAmount) {
      result = result.filter((r) => r.amount >= parseFloat(filters.minAmount))
    }
    if (filters.maxAmount) {
      result = result.filter((r) => r.amount <= parseFloat(filters.maxAmount))
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'amount_desc':
          return b.amount - a.amount
        case 'amount_asc':
          return a.amount - b.amount
        case 'merchant':
          return (a.merchant || '').localeCompare(b.merchant || '')
        default:
          return 0
      }
    })

    return result
  }, [receipts, filters, sortBy])

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filteredReceipts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredReceipts.map((r) => r.id)))
    }
  }

  const handleDelete = async (id: number) => {
    await deleteReceipt(id)
    await loadData()
    toast.success('Document deleted')
  }

  const handleBulkDelete = async () => {
    const count = selectedIds.size
    for (const id of selectedIds) {
      await deleteReceipt(id)
    }
    setSelectedIds(new Set())
    await loadData()
    toast.success(`${count} documents deleted`)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category: 'all',
      hasImage: null,
      minAmount: '',
      maxAmount: '',
    })
  }

  const hasFilters =
    filters.search ||
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.hasImage !== null ||
    filters.minAmount ||
    filters.maxAmount

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="bg-primary/10 p-2 rounded-lg">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Documents Library</h1>
                <p className="text-sm text-muted-foreground">
                  Browse, search, and manage your documents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TaxYearSelector showIndicator={false} />
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white dark:bg-neutral-900 border-b sticky top-[73px] z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                className="pl-9"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="date_asc">Oldest first</SelectItem>
                <SelectItem value="amount_desc">Highest amount</SelectItem>
                <SelectItem value="amount_asc">Lowest amount</SelectItem>
                <SelectItem value="merchant">Merchant name</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none rounded-l-md"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none rounded-r-md"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1" />

            {/* Select All */}
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0 ? (
                <CheckSquare className="h-4 w-4 mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Select All
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary text-primary-foreground sticky top-[129px] z-10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <aside className="w-64 shrink-0">
              <Card>
                <CardContent className="p-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Filters</h3>
                    {hasFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </label>
                    <Select
                      value={filters.category}
                      onValueChange={(v) =>
                        setFilters((f) => ({ ...f, category: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Amount Range
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minAmount}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, minAmount: e.target.value }))
                        }
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxAmount}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, maxAmount: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Has Image Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Image Status
                    </label>
                    <Select
                      value={filters.hasImage === null ? 'all' : filters.hasImage ? 'yes' : 'no'}
                      onValueChange={(v) =>
                        setFilters((f) => ({
                          ...f,
                          hasImage: v === 'all' ? null : v === 'yes',
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Has Image</SelectItem>
                        <SelectItem value="no">No Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </aside>
          )}

          {/* Document Grid/List */}
          <main className="flex-1 min-w-0">
            {/* Year indicator */}
            {!isViewingCurrentYear && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
                <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                  FY {formatYear(selectedYear)}
                </Badge>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You're viewing documents from a past tax year.
                </p>
              </div>
            )}

            {/* Results count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  'Loading...'
                ) : (
                  <>
                    Showing <strong>{filteredReceipts.length}</strong> of{' '}
                    <strong>{receipts.length}</strong> documents
                  </>
                )}
              </p>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredReceipts.map((receipt) => (
                  <DocumentCard
                    key={receipt.id}
                    receipt={receipt}
                    isSelected={selectedIds.has(receipt.id)}
                    onSelect={() => toggleSelection(receipt.id)}
                    onPreview={() => setPreviewReceipt(receipt)}
                    onDelete={() => handleDelete(receipt.id)}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <Card>
                <div className="divide-y">
                  {filteredReceipts.map((receipt) => (
                    <DocumentListItem
                      key={receipt.id}
                      receipt={receipt}
                      isSelected={selectedIds.has(receipt.id)}
                      onSelect={() => toggleSelection(receipt.id)}
                      onPreview={() => setPreviewReceipt(receipt)}
                      onDelete={() => handleDelete(receipt.id)}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && filteredReceipts.length === 0 && (
              <div className="text-center py-16">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  {hasFilters
                    ? 'Try adjusting your filters'
                    : 'Upload your first document to get started'}
                </p>
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewReceipt} onOpenChange={() => setPreviewReceipt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {previewReceipt && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {previewReceipt.merchant || 'Untitled'}
                  <Badge variant="secondary">
                    ${previewReceipt.amount?.toFixed(2) || '0.00'}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4">
                  {previewReceipt.image_path ? (
                    <div className="border rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                      <img
                        src={previewReceipt.image_path}
                        alt="Document"
                        className="w-full h-auto max-h-[500px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      No image available
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">
                        {previewReceipt.date
                          ? format(new Date(previewReceipt.date), 'PPP')
                          : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <p className="font-medium capitalize">
                        {previewReceipt.category?.replace(/_/g, ' ') || 'Uncategorized'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">
                        ${previewReceipt.amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    {previewReceipt.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="font-medium">{previewReceipt.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewReceipt(null)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(previewReceipt.id)
                    setPreviewReceipt(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Document Card Component (Grid View)
function DocumentCard({
  receipt,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
}: {
  receipt: DbReceipt
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDelete: () => void
}) {
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      <div className="relative">
        {/* Image Preview */}
        <div
          className="aspect-[4/3] bg-neutral-100 dark:bg-neutral-900 rounded-t-lg overflow-hidden"
          onClick={onPreview}
        >
          {receipt.image_path ? (
            <img
              src={receipt.image_path}
              alt={receipt.merchant || 'Document'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Receipt className="h-12 w-12 opacity-30" />
            </div>
          )}
        </div>

        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </div>

        {/* Actions Menu */}
        <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {receipt.merchant || 'Untitled'}
            </p>
            <p className="text-xs text-muted-foreground">
              {receipt.date ? format(new Date(receipt.date), 'dd MMM yyyy') : 'No date'}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            ${receipt.amount?.toFixed(2) || '0.00'}
          </Badge>
        </div>
        {receipt.category && (
          <Badge variant="outline" className="mt-2 text-xs capitalize">
            {receipt.category.replace(/_/g, ' ')}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

// Document List Item Component (List View)
function DocumentListItem({
  receipt,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
}: {
  receipt: DbReceipt
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors',
        isSelected && 'bg-primary/5'
      )}
    >
      <Checkbox checked={isSelected} onCheckedChange={onSelect} />

      {/* Thumbnail */}
      <div
        className="h-12 w-12 rounded bg-neutral-100 dark:bg-neutral-900 overflow-hidden shrink-0 cursor-pointer"
        onClick={onPreview}
      >
        {receipt.image_path ? (
          <img
            src={receipt.image_path}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Receipt className="h-5 w-5 opacity-30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPreview}>
        <p className="font-medium truncate">{receipt.merchant || 'Untitled'}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {receipt.date ? format(new Date(receipt.date), 'dd MMM yyyy') : 'No date'}
          {receipt.category && (
            <>
              <span>•</span>
              <span className="capitalize">{receipt.category.replace(/_/g, ' ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="font-medium">${receipt.amount?.toFixed(2) || '0.00'}</p>
      </div>

      {/* Actions */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default DocumentsLibraryPage
