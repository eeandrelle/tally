import { createFileRoute } from '@tanstack/react-router';
import { TravelExpensesWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/travel-expenses')({
  component: TravelExpensesPage,
});

function TravelExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <TravelExpensesWorkpaper taxYear="2024-25" />
    </div>
  );
}
