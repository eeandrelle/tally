import { createFileRoute } from '@tanstack/react-router';
import LowValuePoolWorkpaper from '@/components/workpapers/LowValuePoolWorkpaper';

export const Route = createFileRoute('/low-value-pool')({
  component: LowValuePoolPage,
});

function LowValuePoolPage() {
  return (
    <div className="container mx-auto p-6">
      <LowValuePoolWorkpaper />
    </div>
  );
}
