"use client";

import { Bars, Card, Stat, Spinner, Alert, Badge, PageHeader, Icon } from "@/components/ui";
import { useApi } from "@/lib/api";
import { fmtDate, kes } from "@/lib/format";

type Overview = {
  users: {
    total: number;
    verified: number;
    byRole: Record<string, { total: number; verified: number; suspended: number; restricted: number }>;
  };
  revenue: {
    todayKes: number;
    todayCount: number;
    last7dKes: number;
    last7dCount: number;
    failedLast7d: number;
  };
  activeSubscriptions: number;
  pendingKyc: number;
  openJobs: number;
  pendingReversals: number;
  revenueSeries: { date: string; amountKes: number; count: number }[];
  signupSeries: { date: string; count: number }[];
  recentAudit: {
    id: number;
    actor_email: string;
    actor_role: string;
    action: string;
    reason: string | null;
    created_at: string;
  }[];
};

export default function OverviewPage() {
  const { data, loading, error } = useApi<Overview>("admin/overview");

  if (loading) return <Spinner />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return null;

  const maids = data.users.byRole.maid || { total: 0, verified: 0, suspended: 0, restricted: 0 };
  const employers = data.users.byRole.employer || { total: 0, verified: 0, suspended: 0, restricted: 0 };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        sub="Live platform health and revenue."
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Icon name="clock" className="w-3.5 h-3.5" /> auto-refreshes on reload
          </span>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Users" value={data.users.total} sub={`${maids.total} maids · ${employers.total} employers`} icon="users" />
        <Stat
          label="Revenue today"
          value={kes(data.revenue.todayKes)}
          sub={`${data.revenue.todayCount} payment${data.revenue.todayCount === 1 ? "" : "s"}`}
          tone="good"
          icon="wallet"
        />
        <Stat
          label="Revenue 7 days"
          value={kes(data.revenue.last7dKes)}
          sub={`${data.revenue.last7dCount} payments`}
          tone="good"
          icon="activity"
        />
        <Stat
          label="Failed payments 7d"
          value={data.revenue.failedLast7d}
          tone={data.revenue.failedLast7d > 5 ? "bad" : "default"}
          icon="alert"
        />
        <Stat label="Active subscriptions" value={data.activeSubscriptions} sub="7-day plans live now" icon="verified" />
        <Stat
          label="Pending KYC"
          value={data.pendingKyc}
          tone={data.pendingKyc > 0 ? "warn" : "default"}
          sub={data.pendingKyc > 0 ? "needs review" : "queue clear"}
          icon="kyc"
        />
        <Stat label="Open jobs" value={data.openJobs} sub="within 30-day window" icon="jobs" />
        <Stat
          label="Pending reversals"
          value={data.pendingReversals}
          tone={data.pendingReversals > 0 ? "warn" : "default"}
          sub="M-Pesa money-back in flight"
          icon="transactions"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Revenue — last 14 days">
          <Bars data={data.revenueSeries} valueKey="amountKes" labelKey="date" fmt={(v) => kes(v)} />
        </Card>
        <Card title="Signups — last 14 days">
          <Bars data={data.signupSeries} valueKey="count" labelKey="date" />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Verification">
          <div className="space-y-2.5 text-sm">
            <Row label="Maids verified" value={`${maids.verified} / ${maids.total}`} />
            <Row label="Employers verified" value={`${employers.verified} / ${employers.total}`} />
            <Row label="Suspended accounts" value={maids.suspended + employers.suspended} />
            <Row label="Restricted accounts" value={maids.restricted + employers.restricted} />
          </div>
        </Card>

        <Card title="Recent dashboard activity" className="lg:col-span-2">
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No dashboard actions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentAudit.map((a) => (
                <li key={a.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-700 break-all">{a.actor_email}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="font-mono text-xs text-brand-700 break-all">{a.action}</span>
                    {a.reason && <span className="block text-xs text-slate-400 truncate">“{a.reason}”</span>}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap tnum shrink-0">{fmtDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
