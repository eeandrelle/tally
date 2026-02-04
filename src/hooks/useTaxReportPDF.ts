/**
 * useTaxReportPDF Hook
 * 
 * React hook for generating tax report PDFs with progress tracking,
 * status management, and error handling.
 */

import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import jsPDF from "jspdf";
import {
  generateTaxReportPDF,
  TaxReportConfig,
  TaxReportData,
  ReportGenerationProgress,
  ClientInfo,
  prepareIncomeSummary,
  prepareDeductionCategories,
  calculateTaxWithRefund,
  createDefaultReportConfig,
  saveTaxReportPDF,
  getTaxReportBlob,
} from "@/lib/tax-report-pdf";
import { Receipt, Income, getReceiptsByDateRange, getIncomeByDateRange } from "@/lib/db";
import { useTaxYear } from "@/contexts/TaxYearContext";

// ============= TYPES =============

export type GenerationStatus = 
  | "idle"
  | "preparing"
  | "generating"
  | "saving"
  | "complete"
  | "error";

export interface GenerationState {
  status: GenerationStatus;
  progress: number;
  stage: string;
  currentPage?: number;
  totalPages?: number;
  error?: string;
}

export interface UseTaxReportPDFOptions {
  onComplete?: (pdf: jsPDF, filename: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: ReportGenerationProgress) => void;
}

export interface UseTaxReportPDFReturn {
  // State
  state: GenerationState;
  pdf: jsPDF | null;
  previewUrl: string | null;
  
  // Actions
  generateReport: (config: Partial<TaxReportConfig>) => Promise<jsPDF | null>;
  generateReportForYear: (clientInfo: ClientInfo, options?: ReportOptions) => Promise<jsPDF | null>;
  saveReport: (filename?: string) => Promise<void>;
  downloadReport: (filename?: string) => void;
  previewReport: () => string | null;
  clearReport: () => void;
  reset: () => void;
}

export interface ReportOptions {
  mode?: "summary" | "full";
  includeSections?: TaxReportConfig["includeSections"];
  includeSourceDocuments?: boolean;
  accountantNotes?: string;
}

// ============= HOOK IMPLEMENTATION =============

