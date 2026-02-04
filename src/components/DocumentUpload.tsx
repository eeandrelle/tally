import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Upload,
  File,
  FileText,
  Image,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  FilePlus,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface DocumentUploadProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: (files: UploadFile[]) => void;
  onFileRemove?: (fileId: string) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
  uploadFunction?: (file: File, onProgress: (progress: number) => void) => Promise<void>;
}

const ALLOWED_TYPES = {
  "application/pdf": { icon: FileText, label: "PDF" },
  "image/png": { icon: Image, label: "PNG" },
  "image/jpeg": { icon: Image, label: "JPEG" },
  "image/jpg": { icon: Image, label: "JPG" },
  "image/webp": { icon: Image, label: "WebP" },
  "text/plain": { icon: File, label: "Text" },
  "message/rfc822": { icon: Mail, label: "Email" },
  ".eml": { icon: Mail, label: "Email" },
  ".msg": { icon: Mail, label: "Email" },
};

const DEFAULT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.eml,.msg,application/pdf,image/png,image/jpeg,image/webp";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileType: string) {
  const Icon = ALLOWED_TYPES[fileType as keyof typeof ALLOWED_TYPES]?.icon || File;
  return Icon;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function DocumentUpload({
  onFilesSelected,
  onUploadComplete,
  onFileRemove,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  maxFiles = 50,
  maxSize = 50, // 50MB default
  className,
  uploadFunction,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const filesArray = Array.from(newFiles);
    
    if (!multiple && filesArray.length > 1) {
      toast.error("Only one file allowed");
      return;
    }

    if (files.length + filesArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const uploadFiles: UploadFile[] = [];
    const errors: string[] = [];

    filesArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      uploadFiles.push({
        id: generateId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type || file.name.split(".").pop() || "unknown",
        progress: 0,
        status: "pending",
      });
    });

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    }

    if (uploadFiles.length > 0) {
      setFiles((prev) => [...prev, ...uploadFiles]);
      onFilesSelected?.(uploadFiles.map((f) => f.file));
      toast.success(`${uploadFiles.length} file(s) added`);
    }
  }, [files.length, maxFiles, maxSize, multiple, onFilesSelected]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    onFileRemove?.(id);
  }, [onFileRemove]);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const simulateUpload = async (file: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      const updateProgress = (progress: number) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, progress, status: "uploading" } : f
          )
        );
      };

      if (uploadFunction) {
        uploadFunction(file.file, updateProgress)
          .then(() => resolve())
          .catch((err) => reject(err));
      } else {
        // Simulate upload with progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            updateProgress(100);
            setTimeout(() => resolve(), 200);
          } else {
            updateProgress(Math.min(progress, 99));
          }
        }, 200);
      }
    });
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      toast.info("No files to upload");
      return;
    }

    setIsUploading(true);

    for (const file of pendingFiles) {
      try {
        await simulateUpload(file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "success", progress: 100 } : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error", error: "Upload failed" }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    const completedFiles = files.filter((f) => f.status !== "pending");
    onUploadComplete?.(completedFiles);
    toast.success("Upload complete!");
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drag & Drop Zone */}
      <Card
        className={cn(
          "relative border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 px-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200",
              isDragging ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {isDragging ? (
              <FilePlus className="h-8 w-8" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-lg font-medium mb-1">
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            or click to browse from your computer
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">PDF</Badge>
            <Badge variant="secondary">PNG</Badge>
            <Badge variant="secondary">JPG</Badge>
            <Badge variant="secondary">Email</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Maximum file size: {maxSize}MB • Up to {maxFiles} files
          </p>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Files ({files.length})</h3>
                {totalSize > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {formatFileSize(totalSize)} total
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {pendingCount} pending
                  </Badge>
                )}
                {successCount > 0 && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    {successCount} done
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} failed
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {files.map((file) => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        file.status === "success" && "bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
                        file.status === "error" && "bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
                        file.status === "pending" && "bg-muted/50 border-transparent",
                        file.status === "uploading" && "bg-primary/5 border-primary/20"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>

                        {file.status === "uploading" && (
                          <div className="mt-2">
                            <Progress value={file.progress} className="h-1" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(file.progress)}%
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {file.status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {file.status === "error" && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{file.error}</span>
                          </div>
                        )}
                        {file.status === "uploading" && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          disabled={file.status === "uploading"}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Upload Button */}
            {pendingCount > 0 && (
              <Button
                className="w-full mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
