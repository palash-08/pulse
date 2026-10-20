import React from "react";
import { Glass, GlassButton } from "glaceui";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <Glass
        tone="dark"
        radius={24}
        className="max-w-sm w-full p-6 space-y-4 shadow-2xl border border-white/10"
      >
        <div>
          <h3 className="text-xl font-serif font-bold text-zinc-100">{title}</h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{message}</p>
        </div>
        {children}
        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white glace-pill transition-colors"
          >
            Cancel
          </button>
          <GlassButton
            tone="dark"
            size="sm"
            disabled={disabled}
            onClick={onConfirm}
            className={isDestructive ? "!bg-rose-500/25 !text-rose-200 !border-rose-500/40" : ""}
          >
            {confirmLabel}
          </GlassButton>
        </div>
      </Glass>
    </div>
  );
}
