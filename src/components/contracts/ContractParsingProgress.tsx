import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractParsingProgressProps {
  stage: "uploading" | "extracting" | "parsing" | "analyzing" | "complete" | "error";
  progress: number;
  fileName?: string;
  error?: string | null;
}

const stages = [
  { id: "uploading", label: "Uploading file...", icon: FileText },
  { id: "extracting", label: "Extracting text...", icon: Loader2 },
  { id: "parsing", label: "Parsing contract data...", icon: Loader2 },
  { id: "analyzing", label: "Analyzing terms...", icon: Loader2 },
  { id: "complete", label: "Parsing complete!", icon: CheckCircle },
  { id: "error", label: "Error occurred", icon: AlertCircle },
] as const;

export function ContractParsingProgress({
  stage,
  progress,
  fileName,
  error,
}: ContractParsingProgressProps) {
  const currentStageIndex = stages.findIndex(s => s.id === stage);
  
  return (
    <div className="w-full space-y-4 p-4 bg-muted/50 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stage === "error" ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : stage === "complete" ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <div>
            <p className="font-medium">
              {stage === "error" ? "Error Processing Contract" : "Processing Contract"}
            </p>
            {fileName && (
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                {fileName}
              </p>
            )}
          </div>
        </div>
        <span className="text-sm font-medium">{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <Progress 
        value={progress} 
        className={cn(
          stage === "error" && "bg-destructive/20",
          stage === "complete" && "bg-green-500/20"
        )}
      />

      {/* Stage indicators */}
      <div className="grid grid-cols-4 gap-2">
        {stages.slice(0, 4).map((s, index) => {
          const Icon = s.icon;
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;
          
          return (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-md transition-colors",
                isActive && "bg-primary/10",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", s.id !== "uploading" && s.id !== "complete" && "animate-spin")} />
              <span className="text-xs text-center">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
