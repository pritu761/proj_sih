"use client";

import { useEffect, useRef } from "react";
import { Compass, Keyboard, X } from "lucide-react";

const navigateShortcuts = [
  { keys: ["G", "D"], label: "Go to dashboard" },
  { keys: ["G", "C"], label: "Open Case Explorer" },
  { keys: ["G", "A"], label: "Review overlap alerts" },
  { keys: ["G", "I"], label: "Browse institutions" },
  { keys: ["G", "R"], label: "Open reports & analytics" },
];

const workspaceShortcuts = [
  { keys: ["Ctrl", "K"], label: "Command palette" },
  { keys: ["/"], label: "Search anything" },
  { keys: ["T"], label: "Toggle light / dark" },
  { keys: ["["], label: "Collapse or expand sidebar" },
  { keys: ["?"], label: "Show this shortcut guide" },
  { keys: ["Esc"], label: "Close any overlay" },
];

function Keycaps({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={`${key}-${index}`} className="flex items-center gap-1">
          {index > 0 && <span className="text-[8px] font-bold text-slate-500">+</span>}
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[9.5px] font-bold text-slate-600 shadow-[0_1px_0_rgba(10,16,32,0.06)]">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "?") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-sentinel-dialog="open"
      className="fixed inset-0 z-[85] flex items-center justify-center bg-ink-950/55 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        tabIndex={-1}
        className="animate-scale-in max-h-[calc(100vh-2rem)] w-full max-w-[620px] overflow-y-auto rounded-[22px] border border-slate-200 bg-white shadow-[0_40px_90px_-24px_rgba(6,10,20,0.6)] outline-none"
      >
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-brand-50/60 px-6 py-5">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-500 via-brand-400 to-saffron-500"
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-600 shadow-sm">
                <Keyboard className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="eyebrow mb-1">Keyboard</p>
                <h2
                  id="shortcuts-title"
                  className="font-display text-[18px] font-extrabold tracking-tight text-slate-950"
                >
                  Command your workspace
                </h2>
                <p className="mt-1 text-[11.5px] font-medium text-slate-500">
                  Move through Sentinel without lifting your hands from the keys.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close keyboard shortcuts"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-x-7 gap-y-6 px-6 py-5 sm:grid-cols-2">
          <section aria-labelledby="shortcuts-navigate">
            <div className="mb-2.5 flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 text-brand-500" />
              <h3
                id="shortcuts-navigate"
                className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500"
              >
                Navigate
              </h3>
            </div>
            <div className="space-y-0.5">
              {navigateShortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50"
                >
                  <span className="text-[11.5px] font-semibold text-slate-600">
                    {shortcut.label}
                  </span>
                  <Keycaps keys={shortcut.keys} />
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="shortcuts-workspace">
            <div className="mb-2.5 flex items-center gap-2">
              <Keyboard className="h-3.5 w-3.5 text-saffron-500" />
              <h3
                id="shortcuts-workspace"
                className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500"
              >
                Workspace
              </h3>
            </div>
            <div className="space-y-0.5">
              {workspaceShortcuts.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50"
                >
                  <span className="text-[11.5px] font-semibold text-slate-600">
                    {shortcut.label}
                  </span>
                  <Keycaps keys={shortcut.keys} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-medium text-slate-500">
            Shortcuts pause automatically while you are typing in a field.
          </p>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
