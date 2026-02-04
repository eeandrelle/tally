import { createFileRoute } from '@tanstack/react-router';
import { D13ProjectPoolWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d13-project-pool')({
  component: D13ProjectPoolPage,
});

function D13ProjectPoolPage() {
  return (
    <div className="container mx-auto p-6">
      <D13ProjectPoolWorkpaper />
    </div>
  );
}
