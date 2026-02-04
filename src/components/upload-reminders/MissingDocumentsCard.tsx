import { useState } from 'react';
import { 
  AlertTriangle, 
  FileText, 
  Banknote, 
  Receipt, 
  File,
  Upload,
  X,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { MissingDocument, DocumentType } from '@/lib/upload-patterns';
import type { DocumentReminder } from '@/lib/reminder-generator';

interface MissingDocumentsCardProps {
  missingDocuments: MissingDocument[];
  reminders: DocumentReminder[];
  onUpload: (missing: MissingDocument) => void;
  onDismiss: (id: string) => void;
  onViewAll: () => void;
  maxDisplay?: number;
}

const documentTypeIcons: Record<DocumentType, typeof FileText> = {
  bank_statement: Banknote,
  dividend_statement: Receipt,
  payg_summary: FileText,
  other: File,
};

const documentTypeLabels: Record<DocumentType, string> = {
  bank_statement: 'Bank Statement',
  dividend_statement: 'Dividend',
  payg_summary: 'PAYG Summary',
  other: 'Document',
};

const urgencyConfig = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertCircle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertTriangle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock },
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Bell },
};

export function MissingDocumentsCard({
  missingDocuments,
  reminders,
  onUpload,
  onDismiss,
  onViewAll,
  maxDisplay = 5,
}: MissingDocumentsCardProps) {
  const [dismissing, setDismissing] = useState<string | null>(null);

  // Get the most urgent items
  const urgentItems = missingDocuments
    .filter(m => m.isMissing)
    .slice(0, maxDisplay);

  const upcomingItems = missingDocuments
    .filter(m => !m.isMissing)
    .slice(0, Math.max(0, maxDisplay - urgentItems.length));

  const displayItems = [...urgentItems, ...upcomingItems];
  const totalMissing = missingDocuments.filter(m => m.isMissing).length;

  const getReminderForMissing = (missingId: string) => {
    return reminders.find(r => r.missingDocumentId === missingId);
  };

  const handleDismiss = async (id: string) => {
    setDismissing(id);
    await onDismiss(id);
    setDismissing(null);
  };

  if (missingDocuments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            All Documents Accounted For
          </CardTitle>
          <CardDescription>
            No missing documents detected based on your upload patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We&apos;ll monitor your document patterns and alert you when expected documents don&apos;t arrive on time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={totalMissing > 0 ? "h-5 w-5 text-orange-500" : "h-5 w-5 text-blue-500"} />
              {totalMissing > 0 ? `${totalMissing} Missing Document${totalMissing === 1 ? '' : 's'}` : 'Documents Expected Soon'}
            </CardTitle>
            <CardDescription>
              {totalMissing > 0 
                ? 'Documents that haven\'t arrived when expected'
                : 'Upcoming documents based on your patterns'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalMissing > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Upload Progress</span>
              <span className="font-medium">
                {missingDocuments.filter(m => !m.isMissing).length} of {missingDocuments.length} on track
              </span>
            </div>
            <Progress 
              value={(missingDocuments.filter(m => !m.isMissing).length / missingDocuments.length) * 100} 
              className="h-2"
            />
          </div>
        )}

        <div className="space-y-2">
          {displayItems.map((missing) => {
            const Icon = documentTypeIcons[missing.documentType];
            const reminder = getReminderForMissing(missing.id);
            const urgency = reminder?.urgency || (missing.isMissing ? 'high' : 'low');
            const config = urgencyConfig[urgency];
            const UrgencyIcon = config.icon;

            return (
              <div
                key={missing.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${config.border} ${config.bg}`}
              >
                <div className={`p-2 rounded-md bg-background`}>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {missing.source}
                    </p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {documentTypeLabels[missing.documentType]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {missing.isMissing ? (
                      <span className={config.color}>
                        <UrgencyIcon className="h-3 w-3 inline mr-1" />
                        {missing.daysOverdue} day{missing.daysOverdue === 1 ? '' : 's'} overdue
                      </span>
                    ) : (
                      <span>Expected {formatDate(missing.expectedDate)}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {missing.isMissing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onUpload(missing)}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={dismissing === missing.id}
                    onClick={() => handleDismiss(missing.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {missingDocuments.length > maxDisplay && (
          <Button variant="outline" className="w-full" onClick={onViewAll}>
            View {missingDocuments.length - maxDisplay} More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays <= 7) return `in ${diffDays} days`;

  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}