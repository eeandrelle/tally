use serde::{Deserialize, Serialize};
use std::path::Path;

/// Extracted receipt data with confidence scores
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractedReceipt {
    pub vendor: ExtractedField<String>,
    pub date: ExtractedField<String>,
    pub total_amount: ExtractedField<f64>,
    pub items: Vec<ExtractedItem>,
    pub raw_text: String,
    pub overall_confidence: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractedField<T> {
    pub value: T,
    pub confidence: f64,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractedItem {
    pub name: String,
    pub amount: f64,
    pub confidence: f64,
}

/// Mock OCR engine for development
/// In production, this would use Tesseract (leptess)
pub struct OcrEngine;

impl OcrEngine {
    pub fn new() -> Result<Self, String> {
        // In production: Initialize Tesseract
        Ok(OcrEngine)
    }

    /// Process an image file and extract receipt data
    /// This is a mock implementation that simulates OCR for development
    pub fn process_receipt_image(&mut self, image_path: &str) -> Result<ExtractedReceipt, String> {
        let path = Path::new(image_path);
        if !path.exists() {
            return Err(format!("Image file not found: {}", image_path));
        }

        // Mock extracted data based on file metadata
        // In production, this would perform actual OCR
        let file_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("receipt");

        // Generate mock data with varying confidence
        let mock_vendor = format!("{} Store", capitalize_first(file_name));
        let mock_amount = 45.99 + (file_name.len() as f64 * 1.5) % 100.0;
        let mock_date = chrono::Local::now().format("%Y-%m-%d").to_string();

        let vendor_confidence = 0.75 + (file_name.len() as f64 * 0.01) % 0.2;
        let date_confidence = 0.80;
        let amount_confidence = 0.85;

        let overall_confidence = (vendor_confidence + date_confidence + amount_confidence) / 3.0;

        Ok(ExtractedReceipt {
            vendor: ExtractedField {
                value: mock_vendor.clone(),
                confidence: vendor_confidence,
                source: "ocr_line_0".to_string(),
            },
            date: ExtractedField {
                value: mock_date.clone(),
                confidence: date_confidence,
                source: "ocr_line_2".to_string(),
            },
            total_amount: ExtractedField {
                value: mock_amount,
                confidence: amount_confidence,
                source: "keyword_total".to_string(),
            },
            items: vec![
                ExtractedItem {
                    name: "Item 1".to_string(),
                    amount: mock_amount * 0.6,
                    confidence: 0.65,
                },
                ExtractedItem {
                    name: "Item 2".to_string(),
                    amount: mock_amount * 0.4,
                    confidence: 0.65,
                },
            ],
            raw_text: format!(
                "{}\nDate: {}\n\nItem 1: ${:.2}\nItem 2: ${:.2}\n\nTotal: ${:.2}",
                mock_vendor,
                mock_date,
                mock_amount * 0.6,
                mock_amount * 0.4,
                mock_amount
            ),
            overall_confidence,
        })
    }
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

#[tauri::command]
pub async fn scan_receipt_ocr(image_path: String) -> Result<ExtractedReceipt, String> {
    let mut engine = OcrEngine::new()?;
    engine.process_receipt_image(&image_path)
}

#[tauri::command]
pub async fn validate_ocr_confidence(receipt: ExtractedReceipt) -> ValidationResult {
    let threshold = 0.50;

    ValidationResult {
        is_valid: receipt.overall_confidence >= threshold,
        low_confidence_fields: get_low_confidence_fields(&receipt, threshold),
        suggested_action: if receipt.overall_confidence >= threshold {
            "accept".to_string()
        } else if receipt.overall_confidence >= 0.35 {
            "review".to_string()
        } else {
            "manual_entry".to_string()
        },
    }
}

#[derive(Debug, Serialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub low_confidence_fields: Vec<String>,
    pub suggested_action: String,
}

fn get_low_confidence_fields(receipt: &ExtractedReceipt, threshold: f64) -> Vec<String> {
    let mut fields = Vec::new();

    if receipt.vendor.confidence < threshold {
        fields.push("vendor".to_string());
    }
    if receipt.date.confidence < threshold {
        fields.push("date".to_string());
    }
    if receipt.total_amount.confidence < threshold {
        fields.push("total_amount".to_string());
    }

    fields
}

// Production implementation note:
// To enable real OCR, install system dependencies:
// macOS: brew install pkgconf leptonica tesseract
// Ubuntu: sudo apt-get install pkg-config libleptonica-dev libtesseract-dev tesseract-ocr
// Then update Cargo.toml to use:
// leptess = "0.14"
// image = "0.25"
// regex = "1.10"
// And replace this mock implementation with the full ocr.rs implementation
