"use client";

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
  PageHeader,
  Spinner,
  statusTone
} from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Doc = {
  docId: string;
  userId: string;
  userName: string;
  userPhone: string;
  userKycStatus: string;
  kind: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
  mediaViewable: boolean;
  url: string | null;
  expiresAt: string | null;
};

const KIND_LABELS: Record<string, string> = {
  id_front: "ID front",
  id_back: "ID back",
  selfie: "Selfie"
};

export default function KycPage() {
  const [status, setStatus] = useState("pending");
  const { data, loading, error, refetch } = useApi<{ count: number; queue: Doc[] }>(
    `admin/kyc/queue?status=${status}`
  );

  const [acting, setActing] = useState<{ docs: Doc[]; mode: "approve" | "reject" } | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // group by user so the reviewer sees all three docs of a submission together
  const byUser = new Map<string, Doc[]>();
  for (const doc of data?.queue || []) {
    const list = byUser.get(doc.userId) || [];
    list.push(doc);
    byUser.set(doc.userId, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeader
            title="KYC review"
            sub={
              <>
                Identity verification queue — approving all three docs of a user flips them to
                <strong> verified</strong> and grants the one-time welcome bonus (PRD §4, §7.4).
              </>
            }
          />
        </div>
        <div className="flex gap-2">
          {["pending", "approved", "rejected"].map((s) => (
            <Button key={s} small variant={status === s ? "primary" : "ghost"} onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && data.queue.length === 0 && <Card><Empty>Queue is clear. 🎉</Empty></Card>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from(byUser.entries()).map(([userId, docs]) => (
          <Card
            key={userId}
            title={
              <span className="flex items-center gap-2">
                <Link href={`/users/${userId}`} className="text-brand-700 hover:underline">{docs[0].userName}</Link>
                <Badge tone={statusTone(docs[0].userKycStatus)}>{docs[0].userKycStatus}</Badge>
              </span>
            }
            right={<span className="text-xs text-slate-400">{fmtDate(docs[0].submittedAt)}</span>}
          >
            <div className="grid grid-cols-3 gap-2 mb-3">
              {docs.map((doc) => (
                <a
                  key={doc.docId}
                  href={doc.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block border border-slate-200 rounded-lg overflow-hidden hover:border-brand-500 transition"
                >
                  {doc.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.url} alt={doc.kind} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      no image
                    </div>
                  )}
                  <div className="px-1.5 py-1 text-[10px] font-medium text-slate-600">
                    {KIND_LABELS[doc.kind] || doc.kind}
                  </div>
                </a>
              ))}
            </div>

            {docs[0].status === "rejected" && docs[0].rejectionReason && (
              <p className="text-xs text-rose-600 mb-2">Rejected: {docs[0].rejectionReason}</p>
            )}

            {status === "pending" && (
              <div className="flex gap-2">
                <Button small variant="subtle" onClick={() => setActing({ docs: docs.filter((d) => d.status === "pending"), mode: "approve" })}>
                  Approve pending docs
                </Button>
                <Button small variant="danger" onClick={() => setActing({ docs: [docs[0]], mode: "reject" })}>
                  Reject…
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <DecisionModal
        acting={acting}
        onClose={() => setActing(null)}
        onDone={(text, kind) => {
          setActing(null);
          setMsg({ kind, text });
          refetch();
        }}
      />
    </div>
  );
}

function DecisionModal({
  acting,
  onClose,
  onDone
}: {
  acting: { docs: Doc[]; mode: "approve" | "reject" } | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!acting) return null;

  const { docs, mode } = acting;
  const first = docs[0];

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      let approved = 0;
      let lastMsg = "";

      for (const doc of docs) {
        const d = await api.post<{ message: string }>(
          `admin/kyc/${doc.docId}/${mode}`,
          mode === "reject" ? { reason } : {}
        );
        approved += 1;
        lastMsg = d.message;
      }

      onDone(
        mode === "approve"
          ? `Approved ${approved} document${approved === 1 ? "" : "s"}. ${lastMsg || ""}`
          : `Rejected. ${lastMsg || ""}`,
        "ok"
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={mode === "approve" ? "Approve documents" : "Reject document"} onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-sm text-slate-600 mb-3">
        {mode === "approve"
          ? `Approve ${docs.length} pending document${docs.length === 1 ? "" : "s"} for ${first.userName}? When all three docs of a user are approved they become verified and the once-only welcome bonus is granted (PRD §4.5).`
          : `Reject ${KIND_LABELS[first.kind] || first.kind} for ${first.userName}? The reason is shown to the user so they can resubmit (up to 3 attempts — PRD §4.7).`}
      </p>
      {mode === "reject" && (
        <Field label="Reason (shown to the user)">
          <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. ID photo is blurred — retake in daylight" />
        </Field>
      )}
      <Button
        variant={mode === "approve" ? "primary" : "danger"}
        disabled={busy || (mode === "reject" && reason.trim().length < 3)}
        onClick={submit}
      >
        {busy ? "Saving…" : mode === "approve" ? `Approve ${docs.length}` : "Reject"}
      </Button>
    </Modal>
  );
}
