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
  Pagination,
  Spinner,
  TableWrap,
  Td,
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi, roleFromCookie } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fmtDate, kes, shortId } from "@/lib/format";

type Txn = {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  plan: string;
  amount_kes: number;
  phone: string;
  status: string;
  result_desc: string | null;
  mpesa_receipt: string | null;
  created_at: string;
  reversal_status: string | null;
  refund_status: string | null;
  refund_reference: string | null;
  refund_requested_at: string | null;
  refund_requested_reason: string | null;
  refunded_at: string | null;
};

const REFUND_TONE: Record<string, "amber" | "red" | "green" | "slate"> = {
  requested: "amber",
  approved: "amber",
  completed: "red",
  rejected: "slate"
};

export default function TransactionsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [refund, setRefund] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState("");
  const [refunding, setRefunding] = useState<Txn | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  const query = `admin/transactions?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error, refetch } = useApi<{ transactions: Txn[]; total: number; page: number; pageSize: number }>(query);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayRefund = can.reverse(role); // admin | finance

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (plan) params.set("plan", plan);
    if (refund) params.set("refund", refund);
    setApplied(params.toString());
  };

  const refundChip = (t: Txn) => {
    const rs = t.refund_status || "none";
    if (t.reversal_status === "pending") return <Badge tone="amber">legacy reversing…</Badge>;
    if (t.reversal_status === "success") return <Badge tone="red">reversed (legacy)</Badge>;
    if (rs === "none") return <span className="text-slate-300">—</span>;
    return <Badge tone={REFUND_TONE[rs] || "slate"}>{rs}</Badge>;
  };

  const openable = (t: Txn) =>
    mayRefund && t.status === "success" && ["requested", "approved"].includes(t.refund_status || "none");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        sub="Every M-Pesa STK attempt. Refunds are handled manually — move the money from the till, then record the reference here."
      />

      {msg && <Alert kind={msg.kind === "info" ? "info" : msg.kind}>{msg.text}</Alert>}

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-5 gap-2 items-end">
          <Field label="Search receipt / phone / user">
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="QGH7… / 2547…" />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {["success", "pending", "failed", "timeout"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Plan">
            <input className={inputCls} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="emp_gold" />
          </Field>
          <Field label="Refund">
            <select className={inputCls} value={refund} onChange={(e) => setRefund(e.target.value)}>
              <option value="">All</option>
              {["requested", "approved", "completed", "rejected", "none"].map((s) => (
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
          {data.transactions.length === 0 ? (
            <Empty>No transactions match.</Empty>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <CardList>
                {data.transactions.map((t) => (
                  <MCard key={t.id}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-medium text-slate-800 truncate">{t.user_name}</span>
                      <span className="font-semibold tnum">{kes(t.amount_kes)}</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{t.phone} · {t.user_role}</div>
                    <MRow label="Plan" value={t.plan} />
                    <MRow label="Status" value={<Badge tone={statusTone(t.status)}>{t.status}</Badge>} />
                    <MRow label="Receipt" value={<span className="font-mono text-xs">{t.mpesa_receipt || "—"}</span>} />
                    <MRow label="Refund" value={refundChip(t)} />
                    {t.refund_requested_reason && t.refund_status !== "completed" && (
                      <p className="mt-1.5 text-[11px] text-slate-500 bg-amber-50 border border-amber-100 rounded p-1.5 break-words">
                        “{t.refund_requested_reason}”
                      </p>
                    )}
                    <MRow label="When" value={fmtDate(t.created_at)} />
                    {openable(t) && (
                      <div className="mt-2">
                        <Button small variant="ghost" onClick={() => setRefunding(t)}>Handle refund…</Button>
                      </div>
                    )}
                  </MCard>
                ))}
              </CardList>

              {/* sm+: table */}
              <TableWrap>
                <thead>
                  <tr>
                    <Th>User</Th><Th>Plan</Th><Th right>Amount</Th><Th>Status</Th><Th>Receipt</Th><Th>Refund</Th><Th>When</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.transactions.map((t) => (
                    <tr key={t.id}>
                      <Td>
                        <div className="font-medium">{t.user_name}</div>
                        <div className="text-xs text-slate-400">{t.phone} · {t.user_role}</div>
                      </Td>
                      <Td>{t.plan}</Td>
                      <Td right className="font-semibold">{kes(t.amount_kes)}</Td>
                      <Td>
                        <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                        {t.result_desc && t.status !== "success" && (
                          <div className="text-[10px] text-slate-400 max-w-[180px] truncate" title={t.result_desc}>{t.result_desc}</div>
                        )}
                      </Td>
                      <Td mono>{t.mpesa_receipt || "—"}</Td>
                      <Td>
                        {refundChip(t)}
                        {t.refund_status === "completed" && t.refund_reference && (
                          <div className="text-[10px] font-mono text-slate-400">{t.refund_reference}</div>
                        )}
                      </Td>
                      <Td><span className="text-xs text-slate-500">{fmtDate(t.created_at)}</span></Td>
                      <Td right>
                        {openable(t) && (
                          <Button small variant="ghost" onClick={() => setRefunding(t)}>Handle refund…</Button>
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

      <RefundModal
        txn={refunding}
        onClose={() => setRefunding(null)}
        onDone={(text, kind) => {
          setRefunding(null);
          setMsg({ kind, text });
          refetch();
        }}
      />
    </div>
  );
}

function RefundModal({
  txn,
  onClose,
  onDone
}: {
  txn: Txn | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!txn) return null;

  const rs = txn.refund_status || "none";
  const canComplete = rs === "requested" || rs === "approved";
  const reasonOk = reason.trim().length >= 5;

  const submit = async (action: "approve" | "complete" | "reject") => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/transactions/${txn.id}/refund`, {
        action,
        reason,
        ...(action === "complete" ? { reference } : {})
      });
      onDone(d.message, "ok");
    } catch (e: any) {
      setErr(e.message || "Refund action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Manual refund" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}

      <div className="bg-slate-50 rounded-lg p-3 text-sm mb-3 space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">User</span><span>{txn.user_name} ({txn.phone})</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Plan</span><span>{txn.plan}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-semibold">{kes(txn.amount_kes)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Receipt</span><span className="font-mono">{txn.mpesa_receipt || "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Refund state</span><Badge tone={REFUND_TONE[rs] || "slate"}>{rs}</Badge></div>
      </div>

      {txn.refund_requested_reason && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm mb-3">
          <div className="text-xs font-medium text-amber-700 mb-0.5">User's request ({fmtDate(txn.refund_requested_at || "")}):</div>
          <div className="text-slate-700">“{txn.refund_requested_reason}”</div>
        </div>
      )}

      <Alert kind="info">
        <ul className="list-disc pl-4 space-y-1 text-xs">
          <li><strong>Manual flow</strong> — move the money back from the M-Pesa till yourself; this system only records it.</li>
          <li><strong>Approve</strong> accepts the request; <strong>Complete</strong> records the reversal reference and revokes unconsumed credits (PRD §14.6).</li>
          <li>Used credits stay — value already delivered. Every action is audit-trailed.</li>
        </ul>
      </Alert>

      <Field label="Reason (required, audit-trailed)">
        <textarea className={inputCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. platform fault — job post never published" />
      </Field>

      {canComplete && (
        <Field label="M-Pesa reversal reference (required to complete)">
          <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. QK7HUB61XZ from the till confirmation" />
        </Field>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {rs === "requested" && (
          <Button disabled={busy || !reasonOk} onClick={() => submit("approve")}>
            {busy ? "Working…" : "Approve request"}
          </Button>
        )}
        {canComplete && (
          <Button variant="danger" disabled={busy || !reasonOk || reference.trim().length < 3} onClick={() => submit("complete")}>
            {busy ? "Working…" : `Complete refund ${kes(txn.amount_kes)}`}
          </Button>
        )}
        {(rs === "requested" || rs === "approved") && (
          <Button variant="ghost" disabled={busy || !reasonOk} onClick={() => submit("reject")}>
            Reject request
          </Button>
        )}
      </div>
    </Modal>
  );
}
