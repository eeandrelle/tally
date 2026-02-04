import { createFileRoute } from '@tanstack/react-router';
import { ReminderDashboard } from '@/components/reminders';
import { ReminderEngineInput } from '@/lib/proactive-reminders';

export const Route = createFileRoute('/reminders')({
  component: RemindersPage,
});

function RemindersPage() {
  // Sample engine input - in production this would come from your data sources
  const engineInput: ReminderEngineInput = {
    uploadHistory: [
      { date: '2026-01-15', type: 'bank_statement' },
      { date: '2026-01-20', type: 'receipt' },
      { date: '2026-01-25', type: 'dividend_statement' },
    ],
    holdings: [
      {
        companyName: 'Commonwealth Bank',
        asxCode: 'CBA',
        paymentHistory: [
          { date: '2025-08-15', amount: 450.50 },
          { date: '2025-11-15', amount: 460.25 },
          { date: '2026-02-15', amount: 455.00 },
        ],
      },
    ],
    opportunities: [
      {
        type: 'Work From Home Deductions',
        estimatedSavings: 320,
        categoryCode: 'WFH',
        actionItems: ['Complete WFH workpaper', 'Upload 4-week diary'],
        discoveredAt: '2026-02-01',
      },
    ],
    deadlines: [
      {
        type: 'tax_return',
        date: '2026-10-31',
        description: 'Tax return lodgment deadline for self-preparers',
      },
    ],
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <ReminderDashboard engineInput={engineInput} />
    </div>
  );
}
