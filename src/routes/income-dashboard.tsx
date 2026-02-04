import { IncomeDashboard } from '@/components/workpapers/IncomeDashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/income-dashboard')({
  component: IncomeDashboardRoute,
});

function IncomeDashboardRoute() {
  return <IncomeDashboard />;
}
