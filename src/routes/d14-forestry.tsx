import { createFileRoute } from '@tanstack/react-router';
import { D14ForestryWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d14-forestry')({
  component: D14ForestryPage,
});

function D14ForestryPage() {
  return (
    <div className="container mx-auto p-6">
      <D14ForestryWorkpaper />
    </div>
  );
}
