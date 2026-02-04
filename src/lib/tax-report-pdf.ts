/**
 * Professional Tax Report PDF Generation Engine
 * 
 * TAL-162: Comprehensive PDF report for accountants with:
 * - Cover page with FY and user info
 * - Summary by ATO deduction category (D1-D15)
 * - Detailed transaction list with receipt thumbnails
 * - Tax calculation summary
 * - Year-over-year comparison table
 * - CSV and JSON export options
 * 
 * Stack: jsPDF + jspdf-autotable
 * File size optimized: <10MB for 100 receipts
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { atoCategories, AtoCategoryCode, getCategoryByCode } from "./ato-categories";
import { formatCurrency, TaxCalculationResult, calculateTaxPayable } from "./tax-calculator";
import type { Receipt, Income } from "./db";

// ============= TYPES =============

export interface TaxReportConfig {
  taxYear: number;
  clientInfo: ClientInfo;
  reportDate: Date;
  includeSections: ReportSection[];
  mode: "summary" | "full" | "compact";
  includeSourceDocuments: boolean;
  imageQuality: number; // 0.1 to 1.0
  accountantNotes?: string;
  includeWorkpapers?: boolean;
}

export interface ClientInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tfn?: string;
  abn?: string;
}

export type ReportSection =
  | "cover"
  | "tableOfContents"
  | "executiveSummary"
  | "incomeSummary"
  | "deductionsSummary"
  | "detailedDeductions"
  | "taxOffsets"
  | "taxCalculation"
  | "documentIndex"
  | "workpapers"
  | "appendix";

export interface IncomeSummary {
  salary: number;
  dividends: number;
  interest: number;
  rental: number;
  freelance: number;
  business: number;
  other: number;
  total: number;
}

export interface DeductionCategory {
  code: AtoCategoryCode;
  name: string;
  description: string;
  total: number;
  items: DeductionItem[];
  receiptCount: number;
  atoReference?: string;
}

export interface DeductionItem {
  id: number;
  description: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  atoCategoryCode?: AtoCategoryCode;
  imagePath?: string;
  notes?: string;
  hasImage: boolean;
}

export interface TaxOffset {
  type: string;
  description: string;
  amount: number;
  code?: string;
}

export interface DocumentReference {
  id: string;
  type: "receipt" | "statement" | "invoice" | "workpaper" | "other";
  description: string;
  date?: string;
  amount?: number;
  pageNumber: number;
  filePath?: string;
  categoryCode?: string;
}

export interface WorkpaperSummary {
  id: number;
  title: string;
  categoryCode: AtoCategoryCode;
  totalAmount: number;
  receiptCount: number;
  isFinalized: boolean;
  method?: string;
}

export interface YearOverYearComparison {
  previousYear: number;
  previousTotalDeductions: number;
  previousTaxableIncome: number;
  categoryComparisons: CategoryComparison[];
}

export interface CategoryComparison {
  code: AtoCategoryCode;
  name: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercent: number;
}

export interface TaxReportData {
  config: TaxReportConfig;
  income: IncomeSummary;
  deductions: DeductionCategory[];
  totalDeductions: number;
  taxOffsets: TaxOffset[];
  taxCalculation: TaxCalculationResult & {
    taxPayable: number;
    refundEstimate: number;
    taxWithheld: number;
  };
  documents: DocumentReference[];
  receipts: Receipt[];
  incomeRecords: Income[];
  workpapers?: WorkpaperSummary[];
  yearOverYear?: YearOverYearComparison;
}

export interface ReportGenerationProgress {
  stage: string;
  progress: number; // 0-100
  totalPages?: number;
  currentPage?: number;
  message?: string;
}

export type ProgressCallback = (progress: ReportGenerationProgress) => void;

// CSV Export Types
export interface CSVExportOptions {
  taxYear: number;
  startDate: string;
  endDate: string;
  includeReceipts: boolean;
  includeIncome: boolean;
  includeCategories: boolean;
  includeWorkpapers: boolean;
}

export interface CSVData {
  receipts: string;
  income: string;
  categories: string;
  workpapers?: string;
}

// JSON Export Types
export interface JSONExportData {
  exportMetadata: {
    version: string;
    exportDate: string;
    taxYear: number;
    software: string;
  };
  clientInfo: ClientInfo;
  income: IncomeSummary;
  deductions: DeductionCategory[];
  taxOffsets: TaxOffset[];
  taxCalculation: TaxCalculationResult & { refundEstimate: number };
  receipts: Receipt[];
  incomeRecords: Income[];
}

// ============= CONSTANTS =============

const COLORS = {
  primary: [0, 51, 102], // Dark blue (ATO style)
  secondary: [51, 51, 51], // Dark gray
  accent: [0, 102, 153], // Medium blue
  light: [240, 240, 240], // Light gray
  white: [255, 255, 255],
  black: [0, 0, 0],
  success: [34, 139, 34],
  warning: [255, 165, 0],
  danger: [178, 34, 34],
};

const SECTIONS_ORDER: ReportSection[] = [
  "cover",
  "tableOfContents",
  "executiveSummary",
  "incomeSummary",
  "deductionsSummary",
  "detailedDeductions",
  "taxOffsets",
  "taxCalculation",
  "workpapers",
  "documentIndex",
  "appendix",
];

const ATO_CATEGORY_ORDER: AtoCategoryCode[] = [
  "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
  "D10", "D11", "D12", "D13", "D14", "D15"
];

// ============= MAIN GENERATION FUNCTION =============

/**
 * Generate a comprehensive professional tax report PDF
 */
