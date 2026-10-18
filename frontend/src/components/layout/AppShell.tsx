import React from "react";
import { NavBar } from "./NavBar.js";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col font-sans">
      <NavBar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400 bg-white">
        <span className="font-serif font-bold text-neutral-700">pulse</span> &bull; The heartbeat of your infrastructure &bull; DBMS Group Mini Project
      </footer>
    </div>
  );
}

