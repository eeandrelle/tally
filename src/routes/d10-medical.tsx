import { createFileRoute } from '@tanstack/react-router';
import { MedicalExpensesWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d10-medical')({
  component: D10MedicalPage,
});

function D10MedicalPage() {
  return (
    <div className="container mx-auto p-6">
      <MedicalExpensesWorkpaper />
    </div>
  );
}
