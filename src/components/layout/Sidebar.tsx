"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  FolderSearch,
  ShieldAlert,
  ChartSpline,
  FilePlus2,
  ScrollText,
  ChevronRight,
  ChevronLeft,
  X,
  LifeBuoy,
  BadgeCheck,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { SessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: SessionUser;
  openOverlapCount: number;
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  onShortcuts?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  badge?: number;
  action?: boolean;
}

export function Sidebar({
  user,
  openOverlapCount,
  mobileOpen = false,
  onClose,
  collapsed = false,
  onToggle,
  onShortcuts,
}: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: "Command",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard, active: pathname === "/" },
        {
          name: "Overlap Alerts",
          href: "/alerts",
          icon: ShieldAlert,
          active: pathname.startsWith("/alerts"),
          badge: openOverlapCount,
        },
      ],
    },
    {
      label: "Registry",
      items: [
        {
          name: "Case Explorer",
          href: "/cases",
          icon: FolderSearch,
          active: pathname.startsWith("/cases") && pathname !== "/cases/new",
        },
        {
          name: "Institutions",
          href: "/institutions",
          icon: Building2,
          active: pathname.startsWith("/institutions"),
        },
        {
          name: "Register Complaint",
          href: "/cases/new",
          icon: FilePlus2,
          active: pathname === "/cases/new",
          action: true,
        },
      ],
    },
    {
      label: "Insight",
      items: [
        {
          name: "Reports & Analytics",
          href: "/reports",
          icon: ChartSpline,
          active: pathname.startsWith("/reports"),
        },
        ...(user.role === "ADMIN" || user.role === "COMPETENT_AUTHORITY"
          ? [
              {
                name: "Audit Trail",
                href: "/audit",
                icon: ScrollText,
                active: pathname.startsWith("/audit"),
              },
            ]
          : []),
      ],
    },
  ];

  const bureauLabel =
    user.bureau === "ALL" ? "AICTE Headquarters" : user.bureau.replaceAll("_", " ");
  const initials =
    user.name
      ?.split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AC";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "dark-surface fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-ink-900 transition-[width,transform] duration-300 ease-out lg:w-[var(--sidebar-width)] lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background:
            "radial-gradient(600px 300px at 0% 0%, rgba(59,118,246,0.16), transparent 60%), radial-gradient(500px 260px at 100% 100%, rgba(245,158,11,0.08), transparent 60%), #080e1c",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
        aria-label="Primary navigation"
      >
        {/* Desktop collapse control, pinned to the edge of the rail */}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-keyshortcuts="["
            title={`${collapsed ? "Expand" : "Collapse"} sidebar  [`}
            className="absolute -right-3 top-6 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#111d33] text-slate-400 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.8)] transition-all hover:border-brand-400/50 hover:text-white lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Brand */}
        <div
          className={cn(
            "flex items-center justify-between px-5 pb-5 pt-5",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="AICTE Sentinel home"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-950" fill="currentColor" aria-hidden>
                <path d="M12 1.8 3.6 5.4v5.5c0 5.2 3.5 9.7 8.4 11.3 4.9-1.6 8.4-6.1 8.4-11.3V5.4L12 1.8Zm0 3.1 5.6 2.4v3.6c0 3.6-2.3 6.8-5.6 8.1-3.3-1.3-5.6-4.5-5.6-8.1V7.3L12 4.9Zm-1 3.7v3.3H8.4l3.6 4.5 3.6-4.5H13V8.6h-2Z" />
              </svg>
            </div>
            <div className={cn(collapsed && "lg:hidden")}>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[15px] font-extrabold tracking-tight text-white">
                  AICTE
                </span>
                <span className="font-display text-[15px] font-extrabold tracking-tight text-saffron-400">
                  Sentinel
                </span>
              </div>
              <p className="mt-0.5 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Complaint Intelligence
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Session identity */}
        <div
          className={cn(
            "mx-4 mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5",
            collapsed &&
              "lg:mx-2 lg:mb-4 lg:rounded-xl lg:border-transparent lg:bg-transparent lg:p-0"
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "lg:justify-center")}>
            <div
              title={collapsed ? `${user.name} · ${user.designation || bureauLabel}` : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-extrabold text-white shadow-inner"
            >
              {initials}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <p className="truncate text-[12px] font-bold text-white">{user.name}</p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                {user.designation || bureauLabel}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5",
              collapsed && "lg:hidden"
            )}
          >
            <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Secure session
            </span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
              {user.role === "COMPETENT_AUTHORITY" ? "Authority" : user.role.split("_")[0]}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "sidebar-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-4",
            collapsed && "lg:px-2"
          )}
        >
          {groups.map((group) => (
            <div key={group.label}>
              <p
                className={cn(
                  "mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400/90",
                  collapsed && "lg:hidden"
                )}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.active;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.name : undefined}
                      title={
                        collapsed
                          ? `${item.name}${item.badge ? ` · ${item.badge} open` : ""}`
                          : undefined
                      }
                      className={cn(
                        "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-brand-500/25 to-brand-500/5 text-white shadow-[inset_0_0_0_1px_rgba(96,145,250,0.22)]"
                          : "text-slate-400 hover:bg-white/[0.055] hover:text-slate-100",
                        collapsed && "lg:justify-center lg:px-0"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-saffron-400" />
                      )}
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={cn(
                            "h-[17px] w-[17px] shrink-0 transition-colors",
                            active
                              ? "text-brand-300"
                              : item.action
                                ? "text-saffron-400/80 group-hover:text-saffron-400"
                                : "text-slate-400 group-hover:text-slate-200"
                          )}
                          strokeWidth={2}
                        />
                        <span className={cn("truncate", collapsed && "lg:hidden")}>
                          {item.name}
                        </span>
                      </span>

                      <span
                        className={cn(
                          "flex items-center gap-1.5",
                          collapsed && "lg:hidden"
                        )}
                      >
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500/90 px-1 text-[9.5px] font-extrabold text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                            {item.badge}
                          </span>
                        )}
                        {active && <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
                      </span>

                      {collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span
                          aria-hidden
                          className="absolute right-1.5 top-1.5 hidden h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] lg:block"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom status */}
        <div
          className={cn(
            "mt-auto space-y-3 px-4 pb-5",
            collapsed && "lg:px-2"
          )}
        >
          <div
            className={cn(
              "rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5",
              collapsed && "lg:hidden"
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-saffron-400" />
              <p className="text-[10.5px] font-bold text-slate-200">Overlap engine active</p>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
              Trilayer matching across {openOverlapCount > 0 ? `${openOverlapCount} open alert${openOverlapCount === 1 ? "" : "s"}` : "all bureaus"}.
            </p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="h-1 flex-1 rounded-full bg-emerald-400/70" />
              <span className="h-1 flex-1 rounded-full bg-emerald-400/50" />
              <span className="h-1 flex-1 rounded-full bg-emerald-400/30" />
            </div>
          </div>

          {collapsed && (
            <div className="hidden flex-col items-center gap-2.5 lg:flex">
              <button
                type="button"
                title="Overlap engine active"
                aria-label={`Overlap engine active, ${openOverlapCount} open alerts`}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-saffron-400 transition-colors hover:border-saffron-400/30 hover:bg-white/[0.06]"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <div className="flex flex-col items-center gap-1">
                <span className="h-1 w-6 rounded-full bg-emerald-400/70" />
                <span className="h-1 w-4 rounded-full bg-emerald-400/40" />
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-between px-1",
              collapsed && "lg:hidden"
            )}
          >
            <div className="flex min-w-0 items-center gap-2 text-[10px] font-medium text-slate-400">
              <LifeBuoy className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">support@aicte-india.org</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {onShortcuts && (
                <button
                  type="button"
                  onClick={onShortcuts}
                  title="Keyboard shortcuts  ?"
                  aria-label="Keyboard shortcuts"
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-400">
                <BadgeCheck className="h-3 w-3" />
                v2.4
              </span>
            </div>
          </div>

          {collapsed && onShortcuts && (
            <button
              type="button"
              onClick={onShortcuts}
              title="Keyboard shortcuts  ?"
              aria-label="Keyboard shortcuts"
              className="hidden h-9 w-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 transition-colors hover:text-white lg:flex"
            >
              <Keyboard className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
