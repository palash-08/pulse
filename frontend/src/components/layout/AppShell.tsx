import React from "react";
import { NavBar } from "./NavBar.js";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        Pulse &bull; The heartbeat of your infrastructure &bull; DBMS Group Mini Project
      </footer>
    </div>
  );
}
