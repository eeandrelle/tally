import { createFileRoute } from '@tanstack/react-router';
import { WfhExpensesWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/wfh-expenses')({
  component: WfhExpensesPage,
});

function WfhExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <WfhExpensesWorkpaper taxYear="2024-25" />
    </div>
  );
}
