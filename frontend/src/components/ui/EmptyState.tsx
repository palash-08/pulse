import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 transition-colors">
      {icon && <div className="text-slate-400 dark:text-neutral-500 mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800 dark:text-neutral-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
