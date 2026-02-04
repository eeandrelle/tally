import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Grid3X3, 
  List, 
  Filter,
  X,
  Clock,
  CheckCircle2,
  Circle,
  LayoutGrid,
  BookOpen
} from 'lucide-react';
import { WorkpaperCard, WorkpaperListItem } from './WorkpaperCard';
import { CategorySummary } from './CategorySummary';
import { ProgressTracker } from './ProgressTracker';
import { useWorkpaperLibrary, WORKPAPER_GROUPS } from '@/hooks/useWorkpaperLibrary';
import type { AtoCategoryCode } from '@/lib/ato-categories';
import { getCategoryByCode } from '@/lib/ato-categories';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'complete' | 'in-progress' | 'not-started';
type FilterGroup = 'all' | 'work-related' | 'investment' | 'tax-offsets';

export interface WorkpaperLibraryProps {
  taxYear?: string;
}

export function WorkpaperLibrary({ taxYear }: WorkpaperLibraryProps) {
  const {
    allWorkpapers,
    stats,
    getRecentlyAccessed,
    markAccessed,
  } = useWorkpaperLibrary({ taxYear });

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Get recently accessed
  const recentlyAccessed = useMemo(() => {
    const recent = getRecentlyAccessed(5);
    return recent.map(wp => ({
      workpaper: wp,
      category: getCategoryByCode(wp.categoryCode)!,
    })).filter(item => item.category);
  }, [getRecentlyAccessed]);

  // Filter workpapers
  const filteredWorkpapers = useMemo(() => {
    let result = allWorkpapers;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(({ category }) =>
        category.name.toLowerCase().includes(query) ||
        category.code.toLowerCase().includes(query) ||
        category.shortDescription.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(({ workpaper }) => workpaper.status === filterStatus);
    }

    // Apply group filter
    if (filterGroup !== 'all') {
      const groupCodes = WORKPAPER_GROUPS[filterGroup];
      result = result.filter(({ category }) => groupCodes.includes(category.code));
    }

    return result;
  }, [allWorkpapers, searchQuery, filterStatus, filterGroup]);

  // Handle workpaper click
  const handleWorkpaperClick = (categoryCode: AtoCategoryCode) => {
    markAccessed(categoryCode);
  };

  // Get route path for workpaper
  const getWorkpaperRoute = (code: AtoCategoryCode): string => {
    const routeMap: Record<string, string> = {
      D1: '/car-expenses',
      D2: '/travel-expenses',
      D3: '/clothing-expenses',
      D4: '/self-education',
      D5: '/d5-expenses',
      D6: '/low-value-pool',
      D7: '/d7-interest-dividends',
      D8: '/d8-donations',
      D9: '/d9-tax-affairs',
      D10: '/d10-medical',
      D11: '/d11-upp',
      D12: '/d12-super',
      D13: '/d13-project-pool',
      D14: '/d14-forestry',
      D15: '/d15-other',
    };
    return routeMap[code] || `/workpapers/${code.toLowerCase()}`;
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterGroup('all');
  };

  const hasFilters = searchQuery || filterStatus !== 'all' || filterGroup !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deductions Workpapers</h1>
          <p className="text-muted-foreground">
            Complete all D1-D15 workpapers for your tax return
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            FY {taxYear || new Date().getFullYear()}
          </Badge>
          <Badge variant={stats.complete === stats.total ? "default" : "secondary"} className={stats.complete === stats.total ? "bg-green-500" : ""}>
            {stats.complete}/{stats.total} Complete
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            All Workpapers
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2" disabled={recentlyAccessed.length === 0}>
            <Clock className="h-4 w-4" />
            Recent
          </TabsTrigger>
        </TabsList>

        {/* All Workpapers Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workpapers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="complete">Complete</option>
                    <option value="in-progress">In Progress</option>
                    <option value="not-started">Not Started</option>
                  </select>
                  
                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value as FilterGroup)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Groups</option>
                    <option value="work-related">Work-Related (D1-D6)</option>
                    <option value="investment">Investment (D7-D8)</option>
                    <option value="tax-offsets">Tax Offsets (D9-D15)</option>
                  </select>

                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-10 w-10 rounded-none rounded-l-md"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-10 w-10 rounded-none rounded-r-md"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {hasFilters && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filters:</span>
                  {filterStatus !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {filterStatus.replace('-', ' ')}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
                    </Badge>
                  )}
                  {filterGroup !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Group: {filterGroup.replace('-', ' ')}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterGroup('all')} />
                    </Badge>
                  )}
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredWorkpapers.length} of {allWorkpapers.length} workpapers
            </p>
          </div>

          {/* Workpapers Grid/List */}
          {filteredWorkpapers.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No workpapers found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredWorkpapers.map(({ category, workpaper }) => (
                <Link 
                  key={category.code} 
                  to={getWorkpaperRoute(category.code)}
                  onClick={() => handleWorkpaperClick(category.code)}
                >
                  <WorkpaperCard
                    category={category}
                    workpaper={workpaper}
                    onClick={() => handleWorkpaperClick(category.code)}
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkpapers.map(({ category, workpaper }) => (
                <Link 
                  key={category.code} 
                  to={getWorkpaperRoute(category.code)}
                  onClick={() => handleWorkpaperClick(category.code)}
                >
                  <WorkpaperListItem
                    category={category}
                    workpaper={workpaper}
                    onClick={() => handleWorkpaperClick(category.code)}
                  />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <CategorySummary
            workpapers={allWorkpapers}
            totalClaimed={stats.totalClaimed}
            totalEstimatedSavings={stats.totalEstimatedSavings}
            onViewAllClick={() => setActiveTab('all')}
          />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <ProgressTracker
            workpapers={allWorkpapers}
            totalClaimed={stats.totalClaimed}
            totalEstimatedSavings={stats.totalEstimatedSavings}
            onContinueClick={(code) => {
              handleWorkpaperClick(code as AtoCategoryCode);
              // Navigate to the workpaper
              window.location.href = getWorkpaperRoute(code as AtoCategoryCode);
            }}
          />
        </TabsContent>

        {/* Recent Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recently Accessed
              </CardTitle>
              <CardDescription>
                Workpapers you've recently viewed or edited
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentlyAccessed.length === 0 ? (
                <div className="text-center py-8">
                  <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recently accessed workpapers</p>
                  <p className="text-sm text-muted-foreground">
                    Start working on a workpaper to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentlyAccessed.map(({ category, workpaper }) => (
                    <Link 
                      key={category.code} 
                      to={getWorkpaperRoute(category.code)}
                      onClick={() => handleWorkpaperClick(category.code)}
                    >
                      <WorkpaperListItem
                        category={category}
                        workpaper={workpaper}
                        onClick={() => handleWorkpaperClick(category.code)}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
