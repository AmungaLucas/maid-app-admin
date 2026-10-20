"use client";

import { useState } from "react";
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
  Spinner,
  Stat,
  TableWrap,
  Td,
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi, roleFromCookie } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fmtDate, kes } from "@/lib/format";

type Promo = {
  id: string;
  user_id: string;
  kind: "profile_boost" | "urgent" | "spotlight" | "fast_track";
  target_type: string;
  target_id: string | null;
  txn_id: string;
  status: "active" | "expired" | "cancelled" | "refunded";
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  user_name: string;
  user_role: string;
  amount_kes: number | null;
  mpesa_receipt: string | null;
  job_title: string | null;
  overdue: boolean;
};

const KIND_LABELS: Record<string, string> = {
  profile_boost: "Profile boost (7d)",
  urgent: "Urgent boost (24h)",
  spotlight: "Spotlight (24h)",
  fast_track: "Fast-track (6h SLA)"
};

function tone(status: string, overdue?: boolean) {
  if (overdue) return "red" as const;
  if (status === "active") return "green" as const;
  if (status === "cancelled") return "red" as const;
  if (status === "refunded") return "slate" as const;
  return "amber" as const;
}

export default function PromotionsPage() {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState("");
  const [cancelling, setCancelling] = useState<Promo | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const { data, loading, error, refetch } = useApi<{
    stats: { byKind: { kind: string; active: number; total: number }[]; fastTrackOverdue: number };
    promotions: Promo[];
  }>(`admin/promotions${applied ? `?${applied}` : ""}`);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayCancel = can.promotionCancel(role);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (status) params.set("status", status);
    setApplied(params.toString());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Promotions"
        sub="Paid visibility products (PRD §5, §18). Fast-tracks past their 6-hour SLA with KYC still pending are flagged for a manual refund or credit."
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {["profile_boost", "urgent", "spotlight", "fast_track"].map((k) => {
            const s = data.stats.byKind.find((x) => x.kind === k);
            return (
              <Stat
                key={k}
                label={KIND_LABELS[k].split(" (")[0]}
                value={s ? s.active : 0}
                sub={`${s ? s.total : 0} lifetime`}
                icon="boost"
              />
            );
          })}
          <Stat
            label="Fast-track overdue"
            value={data.stats.fastTrackOverdue}
            tone={data.stats.fastTrackOverdue > 0 ? "warn" : "default"}
            sub="SLA missed — refund/credit due"
            icon="alert"
          />
        </div>
      )}

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-3 gap-2 items-end">
          <Field label="Kind">
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All kinds</option>
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["active", "expired", "cancelled", "refunded"].map((s) => (
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
          {data.promotions.length === 0 ? (
            <Empty>No promotions match.</Empty>
          ) : (
            <>
              <CardList>
                {data.promotions.map((p) => (
                  <MCard key={p.id}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-medium text-slate-800 truncate">{p.user_name}</span>
                      <Badge tone={tone(p.status, p.overdue)}>
                        {p.overdue ? "SLA overdue" : p.status}
                      </Badge>
                    </div>
                    <MRow label="Product" value={KIND_LABELS[p.kind] || p.kind} />
                    <MRow
                      label="Target"
                      value={p.target_type === "job" ? (p.job_title || p.target_id?.slice(0, 8)) : p.target_type}
                    />
                    <MRow label="Amount" value={p.amount_kes != null ? kes(p.amount_kes) : "—"} />
                    <MRow label="Window" value={`${fmtDate(p.starts_at)} → ${p.ends_at ? fmtDate(p.ends_at) : "—"}`} />
                    {mayCancel && p.status === "active" && (
                      <div className="mt-2">
                        <Button small variant="ghost" onClick={() => setCancelling(p)}>Cancel placement…</Button>
                      </div>
                    )}
                  </MCard>
                ))}
              </CardList>

              <TableWrap>
                <thead>
                  <tr>
                    <Th>User</Th><Th>Product</Th><Th>Target</Th><Th>Amount</Th><Th>Status</Th><Th>Window</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.promotions.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <div className="font-medium">{p.user_name}</div>
                        <div className="text-xs text-slate-400">{p.user_role}</div>
                      </Td>
                      <Td>{KIND_LABELS[p.kind] || p.kind}</Td>
                      <Td className="max-w-[180px] truncate">
                        {p.target_type === "job" ? (p.job_title || p.target_id?.slice(0, 8)) : p.target_type}
                      </Td>
                      <Td right>{p.amount_kes != null ? kes(p.amount_kes) : "—"}</Td>
                      <Td><Badge tone={tone(p.status, p.overdue)}>{p.overdue ? "SLA overdue" : p.status}</Badge></Td>
                      <Td><span className="text-xs text-slate-500">{fmtDate(p.starts_at)} → {p.ends_at ? fmtDate(p.ends_at) : "—"}</span></Td>
                      <Td right>
                        {mayCancel && p.status === "active" && (
                          <Button small variant="ghost" onClick={() => setCancelling(p)}>Cancel…</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
        </Card>
      )}

      <CancelModal
        promo={cancelling}
        onClose={() => setCancelling(null)}
        onDone={(text, kind2) => {
          setCancelling(null);
          setMsg({ kind: kind2, text });
          refetch();
        }}
      />
    </div>
  );
}

function CancelModal({
  promo,
  onClose,
  onDone
}: {
  promo: Promo | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!promo) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/promotions/${promo.id}/cancel`, { reason });
      onDone(d.message, "ok");
    } catch (e: any) {
      setErr(e.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Cancel promotion" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-sm text-slate-600 mb-3">
        Stop the paid placement for <strong>{promo.user_name}</strong> ({KIND_LABELS[promo.kind]}) now? The
        purchase record stays in Transactions — if this is a delivery failure, process the remedy from the
        manual refund flow there (PRD §14.6).
      </p>
      <Field label="Reason (required, audit-trailed)">
        <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. promoted job was actually suspended — refunding" />
      </Field>
      <Button variant="danger" disabled={busy || reason.trim().length < 5} onClick={submit}>
        {busy ? "Cancelling…" : "Cancel placement"}
      </Button>
    </Modal>
  );
}
