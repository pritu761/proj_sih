"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

const LANG_STORAGE_KEY = "sentinel:lang";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
});

/**
 * Language preference for the public narrative surfaces (landing + tracker).
 * Persisted locally — no account, no server round-trip, consistent with the
 * anonymous nature of those pages.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === "hi" || stored === "en") setLangState(stored);
    } catch {
      /* storage blocked — default English */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* storage blocked — still switches for this session */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/**
 * Segmented EN | हिं control. `overHero` for the always-dark landing hero /
 * track header; omit for surfaces that can go light (scrolled landing nav).
 */
export function LanguageToggle({
  overHero = false,
  className,
}: {
  overHero?: boolean;
  className?: string;
}) {
  const { lang, setLang } = useLang();

  return (
    <div
      role="group"
      aria-label="Content language"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border p-0.5 text-[10px] font-bold tracking-wide",
        overHero
          ? "border-white/15 bg-white/[0.06] text-white/70 backdrop-blur"
          : "border-slate-200 bg-white text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white/60",
        className,
      )}
    >
      {(["en", "hi"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            title={l === "en" ? "English" : "हिन्दी"}
            className={cn(
              "rounded-full px-2.5 py-1 transition-all duration-300 active:scale-[0.97]",
              active
                ? overHero
                  ? "bg-white text-ink-950 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                  : "bg-slate-900 text-white dark:bg-white dark:text-ink-950"
                : "hover:opacity-75",
            )}
          >
            {l === "en" ? "EN" : "हिं"}
          </button>
        );
      })}
    </div>
  );
}
