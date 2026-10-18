import React from "react";

interface StatusBadgeProps {
  status: "up" | "down" | "unknown" | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let bgClass = "bg-slate-100 text-slate-700 border-slate-300";
  let dotClass = "bg-slate-400";
  let label = "Unknown";

  if (normalized === "up") {
    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotClass = "bg-emerald-500";
    label = "Up";
  } else if (normalized === "down") {
    bgClass = "bg-rose-50 text-rose-700 border-rose-200";
    dotClass = "bg-rose-500 animate-pulse";
    label = "Down";
  }

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bgClass} ${paddingClass}`}
    >
      <span className={`inline-block rounded-full ${dotClass} ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
      {label}
    </span>
  );
}
