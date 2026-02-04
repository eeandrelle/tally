import { createFileRoute } from '@tanstack/react-router';
import { DonationsWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d8-donations')({
  component: D8DonationsPage,
});

function D8DonationsPage() {
  return (
    <div className="container mx-auto p-6">
      <DonationsWorkpaper />
    </div>
  );
}
