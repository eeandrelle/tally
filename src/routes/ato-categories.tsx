import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  AtoCategory, 
  AtoCategoryCode,
  getAllCategories,
  getCategoryStats 
} from "@/lib/ato-categories";
import { 
  AtoCategoryList, 
  AtoCategoryCard,
  AtoWorkpaper,
  AtoCategoryBadge
} from "@/components/ato";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calculator, 
  FileText, 
  BarChart3, 
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";

export const Route = createFileRoute("/ato-categories")({
  component: AtoCategoriesPage,
});

function AtoCategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<AtoCategory | null>(null);
  const [workpaperOpen, setWorkpaperOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  
  const categories = getAllCategories();
  const stats = getCategoryStats();
  const currentTaxYear = 2025;

  const handleSaveClaim = async (data: {
    amount: number;
    description: string;
    receiptCount: number;
  }) => {
    // In a real app, this would save to the database
    console.log("Saving claim:", {
      category: selectedCategory?.code,
      ...data
    });
    setWorkpaperOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ATO Deduction Categories</h1>
        <p className="text-muted-foreground">
          Complete guide to D1-D15 tax deductions for FY {currentTaxYear}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.mediumPriority}</div>
            <p className="text-sm text-muted-foreground">Medium Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.highUsage}</div>
            <p className="text-sm text-muted-foreground">Commonly Used</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="browse">
            <BookOpen className="w-4 h-4 mr-2" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="workpapers">
            <FileText className="w-4 h-4 mr-2" />
            Workpapers
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <AtoCategoryList
            categories={categories.map(c => ({ ...c, isEnabled: true }))}
            onSelect={(cat) => {
              setSelectedCategory(cat);
              setWorkpaperOpen(true);
            }}
            showFilters
            showSearch
          />
        </TabsContent>

        <TabsContent value="workpapers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Workpaper Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Workpapers help you calculate and document your deductions. 
                Each category has a guided form to ensure you claim correctly.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {categories
                  .filter(c => c.priority === "high")
                  .map(cat => (
                    <Card 
                      key={cat.code} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setWorkpaperOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AtoCategoryBadge code={cat.code} />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <Button size="sm" variant="ghost">
                            Open
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>By Priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">High Priority</span>
                  <Badge variant="secondary">{stats.highPriority}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium">Medium Priority</span>
                  <Badge variant="secondary">{stats.mediumPriority}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Low Priority</span>
                  <Badge variant="secondary">{stats.lowPriority}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Common Claims</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories
                  .sort((a, b) => b.estimatedUsersPercentage - a.estimatedUsersPercentage)
                  .slice(0, 5)
                  .map(cat => (
                    <div key={cat.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AtoCategoryBadge code={cat.code} size="sm" />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {cat.estimatedUsersPercentage}%
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receipt Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-50 rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <div className="font-semibold">
                    {categories.filter(c => c.receiptRequirements.required === "required").length}
                  </div>
                  <p className="text-sm text-muted-foreground">Receipts Required</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Info className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold">
                    {categories.filter(c => c.receiptRequirements.required === "depends").length}
                  </div>
                  <p className="text-sm text-muted-foreground">Depends on Method</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="font-semibold">
                    {categories.filter(c => c.receiptRequirements.required === "not_required").length}
                  </div>
                  <p className="text-sm text-muted-foreground">No Receipts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workpaper Dialog */}
      <Dialog open={workpaperOpen} onOpenChange={setWorkpaperOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ATO Workpaper</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <AtoWorkpaper
              category={selectedCategory}
              taxYear={currentTaxYear}
              onSave={handleSaveClaim}
              onCancel={() => {
                setWorkpaperOpen(false);
                setSelectedCategory(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
