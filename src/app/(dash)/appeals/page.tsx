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
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi, roleFromCookie } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fmtDate } from "@/lib/format";

type Appeal = {
  id: string;
  user_id: string;
  kind: "kyc_rejection" | "account_suspension" | "chat_restriction";
  target_id: string | null;
  message: string;
  status: "open" | "under_review" | "upheld" | "overturned";
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
  user_name: string;
  user_role: string;
  account_status: string;
  kyc_status: string;
};

const KIND_LABELS: Record<string, string> = {
  kyc_rejection: "KYC rejection",
  account_suspension: "Account suspension",
  chat_restriction: "Chat restriction"
};

function statusTone2(s: string) {
  if (s === "open") return "amber" as const;
  if (s === "under_review") return "amber" as const;
  if (s === "overturned") return "green" as const;
  return "red" as const;
}

export default function AppealsPage() {
  const [status, setStatus] = useState("open");
  const [deciding, setDeciding] = useState<Appeal | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const { data, loading, error, refetch } = useApi<{
    stats: Record<string, number>;
    appeals: Appeal[];
  }>(`admin/appeals?status=${status}`);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayDecide = can.appealDecide(role);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <PageHeader
            title="Appeals"
            sub="Second-reviewer queue (PRD §15.3: appeals target 72h). Overturning re-opens the underlying item — KYC back to pending, suspension lifted, restriction ended."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["open", "under_review", "upheld", "overturned", "all"].map((s) => (
            <Button key={s} small variant={status === s ? "primary" : "ghost"} onClick={() => setStatus(s)}>
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && data.appeals.length === 0 && <Card><Empty>No appeals in this view.</Empty></Card>}

      {data && data.appeals.length > 0 && (
        <Card>
          <CardList>
            {data.appeals.map((a) => (
              <MCard key={a.id}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-medium text-slate-800 truncate">{a.user_name}</span>
                  <Badge tone={statusTone2(a.status)}>{a.status.replace("_", " ")}</Badge>
                </div>
                <MRow label="Kind" value={KIND_LABELS[a.kind] || a.kind} />
                <MRow label="Account" value={<Badge tone={statusTone(a.account_status)}>{a.account_status}</Badge>} />
                <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-2 break-words">
                  “{a.message}”
                </p>
                {a.decision_note && (
                  <p className="mt-1.5 text-[11px] text-slate-400 break-words">Decision: {a.decision_note}</p>
                )}
                <MRow label="Filed" value={fmtDate(a.created_at)} />
                {mayDecide && (a.status === "open" || a.status === "under_review") && (
                  <div className="mt-2">
                    <Button small variant="ghost" onClick={() => setDeciding(a)}>Decide…</Button>
                  </div>
                )}
              </MCard>
            ))}
          </CardList>

          <TableWrap>
            <thead>
              <tr>
                <Th>User</Th><Th>Kind</Th><Th>Message</Th><Th>Status</Th><Th>Filed</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.appeals.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <div className="font-medium">{a.user_name}</div>
                    <div className="text-xs text-slate-400">{a.user_role} · {a.account_status}</div>
                  </Td>
                  <Td>{KIND_LABELS[a.kind] || a.kind}</Td>
                  <Td className="max-w-[280px] truncate"><span title={a.message}>{a.message}</span></Td>
                  <Td><Badge tone={statusTone2(a.status)}>{a.status.replace("_", " ")}</Badge></Td>
                  <Td><span className="text-xs text-slate-500">{fmtDate(a.created_at)}</span></Td>
                  <Td right>
                    {mayDecide && (a.status === "open" || a.status === "under_review") && (
                      <Button small variant="ghost" onClick={() => setDeciding(a)}>Decide…</Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}

      <DecideModal
        appeal={deciding}
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
  appeal,
  onClose,
  onDone
}: {
  appeal: Appeal | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [outcome, setOutcome] = useState<"overturned" | "upheld">("overturned");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!appeal) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/appeals/${appeal.id}/decide`, { outcome, note });
      onDone(d.message, "ok");
    } catch (e: any) {
      setErr(e.message || "Decision failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Decide appeal" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}

      <div className="bg-slate-50 rounded-lg p-3 text-sm mb-3">
        <div className="flex justify-between"><span className="text-slate-500">User</span><span>{appeal.user_name} ({appeal.user_role})</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Kind</span><span>{KIND_LABELS[appeal.kind]}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Account</span><span>{appeal.account_status} · KYC {appeal.kyc_status}</span></div>
      </div>

      <p className="text-sm text-slate-600 mb-3">“{appeal.message}”</p>

      <Alert kind="info">
        <span className="text-xs">
          Overturning: KYC rejection → documents back to pending; suspension → account active; chat restriction →
          lifted. Upholding keeps the original decision. Both outcomes are audit-trailed (PRD §15.6).
        </span>
      </Alert>

      <div className="grid grid-cols-2 gap-2 my-3">
        <Button variant={outcome === "overturned" ? "primary" : "ghost"} onClick={() => setOutcome("overturned")}>
          Overturn
        </Button>
        <Button variant={outcome === "upheld" ? "danger" : "ghost"} onClick={() => setOutcome("upheld")}>
          Uphold decision
        </Button>
      </div>

      <Field label="Decision note (required, audit-trailed)">
        <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ID is legible on second review — reopening the KYC submission" />
      </Field>

      <Button
        variant={outcome === "overturned" ? "primary" : "danger"}
        disabled={busy || note.trim().length < 5}
        onClick={submit}
      >
        {busy ? "Saving…" : outcome === "overturned" ? "Overturn and re-open" : "Uphold decision"}
      </Button>
    </Modal>
  );
}