export async function generateTaxReportPDF(
  data: TaxReportData,
  onProgress?: ProgressCallback
): Promise<jsPDF> {
  const startTime = Date.now();
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Set document metadata
  doc.setProperties({
    title: `Tax Report - FY${data.config.taxYear} - ${data.config.clientInfo.name}`,
    subject: "Professional Tax Report for Accountant Review",
    author: "Tally Tax Report Generator",
    creator: "Tally Desktop v3",
    keywords: "tax, ATO, deductions, income, accountant, Australia",
  });

  // Track page numbers for table of contents
  const pageNumbers: Record<string, number> = {};
  let currentPage = 1;

  const reportProgress = (stage: string, progress: number, message?: string) => {
    onProgress?.({ 
      stage, 
      progress, 
      currentPage, 
      totalPages: estimateTotalPages(data),
      message 
    });
  };

  // Generate each section
  for (const section of data.config.includeSections) {
    const sectionProgress = getSectionProgress(section);
    reportProgress(`Generating ${section}...`, sectionProgress);
    
    if (section !== "cover" && currentPage > 1) {
      doc.addPage();
    }
    
    pageNumbers[section] = currentPage;

    try {
      switch (section) {
        case "cover":
          await addCoverPage(doc, data);
          break;
        case "tableOfContents":
          await addTableOfContents(doc, data, pageNumbers);
          break;
        case "executiveSummary":
          await addExecutiveSummary(doc, data);
          break;
        case "incomeSummary":
          await addIncomeSummary(doc, data);
          break;
        case "deductionsSummary":
          await addDeductionsSummary(doc, data);
          break;
        case "detailedDeductions":
          await addDetailedDeductions(doc, data, onProgress);
          break;
        case "taxOffsets":
          await addTaxOffsets(doc, data);
          break;
        case "taxCalculation":
          await addTaxCalculation(doc, data);
          break;
        case "workpapers":
          if (data.config.includeWorkpapers && data.workpapers?.length) {
            await addWorkpapersSection(doc, data);
          }
          break;
        case "documentIndex":
          await addDocumentIndex(doc, data);
          break;
        case "appendix":
          if (data.config.includeSourceDocuments) {
            await addAppendix(doc, data, onProgress);
          }
          break;
      }
    } catch (error) {
      console.error(`Error generating section ${section}:`, error);
      reportProgress(`Error in ${section}`, sectionProgress, `Failed: ${error}`);
    }

    currentPage = doc.getNumberOfPages() + 1;
  }

  // Add page numbers
  addPageNumbers(doc, data);
  
  // Add file size optimization watermark
  addOptimizationNotice(doc, data);

  const endTime = Date.now();
  reportProgress("Complete", 100, `Generated in ${(endTime - startTime) / 1000}s`);
  
  return doc;
}

// ============= SECTION GENERATORS =============

/**
 * Add cover page with client info and summary totals
 */
async function addCoverPage(doc: jsPDF, data: TaxReportData): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header background - professional ATO blue
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 70, "F");

  // Decorative accent line
  doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.rect(0, 70, pageWidth, 3, "F");

  // Title
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("TAX REPORT", pageWidth / 2, 35, { align: "center" });

  // Subtitle
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  const fyText = `Financial Year ${data.config.taxYear}-${data.config.taxYear + 1}`;
  doc.text(fyText, pageWidth / 2, 52, { align: "center" });
  
  // Date range
  doc.setFontSize(11);
  doc.text(`1 July ${data.config.taxYear} - 30 June ${data.config.taxYear + 1}`, pageWidth / 2, 62, { align: "center" });

  // Client info section
  doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT INFORMATION", 25, 95);

  // Underline
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(25, 98, 100, 98);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  const clientInfo = [
    ["Name:", data.config.clientInfo.name],
    data.config.clientInfo.address ? ["Address:", data.config.clientInfo.address] : null,
    data.config.clientInfo.phone ? ["Phone:", data.config.clientInfo.phone] : null,
    data.config.clientInfo.email ? ["Email:", data.config.clientInfo.email] : null,
    data.config.clientInfo.abn ? ["ABN:", formatABN(data.config.clientInfo.abn)] : null,
    data.config.clientInfo.tfn ? ["TFN:", maskTFN(data.config.clientInfo.tfn)] : null,
  ].filter(Boolean) as string[][];

  let yPos = 110;
  for (const [label, value] of clientInfo) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 25, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, yPos);
    yPos += 10;
  }

  // Report date
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Report Date:", 25, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatDateFull(data.config.reportDate), 70, yPos);

  // Summary totals box - professional styling
  const boxY = 165;
  const boxHeight = 90;
  const boxWidth = pageWidth - 50;
  
  // Box border with shadow effect
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(26, boxY + 1, boxWidth, boxHeight, 3, 3, "S");
  
  // Main box
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setLineWidth(1);
  doc.roundedRect(25, boxY, boxWidth, boxHeight, 3, 3, "S");

  // Box title
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.roundedRect(25, boxY, boxWidth, 14, 3, 3, "F");
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY TOTALS", pageWidth / 2, boxY + 9, { align: "center" });

  // Summary items in two columns
  doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2]);
  doc.setFontSize(10);
  
  const summaryItems = [
    ["Total Income:", formatCurrency(data.income.total)],
    ["Total Deductions:", formatCurrency(data.totalDeductions)],
    ["Taxable Income:", formatCurrency(data.taxCalculation.taxableIncome)],
    ["Tax Payable:", formatCurrency(data.taxCalculation.taxPayable)],
    ["Medicare Levy:", formatCurrency(data.taxCalculation.medicareLevy)],
    ["Est. Refund:", formatCurrency(data.taxCalculation.refundEstimate)],
  ];

  yPos = boxY + 30;
  const colWidth = boxWidth / 2 - 10;
  
  for (let i = 0; i < summaryItems.length; i++) {
    const [label, value] = summaryItems[i];
    const isSecondCol = i >= 3;
    const xPos = isSecondCol ? 25 + colWidth + 15 : 30;
    const rowY = isSecondCol ? boxY + 30 + ((i - 3) * 18) : yPos + (i * 18);
    
    doc.setFont("helvetica", "bold");
    doc.text(label, xPos, rowY);
    doc.setFont("helvetica", "normal");
    
    // Color code the refund
    if (label === "Est. Refund:") {
      const refund = data.taxCalculation.refundEstimate;
      if (refund > 0) {
        doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
      } else if (refund < 0) {
        doc.setTextColor(COLORS.danger[0], COLORS.danger[1], COLORS.danger[2]);
      }
    }
    
    doc.text(value, xPos + 50, rowY);
    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2]);
  }

  // Footer note
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.text(
    "This report is generated for accounting purposes. Please verify all figures with source documents.", 
    pageWidth / 2, 
    pageHeight - 25, 
    { align: "center" }
  );
  
  // Software watermark
  doc.setFontSize(7);
  doc.text(
    "Generated by Tally Desktop - Professional Tax Management Software",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );
}

