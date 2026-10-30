"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./mobile-nav";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { CommandPalette } from "@/components/command/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { useTheme } from "@/components/theme/theme-provider";
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

const SIDEBAR_KEY = "aicte-sentinel-sidebar";

const quickDestinations: Record<string, string> = {
  d: "/",
  c: "/cases",
  a: "/alerts",
  i: "/institutions",
  r: "/reports",
};

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}

export function AppShell({ user, openOverlapCount, notifications, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_KEY) === "collapsed") {
        setCollapsed(true);
      }
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, []);

  useEffect(() => {
    const openShortcuts = () => setShortcutsOpen(true);
    window.addEventListener("sentinel:shortcuts", openShortcuts);
    return () => window.removeEventListener("sentinel:shortcuts", openShortcuts);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
      } catch {
        /* preference simply won't persist */
      }
      return next;
    });
  }, []);

  // Global, non-destructive shortcuts. They always stand down while the officer
  // is typing or when another dialog owns the screen.
  useEffect(() => {
    const clearPendingG = () => {
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[data-sentinel-dialog="open"], .modal-backdrop')) return;

      if (event.key === "Escape") {
        setMobileOpen(false);
        clearPendingG();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        toggleCollapsed();
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleTheme();
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        window.dispatchEvent(new Event("sentinel:command"));
        return;
      }

      if (pendingG.current !== null) {
        const destination = quickDestinations[event.key.toLowerCase()];
        clearPendingG();
        if (destination) {
          event.preventDefault();
          router.push(destination);
        }
        return;
      }

      if (event.key.toLowerCase() === "g") {
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, 1200);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPendingG();
    };
  }, [router, toggleCollapsed, toggleTheme]);

  return (
    <ToastProvider>
      <div
        className="min-h-screen"
        style={{ "--sidebar-width": collapsed ? "86px" : "272px" } as CSSProperties}
      >
        <span key={`route-${pathname}`} className="route-beam" aria-hidden="true" />

        <Sidebar
          user={user}
          openOverlapCount={openOverlapCount}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onShortcuts={() => setShortcutsOpen(true)}
        />

        <div className="flex min-h-screen flex-col pb-28 transition-[padding] duration-300 ease-out lg:pb-0 lg:pl-[var(--sidebar-width)]">
          <Navbar
            user={user}
            notifications={notifications}
            openOverlapCount={openOverlapCount}
            onMenu={() => setMobileOpen(true)}
            onShortcuts={() => setShortcutsOpen(true)}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <div key={pathname} className="page-enter mx-auto w-full max-w-[1440px]">
              {children}
            </div>
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

        <MobileNav
          openOverlapCount={openOverlapCount}
          onMore={() => setMobileOpen(true)}
        />
        <CommandPalette user={user} />
        <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </ToastProvider>
  );
}
