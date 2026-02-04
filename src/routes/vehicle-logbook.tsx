import { VehicleLogbookWorkpaper } from '@/components/workpapers/VehicleLogbookWorkpaper';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/vehicle-logbook')({
  component: VehicleLogbookRoute,
});

function VehicleLogbookRoute() {
  return <VehicleLogbookWorkpaper />;
}
