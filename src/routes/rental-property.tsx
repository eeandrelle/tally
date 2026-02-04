import { createFileRoute } from "@tanstack/react-router";
import { RentalPropertyWorkpaper } from "@/components/workpapers/RentalPropertyWorkpaper";

export const Route = createFileRoute("/rental-property")({
  component: RentalPropertyRoute,
});

function RentalPropertyRoute() {
  return <RentalPropertyWorkpaper />;
}
