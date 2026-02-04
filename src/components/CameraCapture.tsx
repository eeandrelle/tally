/**
 * Camera Capture Component
 * 
 * A mobile-optimized receipt camera capture component with:
 * - Document edge detection
 * - Auto-capture when document is stable
 * - Perspective correction for skewed receipts
 * - Flash/torch toggle
 * - Zoom capability
 * - Mobile-responsive design
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useCameraCapture,
  saveCapturedImage,
  type CapturedImage,
} from "@/hooks/useCameraCapture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Flashlight,
  FlashlightOff,
  ZoomIn,
  SwitchCamera,
  ScanLine,
  Check,
  X,
  RefreshCw,
  ImageIcon,
  Loader2,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CameraCaptureProps {
  /** Called when capture is complete */
  onComplete?: () => void;
  /** Allow multiple captures */
  multiple?: boolean;
  /** Auto-capture when document detected */
  autoCapture?: boolean;
  /** Show review dialog after capture */
  showReview?: boolean;
  /** Initial zoom level */
  defaultZoom?: number;
  /** Class name for styling */
  className?: string;
}

interface CapturedReceipt {
  image: CapturedImage;
  receiptId?: number;
  status: "pending" | "processing" | "saved" | "error";
  error?: string;
}

export function CameraCapture({
  onComplete,
  multiple = false,
  autoCapture = true,
  showReview = true,
  defaultZoom = 1,
  className,
}: CameraCaptureProps) {
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedReceipt[]>([]);
  const [reviewingImage, setReviewingImage] = useState<CapturedImage | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    videoRef,
    canvasRef,
    overlayCanvasRef,
    isReady,
    hasPermission,
    isCapturing,
    documentDetected,
    stabilityScore,
    flashEnabled,
    zoomLevel,
    minZoom,
    maxZoom,
    initialize,
    capture,
    toggleFlash,
    setZoom,
    switchCamera,
    stop,
    error,
  } = useCameraCapture({
    autoCapture,
    stabilityThreshold: 0.75,
    facingMode: "environment",
    onCapture: handleAutoCapture,
  });

  // Initialize camera on mount
  useEffect(() => {
    if (!isInitialized && hasPermission === null) {
      initialize();
      setIsInitialized(true);
    }

    return () => {
      stop();
    };
  }, [isInitialized, hasPermission, initialize, stop]);

  // Set default zoom
  useEffect(() => {
    if (isReady) {
      setZoom(defaultZoom);
    }
  }, [isReady, defaultZoom, setZoom]);

  function handleAutoCapture(image: CapturedImage) {
    if (autoCapture && showReview) {
      setReviewingImage(image);
      setShowReviewDialog(true);
    } else if (autoCapture) {
      // Auto-save without review
      handleSaveImage(image);
    }
  }

  const handleManualCapture = useCallback(async () => {
    const image = await capture();
    if (image) {
      if (showReview) {
        setReviewingImage(image);
        setShowReviewDialog(true);
      } else {
        handleSaveImage(image);
      }
    }
  }, [capture, showReview]);

  const handleSaveImage = async (image: CapturedImage) => {
    setIsSaving(true);
    const toastId = toast.loading("Processing receipt...");

    try {
      const result = await saveCapturedImage(image, {
        notes: `Captured via camera${image.metadata.perspectiveCorrected ? " (perspective corrected)" : ""}`,
      });

      if (result.success) {
        toast.success("Receipt saved!", {
          id: toastId,
          description: `Receipt ID: ${result.receiptId}`,
        });

        setCapturedImages((prev) => [
          ...prev,
          { image, receiptId: result.receiptId, status: "saved" },
        ]);

        setShowReviewDialog(false);
        setReviewingImage(null);

        if (!multiple) {
          onComplete?.();
        }
      } else {
        toast.error("Failed to save receipt", {
          id: toastId,
          description: result.error,
        });
      }
    } catch (err) {
      toast.error("Error saving receipt", {
        id: toastId,
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setShowReviewDialog(false);
    setReviewingImage(null);
  };

  const handleRetake = () => {
    setShowReviewDialog(false);
    setReviewingImage(null);
    // Small delay to allow UI to update
    setTimeout(() => {
      capture();
    }, 300);
  };

  // Permission denied state
  if (hasPermission === false) {
    return (
      <Card className={cn("w-full max-w-lg mx-auto", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Camera Access Denied</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
            Please allow camera access in your browser settings to capture receipts.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/upload" })}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
            <Button onClick={() => initialize()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full max-w-lg mx-auto", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <ScanLine className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
            {error}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/upload" })}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => initialize()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("relative w-full max-w-lg mx-auto", className)}>
      {/* Camera View */}
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: "/upload" })}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-base">Capture Receipt</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              {autoCapture && (
                <Badge
                  variant={documentDetected ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    documentDetected && stabilityScore >= 0.75 && "bg-green-600"
                  )}
                >
                  {documentDetected
                    ? stabilityScore >= 0.75
                      ? "Ready"
                      : "Detecting..."
                    : "No Document"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Camera Preview */}
        <div className="relative aspect-[3/4] bg-black">
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Detection Overlay */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />

          {/* Hidden canvases for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading State */}
          {!isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Initializing camera...</p>
            </div>
          )}

          {/* Document Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none z-5">
            {/* Corner guides */}
            <div className="absolute inset-0 p-8">
              <div
                className={cn(
                  "w-full h-full border-2 border-dashed rounded-lg transition-colors duration-300",
                  documentDetected
                    ? stabilityScore >= 0.75
                      ? "border-green-400/70"
                      : "border-yellow-400/70"
                    : "border-white/30"
                )}
              >
                {/* Corner markers */}
                <div
                  className={cn(
                    "absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors",
                    documentDetected
                      ? stabilityScore >= 0.75
                        ? "border-green-400"
                        : "border-yellow-400"
                      : "border-white/50"
                  )}
                />
                <div
                  className={cn(
                    "absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors",
                    documentDetected
                      ? stabilityScore >= 0.75
                        ? "border-green-400"
                        : "border-yellow-400"
                      : "border-white/50"
                  )}
                />
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors",
                    documentDetected
                      ? stabilityScore >= 0.75
                        ? "border-green-400"
                        : "border-yellow-400"
                      : "border-white/50"
                  )}
                />
                <div
                  className={cn(
                    "absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors",
                    documentDetected
                      ? stabilityScore >= 0.75
                        ? "border-green-400"
                        : "border-yellow-400"
                      : "border-white/50"
                  )}
                />
              </div>
            </div>

            {/* Helper text */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white/80 text-sm font-medium bg-black/40 inline-block px-3 py-1 rounded-full">
                {documentDetected
                  ? stabilityScore >= 0.75
                    ? "Hold steady..."
                    : "Align document in frame"
                  : "Position receipt within frame"}
              </p>
            </div>
          </div>

          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFlash}
              className={cn(
                "h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70",
                flashEnabled && "bg-yellow-500/50 hover:bg-yellow-500/70"
              )}
            >
              {flashEnabled ? (
                <Flashlight className="h-5 w-5 text-white" />
              ) : (
                <FlashlightOff className="h-5 w-5 text-white" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={switchCamera}
              className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70"
            >
              <SwitchCamera className="h-5 w-5 text-white" />
            </Button>
          </div>

          {/* Zoom Control */}
          <div className="absolute bottom-24 left-4 right-4 z-30">
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <ZoomIn className="h-4 w-4 text-white/70" />
              <Slider
                value={[zoomLevel]}
                onValueChange={([value]) => setZoom(value)}
                min={minZoom}
                max={maxZoom}
                step={0.1}
                className="flex-1"
              />
              <span className="text-white text-xs font-medium min-w-[2.5rem] text-right">
                {zoomLevel.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Gallery Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-xl"
              onClick={() => navigate({ to: "/gallery" })}
            >
              <ImageIcon className="h-6 w-6" />
            </Button>

            {/* Capture Button */}
            <button
              onClick={handleManualCapture}
              disabled={!isReady || isCapturing}
              className={cn(
                "relative w-16 h-16 rounded-full border-4 transition-all duration-200",
                documentDetected && stabilityScore >= 0.75
                  ? "border-green-500 bg-green-500/20"
                  : "border-white bg-white/10",
                (!isReady || isCapturing) && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "absolute inset-1 rounded-full transition-colors",
                  documentDetected && stabilityScore >= 0.75
                    ? "bg-green-500"
                    : "bg-white"
                )}
              />
              {isCapturing && (
                <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-black animate-spin" />
              )}
            </button>

            {/* Auto-capture toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-xl",
                autoCapture && "text-primary"
              )}
              onClick={() => {}}
              title="Auto-capture enabled"
            >
              <Zap className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Captured Images Summary */}
      {capturedImages.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">
              Captured ({capturedImages.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {capturedImages.map((item, index) => (
                <div
                  key={item.image.id}
                  className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border"
                >
                  <img
                    src={item.image.dataUrl}
                    alt={`Capture ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
            {!multiple && (
              <Button
                className="w-full mt-3"
                onClick={() => onComplete?.()}
              >
                Done
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Capture</DialogTitle>
            <DialogDescription>
              Check if the receipt is clear and properly aligned
            </DialogDescription>
          </DialogHeader>

          {reviewingImage && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="rounded-lg overflow-hidden border bg-muted">
                <img
                  src={reviewingImage.dataUrl}
                  alt="Captured receipt"
                  className="w-full h-auto max-h-[400px] object-contain"
                />
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted p-2 rounded">
                  <span className="text-muted-foreground">Resolution</span>
                  <p className="font-medium">
                    {reviewingImage.width} × {reviewingImage.height}
                  </p>
                </div>
                <div className="bg-muted p-2 rounded">
                  <span className="text-muted-foreground">Document</span>
                  <p className="font-medium">
                    {reviewingImage.metadata.hasDocument ? "Detected" : "Not detected"}
                  </p>
                </div>
                <div className="bg-muted p-2 rounded">
                  <span className="text-muted-foreground">Stability</span>
                  <p className="font-medium">
                    {Math.round(reviewingImage.metadata.stabilityScore * 100)}%
                  </p>
                </div>
                <div className="bg-muted p-2 rounded">
                  <span className="text-muted-foreground">Corrected</span>
                  <p className="font-medium">
                    {reviewingImage.metadata.perspectiveCorrected ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={handleDiscard}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Discard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={() => reviewingImage && handleSaveImage(reviewingImage)}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Camera Button - Quick access to camera capture
 */
interface CameraButtonProps {
  onCapture?: (image: CapturedImage) => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function CameraButton({
  onCapture,
  variant = "default",
  size = "default",
  className,
  children,
}: CameraButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate({ to: "/camera" });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <Camera className="h-4 w-4 mr-2" />
      {children || "Camera"}
    </Button>
  );
}

export default CameraCapture;
