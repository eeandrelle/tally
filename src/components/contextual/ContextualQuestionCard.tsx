import { useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import {
  ContextualQuestion,
  QuestionResponse,
  ResponseType,
  getNextFollowUpQuestion,
  calculateTaxImpact,
  QUESTION_TEMPLATES,
} from "../../lib/contextual-questions";
import { Receipt } from "./ReceiptListView";
import {
  HelpCircle,
  Home,
  Car,
  Briefcase,
  Shirt,
  GraduationCap,
  TrendingUp,
  Calculator,
  Heart,
  Plane,
  Phone,
  Wrench,
  Wifi,
  CheckCircle2,
  XCircle,
  HelpCircle as UnknownIcon,
  MinusCircle,
  DollarSign,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Home,
  Car,
  Briefcase,
  Shirt,
  GraduationCap,
  TrendingUp,
  Calculator,
  Heart,
  Plane,
  Phone,
  Wrench,
  Wifi,
  HelpCircle,
};

interface ContextualQuestionCardProps {
  question: ContextualQuestion;
  receipt?: Receipt;
  onResponse: (response: QuestionResponse) => void;
  existingResponse?: QuestionResponse;
  className?: string;
}

export function ContextualQuestionCard({
  question,
  receipt,
  onResponse,
  existingResponse,
  className,
}: ContextualQuestionCardProps) {
  const [selectedResponse, setSelectedResponse] = useState<ResponseType | undefined>(
    existingResponse?.response
  );
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpIndex, setFollowUpIndex] = useState(0);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>(
    existingResponse?.followUpResponses || {}
  );
  const [details, setDetails] = useState(existingResponse?.details || "");

  const Icon = iconMap[question.icon] || HelpCircle;

  const handleResponse = useCallback(
    (response: ResponseType) => {
      setSelectedResponse(response);

      // Show follow-up for positive/uncertain responses
      if (response !== "no" && question.followUpQuestions?.length) {
        setShowFollowUp(true);
        setFollowUpIndex(0);
      } else {
        // Submit immediately for "no" responses
        onResponse({
          questionId: question.id,
          response,
          details,
          timestamp: new Date(),
          documentId: receipt?.id,
          followUpResponses: followUpAnswers,
        });
      }
    },
    [question, receipt, details, followUpAnswers, onResponse]
  );

  const handleFollowUpNext = useCallback(() => {
    const nextQuestion = getNextFollowUpQuestion(
      question,
      selectedResponse!,
      followUpIndex + 1
    );

    if (nextQuestion) {
      setFollowUpIndex(followUpIndex + 1);
    } else {
      // Submit with all follow-up answers
      setShowFollowUp(false);
      onResponse({
        questionId: question.id,
        response: selectedResponse!,
        details,
        timestamp: new Date(),
        documentId: receipt?.id,
        followUpResponses: followUpAnswers,
      });
    }
  }, [question, selectedResponse, followUpIndex, followUpAnswers, details, receipt, onResponse]);

  const currentFollowUpQuestion = showFollowUp
    ? question.followUpQuestions?.[followUpIndex]
    : null;

  const responseButtons: { type: ResponseType; label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive" }[] = [
    { type: "yes", label: "Yes", icon: <CheckCircle2 className="h-4 w-4" />, variant: "default" },
    { type: "partial", label: "Partially", icon: <MinusCircle className="h-4 w-4" />, variant: "secondary" },
    { type: "not_sure", label: "Not Sure", icon: <UnknownIcon className="h-4 w-4" />, variant: "outline" },
    { type: "no", label: "No", icon: <XCircle className="h-4 w-4" />, variant: "outline" },
  ];

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              question.priority === "high" ? "bg-amber-100 text-amber-700" :
              question.priority === "medium" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-700"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold leading-tight">
                {question.question}
              </CardTitle>
              {question.description && (
                <CardDescription className="mt-1 text-sm">
                  {question.description}
                </CardDescription>
              )}
            </div>
            {question.taxImpact && (
              <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700 hover:bg-green-100">
                <DollarSign className="mr-1 h-3 w-3" />
                Up to ${question.taxImpact.estimatedValue}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {receipt && (
            <div className="mb-4 rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Related to:</span>{" "}
              <span className="font-medium">{receipt.vendor}</span>
              <span className="text-muted-foreground"> - ${receipt.amount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {responseButtons.map((btn) => (
              <Button
                key={btn.type}
                variant={selectedResponse === btn.type ? "default" : btn.variant}
                size="sm"
                onClick={() => handleResponse(btn.type)}
                className={cn(
                  "flex-1 min-w-[80px]",
                  selectedResponse === btn.type && btn.type === "yes" && "bg-green-600 hover:bg-green-700",
                  selectedResponse === btn.type && btn.type === "no" && "bg-red-600 hover:bg-red-700",
                  selectedResponse === btn.type && btn.type === "partial" && "bg-amber-600 hover:bg-amber-700"
                )}
              >
                {btn.icon}
                <span className="ml-1.5">{btn.label}</span>
              </Button>
            ))}
          </div>

          {(selectedResponse === "yes" || selectedResponse === "partial") && (
            <div className="mt-3">
              <Textarea
                placeholder="Add any additional details (optional)..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
          )}
        </CardContent>

        {existingResponse && (
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                Answered{" "}
                {new Date(existingResponse.timestamp).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {existingResponse.response !== "no" && question.taxImpact && (
                <Badge variant="outline" className="ml-auto border-green-200 text-green-700">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Potential ${question.taxImpact.estimatedValue} deduction
                </Badge>
              )}
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUp} onOpenChange={setShowFollowUp}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Follow-up Question
            </DialogTitle>
            <DialogDescription>
              Help us better understand your situation
            </DialogDescription>
          </DialogHeader>

          {currentFollowUpQuestion && (
            <div className="py-4">
              <p className="font-medium">{currentFollowUpQuestion}</p>
              <Textarea
                placeholder="Your answer..."
                value={followUpAnswers[followUpIndex] || ""}
                onChange={(e) =>
                  setFollowUpAnswers((prev) => ({
                    ...prev,
                    [followUpIndex]: e.target.value,
                  }))
                }
                className="mt-3"
              />
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setShowFollowUp(false);
                onResponse({
                  questionId: question.id,
                  response: selectedResponse!,
                  details,
                  timestamp: new Date(),
                  documentId: receipt?.id,
                  followUpResponses: followUpAnswers,
                });
              }}
            >
              Skip
            </Button>
            <Button onClick={handleFollowUpNext}>
              {followUpIndex < (question.followUpQuestions?.length || 0) - 1 ? (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                "Done"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ContextualQuestionPanelProps {
  questions: ContextualQuestion[];
  receipts: Receipt[];
  responses: QuestionResponse[];
  onResponse: (response: QuestionResponse) => void;
  title?: string;
  className?: string;
}

export function ContextualQuestionPanel({
  questions,
  receipts,
  responses,
  onResponse,
  title = "Smart Questions",
  className,
}: ContextualQuestionPanelProps) {
  const taxImpact = calculateTaxImpact(responses, QUESTION_TEMPLATES);
  const answeredCount = responses.length;
  const totalCount = questions.length;
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  // Group questions by category
  const questionsByCategory = questions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, ContextualQuestion[]>);

  if (questions.length === 0) {
    return (
      <Card className={cn("bg-muted/50", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No questions at the moment. Upload more receipts to get personalized questions!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {answeredCount} of {totalCount} answered
          </p>
        </div>
        {taxImpact.totalEstimatedSavings > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${taxImpact.totalEstimatedSavings.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Potential deductions</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Questions by category */}
      <div className="space-y-6">
        {Object.entries(questionsByCategory).map(([category, categoryQuestions]) => (
          <div key={category}>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-3">
              {categoryQuestions.map((question) => {
                const relatedReceipt = receipts.find((r) =>
                  responses.find(
                    (resp) =>
                      resp.questionId === question.id && resp.documentId === r.id
                  )
                );
                const existingResponse = responses.find(
                  (r) => r.questionId === question.id
                );

                return (
                  <ContextualQuestionCard
                    key={question.id}
                    question={question}
                    receipt={relatedReceipt}
                    onResponse={onResponse}
                    existingResponse={existingResponse}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TaxImpactBadgeProps {
  amount: number;
  type?: "confirmed" | "potential" | "total";
  className?: string;
}

export function TaxImpactBadge({
  amount,
  type = "potential",
  className,
}: TaxImpactBadgeProps) {
  const config = {
    confirmed: {
      bg: "bg-green-100",
      text: "text-green-700",
      label: "Confirmed",
    },
    potential: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      label: "Potential",
    },
    total: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: "Total",
    },
  };

  const { bg, text, label } = config[type];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2",
        bg,
        className
      )}
    >
      <DollarSign className={cn("h-4 w-4", text)} />
      <div>
        <div className={cn("text-lg font-bold leading-none", text)}>
          ${amount.toFixed(0)}
        </div>
        <div className={cn("text-xs", text)}>{label}</div>
      </div>
    </div>
  );
}
