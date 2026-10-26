import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function getBureauLabel(bureau: string): string {
  switch (bureau) {
    case "REGULATION_BUREAU":
      return "Regulation Bureau (RB)";
    case "PGRC":
      return "Public Grievance Redressal Cell (PGRC)";
    case "APPROVAL_BUREAU":
      return "Approval Bureau (AB)";
    case "SKILL_CELL":
      return "Skill Development Cell (SDC)";
    case "ALL":
      return "Central AICTE HQ";
    default:
      return bureau.replace(/_/g, " ");
  }
}

export function getBureauShortName(bureau: string): string {
  switch (bureau) {
    case "REGULATION_BUREAU":
      return "RB";
    case "PGRC":
      return "PGRC";
    case "APPROVAL_BUREAU":
      return "AB";
    case "SKILL_CELL":
      return "SDC";
    case "ALL":
      return "HQ";
    default:
      return bureau;
  }
}

export function getBureauBadgeColor(bureau: string): string {
  switch (bureau) {
    case "REGULATION_BUREAU":
      return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300";
    case "PGRC":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
    case "APPROVAL_BUREAU":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300";
    case "SKILL_CELL":
      return "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
    case "UNDER_PROCESS":
      return "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
    case "DISPOSED":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
    case "TRANSFERRED":
      return "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
    case "ESCALATED":
      return "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function getPriorityBadgeColor(priority: string): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-600 text-white animate-pulse";
    case "HIGH":
      return "bg-rose-100 text-rose-700 border-rose-300";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "LOW":
      return "bg-slate-100 text-slate-700 border-slate-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}
