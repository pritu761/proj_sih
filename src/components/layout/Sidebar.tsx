"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  Folders,
  ShieldAlert,
  BarChart3,
  PlusCircle,
  History,
  Scale,
} from "lucide-react";
import { SessionUser } from "@/lib/rbac";

interface SidebarProps {
  user: SessionUser;
  openOverlapCount: number;
}

export function Sidebar({ user, openOverlapCount }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      name: "Institutions Directory",
      href: "/institutions",
      icon: Building,
      active: pathname.startsWith("/institutions"),
    },
    {
      name: "Case Explorer",
      href: "/cases",
      icon: Folders,
      active: pathname.startsWith("/cases") && pathname !== "/cases/new",
    },
    {
      name: "Overlap Alerts Hub",
      href: "/alerts",
      icon: ShieldAlert,
      badge: openOverlapCount > 0 ? openOverlapCount : undefined,
      badgeColor: "bg-rose-600 text-white animate-pulse",
      active: pathname.startsWith("/alerts"),
    },
    {
      name: "Register Complaint",
      href: "/cases/new",
      icon: PlusCircle,
      active: pathname === "/cases/new",
    },
    {
      name: "Reports & Analytics",
      href: "/reports",
      icon: BarChart3,
      active: pathname.startsWith("/reports"),
    },
  ];

  // Show Audit Trail to Admin and Competent Authority
  if (user.role === "ADMIN" || user.role === "COMPETENT_AUTHORITY") {
    navItems.push({
      name: "System Audit Trail",
      href: "/audit",
      icon: History,
      active: pathname.startsWith("/audit"),
    });
  }

  return (
    <aside className="w-64 shrink-0 hidden md:block border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* User Role Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white text-xs font-bold">
              <Scale className="h-4 w-4 text-amber-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">{user.designation || user.name}</p>
              <p className="text-[10px] font-semibold text-blue-700 tracking-wide uppercase">
                {user.bureau === "ALL" ? "CENTRAL HQ" : user.bureau.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Operations & Monitoring
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                  item.active
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      item.active ? "text-amber-400" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badgeColor || "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* AICTE Helpdesk Info */}
      <div className="mt-8 rounded-lg border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-800">AICTE Technical Support</p>
        <p className="mt-0.5">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</p>
        <p className="mt-1 font-mono text-[10px] text-blue-700">support@aicte-india.org</p>
      </div>
    </aside>
  );
}
