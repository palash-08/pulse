import React from "react";
import { Link } from "react-router-dom";
import { NavBar } from "./NavBar.js";
import { useAuth } from "../../auth/AuthContext.js";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-neutral-950 flex flex-col font-sans text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <NavBar />

      {/* Guest Mode Banner */}
      {user?.isGuest && (
        <div className="pt-20 sm:pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-neutral-900 dark:bg-neutral-900/90 text-white px-4 py-2.5 rounded-xl text-xs font-normal flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-neutral-800 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider">
                Guest Mode
              </span>
              <span className="text-neutral-300 text-xs">Monitors limited to 2 sites.</span>
            </div>
            <Link
              to="/register"
              className="font-medium text-white hover:text-neutral-300 underline underline-offset-4 transition-colors"
            >
              Register to keep history & unlock unlimited monitors →
            </Link>
          </div>
        </div>
      )}

      {/* Main Content with top padding if not guest (guest banner already adds pt-20) */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 ${
          user?.isGuest ? "py-6 sm:py-8" : "pt-20 sm:pt-24 pb-8"
        }`}
      >
        {children}
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800/80 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-900/60 transition-colors">
        <span className="font-serif font-bold text-neutral-700 dark:text-neutral-300">pulse</span> &bull; The heartbeat of your infrastructure &bull; DBMS Group Mini Project
      </footer>
    </div>
  );
}
