import { createFileRoute } from '@tanstack/react-router';
import { InterestDividendWorkpaper } from '@/components/workpapers';

export const Route = createFileRoute('/d7-interest-dividends')({
  component: D7InterestDividendsPage,
});

function D7InterestDividendsPage() {
  return (
    <div className="container mx-auto p-6">
      <InterestDividendWorkpaper />
    </div>
  );
}
