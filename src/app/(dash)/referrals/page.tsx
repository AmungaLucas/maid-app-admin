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
  Stat,
  TableWrap,
  Td,
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi, roleFromCookie } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fmtDate, kes } from "@/lib/format";

type ReferralRow = {
  id: string;
  status: "pending" | "qualified" | "rejected";
  createdAt: string;
  qualifiedAt: string | null;
  referrer: { id: string; name: string; phone: string; role: string };
  referred: { id: string; name: string; phone: string; role: string };
  earning: {
    id: string;
    amountKes: number;
    status: "pending" | "paid" | "cancelled";
    plan: string;
    paidAt: string | null;
    payoutRef: string | null;
  } | null;
};

type ReferralSettings = {
  enabled: boolean;
  earningModel: "first_payment" | "every_payment";
  rateType: "fixed" | "percent";
  rateValue: number;
  minPayoutKes: number;
  rewardText: string;
};

type Payload = {
  settings: ReferralSettings;
  stats: {
    total: number;
    pending: number;
    qualified: number;
    rejected: number;
    pendingKes: number;
    paidKes: number;
    pendingCount: number;
  };
  referrals: ReferralRow[];
  page: number;
  pageSize: number;
};

const earningTone = (s: string | null | undefined): "green" | "red" | "amber" | "slate" =>
  s === "paid" ? "green" : s === "cancelled" ? "red" : s === "pending" ? "amber" : "slate";

