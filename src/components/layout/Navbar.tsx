"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Search,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { SessionUser } from "@/lib/rbac";
import { getBureauLabel } from "@/lib/utils";
import { markNotificationReadAction } from "@/actions/notification-actions";
import { signOut } from "next-auth/react";

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
}

export function Navbar({ user, notifications, openOverlapCount }: NavbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifList, setNotifList] = useState(notifications);

  const unreadCount = notifList.filter((n) => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationReadAction(id);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white shadow-md">
              <span className="font-black text-sm tracking-tighter text-amber-400">AICTE</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  AICTE Complaints Portal
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700 border border-blue-200">
                  SINGLE SOURCE OF TRUTH
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Integrated Institution Complaint Monitoring & Status Dashboard
              </p>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Institution, AICTE ID, Case No, or Keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-700"
            />
          </form>
        </div>

        {/* Actions & User Menu */}
        <div className="flex items-center gap-3">
          {/* Live Polling Status */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Live (30s Polling)
          </div>

          {/* Overlap Quick Pill */}
          {openOverlapCount > 0 && (
            <Link
              href="/alerts"
              className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
              <span>{openOverlapCount} Overlaps Open</span>
            </Link>
          )}

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-slate-900">Notifications & Alerts</h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <Link
                    href="/alerts"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-blue-700 hover:underline font-medium"
                  >
                    View All
                  </Link>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifList.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No active notifications</p>
                  ) : (
                    notifList.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`py-2.5 text-xs ${
                          notif.read ? "opacity-75" : "bg-blue-50/40 rounded-lg p-2"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800 flex items-center gap-1">
                            {notif.type === "OVERLAP" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            )}
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[10px] text-blue-700 hover:underline shrink-0"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {user.role === "COMPETENT_AUTHORITY"
                  ? "Competent Authority"
                  : user.role === "REGULATION_OFFICER"
                  ? "Regulation Bureau (RB)"
                  : user.role === "PGRC_OFFICER"
                  ? "PGRC Officer"
                  : user.role === "REGIONAL_OFFICER"
                  ? `Regional Officer (${user.region || "RO"})`
                  : user.role === "ADMIN"
                  ? "Administrator"
                  : getBureauLabel(user.bureau)}
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign Out"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
