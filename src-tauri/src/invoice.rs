//! Invoice parsing module for extracting data from PDF and image invoices
//! 
//! Supports:
//! - PDF text extraction
//! - OCR for image-based invoices  
//! - Australian Business Number (ABN) extraction
//! - Invoice number parsing
//! - Line item extraction
//! - Payment terms identification

use serde::{Deserialize, Serialize};
use std::path::Path;
use regex::Regex;

/// Extracted invoice data
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ExtractedInvoice {
    /// Australian Business Number
    pub abn: Option<ExtractedField<String>>,
    /// Invoice number
    pub invoice_number: Option<ExtractedField<String>>,
    /// Invoice date
    pub invoice_date: Option<ExtractedField<String>>,
    /// Due date
    pub due_date: Option<ExtractedField<String>>,
    /// Vendor/Business name
    pub vendor_name: Option<ExtractedField<String>>,
    /// Total amount
    pub total_amount: Option<ExtractedField<f64>>,
    /// GST amount
    pub gst_amount: Option<ExtractedField<f64>>,
    /// Payment terms
    pub payment_terms: Option<ExtractedField<String>>,
    /// Line items
    pub line_items: Vec<LineItem>,
    /// Raw extracted text
    pub raw_text: String,
    /// Overall confidence score (0.0 - 1.0)
    pub overall_confidence: f64,
    /// Document type
    pub document_type: DocumentType,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractedField<T> {
    pub value: T,
    pub confidence: f64,
    pub source: String,
}

impl<T> ExtractedField<T> {
    pub fn new(value: T, confidence: f64, source: &str) -> Self {
        Self {
            value,
            confidence,
            source: source.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct LineItem {
    pub description: String,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub total: f64,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub enum DocumentType {
    #[default]
    Unknown,
    Pdf,
    Image,
}

/// Invoice parser for extracting structured data from documents
pub struct InvoiceParser {
    /// Regex patterns for ABN validation and extraction
    abn_patterns: Vec<Regex>,
    /// Regex patterns for invoice numbers
    invoice_number_patterns: Vec<Regex>,
    /// Regex patterns for dates
    date_patterns: Vec<Regex>,
    /// Regex patterns for amounts
    amount_patterns: Vec<Regex>,
    /// Regex patterns for payment terms
    payment_terms_patterns: Vec<Regex>,
}

impl InvoiceParser {
    pub fn new() -> Result<Self, String> {
        // ABN pattern: 11 digits, optionally with spaces
        let abn_patterns = vec![
            Regex::new(r"(?i)(?:abn|a\.b\.n\.?|australian business number)[:\s]*(\d{2}\s*\d{3}\s*\d{3}\s*\d{3})").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:abn|a\.b\.n\.?|australian business number)[:\s]*(\d{11})").map_err(|e| e.to_string())?,
            Regex::new(r"\b(\d{2}\s\d{3}\s\d{3}\s\d{3})\b").map_err(|e| e.to_string())?,
            Regex::new(r"\b(\d{11})\b").map_err(|e| e.to_string())?,
        ];

        // Invoice number patterns
        let invoice_number_patterns = vec![
            Regex::new(r"(?i)(?:invoice\s*(?:#|no\.?|number)?|inv\.?|tax\s*invoice)[:\s#]*(\w[\w\-]*)").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:inv|invoice)\s*#?\s*[:\s]*(\w[\w\-]*)").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:reference|ref)[:\s#]*(INV[\w\-]*)").map_err(|e| e.to_string())?,
        ];

        // Date patterns (Australian format preferred: DD/MM/YYYY, but also accept ISO)
        let date_patterns = vec![
            Regex::new(r"(?i)(?:invoice\s*date|date)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:invoice\s*date|date)[:\s]*(\d{4}-\d{2}-\d{2})").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:date)[:\s]*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})").map_err(|e| e.to_string())?,
            Regex::new(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b").map_err(|e| e.to_string())?,
            Regex::new(r"\b(\d{4}-\d{2}-\d{2})\b").map_err(|e| e.to_string())?,
        ];

        // Amount patterns
        let amount_patterns = vec![
            Regex::new(r"(?i)(?:total\s*amount|total\s*due|amount\s*due|total\s*\(inc\.?\s*gst\)|total\s*\(gst\s*inc\.?\)|grand\s*total)[:\s]*[$€£]?\s*([\d,]+\.\d{2})").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:total)[:\s]*[$€£]?\s*([\d,]+\.\d{2})").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:gst|tax)[:\s]*[$€£]?\s*([\d,]+\.\d{2})").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:balance\s*due)[:\s]*[$€£]?\s*([\d,]+\.\d{2})").map_err(|e| e.to_string())?,
            Regex::new(r"[$€£]\s*([\d,]+\.\d{2})").map_err(|e| e.to_string())?,
        ];

        // Payment terms patterns
        let payment_terms_patterns = vec![
            Regex::new(r"(?i)(?:payment\s*terms?|terms?)[:\s]*(\d+\s*(?:days?|day))").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:payment\s*terms?|terms?)[:\s]*(net\s*\d+|cod|cash\s*on\s*delivery|immediate|upon\s*receipt)").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:due\s*(?:in|within)?)[:\s]*(\d+\s*(?:days?|day))").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)net\s*(\d+)").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:eom|end\s*of\s*month)").map_err(|e| e.to_string())?,
            Regex::new(r"(?i)(?:14|30|60|90)\s*days?").map_err(|e| e.to_string())?,
        ];

        Ok(Self {
            abn_patterns,
            invoice_number_patterns,
            date_patterns,
            amount_patterns,
            payment_terms_patterns,
        })
    }

    /// Parse an invoice from text content
    pub fn parse_from_text(&self, text: &str, document_type: DocumentType) -> Result<ExtractedInvoice, String> {
        let text = text.trim();
        
        if text.is_empty() {
            return Err("Empty text content".to_string());
        }

        let mut invoice = ExtractedInvoice {
            raw_text: text.to_string(),
            document_type: document_type.clone(),
            ..Default::default()
        };

        // Extract ABN
        if let Some(abn) = self.extract_abn(text) {
            invoice.abn = Some(abn);
        }

        // Extract invoice number
        if let Some(inv_num) = self.extract_invoice_number(text) {
            invoice.invoice_number = Some(inv_num);
        }

        // Extract dates
        let dates = self.extract_dates(text);
        if !dates.is_empty() {
            invoice.invoice_date = Some(dates[0].clone());
            if dates.len() > 1 {
                invoice.due_date = Some(dates[1].clone());
            }
        }

        // Extract vendor name (from first few lines or letterhead area)
        if let Some(vendor) = self.extract_vendor_name(text) {
            invoice.vendor_name = Some(vendor);
        }

        // Extract amounts
        let amounts = self.extract_amounts(text);
        if !amounts.is_empty() {
            // The largest amount is likely the total
            invoice.total_amount = Some(amounts[0].clone());
            
            // Look for GST amount in remaining amounts
            for amount in &amounts[1..] {
                if text.to_lowercase().contains("gst") && amount.value < amounts[0].value * 0.2 {
                    invoice.gst_amount = Some(amount.clone());
                    break;
                }
            }
        }

        // Extract payment terms
        if let Some(terms) = self.extract_payment_terms(text) {
            invoice.payment_terms = Some(terms);
        }

        // Extract line items
        invoice.line_items = self.extract_line_items(text);

        // Calculate overall confidence
        invoice.overall_confidence = self.calculate_confidence(&invoice);

        Ok(invoice)
    }

    /// Extract ABN from text
    fn extract_abn(&self, text: &str) -> Option<ExtractedField<String>> {
        for pattern in &self.abn_patterns {
            if let Some(caps) = pattern.captures(text) {
                if let Some(abn_match) = caps.get(1) {
                    let abn = abn_match.as_str().replace(" ", "");
                    if Self::validate_abn(&abn) {
                        return Some(ExtractedField::new(abn, 0.90, "abn_regex"));
                    }
                }
            }
        }
        None
    }

    /// Validate ABN using checksum algorithm
    pub fn validate_abn(abn: &str) -> bool {
        if abn.len() != 11 {
            return false;
        }

        let digits: Vec<u32> = abn.chars()
            .filter_map(|c| c.to_digit(10))
            .collect();

        if digits.len() != 11 {
            return false;
        }

        // ABN validation weights
        let weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
        
        // Subtract 1 from first digit
        let mut sum = (digits[0] - 1) * weights[0];
        
        // Add remaining digits
        for i in 1..11 {
            sum += digits[i] * weights[i];
        }

        sum % 89 == 0
    }

    /// Extract invoice number
    fn extract_invoice_number(&self, text: &str) -> Option<ExtractedField<String>> {
        for pattern in &self.invoice_number_patterns {
            if let Some(caps) = pattern.captures(text) {
                if let Some(inv_match) = caps.get(1) {
                    let inv_num = inv_match.as_str().trim().to_uppercase();
                    if !inv_num.is_empty() && inv_num.len() < 50 {
                        return Some(ExtractedField::new(inv_num, 0.85, "invoice_number_regex"));
                    }
                }
            }
        }
        None
    }

    /// Extract dates from text
    fn extract_dates(&self, text: &str) -> Vec<ExtractedField<String>> {
        let mut dates = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for pattern in &self.date_patterns {
            for caps in pattern.captures_iter(text) {
                if let Some(date_match) = caps.get(1) {
                    let date = date_match.as_str().trim().to_string();
                    if !seen.contains(&date) && date.len() >= 6 {
                        seen.insert(date.clone());
                        dates.push(ExtractedField::new(date, 0.80, "date_regex"));
                    }
                }
            }
        }

        dates.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        dates
    }

    /// Extract vendor name from text (simple heuristic)
    fn extract_vendor_name(&self, text: &str) -> Option<ExtractedField<String>> {
        // Look for common business identifiers
        let lines: Vec<&str> = text.lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty() && l.len() > 2)
            .take(10) // Check first 10 lines
            .collect();

        for line in &lines {
            // Skip lines that are clearly not business names
            let lower = line.to_lowercase();
            if lower.starts_with("abn") 
                || lower.starts_with("invoice") 
                || lower.starts_with("date")
                || lower.starts_with("tax")
                || lower.starts_with("bill to")
                || lower.starts_with("ship to")
                || line.chars().all(|c| c.is_ascii_digit() || c == '-' || c == '/')
            {
                continue;
            }

            // Check if it looks like a business name (has letters, reasonable length)
            if line.len() > 3 && line.len() < 100 && line.chars().any(|c| c.is_alphabetic()) {
                // Check for common business suffixes
                let business_suffixes = ["pty ltd", "ltd", "limited", "inc", "corp", "llc", "trading as", "t/a"];
                let confidence = if business_suffixes.iter().any(|s| lower.contains(s)) {
                    0.90
                } else {
                    0.70
                };

                return Some(ExtractedField::new(line.to_string(), confidence, "vendor_heuristic"));
            }
        }

        None
    }

    /// Extract amounts from text
    fn extract_amounts(&self, text: &str) -> Vec<ExtractedField<f64>> {
        let mut amounts = Vec::new();
        let mut seen = std::collections::HashSet::new();

        for pattern in &self.amount_patterns {
            for caps in pattern.captures_iter(text) {
                if let Some(amount_match) = caps.get(1) {
                    let amount_str = amount_match.as_str().replace(",", "");
                    if let Ok(amount) = amount_str.parse::<f64>() {
                        if amount > 0.0 && !seen.contains(&amount_str) && amount < 1000000.0 {
                            seen.insert(amount_str);
                            amounts.push(ExtractedField::new(amount, 0.75, "amount_regex"));
                        }
                    }
                }
            }
        }

        // Sort by value descending (largest first, likely total)
        amounts.sort_by(|a, b| b.value.partial_cmp(&a.value).unwrap());
        amounts
    }

    /// Extract payment terms
    fn extract_payment_terms(&self, text: &str) -> Option<ExtractedField<String>> {
        for pattern in &self.payment_terms_patterns {
            if let Some(caps) = pattern.captures(text) {
                if let Some(terms_match) = caps.get(0) {
                    let terms = terms_match.as_str().trim().to_string();
                    return Some(ExtractedField::new(terms, 0.75, "payment_terms_regex"));
                }
            }
        }
        None
    }

    /// Extract line items from text
    fn extract_line_items(&self, text: &str) -> Vec<LineItem> {
        let mut items = Vec::new();
        
        // Look for lines that might be line items
        // Pattern: description + quantity + price + total
        let lines = text.lines();
        
        for line in lines {
            let line = line.trim();
            if line.is_empty() || line.len() < 10 {
                continue;
            }

            // Try to find amount patterns in the line
            let amount_pattern = Regex::new(r"([\d,]+\.\d{2})").unwrap();
            let amounts: Vec<f64> = amount_pattern.captures_iter(line)
                .filter_map(|caps| caps.get(1))
                .filter_map(|m| m.as_str().replace(",", "").parse::<f64>().ok())
                .filter(|&a| a > 0.0)
                .collect();

            if amounts.is_empty() {
                continue;
            }

            // Try to extract quantity and unit price
            let qty_pattern = Regex::new(r"(?i)(\d+(?:\.\d+)?)\s*(?:x|×|@|at)").unwrap();
            let quantity = qty_pattern.captures(line)
                .and_then(|caps| caps.get(1))
                .and_then(|m| m.as_str().parse::<f64>().ok());

            let total = *amounts.last().unwrap_or(&0.0);
            let unit_price = if amounts.len() >= 2 {
                amounts[amounts.len() - 2]
            } else if let Some(qty) = quantity {
                if qty > 0.0 { total / qty } else { 0.0 }
            } else {
                total
            };

            // Extract description (text before the amounts)
            let desc = if let Some(first_amount_pos) = line.find(&format!("{:.2}", amounts[0])) {
                line[..first_amount_pos].trim().to_string()
            } else {
                line.to_string()
            };

            // Clean up description
            let desc = desc
                .replace(|c: char| c.is_ascii_control(), " ")
                .replace("  ", " ")
                .trim()
                .to_string();

            if !desc.is_empty() && desc.len() < 200 {
                items.push(LineItem {
                    description: desc,
                    quantity,
                    unit_price: Some(unit_price),
                    total,
                    confidence: if quantity.is_some() { 0.70 } else { 0.50 },
                });
            }
        }

        // Limit to reasonable number of items
        items.truncate(50);
        items
    }

    /// Calculate overall confidence score
    fn calculate_confidence(&self, invoice: &ExtractedInvoice) -> f64 {
        let mut total_confidence = 0.0;
        let mut field_count = 0;

        if let Some(ref abn) = invoice.abn {
            total_confidence += abn.confidence;
            field_count += 1;
        }
        if let Some(ref inv) = invoice.invoice_number {
            total_confidence += inv.confidence;
            field_count += 1;
        }
        if let Some(ref date) = invoice.invoice_date {
            total_confidence += date.confidence;
            field_count += 1;
        }
        if let Some(ref amount) = invoice.total_amount {
            total_confidence += amount.confidence;
            field_count += 1;
        }
        if let Some(ref vendor) = invoice.vendor_name {
            total_confidence += vendor.confidence;
            field_count += 1;
        }

        if field_count == 0 {
            return 0.0;
        }

        let avg_confidence = total_confidence / field_count as f64;
        
        // Boost confidence if we have key fields
        let boost = if invoice.abn.is_some() && invoice.invoice_number.is_some() && invoice.total_amount.is_some() {
            0.1
        } else {
            0.0
        };

        (avg_confidence + boost).min(1.0)
    }
}

