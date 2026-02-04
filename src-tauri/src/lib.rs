mod ocr;
mod invoice;
mod tax_report;

use ocr::{scan_receipt_ocr, validate_ocr_confidence};
use invoice::{
    parse_invoice_pdf, 
    parse_invoice_image, 
    validate_invoice,
    ExtractedInvoice,
    InvoiceValidationResult,
};
use tax_report::{
    save_tax_report_pdf,
    merge_pdfs,
    TaxReportSaveResult,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      scan_receipt_ocr,
      validate_ocr_confidence,
      parse_invoice_pdf_command,
      parse_invoice_image_command,
      validate_invoice_command,
      save_tax_report_pdf_command,
      merge_pdfs_command,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

/// Tauri command to parse a PDF invoice
#[tauri::command]
async fn parse_invoice_pdf_command(pdf_path: String) -> Result<ExtractedInvoice, String> {
    invoice::parse_invoice_pdf(&pdf_path)
}

/// Tauri command to parse an image invoice (via OCR text extraction)
/// In production, this would first run OCR then parse the extracted text
#[tauri::command]
async fn parse_invoice_image_command(image_path: String) -> Result<ExtractedInvoice, String> {
    invoice::parse_invoice_image(&image_path)
}

/// Tauri command to validate extracted invoice data
#[tauri::command]
async fn validate_invoice_command(invoice: ExtractedInvoice) -> InvoiceValidationResult {
    invoice::validate_invoice(&invoice)
}

/// Tauri command to save a tax report PDF
#[tauri::command]
async fn save_tax_report_pdf_command(
    filename: String,
    pdf_data: Vec<u8>,
) -> Result<TaxReportSaveResult, String> {
    tax_report::save_tax_report_pdf(filename, pdf_data).await
}

/// Tauri command to merge multiple PDFs into one
#[tauri::command]
async fn merge_pdfs_command(
    pdf_paths: Vec<String>,
    output_filename: String,
) -> Result<TaxReportSaveResult, String> {
    tax_report::merge_pdfs(pdf_paths, output_filename).await
}
