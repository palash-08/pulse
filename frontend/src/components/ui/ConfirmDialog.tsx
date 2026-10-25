import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  isDestructive = false,
  disabled = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-4 transition-colors">
        <div>
          <h3 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">{title}</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed">{message}</p>
        </div>
        {children}
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-all shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