/// Parse PDF file and extract text content
#[cfg(feature = "pdf-parse")]
pub fn extract_pdf_text(pdf_path: &str) -> Result<String, String> {
    use pdf_extract::extract_text;
    
    extract_text(pdf_path).map_err(|e| format!("PDF extraction error: {}", e))
}

/// Mock PDF extraction for development without pdf-parse feature
#[cfg(not(feature = "pdf-parse"))]
pub fn extract_pdf_text(_pdf_path: &str) -> Result<String, String> {
    Err("PDF parsing not enabled. Enable 'pdf-parse' feature or implement custom PDF extraction".to_string())
}

/// Parse an invoice from a PDF file
pub fn parse_invoice_pdf(pdf_path: &str) -> Result<ExtractedInvoice, String> {
    let text = extract_pdf_text(pdf_path)?;
    
    let parser = InvoiceParser::new()?;
    parser.parse_from_text(&text, DocumentType::Pdf)
}

/// Parse an invoice from an image file using OCR
pub fn parse_invoice_image(image_path: &str) -> Result<ExtractedInvoice, String> {
    // For now, return an error indicating OCR is needed
    // In production, this would call the OCR engine
    Err(format!(
        "Image invoice parsing requires OCR. Use the OCR module to extract text first, then call parse_from_text. Path: {}",
        image_path
    ))
}

