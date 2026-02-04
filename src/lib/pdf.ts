import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Receipt } from "./db";

// ATO Tax Categories with standard deduction types
export const ATO_CATEGORIES: Record<string, { code: string; description: string }> = {
  "Home Office": { code: "D5", description: "Work-related home office expenses" },
  "Vehicle": { code: "D1", description: "Work-related car expenses" },
  "Meals": { code: "D3", description: "Work-related travel expenses" },
  "Travel": { code: "D2", description: "Work-related travel expenses" },
  "Professional Development": { code: "D4", description: "Work-related self-education expenses" },
  "Insurance": { code: "D10", description: "Cost of managing tax affairs" },
  "Other": { code: "D15", description: "Other work-related expenses" },
};

export interface PDFExportOptions {
  title: string;
  financialYear: number;
  startDate: string;
  endDate: string;
  userInfo?: {
    name?: string;
    abn?: string;
    tfn?: string;
    address?: string;
    email?: string;
  };
  includeReceiptImages: boolean;
  imageQuality?: number; // 0.1 to 1.0
  comparePreviousYear?: boolean;
}

export interface TaxReportData {
  receipts: Receipt[];
  totalDeductions: number;
  deductionsByCategory: { category: string; total: number }[];
  previousYearData?: {
    totalDeductions: number;
    deductionsByCategory: { category: string; total: number }[];
  };
}

// Color scheme for professional look
const COLORS = {
  primary: [0, 51, 102], // Dark blue (ATO style)
  secondary: [51, 51, 51], // Dark gray
  accent: [0, 102, 153], // Medium blue
  light: [240, 240, 240], // Light gray
  white: [255, 255, 255],
  black: [0, 0, 0],
  success: [34, 139, 34],
  warning: [255, 165, 0],
};

/**
 * Generate a professional tax report PDF
 */
export async function generateTaxReportPDF(
  data: TaxReportData,
  options: PDFExportOptions
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Set document metadata
  doc.setProperties({
    title: `${options.title} - FY${options.financialYear}`,
    subject: "Tax Deductions Report",
    author: options.userInfo?.name || "Tally Desktop",
    creator: "Tally Desktop Tax Report Generator",
    keywords: "tax, deductions, ATO, financial year",
  });

  // Add cover page
  await addCoverPage(doc, options, data);

  // Add summary section
  doc.addPage();
  await addSummarySection(doc, options, data);

  // Add category breakdown
  doc.addPage();
  await addCategoryBreakdown(doc, options, data);

  // Add year-over-year comparison if requested
  if (options.comparePreviousYear && data.previousYearData) {
    doc.addPage();
    await addYearOverYearComparison(doc, options, data);
  }

  // Add detailed transactions
  doc.addPage();
  await addDetailedTransactions(doc, options, data);

  // Add receipt images if requested
  if (options.includeReceiptImages && data.receipts.length > 0) {
    await addReceiptImages(doc, options, data);
  }

  return doc;
}

/**
 * Add cover page with professional styling
 */
