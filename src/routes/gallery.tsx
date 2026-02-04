import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LayoutGrid, ChevronLeft, Loader2, List } from 'lucide-react'
import { toast } from 'sonner'
import { TaxYearSelector } from '@/components/TaxYearSelector'
import { useTaxYear } from '@/contexts/TaxYearContext'
import { ReceiptImageGallery } from '@/components/ReceiptImageGallery'
import {
  getReceiptsByDateRange,
  deleteReceipt,
  type Receipt as DbReceipt,
} from '@/lib/db'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/gallery')({
  component: GalleryPage,
})

function GalleryPage() {
  const { selectedYear, getYearDates, isViewingCurrentYear } = useTaxYear()
  const [receipts, setReceipts] = useState<DbReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const formatYear = (year: number) => `${year}-${String(year + 1).slice(-2)}`

  const loadData = async () => {
    try {
      setIsLoading(true)
      const { startDate, endDate } = getYearDates()

      const receiptsData = await getReceiptsByDateRange(startDate, endDate)
      setReceipts(receiptsData)
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

  const handleDelete = async (id: number) => {
    await deleteReceipt(id)
    await loadData()
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/receipts">
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="bg-primary/10 p-2 rounded-lg">
                <LayoutGrid className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Receipt Gallery</h1>
                <p className="text-sm text-muted-foreground">
                  Browse your receipt images
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TaxYearSelector showIndicator={false} />
              <Link to="/receipts">
                <Button variant="outline" className="gap-2">
                  <List className="h-4 w-4" />
                  List View
                </Button>
              </Link>
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
              You're viewing receipts from a past tax year.
            </p>
          </div>
        )}

        {/* Stats */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Receipt Gallery
                  {!isViewingCurrentYear && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                      FY {formatYear(selectedYear)}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {isLoading ? (
                    'Loading...'
                  ) : (
                    <>
                      {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
                      {' • '}
                      {receipts.filter((r) => r.image_path).length} with images
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ReceiptImageGallery
              receipts={receipts}
              onDelete={handleDelete}
              onRefresh={loadData}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default GalleryPage
