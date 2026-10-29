"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { CommandPalette } from "@/components/command/command-palette";
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
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen">
      {/* Ambient AICTE Headquarters architectural watermark */}
      <div
        className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -right-16 top-0 h-[720px] w-[960px] max-w-none bg-contain bg-right-top bg-no-repeat opacity-[0.038] transition-opacity duration-700 dark:opacity-[0.048]"
          style={{
            backgroundImage: "url('/images/aicte-hq.webp')",
            maskImage: "radial-gradient(ellipse 95% 85% at 85% 15%, black 25%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 95% 85% at 85% 15%, black 25%, transparent 80%)",
          }}
        />
      </div>

      <span key={`route-${pathname}`} className="route-beam" aria-hidden="true" />

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
          <div key={pathname} className="page-enter mx-auto w-full max-w-[1440px]">{children}</div>
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

      <CommandPalette user={user} />
    </div>
  );
}
