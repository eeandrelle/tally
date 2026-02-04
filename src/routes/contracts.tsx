import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useDatabase } from "@/hooks/useDatabase";
import {
  useContractParser,
  useContracts,
  useContractAnalysis,
} from "@/hooks/useContracts";
import {
  ContractUploadDialog,
  ContractParsingProgress,
  ContractReviewDialog,
  ContractList,
} from "@/components/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Contract, ExtractedContract } from "@/lib/contracts";
import { initContractTables } from "@/lib/contracts";

export const Route = createFileRoute("/contracts")({
  component: ContractsPage,
});

function ContractsPage() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingStage, setParsingStage] = useState<Parameters<typeof ContractParsingProgress>[0]["stage"]>();

  const {
    contracts,
    isLoading: contractsLoading,
    loadContracts,
    addContract,
    updateStatus,
    removeContract,
    exportToJSON,
    exportToCSV,
  } = useContracts(db);

  const {
    extractedContract,
    validationResult,
    isParsing,
    error: parseError,
    parseText,
    parsePdf,
    parseImage,
    reset: resetParser,
  } = useContractParser();

  const { analysis } = useContractAnalysis(contracts);

  // Initialize contract tables
  useEffect(() => {
    if (db) {
      initContractTables(db).catch(console.error);
    }
  }, [db]);

  // Load contracts on mount
  useEffect(() => {
    if (db) {
      loadContracts();
    }
  }, [db, loadContracts]);

  // Simulate parsing progress
  const simulateParsingProgress = useCallback(async () => {
    setUploadProgress(0);
    setParsingStage("uploading");

    const stages: Array<{ stage: typeof parsingStage; duration: number }> = [
      { stage: "uploading", duration: 500 },
      { stage: "extracting", duration: 800 },
      { stage: "parsing", duration: 1000 },
      { stage: "analyzing", duration: 700 },
    ];

    let progress = 0;
    for (const { stage, duration } of stages) {
      setParsingStage(stage);
      const increment = 25 / (duration / 50);
      for (let i = 0; i < duration; i += 50) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        progress = Math.min(progress + increment, 100);
        setUploadProgress(Math.round(progress));
      }
    }

    setParsingStage("complete");
    setUploadProgress(100);
  }, []);

  // Handle file upload
  const handleUpload = async (files: File[]) => {
    if (!db || files.length === 0) return;

    setIsProcessing(true);

    for (const file of files) {
      try {
        // Simulate parsing progress
        await simulateParsingProgress();

        // For now, we'll use text parsing as a fallback
        // In production, you'd integrate with a PDF parsing service
        const text = await file.text().catch(() => "");
        parseText(text || `Contract document: ${file.name}`);

        // Show review dialog
        setReviewDialogOpen(true);
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
        console.error(error);
      }
    }

    setIsProcessing(false);
    setUploadProgress(0);
    setParsingStage(undefined);
  };

  // Handle contract approval
  const handleApprove = async (contract: ExtractedContract, notes: string) => {
    if (!db) return;

    try {
      // Use the first file path as the document path
      const documentPath = "uploaded://contract";
      const documentType: "pdf" | "image" = "pdf";

      await addContract(contract, documentPath, documentType, undefined, notes);
      toast.success("Contract saved successfully");
      setReviewDialogOpen(false);
      resetParser();
    } catch (error) {
      toast.error("Failed to save contract");
      console.error(error);
    }
  };

  // Handle contract rejection
  const handleReject = () => {
    setReviewDialogOpen(false);
    resetParser();
    toast.info("Contract rejected");
  };

  // Handle contract view
  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    // In a full implementation, you'd show a detail view
    toast.info("View contract details - implement detail view");
  };

  // Handle contract approval from list
  const handleApproveFromList = async (id: number) => {
    try {
      await updateStatus(id, "approved");
      toast.success("Contract approved");
    } catch (error) {
      toast.error("Failed to approve contract");
    }
  };

  // Handle contract deletion
  const handleDelete = async (id: number) => {
    try {
      await removeContract(id);
      toast.success("Contract deleted");
    } catch (error) {
      toast.error("Failed to delete contract");
    }
  };

  // Handle export
  const handleExport = (format: "json" | "csv") => {
    try {
      const content = format === "json" ? exportToJSON() : exportToCSV();
      const blob = new Blob([content], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contracts.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Contracts exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Export failed");
    }
  };

  if (dbLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Contract Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Parse and manage contract documents for tax purposes
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Upload Contract
        </Button>
      </div>

      {/* Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{analysis.contractCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contract Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold">
                  {formatCurrency(analysis.totalContractValue)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Depreciation Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <span className="text-3xl font-bold">
                  {formatCurrency(analysis.totalDepreciationValue)}
                </span>
              </div>
              {analysis.immediateDeductionsValue > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {formatCurrency(analysis.immediateDeductionsValue)} immediate deduction
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Parties Involved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                <span className="text-3xl font-bold">{analysis.partyCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contract List */}
      <ContractList
        contracts={contracts}
        isLoading={contractsLoading}
        onView={handleView}
        onApprove={handleApproveFromList}
        onDelete={handleDelete}
        onExport={handleExport}
        onUploadClick={() => setUploadDialogOpen(true)}
      />

      {/* Upload Dialog */}
      <ContractUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUpload}
        isUploading={isProcessing}
        uploadProgress={uploadProgress}
      />

      {/* Review Dialog */}
      <ContractReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        extractedContract={extractedContract}
        validationResult={validationResult}
        onApprove={handleApprove}
        onReject={handleReject}
        isProcessing={isProcessing}
      />
    </div>
  );
}
