import { createFileRoute } from '@tanstack/react-router';
import { D5ExpensesWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d5-expenses')({
  component: D5ExpensesPage,
});

function D5ExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <D5ExpensesWorkpaper taxYear="2024-25" />
    </div>
  );
}
