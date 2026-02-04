import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Store,
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

// ATO Tax Categories with colors
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
  thumbnailUrl?: string
  createdAt: string
}

// Mock data for demonstration
export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: 'RCP-001',
    vendor: 'Officeworks',
    amount: 45.99,
    date: '2026-02-20',
    category: 'tools',
    notes: 'Printer ink',
    thumbnailUrl: '/receipts/officeworks.jpg',
    createdAt: '2026-02-20T10:30:00Z',
  },
  {
    id: 'RCP-002',
    vendor: 'Shell Petrol',
    amount: 78.50,
    date: '2026-02-18',
    category: 'vehicle',
    notes: 'Fuel for client visit',
    thumbnailUrl: '/receipts/shell.jpg',
    createdAt: '2026-02-18T16:45:00Z',
  },
  {
    id: 'RCP-003',
    vendor: 'Apple Store',
    amount: 249.00,
    date: '2026-02-15',
    category: 'tools',
    notes: 'AirPods Pro for calls',
    thumbnailUrl: '/receipts/apple.jpg',
    createdAt: '2026-02-15T14:20:00Z',
  },
  {
    id: 'RCP-004',
    vendor: 'Coles',
    amount: 23.45,
    date: '2026-02-14',
    category: 'other',
    notes: 'Office snacks',
    thumbnailUrl: '/receipts/coles.jpg',
    createdAt: '2026-02-14T09:15:00Z',
  },
  {
    id: 'RCP-005',
    vendor: 'Telstra',
    amount: 89.99,
    date: '2026-02-12',
    category: 'phone',
    notes: 'Monthly phone bill',
    thumbnailUrl: '/receipts/telstra.jpg',
    createdAt: '2026-02-12T11:00:00Z',
  },
  {
    id: 'RCP-006',
    vendor: 'BP',
    amount: 65.00,
    date: '2026-02-10',
    category: 'vehicle',
    notes: 'Fuel',
    thumbnailUrl: '/receipts/bp.jpg',
    createdAt: '2026-02-10T17:30:00Z',
  },
  {
    id: 'RCP-007',
    vendor: 'The Good Guys',
    amount: 189.00,
    date: '2026-02-08',
    category: 'home',
    notes: 'Desk lamp',
    thumbnailUrl: '/receipts/goodguys.jpg',
    createdAt: '2026-02-08T13:45:00Z',
  },
  {
    id: 'RCP-008',
    vendor: 'Uniform Shop',
    amount: 120.00,
    date: '2026-02-05',
    category: 'clothing',
    notes: 'Work shirts',
    thumbnailUrl: '/receipts/uniform.jpg',
    createdAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'RCP-009',
    vendor: 'Coursera',
    amount: 79.00,
    date: '2026-02-03',
    category: 'education',
    notes: 'Professional development course',
    thumbnailUrl: '/receipts/coursera.jpg',
    createdAt: '2026-02-03T15:20:00Z',
  },
  {
    id: 'RCP-010',
    vendor: 'Optus',
    amount: 75.00,
    date: '2026-02-01',
    category: 'phone',
    notes: 'Internet bill',
    thumbnailUrl: '/receipts/optus.jpg',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'RCP-011',
    vendor: 'Bunnings',
    amount: 34.95,
    date: '2026-01-28',
    category: 'home',
    notes: 'Office supplies',
    thumbnailUrl: '/receipts/bunnings.jpg',
    createdAt: '2026-01-28T16:10:00Z',
  },
  {
    id: 'RCP-012',
    vendor: '7-Eleven',
    amount: 25.50,
    date: '2026-01-25',
    category: 'vehicle',
    notes: 'Fuel',
    thumbnailUrl: '/receipts/711.jpg',
    createdAt: '2026-01-25T19:45:00Z',
  },
]

type SortField = 'date' | 'amount' | 'vendor' | 'category'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface ReceiptListViewProps {
  receipts?: Receipt[]
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  onViewReceipt?: (receipt: Receipt) => void
  onEditReceipt?: (receipt: Receipt) => void
  onDeleteReceipt?: (receipt: Receipt) => void
  onDownloadReceipt?: (receipt: Receipt) => void
}

