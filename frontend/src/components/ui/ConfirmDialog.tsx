interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-neutral-200 space-y-4">
        <div>
          <h3 className="text-xl font-serif font-bold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-medium rounded-full text-white transition-all shadow-xs active:scale-[0.99] ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-neutral-900 hover:bg-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
