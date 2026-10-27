"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { SessionUser } from "@/lib/rbac";

interface AppShellProps {
  user: SessionUser;
  openOverlapCount: number;
  notifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: Date | string;
  }[];
  children: React.ReactNode;
}

export function AppShell({ user, openOverlapCount, notifications, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar
        user={user}
        openOverlapCount={openOverlapCount}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[272px]">
        <Navbar
          user={user}
          notifications={notifications}
          openOverlapCount={openOverlapCount}
          onMenu={() => setMobileOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="page-enter mx-auto w-full max-w-[1440px]">{children}</div>
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-[10px] font-medium text-slate-400 sm:flex-row">
            <p>© 2026 All India Council for Technical Education · Integrated Grievance Intelligence</p>
            <p className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems operational · Data refreshed every 30 seconds
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
