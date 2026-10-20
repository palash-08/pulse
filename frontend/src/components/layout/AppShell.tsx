import React from "react";
import { Toaster } from "glaceui";
import { NavBar } from "./NavBar.js";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f5] flex flex-col font-sans relative overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Deep dark canvas texture with subtle micro-dots for depth and refraction */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      </div>

      {/* Navigation Island */}
      <NavBar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-500 glace-nav-bar border-t border-white/[0.06] relative z-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-zinc-300">pulse</span>
            <span>&bull;</span>
            <span className="text-zinc-500">Autonomous uptime & incident intelligence</span>
          </div>
          <span className="text-zinc-600 font-mono text-[11px]">Powered by Glacé UI &bull; DBMS Mini Project</span>
        </div>
      </footer>

      {/* Glacé Frosted Glass Toast Stack */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}
