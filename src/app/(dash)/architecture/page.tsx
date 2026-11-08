"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Card, Icon, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

// System architecture page — topology, live gateway health, resilience
// posture and the measured capacity snapshot. Read-only; admin-only (NAV).
// The live probe calls the PUBLIC /api/health endpoint through the
// /admin-api proxy (the gateway requires no token for it).

type Health = {
  success: boolean;
  message: string;
  database: string;
  build: string;
};

const COMPONENTS: { name: string; tech: string; host: string; role: string }[] = [
  {
    name: "Mobile app",
    tech: "Expo (React Native) SDK ~57",
    host: "Android APK / EAS build",
    role: "Clients — employers & workers (KYC, jobs, chat, payments)"
  },
  {
    name: "Admin dashboard",
    tech: "Next.js 14 + Tailwind",
    host: "Vercel (auto-deploy from GitHub)",
    role: "Operations console — RBAC roles admin / support / finance"
  },
  {
    name: "Edge / reverse proxy",
    tech: "LiteSpeed + TLS + bot verification",
    host: "gateway.jobready.co.ke (cPanel)",
    role: "TLS termination, connection cap, provider DoS shield"
  },
  {
    name: "API gateway",
    tech: "Node 20 + Express 4 + Helmet",
    host: "Passenger under cPanel (restart via tmp/restart.txt)",
    role: "All /api routes, JWT auth, RBAC, audit trail"
  },
  {
    name: "Database",
    tech: "MariaDB 10.11",
    host: "Same VPS (localhost), app pool limit 5, max_connections 151",
    role: "Users, jobs, chat, payments, admin_audit; slow-query log ON (2s)"
  },
  {
    name: "Media host",
    tech: "PHP (receive.php / stream.php)",
    host: "media.jobready.co.ke (cPanel + LiteSpeed)",
    role: "WebP variants shipped by HMAC-signed raw POST"
  },
  {
    name: "Outbound integrations",
    tech: "SMTP (noreply), SMS provider, M-Pesa Daraja",
    host: "External",
    role: "Email codes, OTP, STK push + idempotent callbacks"
  }
];

const POSTURE: { area: string; status: "done" | "partial" | "missing"; detail: string }[] = [
  { area: "Health checks", status: "done", detail: "GET /api/health pings MySQL, returns the build id, answers 503 when the DB is down." },
  { area: "DoS protection", status: "done", detail: "Provider edge verified live: sheds load from ~40+ concurrent connections and temp-bans flooding IPs across all ports." },
  { area: "Race-condition backstop", status: "done", detail: "UNIQUE keys on users.phone/email; UNIQUE(txn_id) makes M-Pesa replays idempotent; admin login throttle 10 fails / 10 min." },
  { area: "Rollback path", status: "done", detail: "Timestamped .bak app directories on the VPS + touch tmp/restart.txt restores an older build in seconds." },
  { area: "Caching", status: "partial", detail: "60s TTL account-status cache on the auth hot path; signed-URL media caching client-side. No response cache — not needed at current scale." },
  { area: "Rate limiting", status: "partial", detail: "In-memory fixed-window limiter (per-process) on OTP/email flows + admin login throttle. Resets on restart; single-process only." },
  { area: "Timeouts", status: "partial", detail: "MySQL connect 10s, media ship 12s, mobile client 15s. No server-side request timeout — the Passenger/Apache default applies." },
  { area: "Retries", status: "partial", detail: "Media ship retries once on network/5xx (4xx fail fast). DB / SMTP / SMS calls do not retry." },
  { area: "Circuit breakers", status: "missing", detail: "Outbound calls (DB/SMTP/SMS/M-Pesa) have no breaker; a hanging provider stalls only its own request path today." },
  { area: "Load balancing", status: "missing", detail: "Single Passenger process on a single VPS. Scale path: extra process + shared rate-limit store (Redis), or a second VPS behind DNS." },
  { area: "Queues", status: "missing", detail: "Email/SMS send inline and fail open. A small worker queue would decouple signup SMTP from request latency." },
  { area: "Monitoring / alerting", status: "missing", detail: "No uptime monitor or log alerting yet. The health endpoint is ready for an external pinger (UptimeRobot / Better Stack)." }
];

const STATUS_STYLE: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  partial: "bg-amber-50 text-amber-700 ring-amber-200/70",
  missing: "bg-rose-50 text-rose-700 ring-rose-200/70"
};

const CAPACITY = [
  { label: "Baseline (1 user)", value: "p50 247–285 ms", sub: "100% OK — mixed admin reads" },
  { label: "20 users", value: "78 rps · p95 282 ms", sub: "100% OK — linear scaling" },
  { label: "40 users", value: "146 rps · p95 285 ms", sub: "96% OK — edge starts shedding (403s)" },
  { label: "60+ users", value: "edge cap", sub: "resets / timeouts — provider shield, not app failure" }
];

