import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, X, Camera, Bug, Lightbulb, Heart, Send, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackData {
  type: 'bug' | 'feature' | 'praise' | 'other';
  message: string;
  screenshot: string | null;
  metadata: {
    timestamp: string;
    path: string;
    userAgent: string;
    appVersion: string;
  };
}

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'praise', label: 'Love it!', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { value: 'other', label: 'Other', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
] as const;

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('bug');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Use html2canvas-like approach with native API
      const canvas = await htmlToCanvas(document.body);
      const dataUrl = canvas.toDataURL('image/png', 0.8);
      
      // Compress and resize
      const resized = await resizeImage(dataUrl, 1200, 800);
      setScreenshot(resized);
      toast.success('Screenshot captured!');
    } catch (error) {
      toast.error('Failed to capture screenshot. You can upload manually.');
      console.error('Screenshot capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type: feedbackType,
      message: message.trim(),
      screenshot,
      metadata: {
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        appVersion: 'Tally Beta 1.0',
      },
    };

    try {
      // Store feedback locally (in a real app, send to backend)
      const existingFeedback = JSON.parse(localStorage.getItem('tally-feedback') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('tally-feedback', JSON.stringify(existingFeedback));

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
        setMessage('');
        setScreenshot(null);
        setFeedbackType('bug');
      }, 1500);

      toast.success('Feedback sent! Thank you for helping improve Tally.');
    } catch (error) {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearScreenshot = () => setScreenshot(null);

  if (showSuccess) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in zoom-in duration-300">
        <div className="bg-green-500 text-white rounded-full p-4 shadow-lg">
          <Check className="w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isExpanded && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <Badge variant="secondary" className="mb-1">
              Beta Feedback
            </Badge>
          </div>
        )}
        <Button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          size="lg"
          className={cn(
            "rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
            "h-14 w-14 p-0"
          )}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-500" />
              Send Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve Tally Beta. Your feedback matters!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Feedback Type Selection */}
            <div className="space-y-3">
              <Label>What type of feedback?</Label>
              <RadioGroup
                value={feedbackType}
                onValueChange={(v) => setFeedbackType(v as FeedbackData['type'])}
                className="grid grid-cols-2 gap-2"
              >
                {feedbackTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.value}>
                      <RadioGroupItem
                        value={type.value}
                        id={type.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={type.value}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          "hover:bg-muted/50 peer-data-[state=checked]:border-violet-500 peer-data-[state=checked]:bg-violet-500/5"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-md", type.bg)}>
                          <Icon className={cn("w-4 h-4", type.color)} />
                        </div>
                        <span className="text-sm font-medium">{type.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Message Input */}
            <div className="space-y-3">
              <Label htmlFor="message">Tell us more</Label>
              <Textarea
                id="message"
                placeholder="Describe your experience, report a bug, or suggest a feature..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Screenshot Capture */}
            <div className="space-y-3">
              <Label>Screenshot (optional)</Label>
              {screenshot ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={screenshot}
                    alt="Screenshot preview"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearScreenshot}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={captureScreenshot}
                    disabled={isCapturing}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isCapturing ? 'Capturing...' : 'Capture Screen'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    Upload Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Beta Badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Badge variant="outline" className="text-[10px]">BETA</Badge>
              <span>Your feedback helps us improve Tally before the official release.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to capture screenshot using native APIs
async function htmlToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set canvas size to viewport
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Fill with background color
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#0f0d13';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Try to use modern capture API if available
  try {
    // @ts-ignore - Chrome-only API
    if (document.documentElement.captureViewport) {
      // @ts-ignore
      const bitmap = await document.documentElement.captureViewport();
      ctx.drawImage(bitmap, 0, 0);
      return canvas;
    }
  } catch (e) {
    console.log('Viewport capture not available, using fallback');
  }
  
  // Fallback: create a visual representation
  ctx.font = '14px system-ui';
  ctx.fillStyle = '#888';
  ctx.fillText(`Tally Beta - ${window.location.pathname}`, 20, 40);
  ctx.fillText(`Captured: ${new Date().toLocaleString()}`, 20, 60);
  ctx.fillText('Screenshot API not available - attach manual screenshot', 20, 100);
  
  return canvas;
}

// Helper function to resize image
async function resizeImage(dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/png', 0.8));
    };
    img.src = dataUrl;
  });
}
