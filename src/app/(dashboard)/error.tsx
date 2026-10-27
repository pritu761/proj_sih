"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-rose-200 bg-white shadow-[0_30px_80px_-40px_rgba(6,10,20,0.35)]">
        <div className="h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400" />
        <div className="p-7 text-center sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <p className="eyebrow mt-5 text-rose-600">Runtime exception</p>
          <h1 className="mt-1.5 font-display text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
            Something interrupted this view
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-slate-500">
            The command center could not complete the last request. Your session is intact and no
            data was modified.
          </p>

          {error?.digest && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[9.5px] text-slate-500">
              <ShieldAlert className="h-3 w-3" />
              trace {error.digest}
            </p>
          )}

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button onClick={reset} className="btn btn-primary">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry request
            </button>
            <Link href="/" className="btn btn-secondary">
              <Home className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
          </div>

          <p className="mt-5 text-[10px] font-medium text-slate-400">
            If this persists, contact the AICTE IT control room at support@aicte-india.org
          </p>
        </div>
      </div>
    </div>
  );
}