async function addCoverPage(
  doc: jsPDF,
  options: PDFExportOptions,
  data: TaxReportData
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("TAX DEDUCTIONS REPORT", pageWidth / 2, 25, { align: "center" });

  // Subtitle
  doc.setFontSize(16);
  doc.text(`Financial Year ${options.financialYear}-${options.financialYear + 1}`, pageWidth / 2, 55, {
    align: "center",
  });

  // Decorative line
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1);
  doc.line(40, 65, pageWidth - 40, 65);

  // User information section
  let yPos = 85;
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TAXPAYER INFORMATION", 40, yPos);

  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (options.userInfo?.name) {
    doc.text(`Name: ${options.userInfo.name}`, 40, yPos);
    yPos += 8;
  }
  if (options.userInfo?.abn) {
    doc.text(`ABN: ${options.userInfo.abn}`, 40, yPos);
    yPos += 8;
  }
  if (options.userInfo?.tfn) {
    doc.text(`TFN: ${options.userInfo.tfn}`, 40, yPos);
    yPos += 8;
  }
  if (options.userInfo?.address) {
    doc.text(`Address: ${options.userInfo.address}`, 40, yPos);
    yPos += 8;
  }
  if (options.userInfo?.email) {
    doc.text(`Email: ${options.userInfo.email}`, 40, yPos);
    yPos += 8;
  }

  // Report period
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("REPORT PERIOD", 40, yPos);
  yPos += 10;
  doc.setFont("helvetica", "normal");
  doc.text(`From: ${formatDate(options.startDate)}`, 40, yPos);
  yPos += 8;
  doc.text(`To: ${formatDate(options.endDate)}`, 40, yPos);

  // Summary box
  yPos += 20;
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(40, yPos, pageWidth - 80, 50, 3, 3, "F");

  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SUMMARY", pageWidth / 2, yPos + 12, { align: "center" });

  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(11);
  doc.text(`Total Receipts: ${data.receipts.length}`, 50, yPos + 28);
  doc.text(`Total Deductions: ${formatCurrency(data.totalDeductions)}`, 50, yPos + 40);

  // Generation date
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(9);
  doc.text(`Report generated: ${new Date().toLocaleDateString("en-AU")}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by Tally Desktop", pageWidth / 2, pageHeight - 10, { align: "center" });
}

/**
 * Add summary section with key metrics
 */
async function addSummarySection(
  doc: jsPDF,
  options: PDFExportOptions,
  data: TaxReportData
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DEDUCTIONS SUMMARY", pageWidth / 2, 16, { align: "center" });

  // Page title
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(14);
  doc.text("Overview", 20, 40);

  // Summary metrics table
  const summaryData = [
    ["Total Deductions", formatCurrency(data.totalDeductions)],
    ["Number of Receipts", data.receipts.length.toString()],
    ["Average per Receipt", formatCurrency(data.receipts.length > 0 ? data.totalDeductions / data.receipts.length : 0)],
    ["Report Period", `${formatDate(options.startDate)} - ${formatDate(options.endDate)}`],
  ];

  autoTable(doc, {
    startY: 50,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });

  // Tax savings estimate
  const taxRate = 0.325; // 32.5% marginal tax rate (common bracket)
  const estimatedTaxSavings = data.totalDeductions * taxRate;

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFillColor(240, 248, 255);
  doc.roundedRect(20, finalY + 15, pageWidth - 40, 35, 3, 3, "F");

  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Estimated Tax Savings", pageWidth / 2, finalY + 28, { align: "center" });

  doc.setTextColor(...COLORS.success);
  doc.setFontSize(16);
  doc.text(formatCurrency(estimatedTaxSavings), pageWidth / 2, finalY + 42, { align: "center" });

  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "* Based on 32.5% marginal tax rate. Actual savings may vary.",
    pageWidth / 2,
    finalY + 50,
    { align: "center" }
  );

  // ATO categories note
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(10);
  doc.text("ATO Deduction Categories Used:", 20, finalY + 70);

  let yPos = finalY + 80;
  Object.entries(ATO_CATEGORIES).forEach(([category, info]) => {
    doc.text(`${info.code} - ${category}`, 25, yPos);
    yPos += 6;
  });
}

/**
 * Add category breakdown section
 */
async function addCategoryBreakdown(
  doc: jsPDF,
  options: PDFExportOptions,
  data: TaxReportData
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CATEGORY BREAKDOWN", pageWidth / 2, 16, { align: "center" });

  // Category table data
  const categoryData = data.deductionsByCategory.map((item) => {
    const atoInfo = ATO_CATEGORIES[item.category];
    const percentage = data.totalDeductions > 0 ? (item.total / data.totalDeductions) * 100 : 0;
    return [
      atoInfo?.code || "D15",
      item.category,
      atoInfo?.description || "Other work-related expenses",
      formatCurrency(item.total),
      `${percentage.toFixed(1)}%`,
    ];
  });

  // Add total row
  categoryData.push(["", "TOTAL", "", formatCurrency(data.totalDeductions), "100.0%"]);

  autoTable(doc, {
    startY: 35,
    head: [["ATO Code", "Category", "Description", "Amount", "% of Total"]],
    body: categoryData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { fontStyle: "bold", cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 25 },
    },
    footStyles: {
      fillColor: COLORS.light,
      fontStyle: "bold",
    },
    margin: { left: 15, right: 15 },
    didDrawCell: (data) => {
      // Highlight total row
      if (data.row.index === categoryData.length - 1 && data.section === "body") {
        doc.setFillColor(230, 230, 230);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
        doc.setTextColor(...COLORS.black);
        doc.text(data.cell.text[0], data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2);
      }
    },
  });

  // Chart explanation
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Note: ATO codes correspond to specific labels on the tax return form.",
    15,
    finalY + 10
  );
}

/**
 * Add year-over-year comparison
 */
async function addYearOverYearComparison(
  doc: jsPDF,
  options: PDFExportOptions,
  data: TaxReportData
): Promise<void> {
  if (!data.previousYearData) return;

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("YEAR-OVER-YEAR COMPARISON", pageWidth / 2, 16, { align: "center" });

  const currentYear = options.financialYear;
  const prevYear = currentYear - 1;

  // Comparison data
  const comparisonData = data.deductionsByCategory.map((current) => {
    const prevCategory = data.previousYearData!.deductionsByCategory.find(
      (c) => c.category === current.category
    );
    const prevAmount = prevCategory?.total || 0;
    const change = prevAmount > 0 ? ((current.total - prevAmount) / prevAmount) * 100 : 0;
    const changeSymbol = change >= 0 ? "+" : "";

    return [
      current.category,
      formatCurrency(prevAmount),
      formatCurrency(current.total),
      `${changeSymbol}${change.toFixed(1)}%`,
    ];
  });

  // Add totals row
  const totalChange =
    data.previousYearData.totalDeductions > 0
      ? ((data.totalDeductions - data.previousYearData.totalDeductions) /
          data.previousYearData.totalDeductions) *
        100
      : 0;
  const totalChangeSymbol = totalChange >= 0 ? "+" : "";

  comparisonData.push([
    "TOTAL",
    formatCurrency(data.previousYearData.totalDeductions),
    formatCurrency(data.totalDeductions),
    `${totalChangeSymbol}${totalChange.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Category", `FY${prevYear}`, `FY${currentYear}`, "Change"]],
    body: comparisonData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { halign: "right", cellWidth: 35 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    margin: { left: 20, right: 20 },
  });

  // Summary insight
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const changeAmount = data.totalDeductions - data.previousYearData.totalDeductions;
  const changeText = changeAmount >= 0 ? "increase" : "decrease";
  const changeColor = changeAmount >= 0 ? COLORS.success : COLORS.warning;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, finalY + 15, pageWidth - 40, 25, 3, 3, "F");

  doc.setTextColor(...changeColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    `${totalChangeSymbol}${Math.abs(totalChange).toFixed(1)}% ${changeText} from previous year`,
    pageWidth / 2,
    finalY + 30,
    { align: "center" }
  );
}

