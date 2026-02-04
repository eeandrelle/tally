import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewStatus, Receipt, updateReceiptReviewStatus } from "@/lib/db";
import { ReviewStatusBadge, getReviewStatusOptions } from "./ReviewStatusBadge";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";

interface ReviewStatusDialogProps {
  receipt: Receipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

export function ReviewStatusDialog({
  receipt,
  open,
  onOpenChange,
  onStatusUpdated,
}: ReviewStatusDialogProps) {
  const [status, setStatus] = useState<ReviewStatus>(receipt?.review_status || "none");
  const [notes, setNotes] = useState(receipt?.review_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when receipt changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && receipt) {
      setStatus(receipt.review_status || "none");
      setNotes(receipt.review_notes || "");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!receipt?.id) return;

    setIsSubmitting(true);
    try {
      await updateReceiptReviewStatus(receipt.id, status, notes);
      toast.success("Review status updated", {
        description: `${receipt.vendor} marked as "${getReviewStatusOptions().find(o => o.value === status)?.label}"`,
      });
      onStatusUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update review status:", error);
      toast.error("Failed to update review status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = getReviewStatusOptions();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Professional Review
          </DialogTitle>
          <DialogDescription>
            {receipt ? (
              <>
                Mark <strong>{receipt.vendor}</strong> for accountant review.
                Review-flagged items will be highlighted in accountant exports.
              </>
            ) : (
              "Select a receipt to update review status."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="review-status">Review Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ReviewStatus)}
            >
              <SelectTrigger id="review-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <ReviewStatusBadge status={option.value} size="sm" />
                      <span className="ml-2">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-notes">
              Notes for Accountant
              <span className="text-muted-foreground font-normal ml-1">
                (optional)
              </span>
            </Label>
            <Textarea
              id="review-notes"
              placeholder="e.g., Unsure if this home office expense qualifies for full deduction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These notes will be visible to your accountant when you share your records.
            </p>
          </div>

          {receipt && (
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p className="font-medium">Receipt Details</p>
              <p className="text-muted-foreground">
                {receipt.vendor} • ${receipt.amount.toFixed(2)} • {receipt.category}
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(receipt.date).toLocaleDateString("en-AU")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Review Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
