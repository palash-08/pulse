import React, { useEffect } from "react";
import { Toaster } from "glaceui";
import { NavBar } from "./NavBar.js";

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId: number | null = null;
    const handlePointerMove = (e: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
        document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b10] text-[#f4f4f5] flex flex-col font-sans relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Background depth layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Soft top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.045),transparent_70%)]" />

        {/* Live Cursor Ambient Spotlight behind glass */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(750px circle at var(--mouse-x, 50vw) var(--mouse-y, 30vh), rgba(255, 255, 255, 0.03), transparent 70%)",
          }}
        />

        {/* Subtle micro-dots for depth and refraction */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      </div>

      {/* Navigation Island */}
      <NavBar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-400 glace-nav-bar border-t border-white/[0.08] relative z-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-zinc-200">pulse</span>
            <span>&bull;</span>
            <span className="text-zinc-400">Autonomous uptime & incident intelligence</span>
          </div>
          <span className="text-zinc-500 font-mono text-[11px]">Powered by Glacé UI &bull; WyberAi Glass Style</span>
        </div>
      </footer>

      {/* Glacé Frosted Glass Toast Stack */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}
