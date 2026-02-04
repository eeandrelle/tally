import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Trash2,
  Receipt,
  ImageOff,
  Loader2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
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
import { toast } from 'sonner'

export interface GalleryReceipt {
  id: number
  vendor: string
  amount: number
  category: string
  date: string
  image_path?: string
  notes?: string
}

interface ReceiptImageGalleryProps {
  receipts: GalleryReceipt[]
  onDelete?: (id: number) => Promise<void>
  onRefresh?: () => void
  isLoading?: boolean
}

// Convert file path to a URL that can be displayed
function getImageUrl(imagePath?: string): string | null {
  if (!imagePath) return null
  
  // Handle Tauri file paths - convert to asset URL
  if (imagePath.startsWith('file://')) {
    return imagePath
  }
  
  // For relative paths, assume they're accessible
  return imagePath
}

export function ReceiptImageGallery({
  receipts,
  onDelete,
  onRefresh,
  isLoading = false,
}: ReceiptImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [receiptToDelete, setReceiptToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const selectedReceipt = selectedIndex !== null ? receipts[selectedIndex] : null

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIndex === null) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (selectedIndex < receipts.length - 1) {
            setSelectedIndex(selectedIndex + 1)
          }
          break
        case 'Escape':
          e.preventDefault()
          setSelectedIndex(null)
          break
      }
    },
    [selectedIndex, receipts.length]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleImageError = (id: number) => {
    setImageErrors((prev) => new Set(prev).add(id))
  }

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setReceiptToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!receiptToDelete || !onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(receiptToDelete)
      toast.success('Receipt deleted')
      
      // Close lightbox if the deleted receipt was being viewed
      if (selectedReceipt?.id === receiptToDelete) {
        setSelectedIndex(null)
      }
      
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete receipt:', error)
      toast.error('Failed to delete receipt')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setReceiptToDelete(null)
    }
  }

  const navigatePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const navigateNext = () => {
    if (selectedIndex !== null && selectedIndex < receipts.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No receipts found</h3>
        <p className="text-sm text-muted-foreground">
          Scan or add receipts to see them in the gallery
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Grid Gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {receipts.map((receipt, index) => {
          const imageUrl = getImageUrl(receipt.image_path)
          const hasImageError = imageErrors.has(receipt.id)
          const hasImage = imageUrl && !hasImageError

          return (
            <Card
              key={receipt.id}
              className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-primary/20"
              onClick={() => setSelectedIndex(index)}
            >
              {/* Image Container */}
              <div className="aspect-[3/4] relative bg-muted">
                {hasImage ? (
                  <img
                    src={imageUrl}
                    alt={`Receipt from ${receipt.vendor}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(receipt.id)}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <ImageOff className="h-10 w-10 mb-2 opacity-50" />
                    <span className="text-xs">No image</span>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                  {/* Top - Quick Info */}
                  <div className="space-y-1">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-black text-xs"
                    >
                      {receipt.category}
                    </Badge>
                    <p className="text-white text-sm font-medium truncate">
                      {receipt.vendor}
                    </p>
                  </div>

                  {/* Bottom - Actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">
                      {formatCurrency(receipt.amount)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedIndex(index)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onDelete && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleDeleteClick(e, receipt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount Badge (always visible) */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded group-hover:opacity-0 transition-opacity">
                  {formatCurrency(receipt.amount)}
                </div>
              </div>

              {/* Info Bar */}
              <div className="p-3 bg-card">
                <p className="font-medium text-sm truncate">{receipt.vendor}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(receipt.date)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {receipt.category}
                  </Badge>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 bg-black/95 border-none overflow-hidden">
          <DialogTitle className="sr-only">
            {selectedReceipt
              ? `Receipt from ${selectedReceipt.vendor}`
              : 'Receipt Image'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and navigate through receipt images
          </DialogDescription>

          {selectedReceipt && (
            <div className="relative w-full h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    {selectedReceipt.category}
                  </Badge>
                  <div>
                    <h3 className="text-white font-semibold">
                      {selectedReceipt.vendor}
                    </h3>
                    <p className="text-white/70 text-sm">
                      {formatDate(selectedReceipt.date)} •{' '}
                      {formatCurrency(selectedReceipt.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">
                    {selectedIndex + 1} of {receipts.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={closeLightbox}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Image Container */}
              <div className="flex-1 relative flex items-center justify-center p-4">
                {/* Navigation - Previous */}
                {selectedIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm z-10"
                    onClick={navigatePrev}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}

                {/* Image */}
                {(() => {
                  const imageUrl = getImageUrl(selectedReceipt.image_path)
                  const hasImageError = imageErrors.has(selectedReceipt.id)
                  const hasImage = imageUrl && !hasImageError

                  return hasImage ? (
                    <img
                      src={imageUrl}
                      alt={`Receipt from ${selectedReceipt.vendor}`}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      onError={() => handleImageError(selectedReceipt.id)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/50">
                      <ImageOff className="h-20 w-20 mb-4" />
                      <p className="text-lg">No image available</p>
                      <p className="text-sm mt-2">
                        {selectedReceipt.vendor} •{' '}
                        {formatCurrency(selectedReceipt.amount)}
                      </p>
                    </div>
                  )
                })()}

                {/* Navigation - Next */}
                {selectedIndex < receipts.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm z-10"
                    onClick={navigateNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* Footer - Thumbnail Strip */}
              <div className="bg-black/50 backdrop-blur-sm p-3">
                <div className="flex items-center justify-center gap-2 overflow-x-auto">
                  {receipts.slice(
                    Math.max(0, selectedIndex - 5),
                    Math.min(receipts.length, selectedIndex + 6)
                  ).map((receipt, idx) => {
                    const actualIndex = Math.max(0, selectedIndex - 5) + idx
                    const imageUrl = getImageUrl(receipt.image_path)
                    const hasImageError = imageErrors.has(receipt.id)
                    const hasImage = imageUrl && !hasImageError

                    return (
                      <button
                        key={receipt.id}
                        onClick={() => setSelectedIndex(actualIndex)}
                        className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${
                          actualIndex === selectedIndex
                            ? 'border-primary ring-2 ring-primary/50'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {hasImage ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(receipt.id)}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Keyboard hint */}
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white/70 text-xs flex items-center gap-2">
                <span className="hidden sm:inline">
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded">←</kbd>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded ml-1">→</kbd>
                  {' '}to navigate
                </span>
                <span className="hidden sm:inline mx-1">•</span>
                <span>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded">Esc</kbd>
                  {' '}to close
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this receipt and its image. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
