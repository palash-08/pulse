import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";

export interface NavLinkItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface FloatingHeaderProps {
  brand?: React.ReactNode;
  links?: NavLinkItem[];
  actions?: React.ReactNode;
  scrollThreshold?: number;
  className?: string;
}

const DEFAULT_LINKS: NavLinkItem[] = [
  { label: "Dashboard", href: "#", active: true },
  { label: "Monitors", href: "#" },
  { label: "Incidents", href: "#" },
  { label: "Reports", href: "#" },
];

/**
 * FloatingHeader - 3-Pill Island Layout styled after easyui.site
 *
 * Rather than bunching elements into a single centered box upon scrolling,
 * the 3 sections remain at their respective anchor locations (Left, Center, Right)
 * and morph into discrete, frosted glass floating pills with spring physics.
 */
export function FloatingHeader({
  brand = "pulse",
  links = DEFAULT_LINKS,
  actions,
  scrollThreshold = 30,
  className = "",
}: FloatingHeaderProps) {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Toggle isScrolled state past scrollThreshold (20-40px)
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > scrollThreshold && !isScrolled) {
      setIsScrolled(true);
    } else if (latest <= scrollThreshold && isScrolled) {
      setIsScrolled(false);
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsScrolled(window.scrollY > scrollThreshold);
    }
  }, [scrollThreshold]);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 pointer-events-none ${className}`}>
      <motion.div
        initial={false}
        animate={{
          y: isScrolled ? 12 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
      >
        <div className="flex items-center justify-between h-16">
          {/* 1. Left Pill: Brand Name (At its left location) */}
          <div
            className={`pointer-events-auto flex items-center h-10 transition-all duration-300 ${
              isScrolled
                ? "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-4"
                : "bg-transparent border border-transparent px-1"
            }`}
          >
            {typeof brand === "string" ? (
              <a href="#" className="select-none inline-flex items-center">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white transition-colors">
                  {brand}
                </span>
              </a>
            ) : (
              brand
            )}
          </div>

          {/* 2. Center Pill: Nav links (At its center location) */}
          <nav
            className={`hidden md:flex items-center h-10 transition-all duration-300 pointer-events-auto ${
              isScrolled
                ? "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-2"
                : "bg-transparent border border-transparent px-0"
            }`}
          >
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`relative px-3.5 py-1 text-[14px] font-medium transition-colors duration-200 rounded-full select-none ${
                  link.active
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <span className="relative z-10">{link.label}</span>
                {link.active && (
                  <motion.div
                    layoutId="standalone-active-pill"
                    className="absolute inset-0 bg-neutral-200/80 dark:bg-neutral-800 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </nav>

          {/* 3. Right Pill: Actions & Theme Toggle (At its right location) */}
          <div
            className={`pointer-events-auto flex items-center h-10 gap-1.5 sm:gap-2 transition-all duration-300 ${
              isScrolled
                ? "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-2.5 sm:px-3"
                : "bg-transparent border border-transparent px-1"
            }`}
          >
            {actions ?? (
              <>
                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  aria-label="Toggle theme"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  className="px-3 py-1 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full hover:opacity-90 transition-opacity"
                >
                  Sign In
                </button>
              </>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-2 pointer-events-auto w-full rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/30 p-3 md:hidden flex flex-col gap-1"
            >
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3.5 py-2 text-[14px] font-medium rounded-xl transition-colors ${
                    link.active
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