export default function ReferralsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [payoutFor, setPayoutFor] = useState<ReferralRow | null>(null);
  const [cancelFor, setCancelFor] = useState<ReferralRow | null>(null);
  const [rejectFor, setRejectFor] = useState<ReferralRow | null>(null);

  const query = `admin/referrals?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error, refetch } = useApi<Payload>(query);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayConfigure = can.referralSettings(role);
  const mayPayout = can.referralPayout(role);
  const mayReject = can.referralReject(role);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (status) params.set("status", status);
    setApplied(params.toString());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Referrals"
        sub="Users earn cash when people they invite sign up AND pay. Earning rules are live-configurable below."
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      {data && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Stat label="Invited users" value={data.stats.total} sub={`${data.stats.qualified} qualified · ${data.stats.rejected} rejected`} icon="users" />
          <Stat label="Qualified (paid)" value={data.stats.qualified} tone="good" sub="Referrals who went on to pay" icon="check" />
          <Stat label="Owed to referrers" value={kes(data.stats.pendingKes)} tone="warn" sub={`${data.stats.pendingCount} earning(s) awaiting payout`} icon="wallet" />
          <Stat label="Paid out" value={kes(data.stats.paidKes)} tone="accent" sub="Lifetime referral payouts" icon="gift" />
        </div>
      )}

      {data && (
        <SettingsCard
          key={data.settings.rateValue + String(data.settings.enabled)}
          settings={data.settings}
          mayConfigure={mayConfigure}
          onSaved={() => {
            setMsg({ kind: "ok", text: "Referral settings updated." });
            refetch();
          }}
        />
      )}

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-3 gap-2 items-end">
          <Field label="Search referrer / referred">
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or 2547…" />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="pending">pending — signed up, not yet paid</option>
              <option value="qualified">qualified — paid</option>
              <option value="rejected">rejected</option>
            </select>
          </Field>
          <Button type="submit">Filter</Button>
        </form>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {data.referrals.length === 0 ? (
            <Empty>No referrals match. Referrals attach when a new user signs up with an invite code.</Empty>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <CardList>
                {data.referrals.map((r) => (
                  <MCard key={r.id}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate">
                          {r.referrer.name} <span className="text-slate-300">→</span> {r.referred.name}
                        </div>
                        <div className="text-xs text-slate-400">{r.referrer.phone} · {r.referred.phone}</div>
                      </div>
                      <Badge tone={statusTone(r.status)} dot>{r.status}</Badge>
                    </div>
                    <MRow label="Referred role" value={r.referred.role} />
                    <MRow label="Earning" value={r.earning ? <span className="font-semibold">{kes(r.earning.amountKes)}</span> : "—"} />
                    {r.earning && (
                      <MRow
                        label="Payout"
                        value={
                          <Badge tone={earningTone(r.earning.status)} dot>
                            {r.earning.status === "pending" ? "owed" : r.earning.status}
                          </Badge>
                        }
                      />
                    )}
                    <MRow label="Joined" value={fmtDate(r.createdAt)} />
                    {r.qualifiedAt && <MRow label="Qualified" value={fmtDate(r.qualifiedAt)} />}
                    {r.earning?.status === "pending" && mayPayout && (
                      <div className="mt-2 flex gap-2">
                        <Button small onClick={() => setPayoutFor(r)}>Mark paid…</Button>
                        {mayReject && (
                          <Button small variant="ghost" onClick={() => setCancelFor(r)}>Cancel earning…</Button>
                        )}
                      </div>
                    )}
                    {r.status === "pending" && mayReject && (
                      <div className="mt-2">
                        <Button small variant="ghost" onClick={() => setRejectFor(r)}>Reject referral…</Button>
                      </div>
                    )}
                  </MCard>
                ))}
              </CardList>

              {/* sm+: table */}
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Referrer</Th><Th>Referred user</Th><Th>Status</Th><Th right>Earning</Th><Th>Payout</Th><Th>Joined</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.referrals.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <div className="font-medium">{r.referrer.name}</div>
                        <div className="text-xs text-slate-400">{r.referrer.phone} · {r.referrer.role}</div>
                      </Td>
                      <Td>
                        <div className="font-medium">{r.referred.name}</div>
                        <div className="text-xs text-slate-400">{r.referred.phone} · {r.referred.role}</div>
                      </Td>
                      <Td>
                        <Badge tone={statusTone(r.status)} dot>{r.status}</Badge>
                        {r.qualifiedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(r.qualifiedAt)}</div>
                        )}
                      </Td>
                      <Td right>
                        {r.earning ? (
                          <span className="font-semibold">{kes(r.earning.amountKes)}</span>
                        ) : (
                          "—"
                        )}
                        {r.earning && <div className="text-[10px] text-slate-400">{r.earning.plan}</div>}
                      </Td>
                      <Td>
                        {r.earning ? (
                          <Badge tone={earningTone(r.earning.status)} dot>
                            {r.earning.status === "pending" ? "owed" : r.earning.status}
                          </Badge>
                        ) : (
                          "—"
                        )}
                        {r.earning?.payoutRef && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{r.earning.payoutRef}</div>
                        )}
                      </Td>
                      <Td><span className="text-xs text-slate-500">{fmtDate(r.createdAt)}</span></Td>
                      <Td right>
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {r.earning?.status === "pending" && mayPayout && (
                            <Button small onClick={() => setPayoutFor(r)}>Mark paid…</Button>
                          )}
                          {r.earning?.status === "pending" && mayReject && (
                            <Button small variant="ghost" onClick={() => setCancelFor(r)}>Cancel…</Button>
                          )}
                          {r.status === "pending" && mayReject && (
                            <Button small variant="ghost" onClick={() => setRejectFor(r)}>Reject…</Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.stats.total} onPage={setPage} />
        </Card>
      )}

      <PayoutModal
        row={payoutFor}
        onClose={() => setPayoutFor(null)}
        onDone={(text) => {
          setPayoutFor(null);
          setMsg({ kind: "ok", text });
          refetch();
        }}
      />
      <CancelModal
        row={cancelFor}
        onClose={() => setCancelFor(null)}
        onDone={(text) => {
          setCancelFor(null);
          setMsg({ kind: "ok", text });
          refetch();
        }}
      />
      <RejectModal
        row={rejectFor}
        onClose={() => setRejectFor(null)}
        onDone={(text) => {
          setRejectFor(null);
          setMsg({ kind: "ok", text });
          refetch();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings editor (admin only — support/finance see read-only)        */
/* ------------------------------------------------------------------ */

function SettingsCard({
  settings,
  mayConfigure,
  onSaved
}: {
  settings: ReferralSettings;
  mayConfigure: boolean;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [earningModel, setEarningModel] = useState(settings.earningModel);
  const [rateType, setRateType] = useState(settings.rateType);
  const [rateValue, setRateValue] = useState(String(settings.rateValue));
  const [minPayout, setMinPayout] = useState(String(settings.minPayoutKes));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const touch = () => setDirty(true);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.put("admin/referrals/settings", {
        enabled,
        earningModel,
        rateType,
        rateValue: Number(rateValue),
        minPayoutKes: Number(minPayout),
        reason
      });
      onSaved();
      setDirty(false);
      setReason("");
    } catch (e: any) {
      setErr(e.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  const preview =
    rateType === "percent"
      ? `Referrers earn ${Number(rateValue) || 0}% of the qualifying payment.`
      : `Referrers earn KES ${Number(rateValue || 0).toLocaleString("en-KE")} per qualifying referral.`;

  return (
    <Card
      title="Programme rules"
      right={
        <Badge tone={settings.enabled ? "green" : "red"} dot>
          {settings.enabled ? "live" : "paused"}
        </Badge>
      }
    >
      {!mayConfigure && (
        <p className="text-xs text-slate-400 mb-3">
          Only the <strong>admin</strong> role can change these rules — you are viewing them read-only.
        </p>
      )}
      <p className="text-sm text-slate-600 mb-4">{settings.rewardText}</p>

      <fieldset disabled={!mayConfigure} className="disabled:opacity-70">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
          <Field label="Programme">
            <select
              className={inputCls}
              value={enabled ? "on" : "off"}
              onChange={(e) => {
                setEnabled(e.target.value === "on");
                touch();
              }}
            >
              <option value="on">Live — new referrals earn</option>
              <option value="off">Paused — no new attributions or earnings</option>
            </select>
          </Field>
          <Field
            label="Earning model"
            hint={earningModel === "first_payment" ? "One bounty on the referral's first successful payment" : "A cut of every successful payment"}
          >
            <select
              className={inputCls}
              value={earningModel}
              onChange={(e) => {
                setEarningModel(e.target.value as ReferralSettings["earningModel"]);
                touch();
              }}
            >
              <option value="first_payment">First payment only</option>
              <option value="every_payment">Every payment</option>
            </select>
          </Field>
          <Field label="Rate type">
            <select
              className={inputCls}
              value={rateType}
              onChange={(e) => {
                setRateType(e.target.value as ReferralSettings["rateType"]);
                touch();
              }}
            >
              <option value="fixed">Fixed (KES)</option>
              <option value="percent">Percent of payment</option>
            </select>
          </Field>
          <Field label={rateType === "percent" ? "Percent (1-100)" : "Amount (KES)"}>
            <input
              className={inputCls}
              type="number"
              min={1}
              max={rateType === "percent" ? 100 : 100000}
              value={rateValue}
              onChange={(e) => {
                setRateValue(e.target.value);
                touch();
              }}
            />
          </Field>
          <Field label="Min payout (KES)" hint="Threshold for the future M-Pesa B2C payout run">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={minPayout}
              onChange={(e) => {
                setMinPayout(e.target.value);
                touch();
              }}
            />
          </Field>
        </div>

        {mayConfigure && dirty && (
          <div className="mt-3 grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <Field label="Reason for the audit trail (required)">
              <input
                className={inputCls}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. launch referral programme at KES 50 per referral"
              />
            </Field>
            <div className="flex items-center gap-2 pb-3.5">
              <span className="text-xs text-slate-400 hidden lg:block">{preview}</span>
              <Button disabled={busy || reason.trim().length < 3} onClick={save}>
                {busy ? "Saving…" : "Save rules"}
              </Button>
            </div>
          </div>
        )}
        {err && <Alert kind="error">{err}</Alert>}
      </fieldset>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Payout / cancel / reject modals                                     */
/* ------------------------------------------------------------------ */

function PayoutModal({
  row,
  onClose,
  onDone
}: {
  row: ReferralRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [payoutRef, setPayoutRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!row || !row.earning) return null;
  const earning = row.earning;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(
        `admin/referrals/earnings/${earning.id}/payout`,
        { payoutRef, note: note || undefined }
      );
      onDone(d.message);
    } catch (e: any) {
      setErr(e.message || "Payout failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Mark referral payout as paid" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}

      <div className="bg-slate-50 rounded-lg p-3 text-sm mb-3 space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">Referrer</span>
          <span>{row.referrer.name} ({row.referrer.phone})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">From</span>
          <span>{row.referred.name}&apos;s payment ({row.earning.plan})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Amount</span>
          <span className="font-semibold">{kes(row.earning.amountKes)}</span>
        </div>
      </div>

      <Alert kind="info">
        Record this AFTER the money has left the business till (e.g. M-Pesa B2C to the referrer). The payout reference goes on the audit trail.
      </Alert>

      <Field label="Payout reference (B2C receipt / txn id)">
        <input className={inputCls} value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} placeholder="e.g. QGH7XYZ123" />
      </Field>
      <Field label="Note (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid to 2547… via B2C" />
      </Field>

      <Button disabled={busy || payoutRef.trim().length < 3} onClick={submit}>
        {busy ? "Recording…" : `Mark ${kes(row.earning.amountKes)} as paid`}
      </Button>
    </Modal>
  );
}

function CancelModal({
  row,
  onClose,
  onDone
}: {
  row: ReferralRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!row || !row.earning) return null;
  const earning = row.earning;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(
        `admin/referrals/earnings/${earning.id}/cancel`,
        { reason }
      );
      onDone(d.message);
    } catch (e: any) {
      setErr(e.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Cancel pending earning" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-sm text-slate-600 mb-3">
        Cancel <strong>{kes(row.earning.amountKes)}</strong> owed to <strong>{row.referrer.name}</strong>? Use this for
        reversed payments handled outside the Reversal flow, or fraud investigations.
      </p>
      <Field label="Reason (required, audit-trailed)">
        <textarea
          className={inputCls}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. qualifying payment was reversed"
        />
      </Field>
      <Button variant="danger" disabled={busy || reason.trim().length < 3} onClick={submit}>
        {busy ? "Cancelling…" : "Cancel earning"}
      </Button>
    </Modal>
  );
}

function RejectModal({
  row,
  onClose,
  onDone
}: {
  row: ReferralRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!row) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(
        `admin/referrals/${row.id}/reject`,
        { reason }
      );
      onDone(d.message);
    } catch (e: any) {
      setErr(e.message || "Reject failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Reject referral" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-sm text-slate-600 mb-3">
        Reject <strong>{row.referrer.name}</strong>&apos;s referral of <strong>{row.referred.name}</strong>? This
        permanently blocks any earning from this pair.
      </p>
      <Field label="Reason (required, audit-trailed)">
        <textarea
          className={inputCls}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. self-referral abuse — same device, two accounts"
        />
      </Field>
      <Button variant="danger" disabled={busy || reason.trim().length < 3} onClick={submit}>
        {busy ? "Rejecting…" : "Reject referral"}
      </Button>
    </Modal>
  );
}
