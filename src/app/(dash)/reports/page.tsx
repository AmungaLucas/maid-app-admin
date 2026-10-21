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
  TableWrap,
  Td,
  Th
} from "@/components/ui";
import { api, useApi, roleFromCookie } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fmtDate } from "@/lib/format";

type Report = {
  id: string;
  category: string;
  note: string;
  status: "open" | "actioned" | "dismissed";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporterId: string | null;
  reporterName: string | null;
  reporterRole: string | null;
  targetUserId: string | null;
  targetName: string | null;
  targetRole: string | null;
  targetStatus: string | null;
  targetJobId: string | null;
  targetJobTitle: string | null;
};

// PRD v1.0 §10.2 — user reports get a 24h response target (SLA board).
function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

function ageTone(iso: string) {
  const h = hoursSince(iso);
  if (h > 24) return "red" as const;
  if (h > 12) return "amber" as const;
  return "slate" as const;
}

function statusTone2(s: string) {
  if (s === "open") return "amber" as const;
  if (s === "actioned") return "green" as const;
  return "slate" as const;
}

export default function ReportsPage() {
  const [status, setStatus] = useState("open");
  const [deciding, setDeciding] = useState<Report | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const { data, loading, error, refetch } = useApi<{
    reports: Report[];
    counts: Record<string, number>;
  }>(`admin/reports?status=${status}`);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayDecide = can.reportDecide(role);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <PageHeader
            title="Reports"
            sub="User reports about profiles and jobs (PRD §10.2: 24h response target). Enforcement happens through Users → Change status; the reporter is notified on decision, the reported user never sees who reported."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["open", "actioned", "dismissed", "all"].map((s) => (
            <Button key={s} small variant={status === s ? "primary" : "ghost"} onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <div className="flex gap-2 flex-wrap text-xs text-slate-500">
          {Object.entries(data.counts).map(([k, v]) => (
            <span key={k} className="bg-slate-100 rounded-full px-2.5 py-1">
              {k}: <b>{v}</b>
            </span>
          ))}
        </div>
      )}

      {data && data.reports.length === 0 && <Card><Empty>No reports in this view.</Empty></Card>}

      {data && data.reports.length > 0 && (
        <Card>
          <CardList>
            {data.reports.map((r) => (
              <MCard key={r.id}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-medium text-slate-800 truncate">
                    {r.targetName ? `${r.targetName} (${r.targetRole})` : r.targetJobTitle || "Unknown target"}
                  </span>
                  <Badge tone={statusTone2(r.status)}>{r.status}</Badge>
                </div>
                <MRow label="Category" value={r.category} />
                {r.targetUserId && (
                  <MRow
                    label="Reported user"
                    value={
                      <a className="text-sky-700 hover:underline" href={`/users/${r.targetUserId}`}>
                        {r.targetName} · status {r.targetStatus}
                      </a>
                    }
                  />
                )}
                {r.targetJobId && <MRow label="Reported job" value={r.targetJobTitle} />}
                <MRow label="By" value={`${r.reporterName || "unknown"} (${r.reporterRole || "-"})`} />
                <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2 break-words">
                  “{r.note}”
                </p>
                {r.resolution_note && (
                  <p className="mt-1.5 text-[11px] text-slate-400 break-words">Resolution: {r.resolution_note}</p>
                )}
                <MRow
                  label="Filed"
                  value={
                    <span className="flex items-center gap-2">
                      {fmtDate(r.created_at)}
                      {r.status === "open" && <Badge tone={ageTone(r.created_at)}>{Math.floor(hoursSince(r.created_at))}h</Badge>}
                    </span>
                  }
                />
                {mayDecide && r.status === "open" && (
                  <div className="mt-2">
                    <Button small variant="ghost" onClick={() => setDeciding(r)}>Decide…</Button>
                  </div>
                )}
              </MCard>
            ))}
          </CardList>

          <TableWrap>
            <thead>
              <tr>
                <Th>Target</Th><Th>Category</Th><Th>Note</Th><Th>Status</Th><Th>Age</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.reports.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <div className="font-medium">
                      {r.targetName ? (
                        <a className="text-sky-700 hover:underline" href={`/users/${r.targetUserId}`}>{r.targetName}</a>
                      ) : (
                        r.targetJobTitle || "-"
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {r.targetRole ? `${r.targetRole} · ${r.targetStatus}` : "job"} · by {r.reporterName}
                    </div>
                  </Td>
                  <Td>{r.category}</Td>
                  <Td className="max-w-[280px] truncate"><span title={r.note}>{r.note}</span></Td>
                  <Td><Badge tone={statusTone2(r.status)}>{r.status}</Badge></Td>
                  <Td>
                    <span className="text-xs text-slate-500">
                      {r.status === "open" ? `${Math.floor(hoursSince(r.created_at))}h` : fmtDate(r.resolved_at || r.created_at)}
                    </span>
                  </Td>
                  <Td right>
                    {mayDecide && r.status === "open" && (
                      <Button small variant="ghost" onClick={() => setDeciding(r)}>Decide…</Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}

      <DecideModal
        report={deciding}
        onClose={() => setDeciding(null)}
        onDone={(text, kind) => {
          setDeciding(null);
          setMsg({ kind, text });
          refetch();
        }}
      />
    </div>
  );
}

function DecideModal({
  report,
  onClose,
  onDone
}: {
  report: Report | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [outcome, setOutcome] = useState<"actioned" | "dismissed">("actioned");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!report) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/reports/${report.id}/decide`, { outcome, note });
      onDone(d.message, "ok");
    } catch (e: any) {
      setErr(e.message || "Decision failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Decide report" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}

      <div className="bg-slate-50 rounded-lg p-3 text-sm mb-3">
        <div className="flex justify-between"><span className="text-slate-500">Reported</span><span>{report.targetName || report.targetJobTitle || "-"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Category</span><span>{report.category}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Reporter</span><span>{report.reporterName || "-"}</span></div>
      </div>

      <p className="text-sm text-slate-600 mb-3">“{report.note}”</p>

      <Alert kind="info">
        <span className="text-xs">
          “Actioned” = you have taken (or will take) enforcement via Users → Change status. “Dismissed” = no action
          needed. Either way the reporter is notified and the decision is audit-trailed (PRD §17, §19.2). The reported
          user is never told who reported them.
        </span>
      </Alert>

      <div className="grid grid-cols-2 gap-2 my-3">
        <Button variant={outcome === "actioned" ? "danger" : "ghost"} onClick={() => setOutcome("actioned")}>
          Action taken
        </Button>
        <Button variant={outcome === "dismissed" ? "primary" : "ghost"} onClick={() => setOutcome("dismissed")}>
          Dismiss
        </Button>
      </div>

      <Field label="Decision note (required, audit-trailed)">
        <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Confirmed off-app payment request — account suspended pending review" />
      </Field>

      <Button
        variant={outcome === "actioned" ? "danger" : "primary"}
        disabled={busy || note.trim().length < 5}
        onClick={submit}
      >
        {busy ? "Saving…" : outcome === "actioned" ? "Mark actioned" : "Dismiss report"}
      </Button>
    </Modal>
  );
}
