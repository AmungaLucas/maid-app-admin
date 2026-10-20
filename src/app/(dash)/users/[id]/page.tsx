"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  inputCls,
  Modal,
  Spinner,
  Td,
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { can } from "@/lib/permissions";
import { roleFromCookie } from "@/lib/api";
import { fmtDate, kes, shortId } from "@/lib/format";

type Entitlement = {
  id: string;
  kind: string;
  source: string;
  target_user_id: string | null;
  expires_at: string | null;
  consumed_at: string | null;
  status: string;
  created_at: string;
};

type Txn = {
  id: string;
  plan: string;
  amount_kes: number;
  phone: string;
  status: string;
  mpesa_receipt: string | null;
  created_at: string;
  reversal_id: string | null;
};

type Dossier = {
  user: {
    id: string;
    role: string;
    name: string;
    phone: string;
    email: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    kycStatus: string;
    accountStatus: string;
    locationLabel: string | null;
    createdAt: string;
  };
  profile: any;
  entitlements: Entitlement[];
  transactions: Txn[];
  jobs: any[];
  applications: any[];
  audit: {
    id: number;
    actor_email: string;
    action: string;
    reason: string | null;
    created_at: string;
  }[];
};

export default function UserDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const { data, loading, error, refetch } = useApi<Dossier>(`admin/users/${id}`);

  const [statusOpen, setStatusOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const actionsAllowed = can.userActions(role);

  if (loading) return <Spinner />;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!data) return null;

  const u = data.user;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/users" className="text-xs text-slate-400 hover:text-slate-600">← All users</Link>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            {u.name}
            <Badge tone={u.role === "maid" ? "violet" : "blue"}>{u.role}</Badge>
            <Badge tone={statusTone(u.kycStatus)}>{u.kycStatus}</Badge>
            <Badge tone={statusTone(u.accountStatus)}>{u.accountStatus}</Badge>
          </h1>
          <p className="text-sm text-slate-500">
            {u.phone} · {u.email} · joined {fmtDate(u.createdAt)}
          </p>
        </div>
        {actionsAllowed && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStatusOpen(true)}>Change status…</Button>
            <Button variant="ghost" onClick={() => setCreditOpen(true)}>Adjust credits…</Button>
          </div>
        )}
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Profile">
          <dl className="text-sm space-y-1.5">
            <Row label="Phone verified" value={u.phoneVerified ? "Yes" : "No"} />
            <Row label="Email verified" value={u.emailVerified ? "Yes" : "No"} />
            <Row label="Location" value={u.locationLabel || "—"} />
            <Row label="ID" value={<span className="font-mono text-xs">{u.id}</span>} />
            {u.role === "maid" && data.profile && (
              <>
                <Row label="Title" value={data.profile.title || "—"} />
                <Row label="Experience" value={data.profile.experienceYears ? `${data.profile.experienceYears} yrs` : "—"} />
                <Row label="Rate" value={data.profile.rateKes ? kes(data.profile.rateKes) : "—"} />
              </>
            )}
          </dl>
        </Card>

        <Card title="Entitlements" className="lg:col-span-2">
          <EntitlementTable rows={data.entitlements} />
        </Card>
      </div>

      <Card title="M-Pesa transactions">
        {data.transactions.length === 0 ? (
          <Empty>No payments.</Empty>
        ) : (
          <div className="overflow-x-auto -mx-4 -my-4">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr>
                  <Th>Txn</Th><Th>Plan</Th><Th right>Amount</Th><Th>Status</Th><Th>Receipt</Th><Th>Refund</Th><Th>When</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <Td mono>{shortId(t.id)}</Td>
                    <Td>{t.plan}</Td>
                    <Td right>{kes(t.amount_kes)}</Td>
                    <Td><Badge tone={statusTone(t.status)}>{t.status}</Badge></Td>
                    <Td mono>{t.mpesa_receipt || "—"}</Td>
                    <Td>{t.reversal_id ? <Badge tone="amber">in flight</Badge> : "—"}</Td>
                    <Td><span className="text-xs text-slate-500">{fmtDate(t.created_at)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {u.role === "employer" && (
        <Card title="Jobs posted">
          {data.jobs.length === 0 ? (
            <Empty>No jobs.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.jobs.map((j) => (
                <li key={j.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{j.title} <span className="text-slate-400">· {j.category}</span></span>
                  <span className="flex items-center gap-2">
                    <Badge tone={statusTone(j.status)}>{j.status}</Badge>
                    <span className="text-xs text-slate-400">{j.applicationsCount} apps</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {u.role === "maid" && (
        <Card title="Applications">
          {data.applications.length === 0 ? (
            <Empty>No applications.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.applications.map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{a.job_title} <span className="text-slate-400">· {kes(a.job_rate)}</span></span>
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card title="Dashboard actions on this user">
        {data.audit.length === 0 ? (
          <Empty>No dashboard actions recorded.</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.audit.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="font-mono text-xs text-brand-700">{a.action}</span>
                <span className="text-slate-400"> by {a.actor_email}</span>
                {a.reason && <span className="block text-xs text-slate-400">“{a.reason}”</span>}
                <span className="block text-xs text-slate-300">{fmtDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <StatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        current={u.accountStatus}
        onDone={(text) => {
          setMsg({ kind: "ok", text });
          setStatusOpen(false);
          refetch();
        }}
        userId={u.id}
      />

      <CreditsModal
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
        onDone={(text) => {
          setMsg({ kind: "ok", text });
          setCreditOpen(false);
          refetch();
        }}
        userId={u.id}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function EntitlementTable({ rows }: { rows: Entitlement[] }) {
  if (!rows.length) return <Empty>No credits or passes.</Empty>;
  return (
    <div className="overflow-x-auto -mx-4 -my-4">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr>
            <Th>Kind</Th><Th>Source</Th><Th>Status</Th><Th>Expires</Th><Th>Consumed</Th><Th>Granted</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((e) => (
            <tr key={e.id}>
              <Td><Badge tone={e.kind === "chat" ? "blue" : e.kind === "apply" ? "violet" : "green"}>{e.kind}</Badge></Td>
              <Td mono>{e.source}</Td>
              <Td><Badge tone={e.status === "active" ? "green" : e.status === "revoked" ? "red" : "slate"}>{e.status}</Badge></Td>
              <Td><span className="text-xs">{e.expires_at ? fmtDate(e.expires_at) : "never"}</span></Td>
              <Td><span className="text-xs">{e.consumed_at ? fmtDate(e.consumed_at) : "—"}</span></Td>
              <Td><span className="text-xs text-slate-500">{fmtDate(e.created_at)}</span></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusModal({
  open,
  onClose,
  current,
  onDone,
  userId
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  onDone: (msg: string) => void;
  userId: string;
}) {
  const [status, setStatus] = useState(current === "active" ? "restricted" : "active");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/users/${userId}/status`, { status, reason });
      onDone(d.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Change account status" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <Field label="New status" hint="Suspended blocks every API call for this user (PRD §3.2). Restricted is recorded and surfaced; per-action limits land later.">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["active", "restricted", "suspended"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Reason (required, audit-trailed)">
        <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this status changing?" />
      </Field>
      <Button onClick={submit} disabled={busy || reason.trim().length < 3} variant={status === "suspended" ? "danger" : "primary"}>
        {busy ? "Saving…" : `Set ${status}`}
      </Button>
    </Modal>
  );
}

function CreditsModal({
  open,
  onClose,
  onDone,
  userId
}: {
  open: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
  userId: string;
}) {
  const [action, setAction] = useState<"grant" | "revoke">("grant");
  const [kind, setKind] = useState("apply");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/users/${userId}/credits`, {
        action,
        kind,
        qty: Number(qty),
        reason
      });
      onDone(d.message);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Adjust credits" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Action">
          <select className={inputCls} value={action} onChange={(e) => setAction(e.target.value as any)}>
            <option value="grant">Grant (never expire)</option>
            <option value="revoke">Revoke (oldest unconsumed)</option>
          </select>
        </Field>
        <Field label="Credit kind">
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="apply">apply (job applications)</option>
            <option value="chat">chat (new conversations)</option>
            <option value="job_post">job_post (publish listings)</option>
          </select>
        </Field>
      </div>
      <Field label="Quantity (1-50)">
        <input className={inputCls} type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
      </Field>
      <Field label="Reason (required, audit-trailed)" hint="PRD §7.4 — manual adjustments need a recorded reason.">
        <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. goodwill credit — payment failed but action completed" />
      </Field>
      <Button onClick={submit} disabled={busy || reason.trim().length < 3}>
        {busy ? "Working…" : action === "grant" ? "Grant credits" : "Revoke credits"}
      </Button>
    </Modal>
  );
}
