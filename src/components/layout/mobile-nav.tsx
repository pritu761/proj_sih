"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderSearch,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  openOverlapCount: number;
  onMore: () => void;
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group relative flex h-full flex-col items-center justify-center gap-0.5"
    >
      {active && (
        <span className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-brand-500" />
      )}
      <span
        className={cn(
          "relative flex h-8 w-10 items-center justify-center rounded-xl transition-all duration-200",
          active
            ? "bg-brand-50 text-brand-600 dark:bg-white/[0.06] dark:text-brand-300"
            : "text-slate-500 group-hover:bg-slate-50 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:bg-white/[0.04] dark:group-hover:text-slate-300"
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.3 : 2} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-0.5 text-[8px] font-extrabold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[9px] font-bold tracking-tight transition-colors",
          active ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-500"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileNav({ openOverlapCount, onMore }: MobileNavProps) {
  const pathname = usePathname();
  const dashboardActive = pathname === "/";
  const casesActive = pathname.startsWith("/cases") && pathname !== "/cases/new";
  const alertsActive = pathname.startsWith("/alerts");
  const registerActive = pathname === "/cases/new";

  return (
    <nav
      aria-label="Mobile navigation"
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 shadow-[0_-10px_40px_-20px_rgba(6,10,20,0.35)] backdrop-blur-2xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-[64px] max-w-lg grid-cols-5 items-stretch px-1.5">
        <Tab href="/" label="Home" icon={LayoutDashboard} active={dashboardActive} />
        <Tab href="/cases" label="Cases" icon={FolderSearch} active={casesActive} />
        <Link
          href="/cases/new"
          aria-current={registerActive ? "page" : undefined}
          className="group relative flex flex-col items-center justify-center gap-0.5"
        >
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_12px_26px_-8px_rgba(37,89,232,0.75)] ring-4 ring-[color:var(--surface-bg)] transition-all duration-200 group-active:scale-95",
              registerActive && "from-saffron-500 to-saffron-600 shadow-[0_12px_26px_-8px_rgba(245,158,11,0.7)]"
            )}
          >
            <Plus className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="text-[9px] font-bold tracking-tight text-slate-500">
            Register
          </span>
        </Link>
        <Tab
          href="/alerts"
          label="Alerts"
          icon={ShieldAlert}
          active={alertsActive}
          badge={openOverlapCount}
        />
        <button
          type="button"
          onClick={onMore}
          aria-label="Open full navigation menu"
          className="group flex h-full flex-col items-center justify-center gap-0.5"
        >
          <span className="flex h-8 w-10 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 group-hover:bg-slate-50 group-hover:text-slate-700 dark:group-hover:bg-white/[0.04] dark:group-hover:text-slate-300">
            <Menu className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[9px] font-bold tracking-tight text-slate-500">Menu</span>
        </button>
      </div>
    </nav>
  );
}
