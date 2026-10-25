import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/useTheme.js";

export interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
  variant?: "default" | "ghost";
}

export function ThemeToggle({
  className = "",
  size = "sm",
  variant = "ghost",
}: ThemeToggleProps) {
  const { isDark, toggleTheme, isAnimating } = useTheme();

  const buttonSizeClasses = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const iconSizeClasses = size === "sm" ? "w-4 h-4" : "w-4.5 h-4.5";

  const ariaLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  const variantClasses =
    variant === "ghost"
      ? isDark
        ? "bg-neutral-800/60 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-700/60 shadow-xs"
        : "bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 hover:text-neutral-900 border border-neutral-200/80 shadow-xs"
      : isDark
      ? "bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-400 shadow-xs"
      : "bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 shadow-xs";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={isAnimating}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 ${buttonSizeClasses} ${variantClasses} ${
        isAnimating ? "cursor-not-allowed opacity-80" : "active:scale-95"
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? "sun-in-dark" : "moon-in-light"}
          initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className={`${iconSizeClasses} text-amber-400 hover:text-amber-300 transition-colors`} />
          ) : (
            <Moon className={`${iconSizeClasses} text-neutral-700 hover:text-neutral-900 transition-colors`} />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