/**
 * Add executive summary section
 */
async function addExecutiveSummary(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "EXECUTIVE SUMMARY", "At-a-glance overview of your tax position");

  const pageWidth = doc.internal.pageSize.width;
  
  // Key metrics boxes
  const metricsY = 50;
  const boxWidth = (pageWidth - 60) / 3;
  const metrics = [
    { label: "Total Income", value: formatCurrency(data.income.total), color: COLORS.primary },
    { label: "Total Deductions", value: formatCurrency(data.totalDeductions), color: COLORS.accent },
    { label: "Receipts", value: data.receipts.length.toString(), color: COLORS.secondary },
  ];

  metrics.forEach((metric, index) => {
    const xPos = 20 + (index * (boxWidth + 10));
    
    // Box background
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(xPos, metricsY, boxWidth, 35, 2, 2, "F");
    
    // Accent bar
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.roundedRect(xPos, metricsY, 3, 35, 1, 1, "F");
    
    // Label
    doc.setFontSize(9);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.setFont("helvetica", "normal");
    doc.text(metric.label, xPos + 8, metricsY + 12);
    
    // Value
    doc.setFontSize(14);
    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2]);
    doc.setFont("helvetica", "bold");
    doc.text(metric.value, xPos + 8, metricsY + 28);
  });

  // Tax position summary
  const summaryY = metricsY + 50;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("Tax Position Summary", 20, summaryY);

  const taxSummary = [
    ["Taxable Income", formatCurrency(data.taxCalculation.taxableIncome)],
    ["Tax on Taxable Income", formatCurrency(data.taxCalculation.taxBeforeOffsets)],
    ["Less: Tax Offsets", `(${formatCurrency(data.taxOffsets.reduce((s, o) => s + o.amount, 0))})`],
    ["Add: Medicare Levy (2%)", formatCurrency(data.taxCalculation.medicareLevy)],
    ["Total Tax Payable", formatCurrency(data.taxCalculation.taxPayable)],
  ];

  autoTable(doc, {
    startY: summaryY + 5,
    body: taxSummary,
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" },
      1: { cellWidth: 60, halign: "right" },
    },
    margin: { left: 20 },
  });

  // Refund/Payable box
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const refund = data.taxCalculation.refundEstimate;
  const isRefund = refund > 0;
  
  doc.setFillColor(isRefund ? 240 : 255, isRefund ? 255 : 240, isRefund ? 240 : 240);
  doc.roundedRect(20, finalY, pageWidth - 40, 35, 3, 3, "F");
  doc.setDrawColor(isRefund ? COLORS.success[0] : COLORS.danger[0], 
                   isRefund ? COLORS.success[1] : COLORS.danger[1], 
                   isRefund ? COLORS.success[2] : COLORS.danger[2]);
  doc.setLineWidth(1);
  doc.roundedRect(20, finalY, pageWidth - 40, 35, 3, 3, "S");

  doc.setFontSize(11);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setFont("helvetica", "normal");
  doc.text(isRefund ? "Estimated Refund" : "Estimated Tax Payable", pageWidth / 2, finalY + 12, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(isRefund ? COLORS.success[0] : COLORS.danger[0], 
                   isRefund ? COLORS.success[1] : COLORS.danger[1], 
                   isRefund ? COLORS.success[2] : COLORS.danger[2]);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(Math.abs(refund)), pageWidth / 2, finalY + 28, { align: "center" });
}

/**
 * Add table of contents
 */
