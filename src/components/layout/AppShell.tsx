import { useState, createContext, useContext, ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaxYearSelector } from '@/components/TaxYearSelector';
import {
  Receipt,
  FileText,
  Building2,
  FolderOpen,
  ClipboardCheck,
  Sparkles,
  FileSpreadsheet,
  Calculator,
  BookOpen,
  BarChart3,
  UserCheck,
  Download,
  Settings,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';

// Context for AppShell state
interface AppShellContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
}

const AppShellContext = createContext<AppShellContextType | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) throw new Error('useAppShell must be used within AppShell');
  return context;
}

// Navigation items configuration
const navSections = [
  {
    title: 'Capture',
    items: [
      { icon: Receipt, label: 'Receipts', href: '/receipts' },
      { icon: FileText, label: 'Invoices', href: '/invoices' },
      { icon: Building2, label: 'Bank Sync', href: '/bank-statements' },
    ],
  },
  {
    title: 'Organize',
    items: [
      { icon: FolderOpen, label: 'Categories', href: '/ato-categories' },
      { icon: ClipboardCheck, label: 'Review', href: '/review-queue' },
      { icon: Sparkles, label: 'Suggestions', href: '/categorization-suggestions' },
    ],
  },
  {
    title: 'Report',
    items: [
      { icon: FileSpreadsheet, label: 'BAS', href: '/gst-summary' },
      { icon: Calculator, label: 'Tax Return', href: '/tax-report' },
      { icon: BookOpen, label: 'Workpapers', href: '/workpapers' },
      { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    ],
  },
  {
    title: 'Export',
    items: [
      { icon: UserCheck, label: 'Accountant Portal', href: '/accountant-portal' },
      { icon: Download, label: 'Download', href: '/exports' },
    ],
  },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  
  // Don't show shell in focus mode
  if (focusMode) {
    return (
      <AppShellContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed, focusMode, setFocusMode }}>
        {children}
      </AppShellContext.Provider>
    );
  }

  return (
    <AppShellContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed, focusMode, setFocusMode }}>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300',
            sidebarCollapsed ? 'w-16' : 'w-64',
            'hidden md:flex'
          )}
        >
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary-foreground" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-semibold text-lg">Tally</span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {/* Dashboard link */}
            <div className="px-3 mb-2">
              <Link
                to="/dashboard"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  router.state.location.pathname === '/dashboard' && 'bg-accent text-accent-foreground'
                )}
              >
                <Home className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>Dashboard</span>}
              </Link>
            </div>

            {/* Nav sections */}
            {navSections.map((section) => (
              <div key={section.title} className="px-3 mb-4">
                {!sidebarCollapsed && (
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = router.state.location.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          isActive && 'bg-accent text-accent-foreground'
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 md:hidden',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="h-14 flex items-center justify-between px-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Tally</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="py-4 overflow-y-auto">
            <div className="px-3 mb-2">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
            </div>
            {navSections.map((section) => (
              <div key={section.title} className="px-3 mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </div>
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div
          className={cn(
            'flex-1 flex flex-col min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
          )}
        >
          {/* Header */}
          <header className="h-14 flex items-center gap-4 px-4 border-b border-border bg-card sticky top-0 z-30">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search receipts, invoices..."
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <TaxYearSelector />
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
