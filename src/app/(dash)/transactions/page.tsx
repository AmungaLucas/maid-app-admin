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
};

export default function TransactionsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState("");
  const [reversing, setReversing] = useState<Txn | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  const query = `admin/transactions?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error, refetch } = useApi<{ transactions: Txn[]; total: number; page: number; pageSize: number }>(query);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayReverse = can.reverse(role);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (plan) params.set("plan", plan);
    setApplied(params.toString());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        sub="Every M-Pesa STK attempt. Successful payments can be reversed (money moves back via Daraja Reversal)."
      />

      {msg && <Alert kind={msg.kind === "info" ? "info" : msg.kind}>{msg.text}</Alert>}

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-4 gap-2 items-end">
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
                    <MRow
                      label="Refund"
                      value={
                        t.reversal_status === "pending" ? (
                          <Badge tone="amber">reversing…</Badge>
                        ) : t.reversal_status === "success" ? (
                          <Badge tone="red">reversed</Badge>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <MRow label="When" value={fmtDate(t.created_at)} />
                    {t.result_desc && t.status !== "success" && (
                      <p className="mt-1.5 text-[11px] text-slate-400 break-words">{t.result_desc}</p>
                    )}
                    {mayReverse && t.status === "success" && !t.reversal_status && (
                      <div className="mt-2">
                        <Button small variant="ghost" onClick={() => setReversing(t)}>Reverse…</Button>
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
                        {t.reversal_status === "pending" && <Badge tone="amber">reversing…</Badge>}
                        {t.reversal_status === "success" && <Badge tone="red">reversed</Badge>}
                        {!t.reversal_status && "—"}
                      </Td>
                      <Td><span className="text-xs text-slate-500">{fmtDate(t.created_at)}</span></Td>
                      <Td right>
                        {mayReverse && t.status === "success" && !t.reversal_status && (
                          <Button small variant="ghost" onClick={() => setReversing(t)}>Reverse…</Button>
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

      <ReverseModal
        txn={reversing}
        onClose={() => setReversing(null)}
        onDone={(text, kind) => {
          setReversing(null);
          setMsg({ kind, text });
          refetch();
        }}
      />
    </div>
  );
}

function ReverseModal({
  txn,
  onClose,
  onDone
}: {
  txn: Txn | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!txn) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/transactions/${txn.id}/reverse`, { reason });
      onDone(d.message, "ok");
    } catch (e: any) {
      // 503 = not configured; other codes = Daraja / state errors
      const detail = e.payload?.missing ? ` (missing: ${e.payload.missing.join(", ")})` : "";
      setErr(`${e.message}${detail}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Reverse payment" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}

      <div className="bg-slate-50 rounded-lg p-3 text-sm mb-3 space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">User</span><span>{txn.user_name} ({txn.phone})</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Plan</span><span>{txn.plan}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-semibold">{kes(txn.amount_kes)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Receipt</span><span className="font-mono">{txn.mpesa_receipt}</span></div>
      </div>

      <Alert kind="info">
        <ul className="list-disc pl-4 space-y-1 text-xs">
          <li>Unused credits from this purchase are <strong>revoked immediately</strong> (PRD §14.6).</li>
          <li>Used credits stay — value already delivered.</li>
          <li>Money moves back to <strong>{txn.phone}</strong> via Daraja Reversal; the outcome lands asynchronously (pending → success/failed on the Transactions list).</li>
          <li>Irreversible once Daraja accepts it.</li>
        </ul>
      </Alert>

      <Field label="Reason (required, audit-trailed)">
        <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. duplicate charge — user paid twice for emp_basic" />
      </Field>

      <Button variant="danger" disabled={busy || reason.trim().length < 5} onClick={submit}>
        {busy ? "Submitting to Daraja…" : `Reverse ${kes(txn.amount_kes)} to ${txn.phone}`}
      </Button>
    </Modal>
  );
}
