import { createFileRoute } from "@tanstack/react-router";
import { AppSettings } from "@/components/AppSettings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <AppSettings />
      </div>
    </div>
  );
}
