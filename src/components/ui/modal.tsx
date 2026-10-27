"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = "blue",
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: "blue" | "rose" | "amber" | "emerald" | "violet" | "slate";
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const toneMap = {
    blue: "bg-brand-50 text-brand-700 border-brand-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const sizeMap = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn("modal-panel overflow-hidden", sizeMap[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  toneMap[tone]
                )}
              >
                {icon}
              </div>
            )}
            <div>
              <h2 className="font-display text-[16px] font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              {description && (
                <p className="mt-1 max-w-md text-[12px] leading-relaxed text-slate-500">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
