import { createFileRoute } from '@tanstack/react-router';
import { CarExpensesWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/car-expenses')({
  component: CarExpensesPage,
});

function CarExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <CarExpensesWorkpaper taxYear="2024-25" />
    </div>
  );
}
