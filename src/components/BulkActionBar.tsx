import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Download, Tag, X, CheckSquare } from 'lucide-react'

// ATO Tax Categories
const ATO_CATEGORIES: Record<string, string> = {
  vehicle: 'Vehicle & Travel',
  clothing: 'Clothing & Laundry',
  education: 'Education',
  home: 'Home Office',
  phone: 'Phone & Internet',
  tools: 'Tools & Equipment',
  other: 'Other',
}

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onDelete: () => void
  onExport: () => void
  onChangeCategory: (category: string) => void
  totalCount: number
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onExport,
  onChangeCategory,
  totalCount,
}: BulkActionBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<string>('')

  if (selectedCount === 0) return null

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    onChangeCategory(value)
    setSelectedCategory('')
  }

  return (
    <>
      {/* Bulk Action Bar - Fixed at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl border shadow-2xl bg-card min-w-[600px]">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <Badge variant="secondary" className="font-medium">
              {selectedCount} selected
            </Badge>
            {selectedCount === totalCount && (
              <Badge variant="outline" className="text-xs">
                All
              </Badge>
            )}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Change Category */}
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[180px] h-9">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Change Category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ATO_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Clear */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Receipts?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <strong>{selectedCount}</strong> selected receipt
              {selectedCount !== 1 ? 's' : ''} from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete()
                setShowDeleteDialog(false)
              }}
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