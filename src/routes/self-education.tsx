import { createFileRoute } from '@tanstack/react-router';
import SelfEducationWorkpaper from '@/components/workpapers/SelfEducationWorkpaper';

export const Route = createFileRoute('/self-education')({
  component: SelfEducationPage,
});

function SelfEducationPage() {
  return (
    <div className="container mx-auto p-6">
      <SelfEducationWorkpaper />
    </div>
  );
}
