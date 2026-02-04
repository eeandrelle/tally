import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Eye, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Clock,
  FileCheck,
  ChevronRight
} from "lucide-react";
import { useTaxReportPDF, ReportOptions } from "@/hooks/useTaxReportPDF";
import { useTaxYear } from "@/contexts/TaxYearContext";
import { toast } from "sonner";

interface ReportGeneratorCardProps {
  onPreview?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function ReportGeneratorCard({ onPreview, onSettings, className }: ReportGeneratorCardProps) {
  const { selectedYear } = useTaxYear();
  const [options, setOptions] = useState<ReportOptions>({
    mode: "full",
    includeSourceDocuments: false,
  });
  const [showOptions, setShowOptions] = useState(false);

  const {
    state,
    pdf,
    generateReportForYear,
    downloadReport,
    clearReport,
    reset,
  } = useTaxReportPDF({
    onComplete: () => {
      toast.success("Tax report generated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });

  const isGenerating = state.status === "preparing" || state.status === "generating" || state.status === "saving";
  const isComplete = state.status === "complete";
  const hasError = state.status === "error";

  const handleGenerate = async () => {
    // Get client info from local storage or prompt
    const clientName = localStorage.getItem("tally_client_name") || "Client";
    
    await generateReportForYear(
      {
        name: clientName,
      },
      options
    );
  };

  const handleDownload = () => {
    downloadReport();
    toast.info("Report downloaded");
  };

  const handleClear = () => {
    clearReport();
    toast.info("Report cleared");
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "preparing":
      case "generating":
      case "saving":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case "complete":
        return "Report ready";
      case "error":
        return `Error: ${state.error}`;
      case "preparing":
      case "generating":
      case "saving":
        return state.stage || "Generating...";
      default:
        return "Ready to generate";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tax Report Generator</CardTitle>
          </div>
          <Badge variant="outline">FY {selectedYear - 1}-{selectedYear}</Badge>
        </div>
        <CardDescription>
          Generate a comprehensive tax report for your accountant
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getStatusText()}</p>
            {isGenerating && (
              <Progress value={state.progress} className="h-1.5 mt-1.5" />
            )}
          </div>
          {state.progress > 0 && isGenerating && (
            <span className="text-xs text-muted-foreground">{state.progress}%</span>
          )}
        </div>

        {/* Options Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          onClick={() => setShowOptions(!showOptions)}
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Report Options
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${showOptions ? "rotate-90" : ""}`} />
        </Button>

        {/* Options Panel */}
        {showOptions && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Report Mode</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={options.mode === "summary"}
                    onChange={() => setOptions({ ...options, mode: "summary" })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Summary Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={options.mode === "full"}
                    onChange={() => setOptions({ ...options, mode: "full" })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Full Report</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {options.mode === "summary" 
                  ? "Includes cover, summary, and totals only (5-7 pages)"
                  : "Complete report with all receipts and details (20+ pages)"}
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-docs" className="text-sm font-medium">
                  Include Source Documents
                </Label>
                <p className="text-xs text-muted-foreground">
                  Embed receipt images in the report
                </p>
              </div>
              <Switch
                id="include-docs"
                checked={options.includeSourceDocuments}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeSourceDocuments: checked })
                }
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isComplete ? (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          ) : (
            <>
              <Button onClick={handleDownload} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              {onPreview && (
                <Button variant="outline" onClick={onPreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              )}
            </>
          )}
        </div>

        {isComplete && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="w-full">
            Generate New Report
          </Button>
        )}

        {hasError && (
          <Button variant="outline" size="sm" onClick={reset} className="w-full">
            <AlertCircle className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
