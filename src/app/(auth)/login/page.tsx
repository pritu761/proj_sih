"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEMO_USERS } from "@/lib/demo-data";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { TextReveal } from "@/components/ui/text-reveal";
import { HeroAmbient } from "./hero-ambient";
import { ToastProvider, useToast } from "@/components/ui/toast";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

type RoleMeta = { label: string; code: string; className: string };

const roleMeta: Record<string, RoleMeta> = {
  ADMIN: { label: "Admin", code: "AD", className: "bg-ink-900 text-white" },
  COMPETENT_AUTHORITY: { label: "Authority", code: "AU", className: "bg-saffron-500 text-ink-950" },
  REGULATION_OFFICER: { label: "Regulation", code: "RB", className: "bg-indigo-600 text-white" },
  PGRC_OFFICER: { label: "PGRC", code: "PG", className: "bg-sky-700 text-white" },
  BUREAU_OFFICER: { label: "Approval", code: "AB", className: "bg-amber-500 text-ink-950" },
  REGIONAL_OFFICER: { label: "Regional", code: "RO", className: "bg-teal-700 text-white" },
};

function safeCallbackUrl(value: string | null) {
  if (!value) return "/dashboard";
  // Only allow same-origin relative paths. Reject `//evil.example` and any
  // absolute URL so a crafted login link cannot bounce users off-site.
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const toast = useToast();

  useEffect(() => {
    if (searchParams.get("signedout") !== "1") return;
    toast.info("Signed out", "You have signed out of Sentinel. Sign in again to continue.");
    // Strip the flag so a manual refresh does not replay the toast.
    const url = new URL(window.location.href);
    url.searchParams.delete("signedout");
    const query = url.searchParams.toString();
    window.history.replaceState(null, "", url.pathname + (query ? `?${query}` : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setErrorMessage("Invalid credentials. Please verify your AICTE email and password.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("Authentication service unavailable. Please try again.");
      setIsLoading(false);
    }
  };

  const quickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    setErrorMessage("");
    signIn("credentials", { email: demoEmail, password: demoPass, redirect: false }).then((res) => {
      if (res?.error) {
        setErrorMessage("Demo credentials rejected. Re-run the seed script.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-7 animate-fade-in lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600">
            <ShieldCheck className="h-5 w-5 text-ink-950" />
          </div>
          <p className="font-display text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            AICTE <span className="text-saffron-600 dark:text-saffron-400">Sentinel</span>
          </p>
        </div>
      </div>

      <div className="auth-card animate-slide-up rounded-[20px] border border-slate-200/70 bg-white/75 p-6 shadow-[0_30px_80px_-40px_rgba(6,10,20,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:p-8 dark:border-white/10 dark:bg-ink-900/75 dark:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.75)]">
        <div className="mb-6" style={{ animationDelay: "60ms" }}>
          <h1 className="animate-rise font-display text-[clamp(1.5rem,2.6vw,1.95rem)] font-extrabold leading-tight tracking-[-0.035em] text-slate-950 dark:text-white">
            Welcome back.
          </h1>
          <p className="animate-rise mt-1.5 text-[11.5px] font-medium text-slate-400" style={{ animationDelay: "120ms" }}>
            Sign in with your AICTE official email to open the command centre.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11.5px] font-medium leading-relaxed text-rose-700 animate-slide-down"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={submit} className="animate-rise space-y-4" style={{ animationDelay: "140ms" }}>
          <div>
            <label htmlFor="email" className="field-label">
              Official email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@aicte.gov.in"
                className="input h-11 pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input h-11 pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary h-11 w-full text-[12.5px]"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="34" strokeLinecap="round" />
                </svg>
                Authenticating…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div
          className="animate-rise mt-7 border-t border-slate-100 pt-5 dark:border-white/10"
          style={{ animationDelay: "260ms" }}
        >
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Demo access
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_USERS.map((u, i) => {
              const meta = roleMeta[u.role] ?? { label: "Officer", code: "OF", className: "bg-slate-600 text-white" };
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => quickLogin(u.email, u.password)}
                  disabled={isLoading}
                  title={`${u.name} — ${u.designation}`}
                  className="group flex h-10 animate-rise items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-2.5 text-left lift hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-brand-400/40 dark:hover:bg-brand-400/10"
                  style={{ animationDelay: `${320 + i * 60}ms` }}
                >
                  <span
                    className={`ring-1 ring-black/5 dark:ring-white/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10.5px] font-bold ${meta.className}`}
                  >
                    {meta.code}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-slate-700 group-hover:text-slate-900">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Below-card links */}
      <div className="animate-fade-in mt-5 flex items-center justify-center gap-5" style={{ animationDelay: "480ms" }}>
        <Link
          href="/"
          className="group inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3 transition-transform duration-300 group-hover:-translate-x-0.5" />
          Back to home
        </Link>
        <span className="h-3 w-px bg-slate-300/70 dark:bg-white/10" aria-hidden />
        <Link
          href="/track"
          className="group inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Track a grievance
          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-bg)] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left brand rail */}
      <section className="hero-mesh relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <HeroAmbient />

        <div className="animate-fade-in relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.8)]">
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-ink-950" fill="currentColor" aria-hidden>
              <path d="M12 1.8 3.6 5.4v5.5c0 5.2 3.5 9.7 8.4 11.3 4.9-1.6 8.4-6.1 8.4-11.3V5.4L12 1.8Zm0 3.1 5.6 2.4v3.6c0 3.6-2.3 6.8-5.6 8.1-3.3-1.3-5.6-4.5-5.6-8.1V7.3L12 4.9Zm-1 3.7v3.3H8.4l3.6 4.5 3.6-4.5H13V8.6h-2Z" />
            </svg>
          </div>
          <p className="font-display text-[17px] font-extrabold tracking-tight text-white">
            AICTE <span className="text-saffron-400">Sentinel</span>
          </p>
        </div>

        <div className="relative z-10 max-w-[460px]">
          <h1
            className="animate-rise font-display text-[42px] font-extrabold leading-[1.04] tracking-[-0.045em] text-white xl:text-[48px]"
            style={{ animationDelay: "80ms" }}
          >
            Every grievance.
            <br />
            <TextReveal
              text="One command view."
              delayBase={240}
              wordClassName="gradient-pan-text bg-gradient-to-r from-brand-300 via-white to-saffron-300 bg-clip-text text-transparent"
            />
          </h1>

          <p
            className="animate-rise mt-5 max-w-[400px] text-[13px] leading-relaxed text-slate-400"
            style={{ animationDelay: "400ms" }}
          >
            AICTE&apos;s single source of truth for institutional complaints — across every
            Bureau, Cell, and Regional Office.
          </p>
        </div>

        <p
          className="animate-fade-in relative z-10 text-[10.5px] font-medium leading-relaxed text-slate-500"
          style={{ animationDelay: "560ms" }}
        >
          All India Council for Technical Education · Nelson Mandela Marg, Vasant Kunj, New Delhi 110070
        </p>
      </section>

      {/* Right form */}
      <section className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <ToastProvider>
          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
                Loading…
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </ToastProvider>
      </section>
    </div>
  );
}
