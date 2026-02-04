/**
 * ATO Workpaper Component
 * 
 * Guided form for entering deductions in an ATO category.
 */

import { useState, useEffect } from "react";
import { AtoCategory, AtoCategoryCode } from "@/lib/ato-categories";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Calculator,
  Save,
  FileText,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AtoWorkpaperProps {
  category: AtoCategory;
  taxYear: number;
  initialAmount?: number;
  initialDescription?: string;
  initialReceiptCount?: number;
  onSave: (data: {
    amount: number;
    description: string;
    receiptCount: number;
  }) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function AtoWorkpaper({
  category,
  taxYear,
  initialAmount = 0,
  initialDescription = "",
  initialReceiptCount = 0,
  onSave,
  onCancel,
  className
}: AtoWorkpaperProps) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(initialAmount.toString());
  const [description, setDescription] = useState(initialDescription);
  const [receiptCount, setReceiptCount] = useState(initialReceiptCount.toString());
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        amount: parseFloat(amount) || 0,
        description,
        receiptCount: parseInt(receiptCount) || 0
      });
      toast.success(`${category.code} claim updated for ${taxYear}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono font-bold text-2xl bg-primary/10 px-3 py-1 rounded">
            {category.code}
          </span>
          <div>
            <CardTitle className="text-xl">{category.name}</CardTitle>
            <CardDescription>FY {taxYear} Workpaper</CardDescription>
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                i + 1 <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          {/* Step 1: Eligibility Check */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Before you start</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Please review the eligibility criteria for this deduction category.
                    You must meet all criteria to claim.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Eligibility Criteria</h4>
                {category.eligibilityCriteria.map((criteria, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{criteria}</span>
                  </div>
                ))}
              </div>

              {category.claimLimits && (
                <div className="p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Claim Limits
                  </h4>
                  <p className="text-sm text-amber-800 mt-1">
                    {category.claimLimits.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Enter Amount */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-base">
                  Total Amount to Claim
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-lg"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the total amount you spent on {category.name.toLowerCase()}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="receipts" className="text-base">
                  Number of Receipts
                </Label>
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-muted-foreground" />
                  <Input
                    id="receipts"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={receiptCount}
                    onChange={(e) => setReceiptCount(e.target.value)}
                    className="w-24"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {category.receiptRequirements.description}
                </p>
              </div>

              {category.typicalWorksheetItems && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Typical items to include
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {category.typicalWorksheetItems.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Notes */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <h4 className="font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium">{category.code} - {category.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax Year:</span>
                    <p className="font-medium">{taxYear}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-medium text-lg">
                      ${parseFloat(amount || "0").toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receipts:</span>
                    <p className="font-medium">{receiptCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base">
                  Notes (optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add any notes about this claim..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready to save
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Review your entries above. Click Save to record this claim.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? onCancel : prevStep}
            disabled={saving}
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>

          {step < totalSteps ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={saving || !amount}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Claim"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AtoWorkpaper;
