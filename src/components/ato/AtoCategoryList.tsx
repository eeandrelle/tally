/**
 * ATO Category List Component
 * 
 * Displays a list/grid of ATO deduction categories.
 */

import { useState } from "react";
import { AtoCategory, AtoCategoryCode } from "@/lib/ato-categories";
import { AtoCategoryCard } from "./AtoCategoryCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AtoCategoryListProps {
  categories: (AtoCategory & { isEnabled?: boolean; claimAmount?: number })[];
  onToggle?: (code: AtoCategoryCode, enabled: boolean) => void;
  onSelect?: (category: AtoCategory) => void;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  viewMode?: "grid" | "list";
}

export function AtoCategoryList({
  categories,
  onToggle,
  onSelect,
  className,
  showFilters = true,
  showSearch = true,
  viewMode: initialViewMode = "grid"
}: AtoCategoryListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(initialViewMode);
  const [activeTab, setActiveTab] = useState("all");

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = !searchQuery || 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "enabled" ? cat.isEnabled :
      activeTab === "disabled" ? !cat.isEnabled :
      activeTab === "high" ? cat.priority === "high" :
      activeTab === "medium" ? cat.priority === "medium" :
      activeTab === "low" ? cat.priority === "low" :
      true;

    return matchesSearch && matchesTab;
  });

  const stats = {
    total: categories.length,
    enabled: categories.filter(c => c.isEnabled).length,
    high: categories.filter(c => c.priority === "high").length,
    withClaims: categories.filter(c => (c.claimAmount || 0) > 0).length
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {showSearch && (
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn(viewMode === "grid" && "bg-muted")}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(viewMode === "list" && "bg-muted")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {showFilters && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="enabled">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Enabled
              <Badge variant="secondary" className="ml-2">{stats.enabled}</Badge>
            </TabsTrigger>
            <TabsTrigger value="high">
              High Priority
              <Badge variant="secondary" className="ml-2">{stats.high}</Badge>
            </TabsTrigger>
            <TabsTrigger value="withClaims">
              With Claims
              <Badge variant="secondary" className="ml-2">{stats.withClaims}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCategories.length} of {categories.length} categories
      </div>

      {/* Grid/List */}
      <div className={cn(
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
      )}>
        {filteredCategories.map((category) => (
          <AtoCategoryCard
            key={category.code}
            category={category}
            isEnabled={category.isEnabled}
            claimAmount={category.claimAmount}
            onToggle={onToggle}
            onClick={onSelect}
            compact={viewMode === "list"}
          />
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No categories found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

export default AtoCategoryList;
