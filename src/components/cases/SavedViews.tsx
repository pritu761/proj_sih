"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedView {
  label: string;
  qs: string;
}

/**
 * Per-officer saved filter views for the case explorer, stored locally
 * (localStorage keyed by officer email) — no extra database round-trip for a
 * demo-friendly convenience feature. Chips deep-link straight back into the
 * filtered registry.
 */
export function SavedViews({
  storageKey,
  activeQuery,
  activeChips,
}: {
  storageKey: string;
  activeQuery: string;
  activeChips: string[];
}) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [ready, setReady] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    try {
      setViews(JSON.parse(window.localStorage.getItem(storageKey) || "[]"));
    } catch {
      /* corrupted storage — start fresh */
    }
    setReady(true);
  }, [storageKey]);

  const persist = (next: SavedView[]) => {
    setViews(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage full or blocked — chip still works for this session */
    }
  };

  const save = () => {
    if (!activeQuery) return;
    const label =
      (name.trim() || activeChips.join(" · ") || "Saved view").slice(0, 48);
    const next = [
      { label, qs: activeQuery },
      ...views.filter((v) => v.qs !== activeQuery),
    ].slice(0, 6);
    persist(next);
    setNaming(false);
    setName("");
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
  };

  if (!ready || (views.length === 0 && !activeQuery)) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 sm:px-5">
      <span className="mr-1 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        <Bookmark className="h-3 w-3" />
        Saved views
      </span>

      {views.map((v) => (
        <span
          key={v.qs}
          className="group inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white transition-colors hover:border-brand-300"
        >
          <Link
            href={`/cases?${v.qs}`}
            title={v.label}
            className="max-w-[220px] truncate px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 transition-colors hover:text-brand-700"
          >
            {v.label}
          </Link>
          <button
            type="button"
            aria-label={`Remove saved view ${v.label}`}
            onClick={() => persist(views.filter((x) => x.qs !== v.qs))}
            className="flex h-6 w-6 items-center justify-center border-l border-slate-100 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {activeQuery && !naming && (
        <button
          type="button"
          onClick={() => {
            setNaming(true);
            setName(activeChips.join(" · "));
          }}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[10.5px] font-bold text-slate-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
        >
          {justSaved ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              Saved
            </>
          ) : (
            <>
              <BookmarkPlus className="h-3 w-3" />
              Save current filters
            </>
          )}
        </button>
      )}

      {naming && (
        <span className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setNaming(false);
            }}
            placeholder="Name this view…"
            maxLength={48}
            className={cn(
              "h-7 w-56 rounded-full border border-brand-300 bg-white px-2.5 text-[10.5px] font-semibold",
              "shadow-[0_0_0_3px_rgba(37,89,232,0.08)] outline-none"
            )}
          />
          <button
            type="button"
            onClick={save}
            className="btn btn-primary btn-sm h-7 px-2.5 text-[10.5px]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setNaming(false)}
            className="text-[10.5px] font-semibold text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </span>
      )}
    </div>
  );
}
