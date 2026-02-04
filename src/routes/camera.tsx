import { createFileRoute } from "@tanstack/react-router";
import { CameraCapture } from "@/components/CameraCapture";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/camera")({
  component: CameraPage,
});

function CameraPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    toast.success("Receipt captured successfully!");
    navigate({ to: "/receipts" });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <CameraCapture
          onComplete={handleComplete}
          autoCapture={true}
          showReview={true}
          multiple={false}
        />
      </main>
    </div>
  );
}
