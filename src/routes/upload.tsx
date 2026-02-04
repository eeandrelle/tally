import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DocumentUpload, 
  UploadFile 
} from "@/components/DocumentUpload";
import { CameraButton } from "@/components/CameraCapture";
import { 
  Upload, 
  ArrowLeft, 
  FileText, 
  Image as ImageIcon, 
  Mail,
  CheckCircle2,
  Sparkles,
  Camera
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

function UploadPage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    console.log("Files selected:", files.map(f => f.name));
  };

  const handleUploadComplete = (files: UploadFile[]) => {
    setUploadedFiles(files);
    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      const successCount = files.filter(f => f.status === "success").length;
      toast.success(`Processed ${successCount} document${successCount !== 1 ? 's' : ''}`);
    }, 1500);
  };

  const handleFileRemove = (fileId: string) => {
    console.log("File removed:", fileId);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="bg-primary/10 p-2 rounded-lg">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Document Upload</h1>
                <p className="text-sm text-muted-foreground">
                  Upload receipts, statements, and tax documents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CameraButton variant="outline" size="default">
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </CameraButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
            <TabsTrigger value="supported">Supported Types</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Upload Zone */}
            <DocumentUpload
              onFilesSelected={handleFilesSelected}
              onUploadComplete={handleUploadComplete}
              onFileRemove={handleFileRemove}
              multiple={true}
              maxFiles={50}
              maxSize={50}
            />

            {/* Processing Status */}
            {isProcessing && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Processing Documents</h3>
                    <p className="text-sm text-muted-foreground">
                      Extracting data, detecting document types, and categorizing...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success Summary */}
            {!isProcessing && uploadedFiles.length > 0 && (
              <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Upload Complete
                  </CardTitle>
                  <CardDescription>
                    {uploadedFiles.filter(f => f.status === "success").length} of {uploadedFiles.length} files processed successfully
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Link to="/receipts">
                      <Button variant="outline">
                        View All Receipts
                      </Button>
                    </Link>
                    <Link to="/dashboard">
                      <Button>Back to Dashboard</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Capture Option */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Quick Capture
                </CardTitle>
                <CardDescription>
                  Use your camera to quickly scan receipts with automatic document detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Automatic document edge detection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Auto-capture when document is stable
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Perspective correction for skewed receipts
                      </li>
                    </ul>
                  </div>
                  <CameraButton variant="default" size="lg" className="w-full sm:w-auto">
                    <Camera className="h-5 w-5 mr-2" />
                    Open Camera
                  </CameraButton>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Clear Photos</p>
                      <p className="text-xs text-muted-foreground">
                        Ensure receipts are well-lit and in focus for best OCR results
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <Camera className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Camera Mode</p>
                      <p className="text-xs text-muted-foreground">
                        Use camera mode for automatic receipt detection and capture
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">PDF Statements</p>
                      <p className="text-xs text-muted-foreground">
                        Upload bank statements as PDFs for automatic transaction extraction
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Email Imports</p>
                      <p className="text-xs text-muted-foreground">
                        Save email receipts as .eml files to preserve metadata
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supported">
            <Card>
              <CardHeader>
                <CardTitle>Supported Document Types</CardTitle>
                <CardDescription>
                  Tally can automatically process and extract data from these document formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Receipts */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Receipts & Invoices</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>PDF Documents</span>
                        <Badge variant="outline">.pdf</Badge>
                      </li>
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>PNG Images</span>
                        <Badge variant="outline">.png</Badge>
                      </li>
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>JPEG Images</span>
                        <Badge variant="outline">.jpg, .jpeg</Badge>
                      </li>
                      <li className="flex items-center justify-between py-2">
                        <span>WebP Images</span>
                        <Badge variant="outline">.webp</Badge>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Auto-extracts: vendor, date, amount, ABN, items
                    </p>
                  </div>

                  {/* Bank Statements */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold">Bank Statements</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>PDF Statements</span>
                        <Badge variant="outline">.pdf</Badge>
                      </li>
                      <li className="py-2 text-muted-foreground">
                        Supported banks: CommBank, NAB, Westpac, ANZ, ING, Macquarie
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Auto-extracts: transactions, dates, amounts, balances
                    </p>
                  </div>

                  {/* Emails */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-amber-500" />
                      <h3 className="font-semibold">Email Receipts</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>Email Message</span>
                        <Badge variant="outline">.eml</Badge>
                      </li>
                      <li className="flex items-center justify-between py-2">
                        <span>Outlook Message</span>
                        <Badge variant="outline">.msg</Badge>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Preserves sender, date, and email metadata
                    </p>
                  </div>

                  {/* Other */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-purple-500" />
                      <h3 className="font-semibold">Other Documents</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>Contracts & Agreements</span>
                        <Badge variant="outline">.pdf</Badge>
                      </li>
                      <li className="flex items-center justify-between py-2 border-b">
                        <span>Dividend Statements</span>
                        <Badge variant="outline">.pdf</Badge>
                      </li>
                      <li className="flex items-center justify-between py-2">
                        <span>Tax Documents</span>
                        <Badge variant="outline">.pdf</Badge>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Key date and amount extraction
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
