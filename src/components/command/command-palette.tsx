"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  CornerDownLeft,
  LayoutDashboard,
  FolderSearch,
  PlusCircle,
  Radar,
  Building2,
  ChartSpline,
  ScrollText,
  Moon,
  Sun,
  Download,
  FileText,
  MapPin,
  ShieldAlert,
  Loader2,
  History,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { cn, getBureauShortName } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";
import type { SessionUser } from "@/lib/rbac";

type Group = "Recent" | "Actions" | "Navigate" | "Cases" | "Institutions";

interface PaletteItem {
  key: string;
  group: Group;
  title: string;
  subtitle?: string;
  icon: typeof Search;
  href?: string;
  run?: () => void;
  badge?: string;
  tone: string;
  keywords?: string;
}

interface SearchResponse {
  cases: {
    id: string;
    case_id: string;
    category: string;
    status: string;
    priority: string;
    bureau: string;
    institution_name: string;
    city: string;
    remainingDays: number;
    isBreached: boolean;
  }[];
  institutions: {
    id: string;
    name: string;
    city: string;
    state: string;
    region: string;
    aicte_permanent_id: string;
    institution_type: string;
  }[];
}

const RECENT_KEY = "aicte-sentinel-recents";
const GROUP_ORDER: Group[] = ["Recent", "Navigate", "Actions", "Cases", "Institutions"];

const groupLabel: Record<Group, string> = {
  Recent: "Recent",
  Navigate: "Navigate",
  Actions: "Quick actions",
  Cases: "Cases",
  Institutions: "Institutions",
};

function loadRecent(): PaletteItem[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { title: string; subtitle?: string; href: string; group: Group }[];
    return parsed
      .filter((r) => r?.href)
      .slice(0, 4)
      .map((r) => ({
        key: `recent-${r.href}`,
        group: "Recent" as Group,
        title: r.title,
        subtitle: r.subtitle,
        href: r.href,
        icon: History,
        tone: "border-slate-200 bg-slate-50 text-slate-500",
      }));
  } catch {
    return [];
  }
}

function saveRecent(item: PaletteItem) {
  if (!item.href) return;
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const current = raw ? (JSON.parse(raw) as { title: string; subtitle?: string; href: string; group: Group }[]) : [];
    const next = [
      { title: item.title, subtitle: item.subtitle, href: item.href, group: item.group },
      ...current.filter((r) => r.href !== item.href),
    ].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* recents are a convenience only */
  }
}