export default function ArchitecturePage() {
  const { data, loading, error } = useHealth();
  const [probeMs, setProbeMs] = useState<number | null>(null);
  const [probing, setProbing] = useState(false);

  const probe = async () => {
    setProbing(true);
    const t0 = performance.now();
    try {
      await api.get<Health>("health");
      setProbeMs(Math.round(performance.now() - t0));
    } catch {
      setProbeMs(-1);
    }
    setProbing(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="System Architecture"
        sub="Topology, live health and resilience posture of the HelpNest platform."
      />

      {error && <Alert kind="error">{error}</Alert>}

      {/* Live health */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card title="API gateway">
          {loading ? (
            <Spinner />
          ) : data ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-slate-800">Online</span>
              </div>
              <div className="text-xs text-slate-500">build {data.build}</div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-sm text-slate-600">Unreachable</span>
            </div>
          )}
        </Card>
        <Card title="Database">
          {loading ? (
            <Spinner />
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    data?.database === "connected" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span className="text-sm font-medium text-slate-800 capitalize">
                  {data?.database || "unknown"}
                </span>
              </div>
              <div className="text-xs text-slate-500">MariaDB 10.11 · localhost</div>
            </div>
          )}
        </Card>
        <Card title="Round-trip probe">
          <div className="space-y-2">
            <button
              onClick={probe}
              disabled={probing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition disabled:opacity-60"
            >
              <Icon name="refresh" className={`w-4 h-4 ${probing ? "animate-spin" : ""}`} />
              Check now
            </button>
            <div className="text-xs text-slate-500">
              {probeMs === null
                ? "Measures gateway latency from your browser via /admin-api."
                : probeMs < 0
                  ? "Probe failed — gateway unreachable from this session."
                  : `${probeMs} ms through the dashboard proxy`}
            </div>
          </div>
        </Card>
      </div>

      {/* Topology */}
      <Card title="Topology">
        <div className="space-y-3 text-[13px]">
          <Row>
            <Node title="Mobile app" sub="Expo · employers & workers" tone="app" />
            <Node title="Admin dashboard" sub="Next.js · Vercel" tone="app" />
          </Row>
          <Arrow label="HTTPS · JSON API (15s client timeout)" />
          <Node
            title="LiteSpeed edge — gateway.jobready.co.ke"
            sub="TLS · bot verification · connection cap · DoS shield (verified in testing)"
            tone="edge"
          />
          <Arrow label="reverse proxy → Passenger" />
          <Node
            title="API gateway — Node 20 · Express"
            sub="JWT + RBAC · audit trail · in-memory rate limits · 60s status cache"
            tone="api"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Node title="MariaDB 10.11" sub="localhost · pool 5 · slow-query log ON" tone="db" />
            <Node title="media.jobready.co.ke" sub="PHP · HMAC-signed ship · WebP variants" tone="db" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Node title="SMTP noreply" sub="email codes · fail-open" tone="ext" />
            <Node title="SMS provider" sub="OTP" tone="ext" />
            <Node title="M-Pesa Daraja" sub="STK push · idempotent replays (UNIQUE txn_id)" tone="ext" />
          </div>
        </div>
      </Card>

      {/* Capacity snapshot */}
      <Card title="Capacity snapshot — measured 2026-11-08 (single source IP)">
        <div className="grid sm:grid-cols-4 gap-3">
          {CAPACITY.map((c) => (
            <div key={c.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">{c.value}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Full methodology, charts and the rerunnable test kit live in the perf suite — see the
          Architecture &amp; Resilience Test Report for commands and raw numbers.
        </p>
      </Card>

      {/* Component inventory */}
      <Card title="Components">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-2 font-medium">Component</th>
              <th className="py-2 font-medium">Technology</th>
              <th className="py-2 font-medium">Runs on</th>
              <th className="py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COMPONENTS.map((c) => (
              <tr key={c.name}>
                <td className="py-2 font-medium text-slate-800 whitespace-nowrap">{c.name}</td>
                <td className="py-2 text-slate-600">{c.tech}</td>
                <td className="py-2 text-slate-600">{c.host}</td>
                <td className="py-2 text-slate-600">{c.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Resilience posture */}
      <Card title="Resilience posture">
        <div className="space-y-2">
          {POSTURE.map((p) => (
            <div key={p.area} className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-0">
              <span
                className={`mt-0.5 shrink-0 inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
                  STATUS_STYLE[p.status]
                }`}
              >
                {p.status}
              </span>
              <div>
                <div className="text-sm font-medium text-slate-800">{p.area}</div>
                <div className="text-xs text-slate-500">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Minimal local hook — polls /admin-api/health every 60s. The gateway's
// /api/health is public, so no token is needed; failures must NOT redirect
// to /login (useApi's 401 handling does) — hence this local variant.
function useHealth() {
  const [state, setState] = useState<{ data: Health | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null
  });

  const load = useCallback(async () => {
    try {
      const d = await api.get<Health>("health");
      setState({ data: d, loading: false, error: null });
    } catch (e: any) {
      setState((prev) => ({ data: null, loading: false, error: e.message || "Health check failed." }));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  return state;
}

const TONES: Record<string, string> = {
  app: "border-brand-200 bg-brand-50",
  edge: "border-slate-300 bg-slate-50",
  api: "border-emerald-200 bg-emerald-50",
  db: "border-amber-200 bg-amber-50",
  ext: "border-slate-200 bg-white"
};

function Node({ title, sub, tone }: { title: string; sub: string; tone: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${TONES[tone]}`}>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pl-6">
      <span className="w-px h-5 bg-slate-300" />
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}
