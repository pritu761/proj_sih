"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const DEFAULT_DURATION = 4600;

const toneMeta: Record<
  ToastTone,
  { icon: typeof CheckCircle2; iconClass: string; barClass: string; accent: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "border-emerald-200 bg-emerald-50 text-emerald-600",
    barClass: "bg-emerald-500",
    accent: "#059669",
  },
  error: {
    icon: XCircle,
    iconClass: "border-rose-200 bg-rose-50 text-rose-600",
    barClass: "bg-rose-500",
    accent: "#e11d48",
  },
  info: {
    icon: Info,
    iconClass: "border-brand-200 bg-brand-50 text-brand-600",
    barClass: "bg-brand-500",
    accent: "#2559e8",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "border-amber-200 bg-amber-50 text-amber-600",
    barClass: "bg-amber-500",
    accent: "#d97706",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ title, description, tone = "info", duration = DEFAULT_DURATION }: ToastOptions) => {
      const id = ++counter.current;
      setToasts((prev) => [
        ...prev.slice(-3),
        { id, title, description, tone, duration },
      ]);
      const timer = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) => show({ title, description, tone: "success" }),
      error: (title, description) => show({ title, description, tone: "error" }),
      info: (title, description) => show({ title, description, tone: "info" }),
      warning: (title, description) => show({ title, description, tone: "warning" }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[95] flex flex-col items-end gap-2.5 sm:inset-x-auto sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => {
          const meta = toneMeta[toast.tone];
          const Icon = meta.icon;
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="toast-card pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 pr-10 shadow-[0_22px_50px_-18px_rgba(6,10,20,0.45)] sm:w-[380px]"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: meta.accent }}
              />
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                    meta.iconClass
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold leading-snug text-slate-900">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] font-medium leading-relaxed text-slate-500">
                      {toast.description}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <span
                aria-hidden
                className={cn("toast-progress absolute inset-x-0 bottom-0 h-[2px] origin-left", meta.barClass)}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
