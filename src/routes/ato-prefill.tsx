import { createFileRoute } from '@tanstack/react-router';
import { ATOPrefillExportDialog } from '@/components/ATOPrefillExport';

export const Route = createFileRoute('/ato-prefill')({
  component: ATOPrefillPage,
});

function ATOPrefillPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <ATOPrefillExportDialog />
    </div>
  );
}