/// Validation result for extracted invoice data
#[derive(Debug, Serialize)]
pub struct InvoiceValidationResult {
    pub is_valid: bool,
    pub missing_fields: Vec<String>,
    pub warnings: Vec<String>,
    pub suggested_action: String,
}

/// Validate extracted invoice data
pub fn validate_invoice(invoice: &ExtractedInvoice) -> InvoiceValidationResult {
    let mut missing_fields = Vec::new();
    let mut warnings = Vec::new();

    // Check required fields
    if invoice.abn.is_none() {
        missing_fields.push("abn".to_string());
    }
    if invoice.invoice_number.is_none() {
        missing_fields.push("invoice_number".to_string());
    }
    if invoice.invoice_date.is_none() {
        missing_fields.push("invoice_date".to_string());
    }
    if invoice.total_amount.is_none() {
        missing_fields.push("total_amount".to_string());
    }

    // Warnings for nice-to-have fields
    if invoice.vendor_name.is_none() {
        warnings.push("Vendor name not detected".to_string());
    }
    if invoice.payment_terms.is_none() {
        warnings.push("Payment terms not detected".to_string());
    }
    if invoice.line_items.is_empty() {
        warnings.push("No line items extracted".to_string());
    }

    // Validate ABN if present
    if let Some(ref abn) = invoice.abn {
        if !InvoiceParser::validate_abn(&abn.value) {
            warnings.push(format!("ABN {} failed checksum validation", abn.value));
        }
    }

    let is_valid = !missing_fields.contains(&"total_amount".to_string()) 
        && invoice.overall_confidence >= 0.5;

    let suggested_action = if missing_fields.is_empty() && invoice.overall_confidence >= 0.75 {
        "accept".to_string()
    } else if invoice.overall_confidence >= 0.5 {
        "review".to_string()
    } else {
        "manual_entry".to_string()
    };

    InvoiceValidationResult {
        is_valid,
        missing_fields,
        warnings,
        suggested_action,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_abn_validation() {
        // Valid ABNs (these are example ABNs)
        assert!(InvoiceParser::validate_abn("51824753556")); // Example valid ABN
        
        // Invalid ABNs
        assert!(!InvoiceParser::validate_abn("12345678901")); // Invalid checksum
        assert!(!InvoiceParser::validate_abn("1234567890"));  // Too short
        assert!(!InvoiceParser::validate_abn("123456789012")); // Too long
        assert!(!InvoiceParser::validate_abn("abcdefghijk")); // Not digits
    }

    #[test]
    fn test_extract_abn() {
        let parser = InvoiceParser::new().unwrap();
        
        let text = "ABN: 51 824 753 556\nInvoice #12345";
        let abn = parser.extract_abn(text);
        assert!(abn.is_some());
        assert_eq!(abn.unwrap().value, "51824753556");

        let text2 = "Australian Business Number: 51824753556";
        let abn2 = parser.extract_abn(text2);
        assert!(abn2.is_some());
    }

    #[test]
    fn test_extract_invoice_number() {
        let parser = InvoiceParser::new().unwrap();
        
        let text = "Invoice #INV-2024-001\nDate: 15/01/2024";
        let inv = parser.extract_invoice_number(text);
        assert!(inv.is_some());
        assert_eq!(inv.unwrap().value, "INV-2024-001");
    }

    #[test]
    fn test_extract_amounts() {
        let parser = InvoiceParser::new().unwrap();
        
        let text = "Subtotal: $100.00\nGST: $10.00\nTotal: $110.00";
        let amounts = parser.extract_amounts(text);
        assert!(!amounts.is_empty());
        assert_eq!(amounts[0].value, 110.00);
    }

    #[test]
    fn test_extract_payment_terms() {
        let parser = InvoiceParser::new().unwrap();
        
        let text = "Payment Terms: Net 30 days";
        let terms = parser.extract_payment_terms(text);
        assert!(terms.is_some());
    }
}
