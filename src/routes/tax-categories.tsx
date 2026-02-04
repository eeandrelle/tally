import { createFileRoute } from "@tanstack/react-router";
import { TaxCategoriesManager } from "@/components/TaxCategoriesManager";

export const Route = createFileRoute("/tax-categories")({
  component: TaxCategoriesPage,
});

function TaxCategoriesPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <TaxCategoriesManager />
      </div>
    </div>
  );
}
