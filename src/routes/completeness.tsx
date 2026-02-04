import { createFileRoute } from '@tanstack/react-router';
import { CompletenessDashboard } from '@/components/completeness/CompletenessDashboard';

export const Route = createFileRoute('/completeness')({
  component: CompletenessPage,
});

function CompletenessPage() {
  return <CompletenessDashboard />;
}

export default CompletenessPage;