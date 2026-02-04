import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, Upload, ScanLine } from "lucide-react";
import { scanReceipt, type OcrScanResult } from "@/lib/ocr";
import { OcrReviewDialog } from "./OcrReviewDialog";
import { createReceipt } from "@/lib/db";
import { cn } from "@/lib/utils";

interface OcrScanButtonProps {
  onReceiptCreated?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function OcrScanButton({
  onReceiptCreated,
  variant = "default",
  size = "default",
  className,
  children,
}: OcrScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OcrScanResult | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image file is too large. Maximum size is 10MB.");
        return;
      }

      setIsScanning(true);
      const toastId = toast.loading("Scanning receipt with OCR...");

      try {
        // Create a temporary file path for Tauri
        // In a real app, you'd use Tauri's fs API to save the file
        const tempPath = URL.createObjectURL(file);
        
        // For Tauri, we need to convert the file to a path
        // This is a simplified version - in production, use Tauri fs API
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Save to temp directory using Tauri fs
        const { writeFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
        const fileName = `receipt_scan_${Date.now()}.jpg`;
        
        await writeFile(fileName, uint8Array, {
          baseDir: BaseDirectory.Temp,
        });

        const fullPath = `${await import("@tauri-apps/api/path").then(m => m.tempDir())}/${fileName}`;
        setImagePath(fullPath);

        // Perform OCR
        const result = await scanReceipt(fullPath);
        setScanResult(result);

        toast.dismiss(toastId);

        // If confidence is high enough, auto-save
        if (result.validation.is_valid && result.receipt.overall_confidence >= 0.75) {
          await autoSaveReceipt(result);
        } else {
          // Show review dialog
          setShowReviewDialog(true);
        }
      } catch (error) {
        toast.dismiss(toastId);
        console.error("OCR scan failed:", error);
        toast.error("Failed to scan receipt. Please try manual entry.");
      } finally {
        setIsScanning(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    []
  );

  const autoSaveReceipt = async (result: OcrScanResult) => {
    try {
      const { receipt } = result;
      await createReceipt({
        vendor: receipt.vendor.value,
        amount: receipt.total_amount.value,
        category: "Other", // Default category
        date: receipt.date.value,
        notes: `Auto-extracted via OCR (Confidence: ${Math.round(
          receipt.overall_confidence * 100
        )}%)`,
      });

      toast.success("Receipt saved automatically!", {
        description: `Extracted from ${receipt.vendor.value} - $${receipt.total_amount.value.toFixed(2)}`,
      });

      onReceiptCreated?.();
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Failed to save receipt. Please review manually.");
      setShowReviewDialog(true);
    }
  };

  const handleManualConfirm = async (data: {
    vendor: string;
    amount: number;
    date: string;
    category: string;
    notes: string;
  }) => {
    try {
      await createReceipt({
        vendor: data.vendor,
        amount: data.amount,
        category: data.category,
        date: data.date,
        notes: data.notes,
      });

      toast.success("Receipt saved successfully!");
      setShowReviewDialog(false);
      setScanResult(null);
      onReceiptCreated?.();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save receipt. Please try again.");
    }
  };

  const handleRetry = () => {
    setShowReviewDialog(false);
    // Re-trigger file selection
    fileInputRef.current?.click();
  };

  const handleManualEntry = () => {
    setShowReviewDialog(false);
    // Navigate to manual entry or show manual form
    toast.info("Manual entry mode", {
      description: "Please enter the receipt details manually.",
    });
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        capture="environment"
      />

      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={() => fileInputRef.current?.click()}
        disabled={isScanning}
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <ScanLine className="h-4 w-4" />
            {children || "Scan Receipt"}
          </>
        )}
      </Button>

      <OcrReviewDialog
        isOpen={showReviewDialog}
        onClose={() => {
          setShowReviewDialog(false);
          setScanResult(null);
        }}
        scanResult={scanResult}
        imagePath={imagePath}
        onConfirm={handleManualConfirm}
        onRetry={handleRetry}
        onManualEntry={handleManualEntry}
      />
    </>
  );
}

// Alternative upload button for desktop
export function OcrUploadButton({
  onReceiptCreated,
  className,
}: {
  onReceiptCreated?: () => void;
  className?: string;
}) {
  return (
    <OcrScanButton
      onReceiptCreated={onReceiptCreated}
      variant="outline"
      className={className}
    >
      <Upload className="h-4 w-4 mr-2" />
      Upload & Scan
    </OcrScanButton>
  );
}
