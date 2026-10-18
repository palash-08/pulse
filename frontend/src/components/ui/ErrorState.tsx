import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-rose-50 border border-rose-200 rounded-xl my-4">
      <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
      <h3 className="text-sm font-semibold text-rose-800">Something went wrong</h3>
      <p className="text-xs text-rose-600 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
