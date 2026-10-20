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

// Chats moderation (BUILD 2026-10-20.14). The platform is E2EE: message
// BODIES never reach the gateway, so this page — by design — can only show
// METADATA: participants, lifecycle state, frozen limits, exchange counters,
// contact-detection flags (kind + severity, never the digits), consent
// records and moderation reports. There is no decrypt capability anywhere.

type Party = {
  id: string;
  name: string;
  phone: string;
  kycStatus?: string;
  email?: string;
  notAcceptingChats?: boolean;
};

type ChatRow = {
  id: string;
  status: string;
  createdAt: string;
  lastMessageAt: string | null;
  limits: { maxExchanges: number | null; maxChars: number; exchangesUsed: number };
  paid: { source: string | null; until: string | null; active: boolean };
  blockedBy: string | null;
  restrictedReason: string | null;
  messageCount: number;
  flaggedCount: number;
  employer: Party;
  maid: Party;
};

type ListPayload = {
  stats: {
    total: number;
    active: number;
    limitReached: number;
    expired: number;
    closed: number;
    restricted: number;
    paidActive: number;
    definiteFlags7d: number;
    openReports: number;
  };
  chats: ChatRow[];
  page: number;
  pageSize: number;
};

type DetailPayload = {
  conversation: ChatRow & {
    closedAt: string | null;
    reopenedAt: string | null;
    employer: Party & { email: string };
    maid: Party & { email: string };
    recentMessages: {
      seq: number;
      senderId: string | null;
      type: string;
      charLen: number;
      flagged: boolean;
      createdAt: string;
    }[];
    contactFlags: {
      id: string;
      userId: string;
      userName: string;
      kind: string;
      severity: string;
      restrictionApplied: string | null;
      createdAt: string;
    }[];
    consents: { ownerId: string; field: string; revokedAt: string | null; createdAt: string }[];
    activeRestrictions: {
      id: string;
      userId: string;
      untilAt: string;
      reason: string | null;
      createdBy: string | null;
    }[];
    reports: {
      id: string;
      reporterId: string;
      messageSeq: number | null;
      reason: string;
      detail: string | null;
      status: string;
      resolutionNote: string | null;
      resolvedAt: string | null;
      createdAt: string;
    }[];
  };
};

type ReportsPayload = {
  stats: { open: number; resolved: number };
  reports: {
    id: string;
    conversationId: string;
    conversationStatus: string;
    reporter: { id: string; name: string; phone: string };
    employerName: string;
    maidName: string;
    messageSeq: number | null;
    reason: string;
    detail: string | null;
    status: string;
    resolutionNote: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }[];
  page: number;
  pageSize: number;
};

const STATUS_TONES: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  active: "green",
  limit_reached: "amber",
  expired: "amber",
  closed: "slate",
  restricted: "red"
};

const REPORT_TONES: Record<string, "green" | "amber" | "red" | "slate"> = {
  open: "amber",
  resolved: "slate",
  harassment: "red",
  fraud: "red",
  off_platform: "amber",
  inappropriate: "red",
  other: "slate"
};

const PAID_LABELS: Record<string, string> = {
  chat_pass: "Chat unlock",
  hire_pass: "Hire Pass",
  emp_basic: "Basic weekly",
  emp_gold: "Gold weekly",
  welcome: "Welcome credit",
  maid_basic: "Maid Basic",
  maid_gold: "Maid Gold",
  chat_week: "Weekly (legacy)",
  chat_month: "Monthly (legacy)"
};

function limitsText(c: ChatRow) {
  const max = c.limits.maxExchanges === null ? "∞" : String(c.limits.maxExchanges);
  return `${c.limits.exchangesUsed}/${max} · ${c.limits.maxChars}ch`;
}

