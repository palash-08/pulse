import React from "react";

interface StatusBadgeProps {
  status: "up" | "down" | "unknown" | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let bgClass = "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-700";
  let dotClass = "bg-slate-400 dark:bg-neutral-400";
  let label = "Unknown";

  if (normalized === "up") {
    bgClass = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80";
    dotClass = "bg-emerald-500";
    label = "Up";
  } else if (normalized === "down") {
    bgClass = "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/80";
    dotClass = "bg-rose-500 animate-pulse";
    label = "Down";
  }

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bgClass} ${paddingClass} transition-colors`}
    >
      <span className={`inline-block rounded-full ${dotClass} ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
      {label}
    </span>
  );
}
