"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEMO_USERS } from "@/lib/demo-data";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage("Invalid AICTE credentials. Please check your email and password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("Authentication error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    setErrorMessage("");

    signIn("credentials", {
      email: demoEmail,
      password: demoPass,
      redirect: false,
    }).then((res) => {
      if (res?.error) {
        setErrorMessage("Invalid credentials.");
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur-md px-6 py-8 shadow-2xl rounded-2xl border border-white/20 sm:px-10">
      {errorMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Direct Credentials Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Official Email Address
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@aicte.gov.in"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-hidden focus:ring-1 focus:ring-blue-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Password
          </label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-hidden focus:ring-1 focus:ring-blue-700"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-900 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-blue-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isLoading ? "Authenticating..." : "Sign In to Portal"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Quick Demo Role Switcher for Pairing & Review */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            1-Click Demo Logins by Role:
          </span>
          <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            RBAC Evaluator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleQuickLogin(u.email, u.password)}
              className="flex flex-col text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-700 hover:bg-blue-50/60 transition-all text-xs group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 group-hover:text-blue-900">
                  {u.name}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {u.bureau === "ALL" ? (u.region ? u.region : "HQ") : u.bureau.split("_")[0]}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                {u.designation}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>AICTE Secure Access with Role-Based Access Control</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Emblem & Brand */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-xl shadow-xl shadow-amber-400/20">
          AICTE
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          AICTE Portal Sign In
        </h2>
        <p className="mt-1 text-xs text-slate-300 font-medium max-w-sm mx-auto">
          Integrated Institution Complaint Monitoring and Status Dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <Suspense fallback={<div className="p-8 text-center text-white text-xs">Loading AICTE Portal...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
