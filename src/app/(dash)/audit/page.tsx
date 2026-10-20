"use client";

import { useState } from "react";
import { Badge, Card, Empty, PageHeader, Pagination, Spinner, Td, Th } from "@/components/ui";
import { useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Entry = {
  id: number;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  before: any;
  after: any;
  created_at: string;
};

function pretty(json: any): string {
  if (json == null) return "—";
  return JSON.stringify(json, null, 1);
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [applied, setApplied] = useState("");

  const query = `admin/audit?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error } = useApi<{ entries: Entry[]; total: number; page: number; pageSize: number }>(query);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    setApplied(params.toString());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit trail"
        sub="Every privileged dashboard action with actor, reason and before/after (PRD §19.2). Immutable."
      />

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-3 gap-2 items-end">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Action</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="plan.update"
              list="actions"
            />
            <datalist id="actions">
              {["auth.login", "plan.create", "plan.update", "pay_options.update", "user.status", "credit.grant", "credit.revoke", "transaction.reverse", "transaction.reverse_failed", "kyc.approve", "kyc.reject", "job.close", "admin.create", "admin.deactivate"].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Actor email</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="admin@jobready.co.ke"
            />
          </label>
          <button type="submit" className="px-3.5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">
            Filter
          </button>
        </form>
      </Card>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {data.entries.length === 0 ? (
            <Empty>No audit entries match.</Empty>
          ) : (
            <div className="overflow-x-auto -mx-4 -my-4">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Target</Th><Th>Reason</Th><Th>Changes</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entries.map((e) => (
                    <tr key={e.id}>
                      <Td><span className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(e.created_at)}</span></Td>
                      <Td>
                        <div className="text-sm">{e.actor_email}</div>
                        <Badge tone={e.actor_role === "admin" ? "blue" : e.actor_role === "finance" ? "green" : "violet"}>{e.actor_role}</Badge>
                      </Td>
                      <Td><span className="font-mono text-xs text-brand-700">{e.action}</span></Td>
                      <Td>
                        <div className="text-xs">{e.target_type || "—"}</div>
                        <div className="font-mono text-[10px] text-slate-400">{e.target_id ? e.target_id.slice(0, 12) : ""}</div>
                      </Td>
                      <Td><span className="text-xs text-slate-600 max-w-[220px] block">{e.reason || "—"}</span></Td>
                      <Td>
                        {(e.before || e.after) && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">view</summary>
                            <pre className="mt-1 bg-slate-50 rounded p-2 overflow-x-auto max-w-xs whitespace-pre-wrap">{e.before ? pretty(e.before) : ""}{e.after ? pretty(e.after) : ""}</pre>
                          </details>
                        )}
                        {!e.before && !e.after && "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
