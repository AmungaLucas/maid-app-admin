"use client";

import { useState } from "react";
import { Alert, Bars, Card, PageHeader, Spinner, Stat } from "@/components/ui";
import { useApi } from "@/lib/api";
import { kes } from "@/lib/format";

type Metrics = {
  windowDays: number;
  metrics: {
    subscriptionConversion: number | null;
    applicationsPerMaidPerWeek: number | null;
    failedPaymentRate: number | null;
    pendingPayments: number;
    verificationCompletedWithin7d: number;
    signupCount: number;
    subscriptionBuyers: number;
    applications: number;
  };
  planPopularity: { plan: string; count: number; amountKes: number }[];
  revenueSeries: { date: string; amountKes: number; count: number }[];
  applicationSeries: { date: string; count: number }[];
  topJobs: { id: string; title: string; category: string; status: string; employer: string; applications: number }[];
};

export default function MetricsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useApi<Metrics>(`admin/metrics?days=${days}`);

  const downloadCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ["HelpNest metrics export"],
      [`window_days`, String(data.windowDays)],
      [],
      ["metric", "value"],
      ["subscription_conversion_pct", String(data.metrics.subscriptionConversion ?? "")],
      ["applications_per_maid_per_week", String(data.metrics.applicationsPerMaidPerWeek ?? "")],
      ["failed_payment_rate_pct", String(data.metrics.failedPaymentRate ?? "")],
      ["verification_completed_within_7d", String(data.metrics.verificationCompletedWithin7d)],
      ["signups", String(data.metrics.signupCount)],
      ["subscription_buyers", String(data.metrics.subscriptionBuyers)],
      ["applications", String(data.metrics.applications)],
      [],
      ["plan", "count", "revenue_kes"],
      ...data.planPopularity.map((p) => [p.plan, String(p.count), String(p.amountKes)]),
      [],
      ["date", "revenue_kes", "payments"],
      ...data.revenueSeries.map((r) => [r.date, String(r.amountKes), String(r.count)]),
      [],
      ["date", "applications"],
      ...data.applicationSeries.map((r) => [r.date, String(r.count)])
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `helpnest-metrics-${data.windowDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeader title="Metrics" sub="PRD §21.1 metric definitions computed live." />
        </div>
        <div className="flex gap-2 items-center">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                days === d ? "bg-brand-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d}d
            </button>
          ))}
          <button onClick={downloadCsv} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-600 hover:bg-slate-50">
            Export CSV
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              label="Subscription conversion"
              value={data.metrics.subscriptionConversion == null ? "—" : `${data.metrics.subscriptionConversion}%`}
              sub={`${data.metrics.subscriptionBuyers} buyers / ${data.metrics.signupCount} signups`}
              tone="good"
            />
            <Stat
              label="Applications / maid / week"
              value={data.metrics.applicationsPerMaidPerWeek ?? "—"}
              sub={`${data.metrics.applications} applications in ${data.windowDays}d`}
            />
            <Stat
              label="Failed payment rate"
              value={data.metrics.failedPaymentRate == null ? "—" : `${data.metrics.failedPaymentRate}%`}
              sub={`${data.metrics.pendingPayments} still pending`}
              tone={data.metrics.failedPaymentRate != null && data.metrics.failedPaymentRate > 30 ? "bad" : "default"}
            />
            <Stat
              label="Verified within 7 days"
              value={data.metrics.verificationCompletedWithin7d}
              sub="KYC completions (PRD §21.1)"
              tone="good"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title={`Revenue — last ${data.windowDays} days`}>
              <Bars data={data.revenueSeries} valueKey="amountKes" labelKey="date" fmt={(v) => kes(v)} />
            </Card>
            <Card title={`Applications — last ${data.windowDays} days`}>
              <Bars data={data.applicationSeries} valueKey="count" labelKey="date" />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Plan popularity (successful payments)">
              {data.planPopularity.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No purchases in this window.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {data.planPopularity.map((p) => (
                      <tr key={p.plan}>
                        <td className="py-2 font-mono text-xs text-brand-700">{p.plan}</td>
                        <td className="py-2 text-right">{p.count}</td>
                        <td className="py-2 text-right font-medium">{kes(p.amountKes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Top jobs by applications">
              {data.topJobs.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No jobs in this window.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {data.topJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="py-2">
                          <div className="font-medium truncate max-w-[220px]">{j.title}</div>
                          <div className="text-xs text-slate-400">{j.employer} · {j.category}</div>
                        </td>
                        <td className="py-2 text-right font-semibold">{j.applications}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