export function useTaxReportPDF(options: UseTaxReportPDFOptions = {}): UseTaxReportPDFReturn {
  const { selectedYear, getYearDates } = useTaxYear();
  
  const [state, setState] = useState<GenerationState>({
    status: "idle",
    progress: 0,
    stage: "",
  });
  
  const [pdf, setPdf] = useState<jsPDF | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Use ref to prevent duplicate generations
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Update generation state with progress
   */
  const updateProgress = useCallback((progress: ReportGenerationProgress) => {
    setState(prev => ({
      ...prev,
      status: "generating",
      progress: progress.progress,
      stage: progress.stage,
      currentPage: progress.currentPage,
      totalPages: progress.totalPages,
    }));
    
    options.onProgress?.(progress);
  }, [options]);

  /**
   * Prepare report data from database
   */
  const prepareReportData = useCallback(async (
    config: TaxReportConfig
  ): Promise<TaxReportData> => {
    setState(prev => ({ ...prev, status: "preparing", stage: "Fetching data...", progress: 5 }));

    const { startDate, endDate } = getYearDates();
    
    // Fetch receipts and income
    const receipts = await getReceiptsByDateRange(startDate, endDate);
    const incomeRecords = await getIncomeByDateRange(startDate, endDate);

    setState(prev => ({ ...prev, progress: 15, stage: "Processing income..." }));

    // Prepare income summary
    const income = prepareIncomeSummary(incomeRecords);

    setState(prev => ({ ...prev, progress: 25, stage: "Processing deductions..." }));

    // Prepare deductions by category
    const categoryMap: Record<string, string> = {};
    const deductions = prepareDeductionCategories(receipts, categoryMap);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.total, 0);

    setState(prev => ({ ...prev, progress: 35, stage: "Calculating tax..." }));

    // Calculate tax
    const taxableIncome = Math.max(0, income.total - totalDeductions);
    
    // Get tax withheld from income records
    const taxWithheld = incomeRecords.reduce((sum, inc) => sum + (inc.tax_withheld || 0), 0);
    
    // Prepare tax offsets (franking credits, etc.)
    const taxOffsets = prepareTaxOffsets(incomeRecords);
    const totalOffsets = taxOffsets.reduce((sum, o) => sum + o.amount, 0);
    
    const taxCalculation = calculateTaxWithRefund(taxableIncome, totalOffsets, taxWithheld);

    setState(prev => ({ ...prev, progress: 45, stage: "Preparing document index..." }));

    // Prepare document index
    const documents = prepareDocumentIndex(receipts);

    return {
      config,
      income,
      deductions,
      totalDeductions,
      taxOffsets,
      taxCalculation,
      documents,
      receipts,
      incomeRecords,
    };
  }, [getYearDates]);

  /**
   * Generate tax report with custom configuration
   */
  const generateReport = useCallback(async (
    partialConfig: Partial<TaxReportConfig>
  ): Promise<jsPDF | null> => {
    if (isGeneratingRef.current) {
      console.warn("Report generation already in progress");
      return null;
    }

    isGeneratingRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      // Merge with defaults
      const config: TaxReportConfig = {
        ...createDefaultReportConfig(selectedYear, partialConfig.clientInfo?.name || ""),
        ...partialConfig,
        clientInfo: {
          ...createDefaultReportConfig(selectedYear, "").clientInfo,
          ...partialConfig.clientInfo,
        },
      };

      // Prepare data
      const reportData = await prepareReportData(config);

      // Check if aborted
      if (abortControllerRef.current.signal.aborted) {
        return null;
      }

      // Generate PDF
      setState(prev => ({ ...prev, status: "generating", stage: "Building PDF...", progress: 50 }));
      
      const generatedPdf = await generateTaxReportPDF(reportData, updateProgress);

      // Check if aborted
      if (abortControllerRef.current.signal.aborted) {
        return null;
      }

      setState({
        status: "complete",
        progress: 100,
        stage: "Complete",
      });

      setPdf(generatedPdf);
      
      // Generate preview URL
      const blob = getTaxReportBlob(generatedPdf);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      options.onComplete?.(generatedPdf, `Tax_Report_${selectedYear}_${config.clientInfo.name.replace(/\s/g, "_")}.pdf`);

      return generatedPdf;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      setState({
        status: "error",
        progress: 0,
        stage: "Error",
        error: errorMessage,
      });

      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return null;
    } finally {
      isGeneratingRef.current = false;
    }
  }, [selectedYear, prepareReportData, updateProgress, options]);

  /**
   * Generate report for current tax year with simplified options
   */
  const generateReportForYear = useCallback(async (
    clientInfo: ClientInfo,
    options: ReportOptions = {}
  ): Promise<jsPDF | null> => {
    const config: Partial<TaxReportConfig> = {
      taxYear: selectedYear,
      clientInfo,
      reportDate: new Date(),
      mode: options.mode || "full",
      includeSections: options.includeSections || [
        "cover",
        "tableOfContents",
        "incomeSummary",
        "deductionsSummary",
        "detailedDeductions",
        "taxCalculation",
        "documentIndex",
      ],
      includeSourceDocuments: options.includeSourceDocuments || false,
      accountantNotes: options.accountantNotes,
    };

    return generateReport(config);
  }, [selectedYear, generateReport]);

  /**
   * Save report to file using Tauri
   */
  const saveReport = useCallback(async (filename?: string): Promise<void> => {
    if (!pdf) {
      throw new Error("No PDF to save. Generate a report first.");
    }

    setState(prev => ({ ...prev, status: "saving", stage: "Saving file..." }));

    try {
      // Convert PDF to bytes
      const pdfBytes = pdf.output("arraybuffer");
      const uint8Array = new Uint8Array(pdfBytes);

      // Use Tauri to save file
      const defaultFilename = `Tax_Report_${selectedYear}_${new Date().toISOString().split("T")[0]}.pdf`;
      const finalFilename = filename || defaultFilename;

      await invoke("save_tax_report_pdf", {
        filename: finalFilename,
        pdfData: Array.from(uint8Array),
      });

      setState(prev => ({ ...prev, status: "complete", stage: "Saved successfully" }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save PDF";
      setState(prev => ({ ...prev, status: "error", error: errorMessage }));
      throw error;
    }
  }, [pdf, selectedYear]);

  /**
   * Download report directly in browser
   */
  const downloadReport = useCallback((filename?: string): void => {
    if (!pdf) {
      console.error("No PDF to download. Generate a report first.");
      return;
    }

    const defaultFilename = `Tax_Report_${selectedYear}_${new Date().toISOString().split("T")[0]}.pdf`;
    saveTaxReportPDF(pdf, filename || defaultFilename);
  }, [pdf, selectedYear]);

  /**
   * Get preview URL for the current PDF
   */
  const previewReport = useCallback((): string | null => {
    return previewUrl;
  }, [previewUrl]);

  /**
   * Clear current report
   */
  const clearReport = useCallback((): void => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPdf(null);
    setPreviewUrl(null);
    setState({
      status: "idle",
      progress: 0,
      stage: "",
    });
  }, [previewUrl]);

  /**
   * Reset state and cancel any ongoing generation
   */
  const reset = useCallback((): void => {
    abortControllerRef.current?.abort();
    isGeneratingRef.current = false;
    clearReport();
  }, [clearReport]);

  return {
    state,
    pdf,
    previewUrl,
    generateReport,
    generateReportForYear,
    saveReport,
    downloadReport,
    previewReport,
    clearReport,
    reset,
  };
}

// ============= HELPER FUNCTIONS =============

/**
 * Prepare tax offsets from income records
 */
function prepareTaxOffsets(incomeRecords: Income[]) {
  const offsets: { type: string; description: string; amount: number }[] = [];
  
  // Look for franking credits in dividend income
  const dividendIncome = incomeRecords.filter(
    inc => inc.type === "investment" && inc.source.toLowerCase().includes("dividend")
  );
  
  // Estimate franking credits at 30% of gross dividend (simplified)
  for (const div of dividendIncome) {
    const frankingCredit = Math.round(div.amount * 0.3); // Approximate
    if (frankingCredit > 0) {
      offsets.push({
        type: "Franking Credit",
        description: `From ${div.source}`,
        amount: frankingCredit,
      });
    }
  }
  
  return offsets;
}

/**
 * Prepare document index from receipts
 */
function prepareDocumentIndex(receipts: Receipt[]) {
  return receipts.map((receipt, index) => ({
    id: receipt.id?.toString() || `doc-${index}`,
    type: "receipt" as const,
    description: `${receipt.vendor} - ${receipt.category}`,
    date: receipt.date,
    amount: receipt.amount,
    pageNumber: index + 1,
    filePath: receipt.image_path,
  }));
}
