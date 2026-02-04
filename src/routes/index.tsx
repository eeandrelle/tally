import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  // Redirect to dashboard as the main app entry point
  return <Navigate to="/dashboard" />;
}
