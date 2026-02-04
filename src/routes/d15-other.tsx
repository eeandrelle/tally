import { createFileRoute } from '@tanstack/react-router';
import { D15OtherDeductionsWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d15-other')({
  component: D15OtherPage,
});

function D15OtherPage() {
  return (
    <div className="container mx-auto p-6">
      <D15OtherDeductionsWorkpaper />
    </div>
  );
}
