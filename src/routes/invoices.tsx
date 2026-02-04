import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, ChevronLeft, Loader2, Trash2, Link as LinkIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TaxYearSelector } from '@/components/TaxYearSelector'
import { useTaxYear } from '@/contexts/TaxYearContext'
import { InvoiceUploadDialog } from '@/components/InvoiceUploadDialog'
import { 
  getInvoices, 
  getInvoiceStats,
  deleteInvoice,
  linkInvoiceToExpense,
  parseLineItems,
  type Invoice 
} from '@/lib/invoices'
import { getReceiptsByDateRange, createReceipt, type Receipt } from '@/lib/db'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search } from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/invoices')({
  component: InvoicesPage,
})

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: AlertCircle },
  pending: { label: 'Pending Review', color: 'bg-yellow-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-500', icon: CheckCircle },
  linked: { label: 'Linked', color: 'bg-green-500', icon: LinkIcon },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: AlertCircle },
}

function InvoicesPage() {
  const { selectedYear, getYearDates } = useTaxYear()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    linked: 0,
    totalAmount: 0,
  })

  // Link invoice dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [invoiceToLink, setInvoiceToLink] = useState<Invoice | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLinking, setIsLinking] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [invoicesData, statsData] = await Promise.all([
        getInvoices(),
        getInvoiceStats(),
      ])

      setInvoices(invoicesData)
      setFilteredInvoices(invoicesData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter invoices
  useEffect(() => {
    let filtered = invoices

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (inv) =>
          inv.vendor_name?.toLowerCase().includes(query) ||
          inv.invoice_number?.toLowerCase().includes(query) ||
          inv.abn?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter)
    }

    setFilteredInvoices(filtered)
  }, [searchQuery, invoices, statusFilter])

  const handleDeleteClick = (id: number) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return

    setIsDeleting(true)
    try {
      await deleteInvoice(invoiceToDelete)
      toast.success('Invoice deleted')
      await loadData()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      toast.error('Failed to delete invoice')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  const handleLinkClick = async (invoice: Invoice) => {
    setInvoiceToLink(invoice)
    setLinkDialogOpen(true)
    
    // Load receipts for linking
    try {
      const { startDate, endDate } = getYearDates()
      const receiptsData = await getReceiptsByDateRange(startDate, endDate)
      setReceipts(receiptsData)
    } catch (error) {
      console.error('Failed to load receipts:', error)
    }
  }

  const handleLinkToReceipt = async (receiptId: number) => {
    if (!invoiceToLink) return

    setIsLinking(true)
    try {
      await linkInvoiceToExpense(invoiceToLink.id!, receiptId)
      toast.success('Invoice linked to expense')
      setLinkDialogOpen(false)
      setInvoiceToLink(null)
      await loadData()
    } catch (error) {
      console.error('Failed to link invoice:', error)
      toast.error('Failed to link invoice to expense')
    } finally {
      setIsLinking(false)
    }
  }

  const handleCreateExpenseFromInvoice = async (invoice: Invoice) => {
    try {
      const receiptId = await createReceipt({
        vendor: invoice.vendor_name || 'Unknown Vendor',
        amount: invoice.total_amount,
        category: 'Other',
        date: invoice.invoice_date || new Date().toISOString().split('T')[0],
        notes: `Created from invoice #${invoice.invoice_number || 'unknown'}`,
      })
      
      await linkInvoiceToExpense(invoice.id!, receiptId)
      toast.success('Expense created and linked to invoice')
      await loadData()
    } catch (error) {
      console.error('Failed to create expense:', error)
      toast.error('Failed to create expense from invoice')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd MMM yyyy')
    } catch {
      return dateStr
    }
  }

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
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Invoices</h1>
                <p className="text-sm text-muted-foreground">
                  Parse and manage invoice documents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TaxYearSelector showIndicator={false} />
              <Button onClick={() => setUploadDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Upload Invoice
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Invoices</CardDescription>
              <CardTitle className="text-2xl">{isLoading ? '-' : stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-2xl">
                {isLoading ? '-' : formatCurrency(stats.totalAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Draft</CardDescription>
              <CardTitle className="text-2xl">{isLoading ? '-' : stats.draft}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl">{isLoading ? '-' : stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-2xl">{isLoading ? '-' : stats.approved}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Linked</CardDescription>
              <CardTitle className="text-2xl">{isLoading ? '-' : stats.linked}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>
                  {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as Invoice['status'] | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="linked">Linked</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? 'No matching invoices' : 'No invoices yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Upload your first invoice to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const StatusIcon = statusConfig[invoice.status].icon
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number || '-'}
                          </TableCell>
                          <TableCell>{invoice.vendor_name || 'Unknown'}</TableCell>
                          <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${statusConfig[invoice.status].color}`} />
                              <span className="text-sm">{statusConfig[invoice.status].label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-sm ${
                              invoice.confidence_score >= 0.8 ? 'text-green-600' :
                              invoice.confidence_score >= 0.6 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {Math.round(invoice.confidence_score * 100)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {invoice.status !== 'linked' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleLinkClick(invoice)}
                                  title="Link to expense"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => invoice.id && handleDeleteClick(invoice.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Upload Dialog */}
      <InvoiceUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onInvoiceCreated={loadData}
      />

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Invoice to Expense</DialogTitle>
            <DialogDescription>
              Link this invoice to an existing expense or create a new one.
            </DialogDescription>
          </DialogHeader>
          
          {invoiceToLink && (
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="font-medium">{invoiceToLink.vendor_name || 'Unknown Vendor'}</p>
                <p className="text-sm text-muted-foreground">
                  Invoice #{invoiceToLink.invoice_number || 'N/A'} • {formatCurrency(invoiceToLink.total_amount)}
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium">Select an expense to link:</p>
                {receipts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses found for this tax year.</p>
                ) : (
                  receipts.map((receipt) => (
                    <button
                      key={receipt.id}
                      onClick={() => receipt.id && handleLinkToReceipt(receipt.id)}
                      disabled={isLinking}
                      className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{receipt.vendor}</span>
                        <span className="text-sm">{formatCurrency(receipt.amount)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{receipt.date}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => invoiceToLink && handleCreateExpenseFromInvoice(invoiceToLink)}
                  disabled={isLinking}
                >
                  Create New Expense from Invoice
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InvoicesPage
