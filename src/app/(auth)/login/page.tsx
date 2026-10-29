"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEMO_USERS } from "@/lib/demo-data";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ScanLine,
  Network,
  Timer,
  Fingerprint,
  ArrowUpRight,
} from "lucide-react";

const roleMeta: Record<string, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-ink-900 text-white" },
  COMPETENT_AUTHORITY: { label: "Authority", className: "bg-saffron-500 text-ink-950" },
  REGULATION_OFFICER: { label: "RB", className: "bg-indigo-600 text-white" },
  PGRC_OFFICER: { label: "PGRC", className: "bg-sky-600 text-white" },
  BUREAU_OFFICER: { label: "AB", className: "bg-amber-500 text-ink-950" },
  REGIONAL_OFFICER: { label: "Region", className: "bg-teal-600 text-white" },
};

function safeCallbackUrl(value: string | null) {
  if (!value) return "/";
  // Only allow same-origin relative paths. Reject `//evil.example` and any
  // absolute URL so a crafted login link cannot bounce users off-site.
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

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
    <div className="w-full max-w-[460px]">
      <div className="mb-7 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600">
            <ShieldCheck className="h-5 w-5 text-ink-950" />
          </div>
          <div>
            <p className="font-display text-[16px] font-extrabold tracking-tight text-slate-900">
              AICTE <span className="text-saffron-600">Sentinel</span>
            </p>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Complaint Intelligence
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(6,10,20,0.35)] sm:p-8">
        <div className="mb-6">
          <span className="eyebrow text-brand-600">
            <Fingerprint className="h-3 w-3" /> Official access
          </span>
          <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950">
            Sign in to the command center
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
            Authorized AICTE officials only. All sessions are audited.
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

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="field-label">
              Official email address
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
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <span className="mb-1.5 text-[10.5px] font-semibold text-slate-400">
                SSO-ready
              </span>
            </div>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700"
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
                Access dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Demo role access
            </p>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-700">
              One-click sign in
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_USERS.map((u) => {
              const meta = roleMeta[u.role] ?? { label: "Officer", className: "bg-slate-600 text-white" };
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => quickLogin(u.email, u.password)}
                  disabled={isLoading}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_8px_20px_-10px_rgba(37,89,232,0.35)] disabled:opacity-60"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[9.5px] font-extrabold ${meta.className}`}
                  >
                    {u.name
                      .split(" ")
                      .filter(Boolean)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                      <span className="truncate">{u.name}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[9.5px] font-medium text-slate-400">
                      {u.designation}
                    </span>
                  </span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-[10.5px] font-medium text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>RBAC enforced · JWT session · Rate-limited · Audit logged</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const highlights = [
    {
      icon: Network,
      title: "Cross-bureau overlap detection",
      text: "Trilayer matching catches the same institution under different IDs, names, and categories.",
    },
    {
      icon: Timer,
      title: "Statutory SLA countdowns",
      text: "Category-aware timelines with amber/red escalation before a grievance goes stale.",
    },
    {
      icon: ScanLine,
      title: "One live operating picture",
      text: "Every bureau, region, and case stream in a single auditable source of truth.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left brand rail */}
      <section className="hero-mesh relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        {/* Photorealistic AICTE HQ Building Backdrop */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000"
          style={{
            backgroundImage: "url('/images/aicte-hq.webp')",
            filter: "contrast(1.1) brightness(0.36) saturate(1.12)",
          }}
          aria-hidden="true"
        />
        {/* Cinematic gradient wash for maximum legibility */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/50"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,118,246,0.35),transparent_65%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.2),transparent_60%)]"
          aria-hidden="true"
        />

        <span className="hero-scan" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.8)]">
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] text-ink-950" fill="currentColor" aria-hidden>
              <path d="M12 1.8 3.6 5.4v5.5c0 5.2 3.5 9.7 8.4 11.3 4.9-1.6 8.4-6.1 8.4-11.3V5.4L12 1.8Zm0 3.1 5.6 2.4v3.6c0 3.6-2.3 6.8-5.6 8.1-3.3-1.3-5.6-4.5-5.6-8.1V7.3L12 4.9Zm-1 3.7v3.3H8.4l3.6 4.5 3.6-4.5H13V8.6h-2Z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-[17px] font-extrabold tracking-tight text-white">
              AICTE <span className="text-saffron-400">Sentinel</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Integrated complaint intelligence
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-[540px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            National grievance grid · Live
          </span>

          <h1 className="mt-6 font-display text-[46px] font-extrabold leading-[1.02] tracking-[-0.045em] text-white xl:text-[54px]">
            Every grievance.
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-white to-saffron-300 bg-clip-text text-transparent">
              One command view.
            </span>
          </h1>

          <p className="mt-5 max-w-[460px] text-[13.5px] leading-relaxed text-slate-400">
            AICTE&apos;s single source of truth for institutional complaints — ending duplicated
            effort, parallel inquiries, and silent SLA breaches across every Bureau and Regional
            Office.
          </p>

          <div className="mt-8 space-y-3.5">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-brand-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-100">{h.title}</p>
                    <p className="mt-0.5 max-w-[400px] text-[10.5px] leading-relaxed text-slate-500">
                      {h.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-sm">
            {[
              { value: "300+", label: "Active grievances" },
              { value: "5", label: "Regional offices" },
              { value: "4", label: "Bureaus unified" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-[22px] font-extrabold tracking-tight text-white">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[9.5px] font-medium leading-relaxed text-slate-600">
            All India Council for Technical Education · Nelson Mandela Marg, Vasant Kunj, New Delhi 110070
          </p>
        </div>
      </section>

      {/* Right form */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        {/* Subtle ambient watermark on form backdrop */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[620px] select-none bg-contain bg-right-top bg-no-repeat opacity-[0.032] dark:opacity-[0.042]"
          style={{
            backgroundImage: "url('/images/aicte-hq.webp')",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
          aria-hidden="true"
        />
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
              Loading secure portal…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
