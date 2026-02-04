import { createFileRoute } from '@tanstack/react-router';
import { D11UPPWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d11-upp')({
  component: D11UPPPage,
});

function D11UPPPage() {
  return (
    <div className="container mx-auto p-6">
      <D11UPPWorkpaper />
    </div>
  );
}
