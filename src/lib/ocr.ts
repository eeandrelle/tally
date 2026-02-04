import { invoke } from "@tauri-apps/api/core";

export interface ExtractedField<T> {
  value: T;
  confidence: number;
  source: string;
}

export interface ExtractedItem {
  name: string;
  amount: number;
  confidence: number;
}

export interface ExtractedReceipt {
  vendor: ExtractedField<string>;
  date: ExtractedField<string>;
  total_amount: ExtractedField<number>;
  items: ExtractedItem[];
  raw_text: string;
  overall_confidence: number;
}

export interface ValidationResult {
  is_valid: boolean;
  low_confidence_fields: string[];
  suggested_action: "accept" | "review" | "manual_entry";
}

export interface OcrScanResult {
  receipt: ExtractedReceipt;
  validation: ValidationResult;
}

const CONFIDENCE_THRESHOLD = 0.50;

/**
 * Scan a receipt image using OCR
 */
export async function scanReceipt(imagePath: string): Promise<OcrScanResult> {
  try {
    const receipt = await invoke<ExtractedReceipt>("scan_receipt_ocr", {
      imagePath,
    });

    const validation = await invoke<ValidationResult>("validate_ocr_confidence", {
      receipt,
    });

    return { receipt, validation };
  } catch (error) {
    console.error("OCR scan failed:", error);
    throw new Error(`Failed to scan receipt: ${error}`);
  }
}

/**
 * Check if OCR confidence is acceptable
 */
export function isConfidenceAcceptable(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(confidence: number): {
  label: string;
  color: "green" | "yellow" | "red";
} {
  if (confidence >= 0.70) {
    return { label: "High", color: "green" };
  } else if (confidence >= CONFIDENCE_THRESHOLD) {
    return { label: "Medium", color: "yellow" };
  } else {
    return { label: "Low", color: "red" };
  }
}

/**
 * Format extracted receipt data for database storage
 */
export function formatExtractedReceipt(
  extracted: ExtractedReceipt
): {
  vendor: string;
  amount: number;
  date: string;
  needsReview: boolean;
} {
  return {
    vendor: extracted.vendor.value,
    amount: extracted.total_amount.value,
    date: extracted.date.value,
    needsReview: extracted.overall_confidence < CONFIDENCE_THRESHOLD,
  };
}