export function CommandPalette({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<PaletteItem[]>([]);
  const [results, setResults] = useState<SearchResponse>({ cases: [], institutions: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const openPalette = useCallback(() => {
    setRecents(loadRecent());
    setOpen(true);
    setQuery("");
    setActive(0);
  }, []);

  // Global shortcuts + external trigger from the navbar search field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) return false;
          setRecents(loadRecent());
          setQuery("");
          setActive(0);
          return true;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onExternal = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("sentinel:command", onExternal);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sentinel:command", onExternal);
    };
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced server search.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setResults({ cases: [], institutions: [] });
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) setResults(await res.json());
      } catch {
        /* aborted or offline - keep local navigation results */
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [query, open]);

  const staticItems = useMemo<PaletteItem[]>(() => {
    const nav: { title: string; subtitle: string; href: string; icon: typeof Search; roles?: string[] }[] = [
      { title: "Dashboard", subtitle: "Command centre and live metrics", href: "/", icon: LayoutDashboard },
      { title: "Case Explorer", subtitle: "Search, filter and drill into grievances", href: "/cases", icon: FolderSearch },
      { title: "Register complaint", subtitle: "Open a new grievance file", href: "/cases/new", icon: PlusCircle },
      { title: "Overlap Alerts", subtitle: "Cross-bureau collision coordination", href: "/alerts", icon: Radar },
      { title: "Institutions", subtitle: "AICTE institution directory", href: "/institutions", icon: Building2 },
      { title: "Reports & Analytics", subtitle: "Bureau performance and exports", href: "/reports", icon: ChartSpline },
      {
        title: "Audit Trail",
        subtitle: "Tamper-evident security ledger",
        href: "/audit",
        icon: ScrollText,
        roles: ["ADMIN", "COMPETENT_AUTHORITY"],
      },
    ];

    const navItems: PaletteItem[] = nav
      .filter((n) => !n.roles || n.roles.includes(user.role))
      .map((n) => ({
        key: `nav-${n.href}`,
        group: "Navigate",
        title: n.title,
        subtitle: n.subtitle,
        href: n.href,
        icon: n.icon,
        tone: "border-brand-200 bg-brand-50 text-brand-600",
      }));

    const actionItems: PaletteItem[] = [
      {
        key: "action-theme",
        group: "Actions",
        title: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        subtitle: "Toggle the interface theme",
        icon: theme === "dark" ? Sun : Moon,
        run: toggleTheme,
        tone: "border-slate-200 bg-slate-50 text-slate-600",
      },
      {
        key: "action-csv",
        group: "Actions",
        title: "Export case register (CSV)",
        subtitle: "Download the current grievance register",
        icon: Download,
        run: () => window.open("/api/reports/csv", "_blank"),
        tone: "border-emerald-200 bg-emerald-50 text-emerald-600",
      },
      {
        key: "action-new",
        group: "Actions",
        title: "Start an overlap scan",
        subtitle: "Review live collision alerts",
        icon: ShieldAlert,
        href: "/alerts?status=OPEN",
        tone: "border-rose-200 bg-rose-50 text-rose-600",
      },
    ];

    return [...navItems, ...actionItems];
  }, [theme, toggleTheme, user.role]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    const caseItems: PaletteItem[] = results.cases.map((c) => ({
      key: `case-${c.id}`,
      group: "Cases",
      title: c.case_id,
      subtitle: `${c.institution_name} - ${c.category}`,
      href: `/cases/${c.id}`,
      icon: FileText,
      badge: getBureauShortName(c.bureau),
      tone: "border-brand-200 bg-brand-50 text-brand-600",
      keywords: `${c.category} ${c.institution_name} ${c.city} ${c.status}`,
    }));

    const institutionItems: PaletteItem[] = results.institutions.map((i) => ({
      key: `inst-${i.id}`,
      group: "Institutions",
      title: i.name,
      subtitle: `${i.city}, ${i.state} - ${i.aicte_permanent_id}`,
      href: `/institutions/${i.id}`,
      icon: MapPin,
      tone: "border-amber-200 bg-amber-50 text-amber-600",
      keywords: `${i.city} ${i.state} ${i.region} ${i.aicte_permanent_id}`,
    }));

    const filteredStatic = q
      ? staticItems.filter((i) => {
          const hay = `${i.title} ${i.subtitle ?? ""} ${i.keywords ?? ""}`.toLowerCase();
          return hay.includes(q) || q.split(/\s+/).every((part) => hay.includes(part));
        })
      : staticItems;

    const recent = !q ? recents : [];

    return [...recent, ...filteredStatic, ...caseItems, ...institutionItems];
  }, [query, results, staticItems, recents]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const run = useCallback(
    (item: PaletteItem) => {
      if (item.run) {
        item.run();
      }
      if (item.href) {
        saveRecent(item);
        router.push(item.href);
      }
      close();
    },
    [close, router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) run(item);
    } else if (e.key === "Escape") {
      close();
    }
  };

  if (!open) return null;

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-950/50 px-3 pt-[8vh] backdrop-blur-sm sm:px-4 sm:pt-[10vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sentinel command palette"
        className="w-[min(660px,100%)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_40px_90px_-24px_rgba(6,10,20,0.65)] animate-slide-down"
      >
        {/* Search row */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-brand-500" />
          ) : (
            <Search className="h-[18px] w-[18px] shrink-0 text-slate-400" />
          )}
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="sentinel-command-list"
            aria-autocomplete="list"
            aria-activedescendant={items[active] ? `sentinel-item-${active}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search cases, institutions, or run a command..."
            className="h-7 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          <span className="hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 sm:flex">
            <Command className="h-2.5 w-2.5" />K
          </span>
          <button
            onClick={close}
            className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Close command palette"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} id="sentinel-command-list" role="listbox" className="max-h-[min(58vh,430px)] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-slate-200" />
              <p className="mt-2 text-[12.5px] font-semibold text-slate-600">
                No matches for &quot;{query}&quot;
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Try a case number, institution name, district, or a category.
              </p>
            </div>
          ) : (
            grouped.map(({ group, items: groupItems }) => (
              <div key={group} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  {groupLabel[group]}
                </p>
                {groupItems.map((item) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const isActive = index === active;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      id={`sentinel-item-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => run(item)}
                      style={{ animationDelay: `${Math.min(index, 9) * 22}ms` }}
                      className={cn(
                        "palette-row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isActive ? "bg-brand-50 ring-1 ring-inset ring-brand-100" : "hover:bg-slate-50"
                      )}
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", item.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[12.5px] font-bold text-slate-800">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="rounded border border-slate-200 bg-white px-1 py-px text-[8.5px] font-bold text-slate-500">
                              {item.badge}
                            </span>
                          )}
                        </span>
                        {item.subtitle && (
                          <span className="mt-0.5 block truncate text-[10.5px] font-medium text-slate-400">
                            {item.subtitle}
                          </span>
                        )}
                      </span>
                      {isActive ? (
                        <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-brand-600">
                          <CornerDownLeft className="h-3 w-3" />
                          Enter
                        </span>
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <div className="flex items-center gap-3 text-[9px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-px font-mono text-[8.5px]">&uarr;&darr;</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-px font-mono text-[8.5px]">&#8629;</kbd>
              open
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-slate-200 bg-white px-1 py-px font-mono text-[8.5px]">esc</kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-saffron-500 text-[8px] font-extrabold text-ink-950">
              A
            </span>
            Sentinel command
          </span>
        </div>
      </div>
    </div>
  );
}