export function ReceiptListView({
  receipts = MOCK_RECEIPTS,
  selectedIds = [],
  onSelectionChange,
  onViewReceipt,
  onEditReceipt,
  onDeleteReceipt,
  onDownloadReceipt,
}: ReceiptListViewProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Handle sorting
  const handleSort = (field: SortField) => {
    setSortConfig((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Filter and sort receipts
  const filteredAndSortedReceipts = useMemo(() => {
    let result = [...receipts]

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (receipt) =>
          receipt.vendor.toLowerCase().includes(query) ||
          receipt.category.toLowerCase().includes(query) ||
          receipt.notes?.toLowerCase().includes(query) ||
          receipt.id.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortConfig.field) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'vendor':
          aValue = a.vendor.toLowerCase()
          bValue = b.vendor.toLowerCase()
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [receipts, searchQuery, sortConfig])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedReceipts.length / itemsPerPage)
  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSortedReceipts.slice(start, start + itemsPerPage)
  }, [filteredAndSortedReceipts, currentPage])

  // Selection logic
  const allCurrentPageSelected = paginatedReceipts.length > 0 && 
    paginatedReceipts.every((receipt) => selectedIds.includes(receipt.id))
  
  const someCurrentPageSelected = paginatedReceipts.some((receipt) => selectedIds.includes(receipt.id)) && 
    !allCurrentPageSelected

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      // Add all current page receipts to selection
      const newSelected = new Set(selectedIds)
      paginatedReceipts.forEach((receipt) => newSelected.add(receipt.id))
      onSelectionChange(Array.from(newSelected))
    } else {
      // Remove all current page receipts from selection
      const currentPageIds = new Set(paginatedReceipts.map((r) => r.id))
      onSelectionChange(selectedIds.filter((id) => !currentPageIds.has(id)))
    }
  }

  const handleSelectRow = (receiptId: string, checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange([...selectedIds, receiptId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== receiptId))
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) {
      return <ChevronDown className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-50" />
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedReceipts.length} receipt{filteredAndSortedReceipts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {/* Checkbox header */}
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all receipts on this page"
                  data-state={someCurrentPageSelected ? 'indeterminate' : allCurrentPageSelected ? 'checked' : 'unchecked'}
                />
              </TableHead>
              <TableHead className="w-[60px]">Preview</TableHead>
              <TableHead
                className="cursor-pointer group"
                onClick={() => handleSort('vendor')}
              >
                <div className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  Vendor
                  <SortIndicator field="vendor" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer group"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Category
                  <SortIndicator field="category" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer group"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Date
                  <SortIndicator field="date" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer group text-right"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="w-4 h-4" />
                  Amount
                  <SortIndicator field="amount" />
                </div>
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No receipts found</p>
                  <p className="text-sm">Try adjusting your search or add a new receipt</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedReceipts.map((receipt) => {
                const categoryInfo = ATO_CATEGORIES[receipt.category] || ATO_CATEGORIES.other
                const isSelected = selectedIds.includes(receipt.id)
                return (
                  <TableRow
                    key={receipt.id}
                    className={`group cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => onViewReceipt?.(receipt)}
                  >
                    {/* Checkbox cell */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(receipt.id, checked as boolean)}
                        aria-label={`Select ${receipt.vendor}`}
                      />
                    </TableCell>

                    {/* Thumbnail */}
                    <TableCell>
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                        {receipt.thumbnailUrl ? (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>

                    {/* Vendor */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{receipt.vendor}</p>
                        {receipt.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {receipt.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant={categoryInfo.color}>{categoryInfo.label}</Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-muted-foreground">
                      {formatDate(receipt.date)}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(receipt.amount)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewReceipt?.(receipt)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditReceipt?.(receipt)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownloadReceipt?.(receipt)}>
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDeleteReceipt?.(receipt)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedReceipts.length)} of{' '}
            {filteredAndSortedReceipts.length} receipts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}