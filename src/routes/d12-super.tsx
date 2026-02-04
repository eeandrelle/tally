import { createFileRoute } from '@tanstack/react-router';
import { SuperContributionsWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d12-super')({
  component: D12SuperPage,
});

function D12SuperPage() {
  return (
    <div className="container mx-auto p-6">
      <SuperContributionsWorkpaper />
    </div>
  );
}