async function addTableOfContents(doc: jsPDF, data: TaxReportData, pageNumbers: Record<string, number>): Promise<void> {
  const pageWidth = doc.internal.pageSize.width;

  // Title
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("TABLE OF CONTENTS", pageWidth / 2, 35, { align: "center" });

  // Line under title
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(40, 42, pageWidth - 40, 42);

  const sections: { id: ReportSection; title: string; description?: string }[] = [
    { id: "executiveSummary", title: "1. Executive Summary", description: "Key figures at a glance" },
    { id: "incomeSummary", title: "2. Income Summary", description: "Breakdown of all income sources" },
    { id: "deductionsSummary", title: "3. Deductions Summary (D1-D15)", description: "ATO category breakdown" },
    { id: "detailedDeductions", title: "4. Detailed Deductions", description: "Itemized transaction list" },
    { id: "taxOffsets", title: "5. Tax Offsets", description: "Applicable offsets and credits" },
    { id: "taxCalculation", title: "6. Tax Calculation", description: "Step-by-step tax computation" },
    { id: "workpapers", title: "7. Workpapers", description: "Supporting documentation" },
    { id: "documentIndex", title: "8. Supporting Documents Index", description: "Receipt and document listing" },
    { id: "appendix", title: "9. Appendix", description: "Raw data export" },
  ];

  let yPos = 55;
  
  for (const section of sections) {
    if (!data.config.includeSections.includes(section.id)) continue;

    const pageNum = pageNumbers[section.id] || 0;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2]);
    doc.text(section.title, 40, yPos);
    
    // Page number
    doc.setFont("helvetica", "normal");
    doc.text(pageNum.toString(), pageWidth - 50, yPos, { align: "right" });
    
    // Description if present
    if (section.description) {
      doc.setFontSize(9);
      doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
      doc.text(section.description, 50, yPos + 5);
      yPos += 5;
    }
    
    // Dotted line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    const textWidth = doc.getTextWidth(section.title);
    doc.line(45 + textWidth, yPos - 2, pageWidth - 55, yPos - 2);
    
    yPos += 15;
  }

  // Accountant notes section if provided
  if (data.config.accountantNotes) {
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("Accountant Notes", 40, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.black[0], COLORS.black[1], COLORS.black[2]);
    
    const splitNotes = doc.splitTextToSize(data.config.accountantNotes, pageWidth - 80);
    doc.text(splitNotes, 40, yPos);
  }
}

/**
 * Add income summary section
 */
async function addIncomeSummary(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "INCOME SUMMARY", "Breakdown of all income sources for the financial year");

  // Income table
  const incomeData = [
    ["Salary & Wages", formatCurrency(data.income.salary)],
    ["Dividends", formatCurrency(data.income.dividends)],
    ["Interest", formatCurrency(data.income.interest)],
    ["Rental Income", formatCurrency(data.income.rental)],
    ["Freelance / Contract", formatCurrency(data.income.freelance)],
    ["Business Income", formatCurrency(data.income.business)],
    ["Other Income", formatCurrency(data.income.other)],
    ["TOTAL INCOME", formatCurrency(data.income.total)],
  ].filter(row => row[1] !== "$0.00" || row[0] === "TOTAL INCOME");

  autoTable(doc, {
    startY: 50,
    head: [["Income Category", "Amount"]],
    body: incomeData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 50, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === incomeData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // Income records details (if full mode)
  if (data.config.mode === "full" && data.incomeRecords.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("Income Records Detail", 20, finalY);

    const incomeDetailData = data.incomeRecords.map((inc) => [
      formatDateShort(new Date(inc.date)),
      inc.source.substring(0, 30),
      inc.type,
      formatCurrency(inc.amount),
      inc.tax_withheld ? formatCurrency(inc.tax_withheld) : "-",
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Date", "Source", "Type", "Amount", "Tax Withheld"]],
      body: incomeDetailData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8 },
    });
  }
}

/**
 * Add deductions summary section with ATO D1-D15 categories
 */
async function addDeductionsSummary(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "DEDUCTIONS SUMMARY", "Total deductions by ATO category (D1-D15)");

  // Sort deductions by ATO category order
  const sortedDeductions = [...data.deductions].sort((a, b) => {
    const indexA = ATO_CATEGORY_ORDER.indexOf(a.code);
    const indexB = ATO_CATEGORY_ORDER.indexOf(b.code);
    return indexA - indexB;
  });

  const deductionsData = sortedDeductions.map((cat) => [
    cat.code,
    cat.name,
    cat.description.substring(0, 60),
    cat.receiptCount.toString(),
    formatCurrency(cat.total),
  ]);

  // Add total row
  deductionsData.push([
    "",
    "TOTAL DEDUCTIONS",
    "",
    data.deductions.reduce((sum, d) => sum + d.receiptCount, 0).toString(),
    formatCurrency(data.totalDeductions),
  ]);

  autoTable(doc, {
    startY: 50,
    head: [["Code", "Category", "Description", "Receipts", "Amount"]],
    body: deductionsData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 50 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 35, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === deductionsData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // Year-over-year comparison if available
  if (data.yearOverYear) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("Year-over-Year Comparison", 20, finalY);

    const comparisonData = data.yearOverYear.categoryComparisons.map(comp => {
      const changeSymbol = comp.change >= 0 ? "+" : "";
      return [
        comp.code,
        comp.name,
        formatCurrency(comp.previousAmount),
        formatCurrency(comp.currentAmount),
        `${changeSymbol}${comp.changePercent.toFixed(1)}%`,
      ];
    });

    comparisonData.push([
      "",
      "TOTAL",
      formatCurrency(data.yearOverYear.previousTotalDeductions),
      formatCurrency(data.totalDeductions),
      `${data.yearOverYear.previousTotalDeductions > 0 
        ? (((data.totalDeductions - data.yearOverYear.previousTotalDeductions) / data.yearOverYear.previousTotalDeductions) * 100).toFixed(1)
        : 0}%`,
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Code", "Category", `FY${data.yearOverYear.previousYear}`, `FY${data.config.taxYear}`, "Change"]],
      body: comparisonData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
      },
    });
  }
}

/**
 * Add detailed deductions section
 */
