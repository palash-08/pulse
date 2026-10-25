import { NotFound } from "@/components/ui/not-found";

export function NotFoundPage() {
  return (
    <div className="h-screen w-full overflow-hidden flex items-center justify-center bg-[#fafafa] dark:bg-[#111113] transition-colors duration-200">
      <NotFound
        title="This page took a wrong turn."
        description="The requested page doesn't exist or may have moved."
        actionLabel="Go back home"
        onAction={() => (window.location.href = "/")}
      />
    </div>
  );
}

export default NotFoundPage;
