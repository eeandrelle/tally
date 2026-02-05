import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FeedbackWidget,
  BetaBadge,
  BetaBanner,
  BetaFeatureFlag,
  BetaTooltip,
  OnboardingFlow,
  RestartOnboardingButton,
  EmptyState,
  EmptyReceipts,
  EmptySearch,
  EmptyDocuments,
  EmptyChart,
  LoadingState,
  SkeletonCard,
  SkeletonStats,
  SkeletonList,
  SkeletonTable,
  SkeletonReceiptCard,
} from '@/components';
import { 
  MessageSquare, 
  Sparkles, 
  Camera, 
  Search, 
  FileText, 
  TrendingUp,
  Inbox,
  Receipt,
  RefreshCcw,
} from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/beta-demo')({
  component: BetaDemoPage,
});

function BetaDemoPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const triggerLoading = () => {
    setLoadingDemo(true);
    setTimeout(() => setLoadingDemo(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold">Tally Beta UI Components</h1>
            <BetaBadge variant="pulse" size="lg" />
          </div>
          <p className="text-muted-foreground text-lg">
            TOS-207: Beta UI Polish and Feedback Widget - Implementation Demo
          </p>
          <div className="flex justify-center gap-4">
            <RestartOnboardingButton />
            <Button onClick={triggerLoading} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Test Loading States
            </Button>
          </div>
        </div>

        <Tabs defaultValue="feedback" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feedback">Feedback Widget</TabsTrigger>
            <TabsTrigger value="beta">Beta Badges</TabsTrigger>
            <TabsTrigger value="empty">Empty States</TabsTrigger>
            <TabsTrigger value="loading">Loading States</TabsTrigger>
          </TabsList>

          {/* Feedback Widget Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feedback Widget</CardTitle>
                <CardDescription>
                  Floating feedback button with screenshot capture, multiple feedback types, and submission tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted rounded-lg p-8 text-center relative min-h-[300px]">
                  <p className="text-muted-foreground mb-4">
                    The feedback widget appears as a floating button in the bottom-right corner.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Look for the purple button with the message icon!
                  </p>
                  
                  {/* Mini preview */}
                  <div className="absolute bottom-4 right-4">
                    <Button size="lg" className="rounded-full h-14 w-14 p-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg">
                      <MessageSquare className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 4 feedback types (Bug, Feature, Praise, Other)</li>
                      <li>• Screenshot capture with canvas API</li>
                      <li>• Image upload support</li>
                      <li>• Local storage for offline use</li>
                      <li>• Success animations</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Technical</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• React with TypeScript</li>
                      <li>• Radix UI Dialog</li>
                      <li>• html2canvas-like capture</li>
                      <li>• Image compression</li>
                      <li>• Accessible keyboard navigation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beta Badges Tab */}
          <TabsContent value="beta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Beta Badge Variants</CardTitle>
                <CardDescription>
                  Multiple styles for indicating beta features throughout the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <BetaBadge variant="default" size="sm" />
                    <span className="text-sm text-muted-foreground">Default SM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BetaBadge variant="default" size="md" />
                    <span className="text-sm text-muted-foreground">Default MD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BetaBadge variant="default" size="lg" />
                    <span className="text-sm text-muted-foreground">Default LG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BetaBadge variant="subtle" size="md" />
                    <span className="text-sm text-muted-foreground">Subtle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BetaBadge variant="pulse" size="md" />
                    <span className="text-sm text-muted-foreground">Pulse</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Beta Banner</h4>
                  <div className="rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 text-white px-4 py-3 text-sm">
                      <div className="flex items-center justify-center gap-3">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span className="font-medium">Tally Beta</span>
                        <span className="text-white/80">You're using an early version. We'd love your feedback!</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-0">
                          Give Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Feature Flag Indicator</h4>
                  <div className="flex items-center gap-4">
                    <BetaFeatureFlag>
                      <Button>New AI Feature</Button>
                    </BetaFeatureFlag>
                    <span className="text-sm text-muted-foreground">Shows pulse indicator on beta features</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Beta Tooltip</h4>
                  <div className="flex items-center gap-4">
                    <BetaTooltip 
                      feature="Smart Categorization" 
                      description="AI-powered receipt categorization that learns from your edits."
                    />
                    <span className="text-sm text-muted-foreground">Hover for info</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Empty States Tab */}
          <TabsContent value="empty" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Empty States</CardTitle>
                <CardDescription>
                  Beautiful, informative empty states with illustrations and actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">EmptyReceipts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EmptyReceipts onAddReceipt={() => {}} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">EmptySearch</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EmptySearch query="coffee receipt" onClear={() => {}} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">EmptyDocuments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EmptyDocuments onUpload={() => {}} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">EmptyChart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EmptyChart />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Generic EmptyState with Illustrations</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <EmptyState
                      illustration="inbox"
                      title="No messages"
                      description="Your inbox is empty."
                      size="sm"
                    />
                    <EmptyState
                      illustration="search"
                      title="Nothing found"
                      description="Try different search terms."
                      size="sm"
                    />
                    <EmptyState
                      illustration="chart"
                      title="No data"
                      description="Data will appear here."
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loading States Tab */}
          <TabsContent value="loading" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loading State Components</CardTitle>
                <CardDescription>
                  Consistent loading skeletons and spinners throughout the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingDemo ? (
                  <div className="space-y-6">
                    <SkeletonStats count={4} />
                    <div className="grid grid-cols-2 gap-4">
                      <SkeletonList rows={4} />
                      <div className="space-y-4">
                        <SkeletonCard hasHeader rows={3} />
                        <SkeletonCard hasHeader rows={2} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">LoadingState Default</CardTitle>
                        </CardHeader>
                        <CardContent className="h-32">
                          <LoadingState variant="default" />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">SkeletonCard</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SkeletonCard hasHeader hasFooter rows={2} />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">SkeletonList</h4>
                      <SkeletonList rows={3} />
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">SkeletonStats</h4>
                      <SkeletonStats count={4} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h4 className="font-medium">SkeletonReceiptCard</h4>
                        <SkeletonReceiptCard />
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-medium">SkeletonReceiptGrid</h4>
                        <SkeletonReceiptGrid count={2} />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Implementation Notes */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>TOS-207 Implementation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">Components Created</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>✅ FeedbackWidget - In-app feedback with screenshot capture</li>
                  <li>✅ BetaBadge/BetaBanner - Beta indicators</li>
                  <li>✅ OnboardingFlow - 4-step welcome tour</li>
                  <li>✅ EmptyStates - Enhanced empty state components</li>
                  <li>✅ LoadingStates - Consistent skeleton loaders</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Files Modified</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>✅ src/components/index.ts - Added exports</li>
                  <li>✅ src/routes/__root.tsx - Integrated components</li>
                  <li>✅ src/routes/dashboard.tsx - Updated empty states</li>
                  <li>✅ package.json - Added canvas-confetti</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Widget - renders the actual floating button */}
      <FeedbackWidget />
    </div>
  );
}