export default function ChatsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [restrictFor, setRestrictFor] = useState<ChatRow | null>(null);
  const [restrictDays, setRestrictDays] = useState("2");
  const [restrictReason, setRestrictReason] = useState("");
  const [unrestrictFor, setUnrestrictFor] = useState<ChatRow | null>(null);
  const [unrestrictReason, setUnrestrictReason] = useState("");
  const [resolveFor, setResolveFor] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [reportStatus, setReportStatus] = useState("open");
  const [busy, setBusy] = useState(false);

  const query = `admin/chats?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error, refetch } = useApi<ListPayload>(query);
  const detail = useApi<DetailPayload>(detailId ? `admin/chats/${detailId}` : null);
  const reportsQ = `admin/chat/reports?status=${reportStatus}`;
  const reports = useApi<ReportsPayload>(reportsQ);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayModerate = can.chatModerate(role);
  const mayUnrestrict = can.chatUnrestrict(role);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (status) params.set("status", status);
    setApplied(params.toString());
  };

  async function run(fn: () => Promise<unknown>, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: okText });
      refetch();
      detail.refetch();
      reports.refetch();
      setRestrictFor(null);
      setUnrestrictFor(null);
      setResolveFor(null);
      setRestrictReason("");
      setUnrestrictReason("");
      setResolveNote("");
    } catch (e: any) {
      setMsg({ kind: "error", text: e?.payload?.message || e.message || "Action failed." });
    } finally {
      setBusy(false);
    }
  }

  const openDetail = (id: string) => {
    setDetailId(id);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chats"
        sub="End-to-end encrypted platform — this view shows conversation metadata, safety flags and reports only. Message content is never accessible."
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {data && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Stat label="Conversations" value={data.stats.total} icon="chat" sub={`${data.stats.active} active · ${data.stats.closed} closed`} />
          <Stat label="Paid access live" value={data.stats.paidActive} tone="good" icon="wallet" sub={`${data.stats.limitReached} limit reached · ${data.stats.expired} expired`} />
          <Stat label="Contact flags (7d)" value={data.stats.definiteFlags7d} tone={data.stats.definiteFlags7d > 0 ? "warn" : "default"} icon="shield" sub="Sender-side detections, masked before send" />
          <Stat label="Open reports" value={data.stats.openReports} tone={data.stats.openReports > 0 ? "warn" : "default"} icon="alert" sub={`${data.stats.restricted} conversation(s) restricted`} />
        </div>
      )}

      <Card>
        <form onSubmit={apply} className="flex flex-wrap gap-2 items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search participant name or phone…" className={`${inputCls} w-full sm:w-72`} />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="limit_reached">Limit reached</option>
              <option value="expired">Expired</option>
              <option value="closed">Closed</option>
              <option value="restricted">Restricted</option>
            </select>
            <Button type="submit" variant="subtle">Filter</Button>
          </div>
        </form>

        {loading && !data ? (
          <Spinner />
        ) : !data || data.chats.length === 0 ? (
          <Empty>No conversations match. Chats appear here once employers start them.</Empty>
        ) : (
          <>
            {/* Mobile cards */}
            <CardList>
              {data.chats.map((c) => (
                <MCard key={c.id} onClick={() => openDetail(c.id)}>
                  <MRow
                    label="Participants"
                    value={
                      <span className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="font-semibold text-slate-900">{c.employer.name} → {c.maid.name}</span>
                        <Badge tone={STATUS_TONES[c.status] || "slate"}>{c.status.replace("_", " ")}</Badge>
                      </span>
                    }
                  />
                  <MRow label="Limits" value={limitsText(c)} />
                  <MRow label="Paid" value={c.paid.active ? `${PAID_LABELS[c.paid.source || ""] || c.paid.source} · to ${fmtDate(c.paid.until)}` : c.paid.source ? `${PAID_LABELS[c.paid.source] || c.paid.source} (ended)` : "—"} />
                  <MRow label="Messages" value={`${c.messageCount}${c.flaggedCount ? ` · ${c.flaggedCount} flagged` : ""}`} />
                  <MRow label="Last activity" value={fmtDate(c.lastMessageAt || c.createdAt)} />
                </MCard>
              ))}
            </CardList>

            {/* sm+ table */}
            <TableWrap>
              <table className="w-full text-sm hidden sm:table">
                <thead>
                  <tr>
                    <Th>Participants</Th>
                    <Th>Status</Th>
                    <Th>Limits</Th>
                    <Th>Paid access</Th>
                    <Th right>Messages</Th>
                    <Th right>Last activity</Th>
                    <Th right>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.chats.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/70 cursor-pointer" onClick={() => openDetail(c.id)}>
                      <Td>
                        <div className="font-medium text-slate-900">{c.employer.name} <span className="text-slate-400">→</span> {c.maid.name}</div>
                        <div className="text-xs text-slate-500 tnum">{c.employer.phone} · {c.maid.phone}</div>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONES[c.status] || "slate"}>{c.status.replace("_", " ")}</Badge>
                        {c.blockedBy && <div className="text-xs text-red-600 mt-1">blocked</div>}
                      </Td>
                      <Td className="tnum">{limitsText(c)}</Td>
                      <Td>
                        {c.paid.active ? (
                          <span className="text-emerald-700 font-medium">{PAID_LABELS[c.paid.source || ""] || c.paid.source}</span>
                        ) : c.paid.source ? (
                          <span className="text-slate-500">{PAID_LABELS[c.paid.source] || c.paid.source} (ended)</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td right className="tnum">{c.messageCount}{c.flaggedCount ? <span className="text-amber-600"> · {c.flaggedCount} flagged</span> : null}</Td>
                      <Td right className="whitespace-nowrap">{fmtDate(c.lastMessageAt || c.createdAt)}</Td>
                      <Td right>
                        {mayModerate && c.status !== "restricted" && (
                          <button className="text-xs font-semibold text-amber-700 hover:underline" onClick={(e) => { e.stopPropagation(); setRestrictFor(c); }}>Restrict</button>
                        )}
                        {mayUnrestrict && c.status === "restricted" && (
                          <button className="text-xs font-semibold text-emerald-700 hover:underline" onClick={(e) => { e.stopPropagation(); setUnrestrictFor(c); }}>Unrestrict</button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>

            <Pagination page={data.page} pageSize={data.pageSize} total={data.stats.total} onPage={setPage} />
          </>
        )}
      </Card>

      {/* Reports queue */}
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-slate-900">Moderation reports</h2>
          <div className="flex gap-2">
            <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className={inputCls}>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {reports.loading && !reports.data ? (
          <Spinner />
        ) : !reports.data || reports.data.reports.length === 0 ? (
          <Empty>No {reportStatus} reports.</Empty>
        ) : (
          <CardList>
            {reports.data.reports.map((r) => (
              <MCard key={r.id}>
                <MRow
                  label="Report"
                  value={
                    <span className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="font-semibold text-slate-900">{r.reason}</span>
                      <Badge tone={REPORT_TONES[r.status] || "slate"}>{r.status}</Badge>
                    </span>
                  }
                />
                <MRow label="Conversation" value={`${r.employerName} → ${r.maidName}`} />
                <MRow label="Reporter" value={`${r.reporter.name}${r.messageSeq ? ` · msg #${r.messageSeq}` : ""}`} />
                {r.detail && <MRow label="Statement" value={<span className="break-all">{r.detail}</span>} />}
                {r.status === "resolved" && r.resolutionNote && <MRow label="Resolution" value={r.resolutionNote} />}
                <MRow label="Filed" value={fmtDate(r.createdAt)} />
                {r.status === "open" && mayModerate && (
                  <div className="pt-2">
                    <Button variant="subtle" onClick={() => { setResolveFor(r.id); setResolveNote(""); }}>
                      Resolve
                    </Button>
                  </div>
                )}
              </MCard>
            ))}
          </CardList>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={Boolean(detailId)} onClose={() => setDetailId(null)} title="Conversation detail">
        {detail.loading && !detail.data ? (
          <Spinner />
        ) : detail.data ? (
          <ConversationDetail d={detail.data.conversation} />
        ) : (
          <Alert kind="error">{detail.error || "Could not load detail."}</Alert>
        )}
        {detail.data && (
          <div className="flex flex-wrap gap-2 mt-4">
            {mayModerate && detail.data.conversation.status !== "restricted" && (
              <Button variant="subtle" onClick={() => setRestrictFor(detail.data!.conversation)}>Restrict conversation</Button>
            )}
            {mayUnrestrict && detail.data.conversation.status === "restricted" && (
              <Button variant="subtle" onClick={() => setUnrestrictFor(detail.data!.conversation)}>Unrestrict</Button>
            )}
          </div>
        )}
      </Modal>

      {/* Restrict modal */}
      <Modal open={Boolean(restrictFor)} onClose={() => setRestrictFor(null)} title="Restrict conversation">
        <p className="text-sm text-slate-600 mb-3">
          Blocks new messages in both directions (PRD §9.4). History stays readable. Audit-trailed — a reason is required.
        </p>
        <div className="space-y-3">
          <Field label="Duration">
            <select value={restrictDays} onChange={(e) => setRestrictDays(e.target.value)} className={inputCls}>
              <option value="1">24 hours</option>
              <option value="2">2 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </Field>
          <Field label="Reason (required)">
            <textarea value={restrictReason} onChange={(e) => setRestrictReason(e.target.value)} rows={3} className={inputCls} placeholder="e.g. repeated off-platform contact attempts" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRestrictFor(null)}>Cancel</Button>
            <Button disabled={busy || restrictReason.trim().length < 3} onClick={() => run(() => api.post(`admin/chats/${restrictFor!.id}/restrict`, { days: Number(restrictDays), reason: restrictReason.trim() }), "Conversation restricted.")}>
              Restrict
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unrestrict modal */}
      <Modal open={Boolean(unrestrictFor)} onClose={() => setUnrestrictFor(null)} title="Unrestrict conversation">
        <p className="text-sm text-slate-600 mb-3">
          Restores the lifecycle state implied by the frozen limits and paid window (admin only).
        </p>
        <div className="space-y-3">
          <Field label="Reason (required)">
            <textarea value={unrestrictReason} onChange={(e) => setUnrestrictReason(e.target.value)} rows={3} className={inputCls} placeholder="e.g. appeal accepted after review" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setUnrestrictFor(null)}>Cancel</Button>
            <Button disabled={busy || unrestrictReason.trim().length < 3} onClick={() => run(() => api.post(`admin/chats/${unrestrictFor!.id}/unrestrict`, { reason: unrestrictReason.trim() }), "Conversation unrestricted.")}>
              Unrestrict
            </Button>
          </div>
        </div>
      </Modal>

      {/* Resolve report modal */}
      <Modal open={Boolean(resolveFor)} onClose={() => setResolveFor(null)} title="Resolve report">
        <div className="space-y-3">
          <Field label="Resolution note (required)">
            <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={3} className={inputCls} placeholder="e.g. warning issued to both parties; no breach confirmed" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResolveFor(null)}>Cancel</Button>
            <Button disabled={busy || resolveNote.trim().length < 3} onClick={() => run(() => api.post(`admin/chat/reports/${resolveFor}/resolve`, { note: resolveNote.trim() }), "Report resolved.")}>
              Resolve
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ConversationDetail({ d }: { d: NonNullable<DetailPayload["conversation"]> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={STATUS_TONES[d.status] || "slate"}>{d.status.replace("_", " ")}</Badge>
        {d.paid.active && <Badge tone="green">{PAID_LABELS[d.paid.source || ""] || d.paid.source} live</Badge>}
        {d.blockedBy && <Badge tone="red">blocked</Badge>}
        <span className="text-xs text-slate-500">created {fmtDate(d.createdAt)}</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { title: "Employer", p: d.employer },
          { title: "Worker", p: d.maid }
        ].map(({ title, p }) => (
          <div key={title} className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{title}</div>
            <div className="font-semibold text-slate-900">{p.name}</div>
            <div className="text-xs text-slate-500 tnum">{p.phone}{p.email ? ` · ${p.email}` : ""}</div>
            <div className="text-xs mt-1">
              <Badge tone={p.kycStatus === "verified" ? "green" : "slate"}>{p.kycStatus || "unverified"}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[
          { label: "Exchanges", value: `${d.limits.exchangesUsed}/${d.limits.maxExchanges === null ? "∞" : d.limits.maxExchanges}` },
          { label: "Max chars", value: String(d.limits.maxChars) },
          { label: "Recent msgs", value: String(d.recentMessages.length) },
          { label: "Flagged", value: String(d.contactFlags.length) }
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 py-2">
            <div className="text-lg font-bold text-slate-900 tnum">{s.value}</div>
            <div className="text-[11px] text-slate-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {d.restrictedReason && (
        <Alert kind="error">Restricted: {d.restrictedReason}</Alert>
      )}

      {d.activeRestrictions.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">User chat restrictions</div>
          {d.activeRestrictions.map((r) => (
            <div key={r.id} className="text-sm text-slate-700">
              {r.userId === d.employer.id ? d.employer.name : d.maid.name} — until {fmtDate(r.untilAt)} <span className="text-slate-400">({r.reason})</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Contact flags (sender-side detections)</div>
        {d.contactFlags.length === 0 ? (
          <div className="text-sm text-slate-500">None.</div>
        ) : (
          <div className="space-y-1">
            {d.contactFlags.map((f) => (
              <div key={f.id} className="text-sm text-slate-700 flex justify-between gap-2">
                <span><b>{f.userName}</b> — {f.kind} ({f.severity})</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">{f.restrictionApplied || ""} {fmtDate(f.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Contact consents</div>
        {d.consents.length === 0 ? (
          <div className="text-sm text-slate-500">None recorded.</div>
        ) : (
          d.consents.map((c, i) => (
            <div key={i} className="text-sm text-slate-700">
              {c.ownerId === d.employer.id ? d.employer.name : d.maid.name} — {c.field}
              {c.revokedAt ? <span className="text-red-600"> (revoked {fmtDate(c.revokedAt)})</span> : ""}
            </div>
          ))
        )}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Recent messages (metadata only — content is E2EE)</div>
        <div className="space-y-1">
          {d.recentMessages.map((m) => (
            <div key={m.seq} className="text-xs text-slate-600 flex justify-between gap-2">
              <span>
                #{m.seq} · {m.type === "system" ? "system" : m.senderId === d.employer.id ? d.employer.name : m.senderId === d.maid.id ? d.maid.name : "—"}
                {m.flagged ? <span className="text-amber-600"> · contact masked</span> : null}
              </span>
              <span className="text-slate-400">{m.charLen}ch · {fmtDate(m.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Reports</div>
        {d.reports.length === 0 ? (
          <div className="text-sm text-slate-500">None.</div>
        ) : (
          d.reports.map((r) => (
            <div key={r.id} className="text-sm text-slate-700">
              <Badge tone={REPORT_TONES[r.reason] || "slate"}>{r.reason}</Badge>{" "}
              <Badge tone={REPORT_TONES[r.status] || "slate"}>{r.status}</Badge>{" "}
              <span className="text-xs text-slate-500">{fmtDate(r.createdAt)}</span>
              {r.detail && <div className="text-xs text-slate-600 break-all">{r.detail}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
