"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Icon, inputCls } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/admin-api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        router.replace("/");
        router.refresh();
      } else {
        setError(data.message || "Login failed.");
      }
    } catch {
      setError("Could not reach the gateway. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Brand panel (desktop) */}
      <div className="hidden lg:flex lg:w-[46%] relative bg-ink-900 flex-col justify-between p-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px 400px at 15% 15%, rgba(16,185,129,.22), transparent 60%), radial-gradient(500px 380px at 85% 80%, rgba(56,189,248,.12), transparent 60%)"
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 items-center justify-center shadow-glow">
            <Icon name="shield" className="w-5 h-5 text-white" strokeWidth={2} />
          </span>
          <div>
            <div className="text-white font-semibold tracking-tight">JobReady Admin</div>
            <div className="text-xs text-slate-500">HelpNest operations console</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight">
            The whole marketplace,
            <br />
            <span className="text-brand-400">one console.</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400 leading-6">
            Users, KYC, pricing, M-Pesa payments and manual refunds, jobs moderation
            and the full audit trail — governed by role, logged on every action.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: "users", label: "Users & dossiers" },
              { icon: "wallet", label: "M-Pesa + refunds" },
              { icon: "metrics", label: "PRD §21 metrics" }
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-2xl bg-white/[0.05] ring-1 ring-inset ring-white/[0.07] px-3.5 py-3"
              >
                <Icon name={f.icon} className="w-5 h-5 text-brand-400" />
                <div className="mt-2 text-[11px] font-medium text-slate-300 leading-4">
                  {f.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} JobReady · jobready.co.ke
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div
          className="absolute inset-0 lg:opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(500px 300px at 80% 0%, rgba(16,185,129,.10), transparent 55%)"
          }}
        />
        <div className="relative w-full max-w-sm">
          {/* Compact brand for mobile */}
          <div className="lg:hidden text-center mb-8">
            <span className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 items-center justify-center shadow-glow">
              <Icon name="shield" className="w-6 h-6 text-white" strokeWidth={2} />
            </span>
            <h1 className="mt-3 text-lg font-semibold text-slate-900">JobReady Admin</h1>
            <p className="text-sm text-slate-500">Operations console</p>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use your dashboard account — admin, support or finance.
          </p>

          <form
            onSubmit={submit}
            className="mt-6 bg-white border border-slate-200/80 rounded-2xl shadow-lift p-6 animate-scale-in"
          >
            {error && <Alert kind="error">{error}</Alert>}

            <Field label="Email">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <Icon name="users" className="w-4 h-4" />
                </span>
                <input
                  className={`${inputCls} pl-10`}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@jobready.co.ke"
                  required
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <Icon name="team" className="w-4 h-4" />
                </span>
                <input
                  className={`${inputCls} pl-10`}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </Field>

            <Button type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <Icon name="chevronRight" className="w-4 h-4" />}
            </Button>

            <p className="mt-4 text-[11px] text-slate-400 leading-5">
              Sessions last 12 hours. Every sign-in is recorded in the audit
              trail (PRD §19.2).
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
