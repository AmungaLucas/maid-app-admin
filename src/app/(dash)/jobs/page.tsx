"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardList,
  Empty,
  Field,
  inputCls,
  MCard,
  MRow,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  TableWrap,
  Td,
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { fmtDate, kes } from "@/lib/format";

type Job = {
  id: string;
  title: string;
  category: string;
  location_label: string | null;
  rate_kes: number | null;
  status: string;
  created_at: string;
  published_at: string | null;
  expires_at: string | null;
  employer_id: string;
  employer_name: string;
  employer_status: string;
  applicationsCount: number;
};

export default function JobsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState("");
  const [closing, setClosing] = useState<Job | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const query = `admin/jobs?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error, refetch } = useApi<{ jobs: Job[]; total: number; page: number; pageSize: number }>(query);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    setApplied(params.toString());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jobs"
        sub="Published listings and their applicants. Closing a listing is immediate and audit-trailed."
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-3 gap-2 items-end">
          <Field label="Search title / employer">
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="cleaning / Jane" />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {["open", "closed"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Button type="submit">Filter</Button>
        </form>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {data.jobs.length === 0 ? (
            <Empty>No jobs match.</Empty>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <CardList>
                {data.jobs.map((j) => (
                  <MCard key={j.id}>
                    <div className="font-medium text-slate-800">{j.title}</div>
                    <div className="text-xs text-slate-400 mb-2">{j.category} · {j.location_label || "—"}</div>
                    <MRow
                      label="Employer"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Link href={`/users/${j.employer_id}`} className="text-brand-700 hover:underline">{j.employer_name}</Link>
                          <Badge tone={statusTone(j.employer_status)}>{j.employer_status}</Badge>
                        </span>
                      }
                    />
                    <MRow label="Rate" value={j.rate_kes ? kes(j.rate_kes) : "—"} strong />
                    <MRow label="Applicants" value={j.applicationsCount} strong />
                    <MRow label="Status" value={<Badge tone={statusTone(j.status)}>{j.status}</Badge>} />
                    <MRow label="Window" value={j.expires_at ? `until ${fmtDate(j.expires_at)}` : "—"} />
                    {j.status !== "closed" && (
                      <div className="mt-2">
                        <Button small variant="ghost" onClick={() => setClosing(j)}>Close…</Button>
                      </div>
                    )}
                  </MCard>
                ))}
              </CardList>

              {/* sm+: table */}
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Job</Th><Th>Employer</Th><Th right>Rate</Th><Th right>Applicants</Th><Th>Status</Th><Th>Window</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.jobs.map((j) => (
                    <tr key={j.id}>
                      <Td>
                        <div className="font-medium">{j.title}</div>
                        <div className="text-xs text-slate-400">{j.category} · {j.location_label || "—"}</div>
                      </Td>
                      <Td>
                        <Link href={`/users/${j.employer_id}`} className="text-brand-700 hover:underline">{j.employer_name}</Link>
                        <div><Badge tone={statusTone(j.employer_status)}>{j.employer_status}</Badge></div>
                      </Td>
                      <Td right>{j.rate_kes ? kes(j.rate_kes) : "—"}</Td>
                      <Td right className="font-medium">{j.applicationsCount}</Td>
                      <Td><Badge tone={statusTone(j.status)}>{j.status}</Badge></Td>
                      <Td><span className="text-xs text-slate-500">{j.expires_at ? `until ${fmtDate(j.expires_at)}` : "—"}</span></Td>
                      <Td right>
                        {j.status !== "closed" && (
                          <Button small variant="ghost" onClick={() => setClosing(j)}>Close…</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </Card>
      )}

      <CloseModal
        job={closing}
        onClose={() => setClosing(null)}
        onDone={(text) => {
          setClosing(null);
          setMsg({ kind: "ok", text });
          refetch();
        }}
      />
    </div>
  );
}

function CloseModal({
  job,
  onClose,
  onDone
}: {
  job: Job | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!job) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/jobs/${job.id}/close`, { reason });
      onDone(d.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Close listing" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-sm text-slate-600 mb-3">
        Close <strong>“{job.title}”</strong> by {job.employer_name}? It disappears from the maid feed immediately.
        The employer can still see it in My Jobs.
      </p>
      <Field label="Reason (audit-trailed)">
        <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. prohibited listing — agency fee demanded (PRD §11.4)" />
      </Field>
      <Button variant="danger" disabled={busy || reason.trim().length < 3} onClick={submit}>
        {busy ? "Closing…" : "Close listing"}
      </Button>
    </Modal>
  );
}