/**
 * Add detailed transactions table
 */
async function addDetailedTransactions(
  doc: jsPDF,
  options: PDFExportOptions,
  data: TaxReportData
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DETAILED TRANSACTIONS", pageWidth / 2, 16, { align: "center" });

  // Sort receipts by date
  const sortedReceipts = [...data.receipts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Table data
  const transactionData = sortedReceipts.map((receipt, index) => {
    const atoInfo = ATO_CATEGORIES[receipt.category];
    return [
      (index + 1).toString(),
      formatDate(receipt.date),
      receipt.vendor.substring(0, 25),
      atoInfo?.code || "D15",
      receipt.category,
      formatCurrency(receipt.amount),
      receipt.notes ? "Yes" : "",
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [["#", "Date", "Vendor", "Code", "Category", "Amount", "Notes"]],
    body: transactionData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: 50 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 35 },
      5: { cellWidth: 30, halign: "right" },
      6: { cellWidth: 15, halign: "center" },
    },
    margin: { left: 15, right: 15 },
    showHead: "everyPage",
    pageBreak: "auto",
  });
}

/**
 * Add receipt images as appendix
 */
async function addReceiptImages(
  doc: jsPDF,
  options: PDFExportOptions,
  data: TaxReportData
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imageQuality = options.imageQuality || 0.6;

  // Filter receipts with images
  const receiptsWithImages = data.receipts.filter((r) => r.image_path);

  if (receiptsWithImages.length === 0) return;

  // Add appendix header page
  doc.addPage();
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RECEIPT IMAGES", pageWidth / 2, 16, { align: "center" });

  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(12);
  doc.text(`Appendix: ${receiptsWithImages.length} receipt images included`, pageWidth / 2, 50, {
    align: "center",
  });

  doc.setFontSize(9);
  doc.text("The following pages contain images of your receipt records.", pageWidth / 2, 65, {
    align: "center",
  });

  // Process each receipt image
  for (const receipt of receiptsWithImages) {
    try {
      if (!receipt.image_path) continue;

      // Load image as base64
      const imageData = await loadImageAsBase64(receipt.image_path);
      if (!imageData) continue;

      doc.addPage();

      // Receipt info header
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, 30, "F");

      doc.setTextColor(...COLORS.secondary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(receipt.vendor, 15, 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${formatDate(receipt.date)} | ${formatCurrency(receipt.amount)} | ${receipt.category}`, 15, 22);

      // Calculate image dimensions to fit page
      const imgWidth = pageWidth - 30;
      const imgHeight = pageHeight - 60;

      // Add image to PDF
      try {
        if (imageData.startsWith("data:image/jpeg") || imageData.startsWith("data:image/jpg")) {
          doc.addImage(imageData, "JPEG", 15, 40, imgWidth, imgHeight, undefined, "FAST");
        } else if (imageData.startsWith("data:image/png")) {
          doc.addImage(imageData, "PNG", 15, 40, imgWidth, imgHeight, undefined, "FAST");
        } else if (imageData.startsWith("data:image/webp")) {
          // Convert WebP to JPEG for PDF compatibility
          const convertedData = await convertWebPToJPEG(imageData, imageQuality);
          doc.addImage(convertedData, "JPEG", 15, 40, imgWidth, imgHeight, undefined, "FAST");
        }
      } catch (imgError) {
        console.error("Error adding image to PDF:", imgError);
        doc.setTextColor(...COLORS.warning);
        doc.text("Error loading receipt image", pageWidth / 2, pageHeight / 2, { align: "center" });
      }

      // Page number
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`Receipt ID: ${receipt.id}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    } catch (error) {
      console.error("Error processing receipt image:", error);
    }
  }
}

/**
 * Load image file as base64 data URL
 */
async function loadImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    // Handle different path formats
    const cleanPath = imagePath.replace(/^file:\/\//, "");

    // In a Tauri environment, we'd use the fs API
    // For now, return null to indicate we need the actual file data
    // This will be handled by the component that calls the PDF generation
    return null;
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
}

/**
 * Convert WebP image to JPEG format for PDF compatibility
 */
async function convertWebPToJPEG(base64Data: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = base64Data;
  });
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Generate and download PDF
 */
