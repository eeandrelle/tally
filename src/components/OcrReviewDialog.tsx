import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import type { ExtractedReceipt, ValidationResult } from "@/lib/ocr";
import { AlertTriangle, Check, Camera, FileText } from "lucide-react";
import { getCategories } from "@/lib/db";
import type { TaxCategory } from "@/lib/db";

interface OcrReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: {
    receipt: ExtractedReceipt;
    validation: ValidationResult;
  } | null;
  imagePath: string;
  onConfirm: (data: {
    vendor: string;
    amount: number;
    date: string;
    category: string;
    notes: string;
  }) => void;
  onRetry: () => void;
  onManualEntry: () => void;
}

export function OcrReviewDialog({
  isOpen,
  onClose,
  scanResult,
  imagePath,
  onConfirm,
  onRetry,
  onManualEntry,
}: OcrReviewDialogProps) {
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [formData, setFormData] = useState({
    vendor: "",
    amount: "",
    date: "",
    category: "",
    notes: "",
  });
  const [activeTab, setActiveTab] = useState<"review" | "raw">("review");

  useEffect(() => {
    if (isOpen) {
      getCategories().then(setCategories);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scanResult) {
      const { receipt } = scanResult;
      setFormData({
        vendor: receipt.vendor.value,
        amount: receipt.total_amount.value.toString(),
        date: receipt.date.value,
        category: "",
        notes: `OCR Confidence: ${Math.round(receipt.overall_confidence * 100)}%`,
      });
    }
  }, [scanResult]);

  if (!scanResult) return null;

  const { receipt, validation } = scanResult;
  const needsReview = !validation.is_valid;

  const handleConfirm = () => {
    onConfirm({
      vendor: formData.vendor,
      amount: parseFloat(formData.amount) || 0,
      date: formData.date,
      category: formData.category,
      notes: formData.notes,
    });
  };

  const hasLowConfidence = (field: string) =>
    validation.low_confidence_fields.includes(field);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Review Scanned Receipt
          </DialogTitle>
          <DialogDescription>
            Review and correct the extracted receipt details before saving.
          </DialogDescription>
        </DialogHeader>

        {needsReview && (
          <Alert variant="destructive" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Review Recommended</AlertTitle>
            <AlertDescription className="text-amber-700">
              Some fields have low confidence scores. Please verify the extracted data.
            </AlertDescription>
          </Alert>
        )}

        <ConfidenceIndicator
          confidence={receipt.overall_confidence}
          className="py-2"
        />

        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "review"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Review Data
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "raw"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Raw Text
          </button>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          {activeTab === "review" ? (
            <div className="space-y-4 p-1">
              {/* Vendor */}
              <div className="space-y-2">
                <Label htmlFor="vendor" className="flex items-center gap-2">
                  Vendor
                  {hasLowConfidence("vendor") && (
                    <span className="text-xs text-amber-600 font-medium">
                      (Low confidence)
                    </span>
                  )}
                </Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vendor: e.target.value }))
                  }
                  className={hasLowConfidence("vendor") ? "border-amber-300" : ""}
                />
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator
                    confidence={receipt.vendor.confidence}
                    size="sm"
                    showLabel={false}
                  />
                  <span className="text-xs text-muted-foreground">
                    Source: {receipt.vendor.source}
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  Date
                  {hasLowConfidence("date") && (
                    <span className="text-xs text-amber-600 font-medium">
                      (Low confidence)
                    </span>
                  )}
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className={hasLowConfidence("date") ? "border-amber-300" : ""}
                />
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator
                    confidence={receipt.date.confidence}
                    size="sm"
                    showLabel={false}
                  />
                  <span className="text-xs text-muted-foreground">
                    Source: {receipt.date.source}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  Total Amount
                  {hasLowConfidence("total_amount") && (
                    <span className="text-xs text-amber-600 font-medium">
                      (Low confidence)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className={`pl-7 ${
                      hasLowConfidence("total_amount") ? "border-amber-300" : ""
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceIndicator
                    confidence={receipt.total_amount.confidence}
                    size="sm"
                    showLabel={false}
                  />
                  <span className="text-xs text-muted-foreground">
                    Source: {receipt.total_amount.source}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Extracted Items Preview */}
              {receipt.items.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Detected Items ({receipt.items.length})
                    </Label>
                    <div className="bg-muted rounded-md p-3 space-y-1">
                      {receipt.items.slice(0, 5).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground truncate max-w-[70%]">
                            {item.name}
                          </span>
                          <span className="font-medium">
                            ${item.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {receipt.items.length > 5 && (
                        <p className="text-xs text-muted-foreground pt-1">
                          +{receipt.items.length - 5} more items
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-1">
              <div className="bg-muted rounded-md p-4 font-mono text-xs whitespace-pre-wrap">
                {receipt.raw_text || "No raw text extracted"}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onManualEntry} className="flex-1">
              Manual Entry
            </Button>
            <Button variant="outline" onClick={onRetry} className="flex-1">
              Rescan
            </Button>
          </div>
          <Button
            onClick={handleConfirm}
            className="w-full sm:w-auto"
            disabled={!formData.vendor || !formData.amount || !formData.category}
          >
            <Check className="h-4 w-4 mr-2" />
            Save Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
