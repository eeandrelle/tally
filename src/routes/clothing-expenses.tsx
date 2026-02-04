import { createFileRoute } from '@tanstack/react-router';
import { ClothingExpensesWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/clothing-expenses')({
  component: ClothingExpensesPage,
});

function ClothingExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <ClothingExpensesWorkpaper taxYear="2024-25" />
    </div>
  );
}
