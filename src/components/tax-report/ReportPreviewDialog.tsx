import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer
} from "lucide-react";

interface ReportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  onDownload?: () => void;
  onPrint?: () => void;
  title?: string;
}

export function ReportPreviewDialog({
  isOpen,
  onClose,
  pdfUrl,
  onDownload,
  onPrint,
  title = "Tax Report Preview",
}: ReportPreviewDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState("preview");

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setZoom(100);
    }
  }, [isOpen]);

  // Try to determine page count from PDF
  useEffect(() => {
    if (pdfUrl) {
      // In a real implementation, we'd use a PDF library to get the page count
      // For now, we'll assume it's loaded in an iframe
      setTotalPages(1); // Will be updated by iframe
    }
  }, [pdfUrl]);

  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 50));
  const handleResetZoom = () => setZoom(100);

  const handlePreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const handleNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1));

  const zoomPercentage = `${zoom}%`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-lg flex items-center gap-2">
              {title}
            </DialogTitle>
            <DialogDescription>
              Preview your tax report before downloading
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span 
              className="text-sm text-muted-foreground min-w-[60px] text-center cursor-pointer hover:text-foreground"
              onClick={handleResetZoom}
            >
              {zoomPercentage}
            </span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(100)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-2 w-fit">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 m-0 p-0 mt-0">
            <ScrollArea className="h-full">
              <div className="flex justify-center p-8 min-h-full bg-muted/20">
                {pdfUrl ? (
                  <div 
                    className="shadow-lg bg-white transition-transform duration-200"
                    style={{ 
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <iframe
                      src={pdfUrl}
                      className="w-[210mm] h-[297mm] border-0"
                      title="Tax Report Preview"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p>No PDF to preview</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="outline" className="flex-1 m-0 p-0 mt-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                <h3 className="font-semibold mb-4">Report Sections</h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>1. Cover Page</span>
                    <span className="text-sm text-muted-foreground">Page 1</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>2. Table of Contents</span>
                    <span className="text-sm text-muted-foreground">Page 2</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>3. Income Summary</span>
                    <span className="text-sm text-muted-foreground">Page 3</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>4. Deductions Summary</span>
                    <span className="text-sm text-muted-foreground">Page 4</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>5. Detailed Deductions</span>
                    <span className="text-sm text-muted-foreground">Page 5-15</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>6. Tax Offsets</span>
                    <span className="text-sm text-muted-foreground">Page 16</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>7. Tax Calculation</span>
                    <span className="text-sm text-muted-foreground">Page 17</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>8. Document Index</span>
                    <span className="text-sm text-muted-foreground">Page 18</span>
                  </li>
                  <li className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                    <span>9. Appendix</span>
                    <span className="text-sm text-muted-foreground">Page 19-20</span>
                  </li>
                </ul>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            This preview shows how your report will appear when downloaded.
          </p>
          <Button onClick={onClose} variant="secondary">
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
