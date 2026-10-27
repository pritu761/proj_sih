"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  className?: string;
  /** Show the "Light"/"Dark" caption next to the switch on wide screens. */
  withLabel?: boolean;
}

export function ThemeToggle({ className, withLabel = false }: ThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Compact control for phones */}
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={isDark}
        onClick={toggleTheme}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors sm:hidden",
          "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600",
          "dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-brand-400/60 dark:hover:text-brand-300"
        )}
      >
        {isDark ? (
          <Moon className="h-[16px] w-[16px]" aria-hidden="true" />
        ) : (
          <Sun className="h-[16px] w-[16px]" aria-hidden="true" />
        )}
      </button>

      {/* Sliding switch for tablet and up */}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={label}
        title={label}
        onClick={toggleTheme}
        data-mounted={mounted ? "true" : "false"}
        className={cn(
          "group relative hidden h-[30px] w-[56px] shrink-0 items-center rounded-full border p-1 transition-colors duration-300 sm:inline-flex",
          "border-slate-200 bg-slate-100 hover:border-brand-300",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          "dark:border-white/10 dark:bg-white/[0.08] dark:hover:border-brand-400/60"
        )}
      >
        <Sun
          className={cn(
            "pointer-events-none absolute left-[7px] h-3 w-3 transition-colors duration-300",
            isDark ? "text-slate-500" : "text-saffron-500"
          )}
          aria-hidden="true"
        />
        <Moon
          className={cn(
            "pointer-events-none absolute right-[7px] h-3 w-3 transition-colors duration-300",
            isDark ? "text-brand-300" : "text-slate-400"
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full shadow-sm ring-1 transition-all duration-300 ease-out",
            isDark
              ? "translate-x-[26px] bg-ink-800 text-brand-300 ring-white/15"
              : "translate-x-0 bg-white text-saffron-500 ring-slate-900/5"
          )}
        >
          {isDark ? (
            <Moon className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Sun className="h-3 w-3" aria-hidden="true" />
          )}
        </span>
      </button>

      {withLabel && (
        <span className="hidden text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:inline">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
    </div>
  );
}
