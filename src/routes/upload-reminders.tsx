import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { 
  Bell, 
  Settings, 
  BarChart3, 
  RefreshCw,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  MissingDocumentsCard,
  ReminderSettingsPanel,
  PatternAnalysisView 
} from '@/components/upload-reminders';
import { useMissingUploadReminders } from '@/hooks/useUploadReminders';
import { processDueReminders } from '@/lib/reminder-generator';

export const Route = createFileRoute('/upload-reminders')({
  component: UploadRemindersPage,
});

function UploadRemindersPage() {
  const {
    patterns,
    patternsLoading,
    missing,
    missingLoading,
    reminders,
    remindersLoading,
    settings,
    settingsLoading,
    refresh,
    runAnalysis,
    generateReminders,
    dismissMissing,
    updateSettings,
    stats,
  } = useMissingUploadReminders();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessReminders = async () => {
    setIsProcessing(true);
    await processDueReminders(reminders, { channels: ['app'] });
    setIsProcessing(false);
  };

  const hasHighUrgency = stats.criticalCount > 0 || stats.highCount > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Missing Upload Reminders
          </h1>
          <p className="text-muted-foreground mt-1">
            Smart notifications for expected documents based on your upload history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={patternsLoading || missingLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${patternsLoading || missingLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert for high urgency items */}
      {hasHighUrgency && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            You have {stats.criticalCount + stats.highCount} document{stats.criticalCount + stats.highCount === 1 ? '' : 's'} that {stats.criticalCount + stats.highCount === 1 ? 'is' : 'are'} significantly overdue. 
            Please upload or dismiss these items.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Patterns"
          value={stats.totalPatterns}
          description="Detected upload patterns"
          loading={patternsLoading}
        />
        <StatCard
          title="Missing Documents"
          value={stats.totalMissing}
          description="Awaiting upload"
          loading={missingLoading}
          highlight={stats.totalMissing > 0}
        />
        <StatCard
          title="Critical"
          value={stats.criticalCount}
          description="Over 14 days overdue"
          loading={remindersLoading}
          variant="destructive"
        />
        <StatCard
          title="Pending Reminders"
          value={reminders.length}
          description="Scheduled notifications"
          loading={remindersLoading}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="missing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="missing" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Missing Documents
            {stats.totalMissing > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {stats.totalMissing}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Pattern Analysis
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="space-y-4">
          <MissingDocumentsCard
            missingDocuments={missing}
            reminders={reminders}
            onUpload={(missingDoc) => {
              // Navigate to upload page with context
              console.log('Upload requested for:', missingDoc);
            }}
            onDismiss={dismissMissing}
            onViewAll={() => {
              // Could open a dialog or navigate to detailed view
              console.log('View all clicked');
            }}
          />

          {reminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Process Reminders</CardTitle>
                <CardDescription>
                  Send pending reminders through your preferred channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleProcessReminders}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Send Due Reminders ({reminders.length})
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <PatternAnalysisView
            patterns={patterns}
            isLoading={patternsLoading}
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ReminderSettingsPanel
            settings={settings}
            onUpdate={updateSettings}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateReminders} disabled={remindersLoading}>
            <Bell className="h-4 w-4 mr-2" />
            Generate Reminders
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // Run analysis on existing uploads
              console.log('Run analysis clicked');
            }}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Re-run Analysis
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/upload'}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  description, 
  loading,
  highlight,
  variant
}: { 
  title: string;
  value: number;
  description: string;
  loading?: boolean;
  highlight?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card className={variant === 'destructive' && value > 0 ? 'border-red-500' : highlight ? 'border-primary' : undefined}>
      <CardContent className="p-6">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded mt-2" />
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${variant === 'destructive' && value > 0 ? 'text-red-500' : ''}`}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}