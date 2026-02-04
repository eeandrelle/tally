import React, { useState, useMemo, useCallback } from 'react'
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import {
  Search,
  Filter,
  X,
  Calendar,
  DollarSign,
  Store,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'

// shadcn/ui components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// ATO Tax Categories
export const ATO_CATEGORIES: Record<string, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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
  status?: 'pending' | 'reviewed' | 'claimed'
  createdAt: string
}

// Filter state type
export interface FilterState {
  searchQuery: string
  categories: string[]
  dateRange: { from?: Date; to?: Date }
  amountRange: [number, number]
  vendors: string[]
  status: string[]
}

// Default filter state
export const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  categories: [],
  dateRange: { from: undefined, to: undefined },
  amountRange: [0, 1000],
  vendors: [],
  status: [],
}

// Quick filter presets
export const QUICK_FILTERS = [
  { id: 'this-month', label: 'This Month', icon: Calendar },
  { id: 'last-month', label: 'Last Month', icon: Calendar },
  { id: 'this-fy', label: 'This FY', icon: Calendar },
  { id: 'over-100', label: 'Over $100', icon: DollarSign },
  { id: 'vehicle-only', label: 'Vehicle Only', icon: Store },
  { id: 'pending', label: 'Pending Review', icon: FileText },
]

interface ReceiptSearchFiltersProps {
  receipts: Receipt[]
  onFilterChange?: (filteredReceipts: Receipt[]) => void
  children?: React.ReactNode
}

