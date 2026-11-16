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
import { LANGS, type Lang } from "@/lib/i18n";

const LANG_STORAGE_KEY = "sentinel:lang";

/** Native labels — citizens recognise their own language instantly. */
const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
  te: "తెలుగు",
  bn: "বাংলা",
};

function isLang(value: string | null): value is Lang {
  return value !== null && LANGS.some((l) => l === value);
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
});

/**
 * Language preference for the public narrative surfaces (landing + tracker +
 * transparency). Persisted locally — no account, no server round-trip,
 * consistent with the anonymous nature of those pages. Stored "en"/"hi"
 * values from earlier builds remain valid; new languages are additive.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  // Server and first client render always start at "en" so there is no
  // SSR/hydration mismatch; the saved preference is applied after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (isLang(stored)) setLangState(stored);
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
    document.documentElement.lang = lang;
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
 * Compact native-language select. A five-way segmented row of wide buttons
 * does not fit the public headers, so a single dropdown keeps the existing
 * pill styling while exposing all five languages. `overHero` targets the
 * always-dark landing hero / track header; omit for light surfaces.
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
    <select
      aria-label="Content language"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className={cn(
        "max-w-[8.5rem] shrink-0 cursor-pointer appearance-none rounded-full border bg-transparent px-2.5 py-1 text-[10px] font-bold tracking-wide outline-none transition-colors [&>option]:bg-white [&>option]:text-ink-950",
        overHero
          ? "border-white/15 text-white/80 hover:border-white/30"
          : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-white/70",
        className,
      )}
    >
      {LANGS.map((l) => (
        <option key={l} value={l} title={LANG_LABELS[l]}>
          {LANG_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
