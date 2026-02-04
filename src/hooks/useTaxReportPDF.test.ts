/**
 * useTaxReportPDF Hook Tests
 * 
 * Tests for the tax report PDF generation hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTaxReportPDF, ReportOptions } from "./useTaxReportPDF";

// Mock the database module
vi.mock("@/lib/db", () => ({
  getReceiptsByDateRange: vi.fn(),
  getIncomeByDateRange: vi.fn(),
}));

// Mock the tax report PDF module - need to mock before imports
vi.mock("@/lib/tax-report-pdf", async () => {
  const actual = await vi.importActual("@/lib/tax-report-pdf");
  return {
    ...actual,
    generateTaxReportPDF: vi.fn(),
    getTaxReportBlob: vi.fn(),
    prepareIncomeSummary: vi.fn(),
    prepareDeductionCategories: vi.fn(),
    calculateTaxWithRefund: vi.fn(),
  };
});

// Import after mocks are defined
import * as db from "@/lib/db";
import * as taxReportPdf from "@/lib/tax-report-pdf";

// Mock the TaxYear context
vi.mock("@/contexts/TaxYearContext", () => ({
  useTaxYear: () => ({
    selectedYear: 2025,
    getYearDates: () => ({
      startDate: "2024-07-01",
      endDate: "2025-06-30",
    }),
  }),
}));

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useTaxReportPDF", () => {
  const mockReceipts = [
    { id: 1, vendor: "Test Store", amount: 100, category: "Supplies", ato_category_code: "D5", date: "2024-08-15" },
  ];

  const mockIncome = [
    { id: 1, source: "Employer", amount: 50000, type: "salary", date: "2024-07-15", tax_withheld: 10000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(db.getReceiptsByDateRange).mockResolvedValue(mockReceipts as any);
    vi.mocked(db.getIncomeByDateRange).mockResolvedValue(mockIncome as any);
    
    // Mock helper functions
    vi.mocked(taxReportPdf.prepareIncomeSummary).mockReturnValue({
      salary: 50000,
      dividends: 0,
      interest: 0,
      rental: 0,
      freelance: 0,
      business: 0,
      other: 0,
      total: 50000,
    });
    
    vi.mocked(taxReportPdf.prepareDeductionCategories).mockReturnValue([
      {
        code: "D5" as any,
        name: "Work-related home office expenses",
        description: "Home office expenses",
        total: 100,
        items: [],
        receiptCount: 1,
      },
    ]);
    
    vi.mocked(taxReportPdf.calculateTaxWithRefund).mockReturnValue({
      taxableIncome: 49900,
      taxBeforeOffsets: 8000,
      totalTax: 9000,
      taxPayable: 9000,
      medicareLevy: 1000,
      medicareLevySurcharge: 0,
      marginalRate: 0.325,
      effectiveRate: 0.18,
      refundEstimate: 1000,
      taxWithheld: 10000,
    } as any);
    
    const mockPdf = {
      output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
      getNumberOfPages: vi.fn().mockReturnValue(5),
      save: vi.fn(),
    };
    
    vi.mocked(taxReportPdf.generateTaxReportPDF).mockResolvedValue(mockPdf as any);
    vi.mocked(taxReportPdf.getTaxReportBlob).mockReturnValue(new Blob(["test"], { type: "application/pdf" }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with idle state", () => {
    const { result } = renderHook(() => useTaxReportPDF());
    
    expect(result.current.state.status).toBe("idle");
    expect(result.current.state.progress).toBe(0);
    expect(result.current.pdf).toBeNull();
  });

  it("generates report successfully", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTaxReportPDF({ onComplete }));

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("complete");
    });

    expect(result.current.pdf).not.toBeNull();
    expect(onComplete).toHaveBeenCalled();
  });

  it("shows progress during generation", async () => {
    const onProgress = vi.fn();
    const { result } = renderHook(() => useTaxReportPDF({ onProgress }));

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    expect(result.current.state.progress).toBe(100);
  });

  it("prevents duplicate generation", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    // Start first generation
    act(() => {
      result.current.generateReportForYear(clientInfo);
    });

    // Try to start second while first is running
    const secondAttempt = await result.current.generateReportForYear(clientInfo);

    expect(secondAttempt).toBeNull();
  });

  it("handles errors gracefully", async () => {
    const onError = vi.fn();
    const error = new Error("Generation failed");
    
    vi.mocked(taxReportPdf.generateTaxReportPDF).mockRejectedValue(error);
    
    const { result } = renderHook(() => useTaxReportPDF({ onError }));

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });

    expect(result.current.state.error).toBe("Generation failed");
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("clears report correctly", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    expect(result.current.pdf).not.toBeNull();

    act(() => {
      result.current.clearReport();
    });

    expect(result.current.pdf).toBeNull();
    expect(result.current.state.status).toBe("idle");
  });

  it("resets state and cancels generation", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    act(() => {
      result.current.generateReportForYear(clientInfo);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.pdf).toBeNull();
    expect(result.current.state.status).toBe("idle");
  });

  it("respects report options", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };
    const options: ReportOptions = {
      mode: "summary",
      includeSections: ["cover", "incomeSummary", "deductionsSummary"],
      includeSourceDocuments: true,
    };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo, options);
    });

    expect(result.current.state.status).toBe("complete");
  });

  it("generates preview URL when complete", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    expect(result.current.previewUrl).not.toBeNull();
  });

  it("downloads report when PDF exists", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    // Mock PDF save function
    const mockPdf = result.current.pdf;
    if (mockPdf) {
      mockPdf.save = vi.fn();
    }

    act(() => {
      result.current.downloadReport("test.pdf");
    });
  });
});

describe("useTaxReportPDF - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Re-setup mocks for edge cases
    vi.mocked(db.getIncomeByDateRange).mockResolvedValue([]);
    vi.mocked(taxReportPdf.prepareIncomeSummary).mockReturnValue({
      salary: 0,
      dividends: 0,
      interest: 0,
      rental: 0,
      freelance: 0,
      business: 0,
      other: 0,
      total: 0,
    });
    vi.mocked(taxReportPdf.prepareDeductionCategories).mockReturnValue([]);
    vi.mocked(taxReportPdf.calculateTaxWithRefund).mockReturnValue({
      taxableIncome: 0,
      taxBeforeOffsets: 0,
      totalTax: 0,
      taxPayable: 0,
      medicareLevy: 0,
      medicareLevySurcharge: 0,
      marginalRate: 0,
      effectiveRate: 0,
      refundEstimate: 0,
      taxWithheld: 0,
    } as any);
    
    const mockPdf = {
      output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
      getNumberOfPages: vi.fn().mockReturnValue(5),
      save: vi.fn(),
    };
    
    vi.mocked(taxReportPdf.generateTaxReportPDF).mockResolvedValue(mockPdf as any);
    vi.mocked(taxReportPdf.getTaxReportBlob).mockReturnValue(new Blob(["test"], { type: "application/pdf" }));
  });

  it("handles empty data", async () => {
    vi.mocked(db.getReceiptsByDateRange).mockResolvedValue([]);
    vi.mocked(db.getIncomeByDateRange).mockResolvedValue([]);

    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("complete");
    });
  });

  it("handles very large datasets", async () => {
    const largeReceipts = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      vendor: `Vendor ${i}`,
      amount: Math.random() * 1000,
      category: "Supplies",
      ato_category_code: "D5",
      date: "2024-08-15",
    }));

    vi.mocked(db.getReceiptsByDateRange).mockResolvedValue(largeReceipts as any);
    vi.mocked(taxReportPdf.prepareDeductionCategories).mockReturnValue([
      {
        code: "D5" as any,
        name: "Work-related home office expenses",
        description: "Home office expenses",
        total: 500000,
        items: largeReceipts,
        receiptCount: 1000,
      },
    ]);

    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "Test Client" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("complete");
    });
  });

  it("handles special characters in client name", async () => {
    const { result } = renderHook(() => useTaxReportPDF());

    const clientInfo = { name: "O'Connor-Smith & Co. (Test)" };

    await act(async () => {
      await result.current.generateReportForYear(clientInfo);
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("complete");
    });
  });
});
