import { createFileRoute } from '@tanstack/react-router';
import { WorkpaperLibrary } from '@/components/workpapers';

export const Route = createFileRoute('/workpapers')({
  component: WorkpapersPage,
});

function WorkpapersPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left h-5 w-5"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              </a>
              <div>
                <h1 className="text-xl font-bold">Workpaper Library</h1>
                <p className="text-sm text-muted-foreground">
                  D1-D15 Deduction Workpapers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="/dashboard">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  Back to Dashboard
                </button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkpaperLibrary taxYear="2024-25" />
      </main>
    </div>
  );
}
