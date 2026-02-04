import React, { useState, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { 
  ReceiptListView, 
  MOCK_RECEIPTS, 
  type Receipt, 
  DataImportDialog, 
  BulkActionBar,
  MonthlySpendingGraph
} from '@/components'
import { Button } from '@/components/ui/button'
import { Plus, Download, Settings, FileText, TrendingUp, Calendar, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Calculate summary stats
const calculateStats = (receipts: Receipt[]) => {
  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0)
  const currentYear = new Date().getFullYear()
  const taxDeadline = new Date(`${currentYear}-10-31`)
  const today = new Date()
  const daysToDeadline = Math.ceil((taxDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    totalAmount,
    receiptCount: receipts.length,
    daysToDeadline,
  }
}

// Export receipts to CSV
const exportToCSV = (receipts: Receipt[]) => {
  const headers = ['ID', 'Vendor', 'Amount', 'Date', 'Category', 'Notes', 'Created At']
  const rows = receipts.map(r => [
    r.id,
    r.vendor,
    r.amount,
    r.date,
    r.category,
    r.notes || '',
    r.createdAt,
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `tally-receipts-${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function DesktopApp() {
  const [receipts, setReceipts] = useState<Receipt[]>(MOCK_RECEIPTS)
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const stats = calculateStats(receipts)

  // Get selected receipts
  const selectedReceipts = useMemo(() => {
    return receipts.filter((r) => selectedIds.includes(r.id))
  }, [receipts, selectedIds])

  const handleViewReceipt = (receipt: Receipt) => {
    console.log('View receipt:', receipt)
    toast.info(`Viewing ${receipt.vendor}`, {
      description: `${receipt.category} - $${receipt.amount}`,
    })
  }

  const handleEditReceipt = (receipt: Receipt) => {
    console.log('Edit receipt:', receipt)
    toast.info(`Editing ${receipt.vendor}`)
  }

  const handleDeleteReceipt = (receipt: Receipt) => {
    console.log('Delete receipt:', receipt)
    setReceipts((prev) => prev.filter((r) => r.id !== receipt.id))
    setSelectedIds((prev) => prev.filter((id) => id !== receipt.id))
    toast.success(`Deleted ${receipt.vendor}`)
  }

  const handleDownloadReceipt = (receipt: Receipt) => {
    console.log('Download receipt:', receipt)
    toast.success(`Downloading ${receipt.vendor} receipt`)
  }

  // Bulk operations
  const handleBulkDelete = useCallback(() => {
    setReceipts((prev) => prev.filter((r) => !selectedIds.includes(r.id)))
    toast.success(`Deleted ${selectedIds.length} receipt${selectedIds.length !== 1 ? 's' : ''}`)
    setSelectedIds([])
  }, [selectedIds])

  const handleBulkExport = useCallback(() => {
    exportToCSV(selectedReceipts)
    toast.success(`Exported ${selectedIds.length} receipt${selectedIds.length !== 1 ? 's' : ''} to CSV`)
  }, [selectedReceipts, selectedIds.length])

  const handleBulkChangeCategory = useCallback((category: string) => {
    setReceipts((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id) ? { ...r, category } : r
      )
    )
    toast.success(`Updated category for ${selectedIds.length} receipt${selectedIds.length !== 1 ? 's' : ''}`)
    setSelectedIds([])
  }, [selectedIds])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const handleImportComplete = (count: number) => {
    console.log(`Imported ${count} receipts`)
    toast.success(`Successfully imported ${count} receipts`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Tally Desktop</h1>
                <p className="text-xs text-muted-foreground">Tax Receipt Manager</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(receipts)}>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Receipt
              </Button>
              <Button variant="ghost" size="icon-sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl p-5 border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Deductions</p>
                <p className="text-2xl font-semibold">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-5 border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Receipts</p>
                <p className="text-2xl font-semibold">{stats.receiptCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <FileText className="w-5 h-5 text-secondary-foreground" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-5 border shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Days to Deadline</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">{stats.daysToDeadline}</p>
                  {stats.daysToDeadline < 30 && (
                    <Badge variant="destructive" className="text-xs">Urgent</Badge>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Spending Graph */}
        <div className="mb-6">
          <MonthlySpendingGraph receipts={receipts} fiscalYearStart={2025} />
        </div>

        {/* Receipt List */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Receipts</h2>
                {selectedIds.length > 0 && (
                  <Badge variant="secondary">
                    {selectedIds.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeView === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('list')}
                >
                  List
                </Button>
                <Button
                  variant={activeView === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('grid')}
                >
                  Grid
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <ReceiptListView
              receipts={receipts}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onViewReceipt={handleViewReceipt}
              onEditReceipt={handleEditReceipt}
              onDeleteReceipt={handleDeleteReceipt}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Tally Desktop v1.0.0</p>
            <p>Built with shadcn/ui + Tauri</p>
          </div>
        </div>
      </footer>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={receipts.length}
        onClearSelection={handleClearSelection}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onChangeCategory={handleBulkChangeCategory}
      />

      {/* Import Dialog */}
      <DataImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesktopApp />
  </React.StrictMode>,
)