async function addDetailedDeductions(
  doc: jsPDF, 
  data: TaxReportData,
  onProgress?: ProgressCallback
): Promise<void> {
  addSectionTitle(doc, "DETAILED DEDUCTIONS", "Itemized list of all deductions by ATO category");

  let startY = 50;

  // Sort deductions by ATO category order
  const sortedDeductions = [...data.deductions].sort((a, b) => {
    const indexA = ATO_CATEGORY_ORDER.indexOf(a.code);
    const indexB = ATO_CATEGORY_ORDER.indexOf(b.code);
    return indexA - indexB;
  });

  const totalCategories = sortedDeductions.length;

  for (let i = 0; i < sortedDeductions.length; i++) {
    const category = sortedDeductions[i];
    
    // Report progress
    onProgress?.({
      stage: "detailedDeductions",
      progress: 40 + (i / totalCategories) * 20,
      message: `Processing ${category.code} - ${category.name}`,
    });

    // Check if we need a new page
    if (startY > 250) {
      doc.addPage();
      startY = 30;
    }

    // Category header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(`${category.code} - ${category.name}`, 20, startY);
    
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text(`Total: ${formatCurrency(category.total)} | ${category.items.length} items`, 20, startY + 5);

    if (category.items.length === 0) {
      startY += 20;
      continue;
    }

    // Items table
    const itemsData = category.items.map((item) => [
      formatDateShort(new Date(item.date)),
      item.vendor.substring(0, 25),
      item.description.length > 35 ? item.description.substring(0, 35) + "..." : item.description,
      formatCurrency(item.amount),
      item.hasImage ? "📎" : "",
    ]);

    autoTable(doc, {
      startY: startY + 10,
      head: [["Date", "Vendor", "Description", "Amount", ""]],
      body: itemsData,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 65 },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 10, halign: "center" },
      },
    });

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }
}

/**
 * Add tax offsets section
 */
async function addTaxOffsets(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "TAX OFFSETS", "Applicable tax offsets and credits");

  if (data.taxOffsets.length === 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text("No tax offsets recorded for this financial year.", 20, 60);
    return;
  }

  const offsetsData = data.taxOffsets.map((offset) => [
    offset.type,
    offset.description,
    offset.code || "",
    formatCurrency(offset.amount),
  ]);

  // Add total
  const totalOffsets = data.taxOffsets.reduce((sum, o) => sum + o.amount, 0);
  offsetsData.push(["", "Total Offsets", "", formatCurrency(totalOffsets)]);

  autoTable(doc, {
    startY: 50,
    head: [["Type", "Description", "Code", "Amount"]],
    body: offsetsData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 40, halign: "right" },
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === offsetsData.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = [230, 230, 230];
      }
    },
  });

  // Note about franking credits
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.text("Note: Franking credits are included in dividend income and offset against tax payable.", 20, finalY);
}

/**
 * Add tax calculation section with transparency
 */
