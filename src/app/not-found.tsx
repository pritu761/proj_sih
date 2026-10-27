import Link from "next/link";
import { ShieldCheck, ArrowLeft, Compass } from "lucide-react";

export default function RootNotFound() {
  return (
    <main className="hero-mesh flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[15px] bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.8)]">
          <ShieldCheck className="h-6 w-6 text-ink-950" />
        </div>

        <p className="mt-6 font-display text-[13px] font-extrabold tracking-tight text-white">
          AICTE <span className="text-saffron-400">Sentinel</span>
        </p>

        <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.045] p-7 backdrop-blur-sm sm:p-9">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-saffron-300">
            <Compass className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
            404 · Off the grid
          </p>
          <h1 className="mt-1.5 font-display text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-white">
            This route is not in the command map
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-slate-400">
            The page you followed does not exist or has been retired. Return to the dashboard to
            continue monitoring grievances.
          </p>

          <Link href="/" className="btn btn-primary mt-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to command center
          </Link>
        </div>

        <p className="mt-6 text-[9.5px] font-medium text-slate-600">
          All India Council for Technical Education · Integrated Grievance Intelligence
        </p>
      </div>
    </main>
  );
}