export function ReceiptSearchFilters({ receipts, onFilterChange, children }: ReceiptSearchFiltersProps) {
  // Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)

  // Get unique vendors for dropdown
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(receipts.map((r) => r.vendor))
    return Array.from(vendors).sort()
  }, [receipts])

  // Get min/max amount for slider
  const amountBounds = useMemo(() => {
    if (receipts.length === 0) return { min: 0, max: 1000 }
    const amounts = receipts.map((r) => r.amount)
    return { min: 0, max: Math.ceil(Math.max(...amounts) / 100) * 100 }
  }, [receipts])

  // Apply filters
  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesSearch =
          receipt.vendor.toLowerCase().includes(query) ||
          receipt.category.toLowerCase().includes(query) ||
          receipt.notes?.toLowerCase().includes(query) ||
          receipt.id.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(receipt.category)) {
        return false
      }

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const receiptDate = parseISO(receipt.date)
        const from = filters.dateRange.from ? startOfDay(filters.dateRange.from) : null
        const to = filters.dateRange.to ? endOfDay(filters.dateRange.to) : null

        if (from && to) {
          if (!isWithinInterval(receiptDate, { start: from, end: to })) return false
        } else if (from && receiptDate < from) {
          return false
        } else if (to && receiptDate > to) {
          return false
        }
      }

      // Amount range filter
      if (receipt.amount < filters.amountRange[0] || receipt.amount > filters.amountRange[1]) {
        return false
      }

      // Vendor filter
      if (filters.vendors.length > 0 && !filters.vendors.includes(receipt.vendor)) {
        return false
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(receipt.status || 'pending')) {
        return false
      }

      return true
    })
  }, [receipts, filters])

  // Notify parent of filter changes
  React.useEffect(() => {
    onFilterChange?.(filteredReceipts)
  }, [filteredReceipts, onFilterChange])

  // Update filter helper
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setActiveQuickFilter(null)
  }, [])

  // Toggle category
  const toggleCategory = useCallback((category: string) => {
    setFilters((prev) => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category]
      return { ...prev, categories: newCategories }
    })
    setActiveQuickFilter(null)
  }, [])

  // Toggle vendor
  const toggleVendor = useCallback((vendor: string) => {
    setFilters((prev) => {
      const newVendors = prev.vendors.includes(vendor)
        ? prev.vendors.filter((v) => v !== vendor)
        : [...prev.vendors, vendor]
      return { ...prev, vendors: newVendors }
    })
    setActiveQuickFilter(null)
  }, [])

  // Toggle status
  const toggleStatus = useCallback((status: string) => {
    setFilters((prev) => {
      const newStatus = prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status]
      return { ...prev, status: newStatus }
    })
    setActiveQuickFilter(null)
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setActiveQuickFilter(null)
  }, [])

  // Apply quick filter
  const applyQuickFilter = useCallback((filterId: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (filterId) {
      case 'this-month':
        setFilters({
          ...DEFAULT_FILTERS,
          dateRange: {
            from: new Date(year, month, 1),
            to: new Date(year, month + 1, 0),
          },
        })
        break
      case 'last-month':
        setFilters({
          ...DEFAULT_FILTERS,
          dateRange: {
            from: new Date(year, month - 1, 1),
            to: new Date(year, month, 0),
          },
        })
        break
      case 'this-fy':
        // Australian FY: July 1 - June 30
        const fyStart = month >= 6 ? new Date(year, 6, 1) : new Date(year - 1, 6, 1)
        const fyEnd = month >= 6 ? new Date(year + 1, 5, 30) : new Date(year, 5, 30)
        setFilters({
          ...DEFAULT_FILTERS,
          dateRange: { from: fyStart, to: fyEnd },
        })
        break
      case 'over-100':
        setFilters({
          ...DEFAULT_FILTERS,
          amountRange: [100, amountBounds.max],
        })
        break
      case 'vehicle-only':
        setFilters({
          ...DEFAULT_FILTERS,
          categories: ['vehicle'],
        })
        break
      case 'pending':
        setFilters({
          ...DEFAULT_FILTERS,
          status: ['pending'],
        })
        break
    }
    setActiveQuickFilter(filterId)
  }, [amountBounds.max])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.searchQuery) count++
    if (filters.categories.length > 0) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    if (filters.amountRange[0] > 0 || filters.amountRange[1] < amountBounds.max) count++
    if (filters.vendors.length > 0) count++
    if (filters.status.length > 0) count++
    return count
  }, [filters, amountBounds.max])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Search bar and filter button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor, category, notes..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-9"
          />
          {filters.searchQuery && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => updateFilter('searchQuery', '')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Receipts
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
              <Accordion type="multiple" defaultValue={['categories', 'date', 'amount']} className="space-y-4">
                {/* Categories */}
                <AccordionItem value="categories" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Categories</span>
                      {filters.categories.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filters.categories.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2">
                      {Object.entries(ATO_CATEGORIES).map(([key, { label, color }]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => toggleCategory(key)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                filters.categories.includes(key)
                                  ? 'bg-primary border-primary'
                                  : 'border-input'
                              }`}
                            >
                              {filters.categories.includes(key) && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <Badge variant={color}>{label}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {receipts.filter((r) => r.category === key).length}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Date Range */}
                <AccordionItem value="date" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Date Range</span>
                      {(filters.dateRange.from || filters.dateRange.to) && (
                        <Badge variant="secondary" className="ml-2">Active</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal">
                            {filters.dateRange.from ? (
                              format(filters.dateRange.from, 'PP')
                            ) : (
                              <span className="text-muted-foreground">From</span>
                            )}
                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={filters.dateRange.from}
                            onSelect={(date) =>
                              updateFilter('dateRange', { ...filters.dateRange, from: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal">
                            {filters.dateRange.to ? (
                              format(filters.dateRange.to, 'PP')
                            ) : (
                              <span className="text-muted-foreground">To</span>
                            )}
                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={filters.dateRange.to}
                            onSelect={(date) =>
                              updateFilter('dateRange', { ...filters.dateRange, to: date })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {(filters.dateRange.from || filters.dateRange.to) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => updateFilter('dateRange', { from: undefined, to: undefined })}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear dates
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Amount Range */}
                <AccordionItem value="amount" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>Amount Range</span>
                      {(filters.amountRange[0] > 0 || filters.amountRange[1] < amountBounds.max) && (
                        <Badge variant="secondary" className="ml-2">Active</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    <div className="px-2">
                      <Slider
                        value={filters.amountRange}
                        max={amountBounds.max}
                        step={10}
                        minStepsBetweenThumbs={1}
                        onValueChange={(value) => updateFilter('amountRange', value as [number, number])}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{formatCurrency(filters.amountRange[0])}</span>
                      <span className="text-muted-foreground">{formatCurrency(filters.amountRange[1])}</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Vendor Filter */}
                <AccordionItem value="vendor" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span>Vendors</span>
                      {filters.vendors.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filters.vendors.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uniqueVendors.map((vendor) => (
                        <div
                          key={vendor}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => toggleVendor(vendor)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                filters.vendors.includes(vendor)
                                  ? 'bg-primary border-primary'
                                  : 'border-input'
                              }`}
                            >
                              {filters.vendors.includes(vendor) && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm">{vendor}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {receipts.filter((r) => r.vendor === vendor).length}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Status Filter */}
                <AccordionItem value="status" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Status</span>
                      {filters.status.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filters.status.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2">
                      {['pending', 'reviewed', 'claimed'].map((status) => (
                        <div
                          key={status}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => toggleStatus(status)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                filters.status.includes(status)
                                  ? 'bg-primary border-primary'
                                  : 'border-input'
                              }`}
                            >
                              {filters.status.includes(status) && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <Badge
                              variant={
                                status === 'claimed'
                                  ? 'default'
                                  : status === 'reviewed'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {receipts.filter((r) => (r.status || 'pending') === status).length}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ScrollArea>

            <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={clearFilters}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button className="flex-1" onClick={() => setIsFilterOpen(false)}>
                  Show {filteredReceipts.length} Results
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(({ id, label, icon: Icon }) => (
          <Badge
            key={id}
            variant={activeQuickFilter === id ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-muted gap-1.5 py-1.5 px-3"
            onClick={() => applyQuickFilter(id)}
          >
            <Icon className="w-3 h-3" />
            {label}
          </Badge>
        ))}

        {activeFilterCount > 0 && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="w-3 h-3" />
              Clear all
            </Button>
          </>
        )}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          {filters.categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1">
              {ATO_CATEGORIES[cat]?.label || cat}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleCategory(cat)} />
            </Badge>
          ))}
          {(filters.dateRange.from || filters.dateRange.to) && (
            <Badge variant="secondary" className="gap-1">
              {filters.dateRange.from && format(filters.dateRange.from, 'PP')}
              {' - '}
              {filters.dateRange.to && format(filters.dateRange.to, 'PP')}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => updateFilter('dateRange', { from: undefined, to: undefined })}
              />
            </Badge>
          )}
          {(filters.amountRange[0] > 0 || filters.amountRange[1] < amountBounds.max) && (
            <Badge variant="secondary" className="gap-1">
              {formatCurrency(filters.amountRange[0])} - {formatCurrency(filters.amountRange[1])}
              <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('amountRange', [0, amountBounds.max])} />
            </Badge>
          )}
          {filters.vendors.map((vendor) => (
            <Badge key={vendor} variant="secondary" className="gap-1">
              {vendor}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleVendor(vendor)} />
            </Badge>
          ))}
          {filters.status.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleStatus(status)} />
            </Badge>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{filteredReceipts.length}</span> of{' '}
        <span className="font-medium text-foreground">{receipts.length}</span> receipts
      </div>

      {/* Children (e.g., the receipt list/table) */}
      {children}
    </div>
  )
}

export default ReceiptSearchFilters