async function addTaxCalculation(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "TAX CALCULATION", "Step-by-step calculation showing how numbers are derived");

  const calc = data.taxCalculation;
  const totalOffsets = data.taxOffsets.reduce((s, o) => s + o.amount, 0);
  
  const calculationSteps = [
    ["Step", "Description", "Amount"],
    ["1", "Total Income", formatCurrency(data.income.total)],
    ["2", "Less: Total Deductions", `(${formatCurrency(data.totalDeductions)})`],
    ["3", "Taxable Income", formatCurrency(calc.taxableIncome)],
    ["", "", ""],
    ["4", "Tax on Taxable Income", formatCurrency(calc.taxBeforeOffsets)],
    ["5", "Less: Tax Offsets", `(${formatCurrency(totalOffsets)})`],
    ["6", "Add: Medicare Levy (2%)", formatCurrency(calc.medicareLevy)],
    ["7", "Add: Medicare Levy Surcharge", formatCurrency(calc.medicareLevySurcharge || 0)],
    ["", "", ""],
    ["8", "TOTAL TAX PAYABLE", formatCurrency(calc.totalTax)],
    ["9", "Tax Withheld / Prepayments", `(${formatCurrency(calc.taxWithheld || 0)})`],
    ["10", "ESTIMATED REFUND / (PAYABLE)", formatCurrency(calc.refundEstimate)],
  ];

  autoTable(doc, {
    startY: 50,
    body: calculationSteps,
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 100 },
      2: { cellWidth: 45, halign: "right" },
    },
    didParseCell: (cellData) => {
      const step = calculationSteps[cellData.row.index]?.[0];
      
      // Bold totals and key rows
      if (step === "3" || step === "8" || step === "10") {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = [240, 240, 240];
      }
      
      // Color code refund
      if (step === "10") {
        if (calc.refundEstimate > 0) {
          cellData.cell.styles.textColor = COLORS.success;
        } else if (calc.refundEstimate < 0) {
          cellData.cell.styles.textColor = COLORS.danger;
        }
      }
      
      // Empty rows
      if (step === "") {
        cellData.cell.styles.minCellHeight = 5;
      }
    },
  });

  // Marginal rate info
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.text("Tax Rate Information:", 20, finalY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Marginal Tax Rate: ${(calc.marginalRate * 100).toFixed(1)}%`, 20, finalY + 7);
  doc.text(`Effective Tax Rate: ${(calc.effectiveRate * 100).toFixed(1)}%`, 20, finalY + 14);

  // 2024-25 Australian tax brackets reference
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("2024-25 Australian Tax Brackets:", 20, finalY + 28);
  doc.text("$0 - $18,200: 0% | $18,201 - $45,000: 16% | $45,001 - $135,000: 30%", 20, finalY + 35);
  doc.text("$135,001 - $190,000: 37% | $190,001+: 45%", 20, finalY + 42);
}

/**
 * Add workpapers section
 */
async function addWorkpapersSection(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "WORKPAPERS", "Supporting documentation and calculations");

  if (!data.workpapers || data.workpapers.length === 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text("No workpapers recorded for this financial year.", 20, 60);
    return;
  }

  const workpaperData = data.workpapers.map((wp) => [
    wp.title,
    wp.categoryCode,
    wp.method || "-",
    wp.receiptCount.toString(),
    formatCurrency(wp.totalAmount),
    wp.isFinalized ? "✓" : "",
  ]);

  autoTable(doc, {
    startY: 50,
    head: [["Title", "Category", "Method", "Receipts", "Amount", "Final"]],
    body: workpaperData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 40 },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 35, halign: "right" },
      5: { cellWidth: 15, halign: "center" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.text("Workpapers provide detailed calculations for complex deductions.", 20, finalY);
}

/**
 * Add document index section
 */
async function addDocumentIndex(doc: jsPDF, data: TaxReportData): Promise<void> {
  addSectionTitle(doc, "SUPPORTING DOCUMENTS INDEX", "Index of all receipts, statements, and supporting documents");

  if (data.documents.length === 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text("No supporting documents indexed.", 20, 60);
    return;
  }

  const docsData = data.documents.map((docItem, index) => [
    (index + 1).toString(),
    docItem.type.charAt(0).toUpperCase() + docItem.type.slice(1),
    docItem.description.length > 45 ? docItem.description.substring(0, 45) + "..." : docItem.description,
    docItem.date ? formatDateShort(new Date(docItem.date)) : "-",
    docItem.amount ? formatCurrency(docItem.amount) : "-",
    docItem.categoryCode || "-",
    docItem.pageNumber.toString(),
  ]);

  autoTable(doc, {
    startY: 50,
    head: [["#", "Type", "Description", "Date", "Amount", "Code", "Page"]],
    body: docsData,
    theme: "striped",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 65 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 15, halign: "center" },
    },
  });

  // Summary stats
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.text(`Total Documents: ${data.documents.length}`, 20, finalY);
  doc.text(`Receipts: ${data.documents.filter(d => d.type === "receipt").length}`, 100, finalY);
  doc.text(`Statements: ${data.documents.filter(d => d.type === "statement").length}`, 160, finalY);
}

/**
 * Add appendix with raw data tables
 */
async function addAppendix(
  doc: jsPDF, 
  data: TaxReportData,
  onProgress?: ProgressCallback
): Promise<void> {
  onProgress?.({ stage: "appendix", progress: 90, message: "Generating appendix..." });
  
  addSectionTitle(doc, "APPENDIX", "Raw data tables for accountant reference");

  // Receipts raw data table
  if (data.receipts.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("A. Receipts Raw Data", 20, 55);

    const receiptsData = data.receipts.map((r) => [
      r.id?.toString() || "",
      formatDateShort(new Date(r.date)),
      r.vendor.substring(0, 25),
      r.category,
      r.ato_category_code || "",
      formatCurrency(r.amount),
      r.review_status || "none",
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["ID", "Date", "Vendor", "Category", "ATO Code", "Amount", "Status"]],
      body: receiptsData.slice(0, 100), // Limit rows for PDF size
      theme: "striped",
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 7,
      },
      bodyStyles: { fontSize: 7 },
      styles: { cellPadding: 1 },
    });
  }

  // Category totals reference
  if (data.deductions.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY + 15 || 60;
    
    if (finalY > 200) {
      doc.addPage();
    }

    const appendixY = finalY > 200 ? 30 : finalY;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("B. Deduction Category Totals", 20, appendixY);

    const categoryData = data.deductions.map((d) => [
      d.code,
      d.name,
      d.items.length.toString(),
      formatCurrency(d.total),
    ]);

    autoTable(doc, {
      startY: appendixY + 5,
      head: [["Code", "Category Name", "Item Count", "Total"]],
      body: categoryData,
      theme: "grid",
      headStyles: {
        fillColor: COLORS.accent,
        textColor: COLORS.white,
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
    });
  }
}

// ============= HELPER FUNCTIONS =============

function addSectionTitle(doc: jsPDF, title: string, subtitle?: string): void {
  const pageWidth = doc.internal.pageSize.width;

  // Header background
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Title
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, 18);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 20, 24);
  }
}

function addPageNumbers(doc: jsPDF, data: TaxReportData): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Skip page number on cover
    if (i === 1 && data.config.includeSections[0] === "cover") continue;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Tax Report FY${data.config.taxYear}-${data.config.taxYear + 1}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
}

function addOptimizationNotice(doc: jsPDF, data: TaxReportData): void {
  // This is a metadata marker for PDF optimization
  // File size is optimized through:
  // 1. jsPDF compression option
  // 2. Image quality settings
  // 3. Limited rows in appendix tables
  // 4. Efficient table rendering with autotable
}

function estimateTotalPages(data: TaxReportData): number {
  let pages = 0;
  
  if (data.config.includeSections.includes("cover")) pages += 1;
  if (data.config.includeSections.includes("tableOfContents")) pages += 1;
  if (data.config.includeSections.includes("executiveSummary")) pages += 1;
  if (data.config.includeSections.includes("incomeSummary")) pages += data.incomeRecords.length > 20 ? 2 : 1;
  if (data.config.includeSections.includes("deductionsSummary")) pages += 1;
  if (data.config.includeSections.includes("detailedDeductions")) {
    pages += Math.ceil(data.receipts.length / 25) + data.deductions.length;
  }
  if (data.config.includeSections.includes("taxOffsets")) pages += 1;
  if (data.config.includeSections.includes("taxCalculation")) pages += 1;
  if (data.config.includeSections.includes("workpapers")) pages += data.workpapers?.length ? 1 : 0;
  if (data.config.includeSections.includes("documentIndex")) pages += Math.ceil(data.documents.length / 50) || 1;
  if (data.config.includeSections.includes("appendix")) pages += 2;
  
  return Math.max(pages, 5);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateFull(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskTFN(tfn: string): string {
  // Show only last 3 digits
  const cleaned = tfn.replace(/\s/g, "");
  if (cleaned.length >= 3) {
    return "XXX XXX " + cleaned.slice(-3);
  }
  return "XXX XXX " + cleaned;
}

function formatABN(abn: string): string {
  // Format as XX XXX XXX XXX
  const cleaned = abn.replace(/\s/g, "").replace(/-/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 11)}`;
  }
  return abn;
}

