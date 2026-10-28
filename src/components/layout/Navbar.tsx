"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Search,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Menu,
  Command,
  ArrowUpRight,
  Clock3,
  Flame,
  Inbox,
  ChevronDown,
} from "lucide-react";
import { SessionUser } from "@/lib/rbac";
import { getBureauLabel } from "@/lib/utils";
import { markNotificationReadAction } from "@/actions/notification-actions";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user: SessionUser;
  notifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: Date | string;
  }[];
  openOverlapCount: number;
  onMenu?: () => void;
}

const notifIcon: Record<string, typeof Bell> = {
  OVERLAP: ShieldAlert,
  SLA_BREACHED: Flame,
  SLA_APPROACHING: Clock3,
  PENDING_REMINDER: Inbox,
  ESCALATION: AlertTriangle,
};

const notifTone: Record<string, string> = {
  OVERLAP: "bg-rose-50 text-rose-600 border-rose-100",
  SLA_BREACHED: "bg-rose-50 text-rose-600 border-rose-100",
  SLA_APPROACHING: "bg-amber-50 text-amber-600 border-amber-100",
  PENDING_REMINDER: "bg-brand-50 text-brand-600 border-brand-100",
  ESCALATION: "bg-violet-50 text-violet-600 border-violet-100",
};

function timeAgo(date: Date | string) {
  const d = new Date(date).getTime();
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Navbar({ user, notifications, openOverlapCount, onMenu }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifList, setNotifList] = useState(notifications);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifList.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new Event("sentinel:command"));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationReadAction(id);
  };

  const roleName = () => {
    if (user.role === "COMPETENT_AUTHORITY") return "Competent Authority";
    if (user.role === "REGULATION_OFFICER") return "Regulation Bureau";
    if (user.role === "PGRC_OFFICER") return "PGRC Officer";
    if (user.role === "REGIONAL_OFFICER")
      return `Regional Officer${user.region ? ` · ${user.region}` : ""}`;
    if (user.role === "ADMIN") return "Administrator";
    return getBureauLabel(user.bureau);
  };

  const initials =
    user.name
      ?.split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AC";

  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
      style={{ height: "var(--navbar-height)" }}
    >
      <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenu}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>

        {/* Command palette trigger */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("sentinel:command"))}
          aria-label="Open command palette"
          aria-keyshortcuts="Control+K Meta+K"
          className="group relative flex h-10 w-full max-w-[440px] flex-1 items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] pl-3.5 pr-2.5 text-left transition-all hover:border-brand-300 hover:bg-[var(--surface-card)] focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-[3.5px] focus-visible:ring-brand-500/15"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-brand-500" />
          <span className="flex-1 truncate text-[12.5px] font-medium text-slate-400">
            <span className="hidden md:inline">Search cases, institutions, commands...</span>
            <span className="md:hidden">Search...</span>
          </span>
          <kbd className="hidden items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-400 sm:flex">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {/* Live */}
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-[10.5px] font-bold text-emerald-700 xl:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live sync
          </div>

          {/* Overlaps */}
          {openOverlapCount > 0 && (
            <Link
              href="/alerts"
              className="group flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-[10.5px] font-bold text-rose-700 transition-all hover:border-rose-300 hover:bg-rose-100"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{openOverlapCount} overlaps</span>
              <span className="sm:hidden">{openOverlapCount}</span>
            </Link>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              aria-expanded={showNotifications}
              className={cn(
                "relative rounded-xl border p-2 transition-all",
                showNotifications
                  ? "border-brand-200 bg-brand-50 text-brand-600"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-0.5 text-[8.5px] font-extrabold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(6,10,20,0.35)] animate-slide-down">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-[13px] font-bold text-slate-900">
                      Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold text-rose-600">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <Link
                    href="/alerts"
                    onClick={() => setShowNotifications(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700"
                  >
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="max-h-[340px] overflow-y-auto">
                  {notifList.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Bell className="mx-auto mb-2 h-7 w-7 text-slate-200" />
                      <p className="text-[12px] font-semibold text-slate-500">You&apos;re all caught up</p>
                      <p className="mt-0.5 text-[10.5px] text-slate-400">
                        New alerts will appear here.
                      </p>
                    </div>
                  ) : (
                    notifList.slice(0, 7).map((notif) => {
                      const Icon = notifIcon[notif.type] || Bell;
                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            "border-b border-slate-50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50/80",
                            !notif.read && "bg-brand-50/40"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                notifTone[notif.type] || "border-slate-100 bg-slate-50 text-slate-500"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[11.5px] font-bold leading-snug text-slate-800">
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-slate-500">
                                {notif.message}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[9.5px] font-medium text-slate-400">
                                  {timeAgo(notif.created_at)}
                                </span>
                                {!notif.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="rounded-md px-1.5 py-0.5 text-[9.5px] font-bold text-brand-600 hover:bg-brand-50"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile((v) => !v)}
              aria-expanded={showProfile}
              className="flex items-center gap-2.5 rounded-xl border border-transparent p-1 pr-1.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="hidden text-right md:block">
                <p className="max-w-[150px] truncate text-[11.5px] font-bold leading-none text-slate-900">
                  {user.name}
                </p>
                <p className="mt-1 max-w-[150px] truncate text-[9.5px] font-semibold text-slate-400">
                  {roleName()}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink-800 to-ink-700 text-[10.5px] font-extrabold text-white shadow-sm ring-1 ring-ink-900/10">
                {initials}
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2.5 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(6,10,20,0.35)] animate-slide-down">
                <div className="border-b border-slate-100 px-4 py-3.5">
                  <p className="text-[12px] font-bold text-slate-900">{user.name}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-slate-500">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-700">
                      {roleName()}
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                      {user.bureau === "ALL" ? "HQ" : user.bureau.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="p-1.5">
                  <Link
                    href="/alerts"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    Review alerts
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11.5px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
