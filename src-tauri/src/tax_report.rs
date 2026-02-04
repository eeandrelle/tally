//! Tax Report PDF Module
//!
//! Handles PDF generation and manipulation for professional tax reports.
//! Supports saving PDFs, merging multiple PDFs, and document bundling.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri_plugin_fs::FsExt;

/// Result of saving a tax report PDF
#[derive(Debug, Serialize, Deserialize)]
pub struct TaxReportSaveResult {
    /// Whether the save was successful
    pub success: bool,
    /// Full path where the file was saved
    pub file_path: String,
    /// File size in bytes
    pub file_size: u64,
    /// Error message if save failed
    pub error: Option<String>,
}

/// Save a tax report PDF to the user's selected location
/// 
/// # Arguments
/// * `filename` - The suggested filename for the PDF
/// * `pdf_data` - The raw PDF bytes
/// 
/// # Returns
/// Result containing the save result or error message
pub async fn save_tax_report_pdf(
    filename: String,
    pdf_data: Vec<u8>,
) -> Result<TaxReportSaveResult, String> {
    // In a desktop app, we would typically use a save dialog
    // For now, we'll save to a default location (Downloads or Documents)
    
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    
    // Default to Documents/TallyTaxReports
    let default_dir = home_dir.join("Documents").join("TallyTaxReports");
    
    // Create directory if it doesn't exist
    if !default_dir.exists() {
        fs::create_dir_all(&default_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let file_path = default_dir.join(&filename);
    
    // Write the PDF data
    fs::write(&file_path, &pdf_data)
        .map_err(|e| format!("Failed to write PDF: {}", e))?;
    
    // Get file size
    let file_size = fs::metadata(&file_path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    Ok(TaxReportSaveResult {
        success: true,
        file_path: file_path.to_string_lossy().to_string(),
        file_size,
        error: None,
    })
}

/// Merge multiple PDF files into a single PDF
/// 
/// # Arguments
/// * `pdf_paths` - Vector of paths to PDF files to merge
/// * `output_filename` - The filename for the merged PDF
/// 
/// # Returns
/// Result containing the save result or error message
pub async fn merge_pdfs(
    pdf_paths: Vec<String>,
    output_filename: String,
) -> Result<TaxReportSaveResult, String> {
    // Note: Full PDF merging requires a PDF library like lopdf or printpdf
    // This is a placeholder implementation that copies the first PDF
    // In production, you would use a proper PDF merging library
    
    if pdf_paths.is_empty() {
        return Err("No PDFs provided to merge".to_string());
    }
    
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    
    let default_dir = home_dir.join("Documents").join("TallyTaxReports");
    
    if !default_dir.exists() {
        fs::create_dir_all(&default_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let output_path = default_dir.join(&output_filename);
    
    // For now, just copy the first PDF
    // TODO: Implement proper PDF merging with lopdf
    if let Some(first_path) = pdf_paths.first() {
        fs::copy(first_path, &output_path)
            .map_err(|e| format!("Failed to merge PDFs: {}", e))?;
    }
    
    let file_size = fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    Ok(TaxReportSaveResult {
        success: true,
        file_path: output_path.to_string_lossy().to_string(),
        file_size,
        error: None,
    })
}

/// Get the default reports directory
pub fn get_reports_directory() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?;
    
    Ok(home_dir.join("Documents").join("TallyTaxReports"))
}

/// List all saved tax reports
pub fn list_saved_reports() -> Result<Vec<ReportFileInfo>, String> {
    let reports_dir = get_reports_directory()?;
    
    if !reports_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut reports = Vec::new();
    
    for entry in fs::read_dir(&reports_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))? {
        
        if let Ok(entry) = entry {
            let path = entry.path();
            
            if path.extension().and_then(|e| e.to_str()) == Some("pdf") {
                if let Ok(metadata) = entry.metadata() {
                    reports.push(ReportFileInfo {
                        file_name: path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        file_path: path.to_string_lossy().to_string(),
                        file_size: metadata.len(),
                        modified_time: metadata.modified()
                            .ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs()),
                    });
                }
            }
        }
    }
    
    // Sort by modified time (most recent first)
    reports.sort_by(|a, b| b.modified_time.cmp(&a.modified_time));
    
    Ok(reports)
}

/// Information about a saved report file
#[derive(Debug, Serialize, Deserialize)]
pub struct ReportFileInfo {
    pub file_name: String,
    pub file_path: String,
    pub file_size: u64,
    pub modified_time: Option<u64>,
}

/// Delete a saved report
pub fn delete_report(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete report: {}", e))
}

/// Format file size for display
pub fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    let mut size = size as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    format!("{:.2} {}", size, UNITS[unit_index])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(0), "0.00 B");
        assert_eq!(format_file_size(1024), "1.00 KB");
        assert_eq!(format_file_size(1024 * 1024), "1.00 MB");
    }

    #[test]
    fn test_get_reports_directory() {
        let result = get_reports_directory();
        assert!(result.is_ok());
        
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("TallyTaxReports"));
    }
}