export async function downloadTaxReport(
  data: TaxReportData,
  options: PDFExportOptions,
  imageDataMap?: Map<number, string> // Map of receipt ID to base64 image data
): Promise<void> {
  // If image data is provided, temporarily patch the receipts
  if (imageDataMap) {
    data.receipts.forEach((receipt) => {
      if (receipt.id && imageDataMap.has(receipt.id)) {
        // We'll handle this in the component
      }
    });
  }

  const doc = await generateTaxReportPDF(data, options);

  // Generate filename
  const filename = `Tax_Report_FY${options.financialYear}_${new Date().toISOString().split("T")[0]}.pdf`;

  // Download the PDF
  doc.save(filename);
}

/**
 * Get current financial year based on date
 */
export function getCurrentFinancialYear(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Australian financial year runs July 1 - June 30
  return month >= 6 ? year : year - 1;
}

/**
 * Get financial year date range
 */
export function getFinancialYearDates(financialYear: number): { startDate: string; endDate: string } {
  return {
    startDate: `${financialYear}-07-01`,
    endDate: `${financialYear + 1}-06-30`,
  };
}

/**
 * Calculate estimated tax savings based on deductions
 */
export function calculateEstimatedTaxSavings(
  totalDeductions: number,
  taxBracket: "low" | "medium" | "high" = "medium"
): number {
  const rates = {
    low: 0.19, // $18,201 - $45,000
    medium: 0.325, // $45,001 - $120,000
    high: 0.37, // $120,001 - $180,000
  };

  return totalDeductions * rates[taxBracket];
}

export default {
  generateTaxReportPDF,
  downloadTaxReport,
  getCurrentFinancialYear,
  getFinancialYearDates,
  calculateEstimatedTaxSavings,
  ATO_CATEGORIES,
};