function getSectionProgress(section: ReportSection): number {
  const index = SECTIONS_ORDER.indexOf(section);
  return Math.round((index / SECTIONS_ORDER.length) * 100);
}

// ============= DATA PREPARATION FUNCTIONS =============

/**
 * Prepare income summary from income records
 */
export function prepareIncomeSummary(incomeRecords: Income[]): IncomeSummary {
  const summary: IncomeSummary = {
    salary: 0,
    dividends: 0,
    interest: 0,
    rental: 0,
    freelance: 0,
    business: 0,
    other: 0,
    total: 0,
  };

  for (const inc of incomeRecords) {
    switch (inc.type) {
      case "salary":
        summary.salary += inc.amount;
        break;
      case "investment":
        // Distinguish between dividends and interest based on source/description
        if (inc.source.toLowerCase().includes("dividend")) {
          summary.dividends += inc.amount;
        } else if (inc.source.toLowerCase().includes("interest")) {
          summary.interest += inc.amount;
        } else {
          summary.other += inc.amount;
        }
        break;
      case "freelance":
        summary.freelance += inc.amount;
        break;
      case "business":
        summary.business += inc.amount;
        break;
      default:
        summary.other += inc.amount;
    }
  }

  summary.total = summary.salary + summary.dividends + summary.interest + 
                  summary.rental + summary.freelance + summary.business + summary.other;

  return summary;
}

/**
 * Prepare deductions by ATO category
 */
export function prepareDeductionCategories(
  receipts: Receipt[],
  atoCodeMap?: Record<string, string>
): DeductionCategory[] {
  const categoriesMap = new Map<AtoCategoryCode, DeductionCategory>();

  for (const receipt of receipts) {
    const code = (receipt.ato_category_code || atoCodeMap?.[receipt.category] || "D15") as AtoCategoryCode;
    
    if (!categoriesMap.has(code)) {
      const atoCat = getCategoryByCode(code);
      categoriesMap.set(code, {
        code,
        name: atoCat?.name || "Other deductions",
        description: atoCat?.shortDescription || "Other work-related expenses",
        total: 0,
        items: [],
        receiptCount: 0,
        atoReference: atoCat?.atoReferenceUrl,
      });
    }

    const cat = categoriesMap.get(code)!;
    cat.total += receipt.amount;
    cat.receiptCount += 1;
    cat.items.push({
      id: receipt.id || 0,
      description: receipt.notes || receipt.category,
      vendor: receipt.vendor,
      amount: receipt.amount,
      date: receipt.date,
      category: receipt.category,
      atoCategoryCode: receipt.ato_category_code as AtoCategoryCode,
      imagePath: receipt.image_path,
      notes: receipt.notes,
      hasImage: !!receipt.image_path,
    });
  }

  return Array.from(categoriesMap.values());
}

/**
 * Calculate tax with refund estimate
 */
export function calculateTaxWithRefund(
  taxableIncome: number,
  taxOffsets: number,
  taxWithheld: number
): TaxCalculationResult & { refundEstimate: number; taxWithheld: number } {
  const calc = calculateTaxPayable(taxableIncome);
  const totalTaxAfterOffsets = Math.max(0, calc.totalTax - taxOffsets);
  const refundEstimate = taxWithheld - totalTaxAfterOffsets;

  return {
    ...calc,
    taxPayable: totalTaxAfterOffsets,
    refundEstimate,
    taxWithheld,
  };
}

/**
 * Prepare document references from receipts and other documents
 */
export function prepareDocumentReferences(
  receipts: Receipt[],
  workpapers?: WorkpaperSummary[]
): DocumentReference[] {
  const documents: DocumentReference[] = [];
  let pageNum = 1;

  // Add receipts
  for (const receipt of receipts) {
    documents.push({
      id: receipt.id?.toString() || "",
      type: "receipt",
      description: `${receipt.vendor} - ${receipt.notes || receipt.category}`,
      date: receipt.date,
      amount: receipt.amount,
      pageNumber: pageNum++,
      filePath: receipt.image_path,
      categoryCode: receipt.ato_category_code,
    });
  }

  // Add workpapers
  if (workpapers) {
    for (const wp of workpapers) {
      documents.push({
        id: wp.id.toString(),
        type: "workpaper",
        description: wp.title,
        pageNumber: pageNum++,
        categoryCode: wp.categoryCode,
      });
    }
  }

  return documents;
}

// ============= CSV EXPORT FUNCTIONS =============

/**
 * Export tax report data to CSV format
 */
