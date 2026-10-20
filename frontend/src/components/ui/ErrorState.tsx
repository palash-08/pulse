import { AlertTriangle } from "lucide-react";
import { GlassButton } from "glaceui";
import { GlassCard } from "./GlassCard.js";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <GlassCard tone="dark" className="flex flex-col items-center justify-center p-6 text-center border-rose-500/20 rounded-2xl my-4">
      <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
      <h3 className="text-sm font-semibold text-rose-300">Something went wrong</h3>
      <p className="text-xs text-zinc-400 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <div className="mt-3">
          <GlassButton size="sm" tone="dark" onClick={onRetry}>
            Try Again
          </GlassButton>
        </div>
      )}
    </GlassCard>
  );
}
