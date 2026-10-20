interface StatusBadgeProps {
  status: "up" | "down" | "unknown" | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let bgClass = "bg-zinc-800/60 text-zinc-400 border-zinc-700/50";
  let dotClass = "bg-zinc-500";
  let label = "Unknown";

  if (normalized === "up") {
    bgClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
    dotClass = "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
    label = "Up";
  } else if (normalized === "down") {
    bgClass = "bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
    dotClass = "bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]";
    label = "Down";
  }

  const paddingClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border backdrop-blur-md ${bgClass} ${paddingClass}`}
    >
      <span className={`inline-block rounded-full ${dotClass} ${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
      {label}
    </span>
  );
}
