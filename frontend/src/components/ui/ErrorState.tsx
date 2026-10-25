import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl my-4 transition-colors">
      <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
      <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">Something went wrong</h3>
      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-white dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/60 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
