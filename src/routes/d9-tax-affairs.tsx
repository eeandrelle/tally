import { createFileRoute } from '@tanstack/react-router';
import { TaxAffairsWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d9-tax-affairs')({
  component: D9TaxAffairsPage,
});

function D9TaxAffairsPage() {
  return (
    <div className="container mx-auto p-6">
      <TaxAffairsWorkpaper />
    </div>
  );
}