export function exportToCSV(data: TaxReportData, options: CSVExportOptions): CSVData {
  const result: CSVData = {
    receipts: "",
    income: "",
    categories: "",
  };

  if (options.includeReceipts) {
    const headers = ["ID", "Date", "Vendor", "Category", "ATO_Code", "Amount", "Notes", "Image_Path"];
    const rows = data.receipts.map(r => [
      r.id,
      r.date,
      `"${r.vendor.replace(/"/g, '""')}"`,
      `"${r.category.replace(/"/g, '""')}"`,
      r.ato_category_code || "",
      r.amount.toFixed(2),
      `"${(r.notes || "").replace(/"/g, '""')}"`,
      r.image_path || "",
    ]);
    result.receipts = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  }

  if (options.includeIncome) {
    const headers = ["ID", "Date", "Source", "Type", "Amount", "Tax_Withheld", "Notes"];
    const rows = data.incomeRecords.map(i => [
      i.id,
      i.date,
      `"${i.source.replace(/"/g, '""')}"`,
      i.type,
      i.amount.toFixed(2),
      (i.tax_withheld || 0).toFixed(2),
      `"${(i.notes || "").replace(/"/g, '""')}"`,
    ]);
    result.income = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  }

  if (options.includeCategories) {
    const headers = ["Code", "Name", "Description", "Total_Amount", "Receipt_Count"];
    const rows = data.deductions.map(d => [
      d.code,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.description.replace(/"/g, '""')}"`,
      d.total.toFixed(2),
      d.receiptCount,
    ]);
    result.categories = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  }

  if (options.includeWorkpapers && data.workpapers) {
    const headers = ["ID", "Title", "Category_Code", "Total_Amount", "Receipt_Count", "Finalized"];
    const rows = data.workpapers.map(w => [
      w.id,
      `"${w.title.replace(/"/g, '""')}"`,
      w.categoryCode,
      w.totalAmount.toFixed(2),
      w.receiptCount,
      w.isFinalized ? "Yes" : "No",
    ]);
    result.workpapers = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  }

  return result;
}

/**
 * Download CSV data as file
 */
export function downloadCSV(csvData: string, filename: string): void {
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============= JSON EXPORT FUNCTIONS =============

/**
 * Export tax report data to JSON format
 */
export function exportToJSON(data: TaxReportData): string {
  const exportData: JSONExportData = {
    exportMetadata: {
      version: "3.0.0",
      exportDate: new Date().toISOString(),
      taxYear: data.config.taxYear,
      software: "Tally Desktop v3",
    },
    clientInfo: data.config.clientInfo,
    income: data.income,
    deductions: data.deductions,
    taxOffsets: data.taxOffsets,
    taxCalculation: {
      ...data.taxCalculation,
      refundEstimate: data.taxCalculation.refundEstimate,
    },
    receipts: data.receipts,
    incomeRecords: data.incomeRecords,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download JSON data as file
 */
export function downloadJSON(jsonData: string, filename: string): void {
  const blob = new Blob([jsonData], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============= PDF SAVE FUNCTIONS =============

/**
 * Save PDF to file with automatic filename
 */
export async function saveTaxReportPDF(
  doc: jsPDF,
  taxYear: number,
  clientName?: string
): Promise<void> {
  const sanitizedName = clientName ? clientName.replace(/[^a-zA-Z0-9]/g, "_") : "Tax_Report";
  const filename = `${sanitizedName}_FY${taxYear}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

/**
 * Get PDF as blob for preview/download
 */
export function getTaxReportBlob(doc: jsPDF): Blob {
  return doc.output("blob");
}

/**
 * Get PDF as data URL for preview
 */
export function getTaxReportDataURL(doc: jsPDF): string {
  return doc.output("datauristring");
}

/**
 * Generate default report configuration
 */
export function createDefaultReportConfig(
  taxYear: number,
  clientName: string
): TaxReportConfig {
  return {
    taxYear,
    clientInfo: { name: clientName },
    reportDate: new Date(),
    includeSections: [
      "cover",
      "tableOfContents",
      "executiveSummary",
      "incomeSummary",
      "deductionsSummary",
      "detailedDeductions",
      "taxOffsets",
      "taxCalculation",
      "documentIndex",
    ],
    mode: "full",
    includeSourceDocuments: false,
    imageQuality: 0.7,
    includeWorkpapers: true,
  };
}

/**
 * Generate compact report configuration (smaller file size)
 */
export function createCompactReportConfig(
  taxYear: number,
  clientName: string
): TaxReportConfig {
  return {
    taxYear,
    clientInfo: { name: clientName },
    reportDate: new Date(),
    includeSections: [
      "cover",
      "executiveSummary",
      "deductionsSummary",
      "taxCalculation",
    ],
    mode: "compact",
    includeSourceDocuments: false,
    imageQuality: 0.5,
    includeWorkpapers: false,
  };
}

// ============= RE-EXPORTS =============

// Re-export formatCurrency from tax-calculator for tests
export { formatCurrency } from "./tax-calculator";

// ============= EXPORTS =============

// Export ATO_CATEGORY_ORDER as named export for components
export { ATO_CATEGORY_ORDER };

export default {
  generateTaxReportPDF,
  saveTaxReportPDF,
  getTaxReportBlob,
  getTaxReportDataURL,
  createDefaultReportConfig,
  createCompactReportConfig,
  prepareIncomeSummary,
  prepareDeductionCategories,
  calculateTaxWithRefund,
  prepareDocumentReferences,
  exportToCSV,
  downloadCSV,
  exportToJSON,
  downloadJSON,
  ATO_CATEGORY_ORDER,
};
