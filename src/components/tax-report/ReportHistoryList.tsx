import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Calendar, 
  User,
  Clock,
  ChevronRight,
  FolderOpen,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useTaxYear } from "@/contexts/TaxYearContext";
import { toast } from "sonner";

export interface ReportHistoryItem {
  id: string;
  filename: string;
  clientName: string;
  taxYear: number;
  generatedAt: Date;
  mode: "summary" | "full";
  pageCount?: number;
  fileSize?: string;
  filePath?: string;
  sections?: string[];
}

interface ReportHistoryListProps {
  onPreview?: (report: ReportHistoryItem) => void;
  onDownload?: (report: ReportHistoryItem) => void;
  className?: string;
}

export function ReportHistoryList({
  onPreview,
  onDownload,
  className,
}: ReportHistoryListProps) {
  const { selectedYear } = useTaxYear();
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportHistoryItem | null>(null);

  // Load report history from local storage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem(`tally_reports_${selectedYear}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setReports(parsed.map((r: ReportHistoryItem) => ({
            ...r,
            generatedAt: new Date(r.generatedAt),
          })));
        }
      } catch (error) {
        console.error("Failed to load report history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [selectedYear]);

  const handleDelete = (reportId: string) => {
    const updated = reports.filter(r => r.id !== reportId);
    setReports(updated);
    localStorage.setItem(`tally_reports_${selectedYear}`, JSON.stringify(updated));
    
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
    }
    
    toast.success("Report removed from history");
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all report history?")) {
      setReports([]);
      localStorage.removeItem(`tally_reports_${selectedYear}`);
      setSelectedReport(null);
      toast.success("Report history cleared");
    }
  };

  const handlePreview = (report: ReportHistoryItem) => {
    setSelectedReport(report);
    onPreview?.(report);
  };

  const handleDownload = (report: ReportHistoryItem) => {
    onDownload?.(report);
    toast.success("Download started");
  };

  const addToHistory = (report: ReportHistoryItem) => {
    const updated = [report, ...reports].slice(0, 20); // Keep last 20
    setReports(updated);
    localStorage.setItem(`tally_reports_${selectedYear}`, JSON.stringify(updated));
  };

  // Expose addToHistory via a ref-like mechanism
  useEffect(() => {
    (window as any).__addReportToHistory = addToHistory;
    return () => {
      delete (window as any).__addReportToHistory;
    };
  }, [reports, selectedYear]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Report History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Report History</CardTitle>
          </div>
          <CardDescription>
            Previously generated tax reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">No reports generated yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated reports will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Report History</CardTitle>
          </div>
          <Badge variant="secondary">{reports.length}</Badge>
        </div>
        <CardDescription>
          Previously generated tax reports for FY {selectedYear - 1}-{selectedYear}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  selectedReport?.id === report.id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {report.clientName}
                      </h4>
                      <Badge variant={report.mode === "full" ? "default" : "secondary"} className="text-xs">
                        {report.mode === "full" ? "Full" : "Summary"}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {report.filename}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(report.generatedAt, "dd MMM yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(report.generatedAt, "h:mm a")}
                      </span>
                      {report.pageCount && (
                        <span>{report.pageCount} pages</span>
                      )}
                      {report.fileSize && (
                        <span>{report.fileSize}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(report);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(report);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(report.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {selectedReport && (
          <>
            <Separator />
            <div className="p-4 bg-muted/30">
              <h4 className="font-medium text-sm mb-2">Report Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span>{selectedReport.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Year:</span>
                  <span>FY {selectedReport.taxYear - 1}-{selectedReport.taxYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generated:</span>
                  <span>{format(selectedReport.generatedAt, "PPp")}</span>
                </div>
                {selectedReport.sections && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sections:</span>
                    <span>{selectedReport.sections.length} included</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleDownload(selectedReport)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handlePreview(selectedReport)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="p-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-destructive hover:text-destructive"
            onClick={handleClearAll}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper to add reports to history from other components
export function addReportToHistory(report: ReportHistoryItem): void {
  if (typeof window !== "undefined" && (window as any).__addReportToHistory) {
    (window as any).__addReportToHistory(report);
  }
}
