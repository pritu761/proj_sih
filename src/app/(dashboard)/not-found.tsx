import Link from "next/link";
import { FileQuestion, ArrowLeft, Search } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(6,10,20,0.35)]">
        <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-saffron-400" />
        <div className="p-7 text-center sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
            <FileQuestion className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
            This record is not in the registry
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-slate-500">
            The case or institution may have been merged, transferred, or the link is incomplete.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/cases" className="btn btn-primary">
              <Search className="h-3.5 w-3.5" />
              Open case explorer
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
