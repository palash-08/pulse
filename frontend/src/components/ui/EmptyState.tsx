import React from "react";
import { GlassCard } from "./GlassCard.js";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <GlassCard tone="dark" className="flex flex-col items-center justify-center p-8 text-center rounded-3xl">
      {icon && <div className="text-zinc-500 mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-400 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </GlassCard>
  );
}
