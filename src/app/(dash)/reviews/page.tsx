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
import { fmtDate } from "@/lib/format";

type Review = {
  id: string;
  conversation_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: string;
  rating: number;
  comment: string | null;
  response_text: string | null;
  status: "pending" | "published" | "hidden";
  flagged: number;
  created_at: string;
  published_at: string | null;
  reviewer_name: string;
  reviewee_name: string;
};

function stars(n: number) {
  return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
}

function tone(status: string, flagged: number) {
  if (flagged) return "red" as const;
  if (status === "published") return "green" as const;
  if (status === "hidden") return "slate" as const;
  return "amber" as const;
}

export default function ReviewsPage() {
  const [status, setStatus] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [acting, setActing] = useState<{ review: Review; mode: "hide" | "unhide" } | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (flagged) params.set("flagged", "1");

  const { data, loading, error, refetch } = useApi<{
    stats: Record<string, number>;
    reviews: Review[];
  }>(`admin/reviews?${params.toString()}`);

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const mayModerate = can.appealDecide(role);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ratings & Reviews"
        sub="Double-blind reviews (v1.0 §9): pending until both sides submit or 14 days pass. Flags route here for moderation — hide/unhide is audit-trailed."
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Pending (blind window)" value={data.stats.pending || 0} icon="clock" />
          <Stat label="Published" value={data.stats.published || 0} icon="verified" />
          <Stat
            label="Flagged"
            value={data.reviews.filter((r) => r.flagged).length}
            tone={data.reviews.some((r) => r.flagged) ? "warn" : "default"}
            sub="needs moderation"
            icon="flag"
          />
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {["pending", "published", "hidden"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Button variant={flagged ? "primary" : "ghost"} onClick={() => setFlagged((f) => !f)}>
            {flagged ? "Showing flagged only" : "Flagged only"}
          </Button>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {data.reviews.length === 0 ? (
            <Empty>No reviews match.</Empty>
          ) : (
            <>
              <CardList>
                {data.reviews.map((r) => (
                  <MCard key={r.id}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-medium text-slate-800 truncate">
                        {r.reviewer_name} → {r.reviewee_name}
                      </span>
                      <Badge tone={tone(r.status, r.flagged)}>
                        {r.flagged ? "flagged" : r.status}
                      </Badge>
                    </div>
                    <MRow label="Rating" value={<span className="text-amber-500 tracking-wider">{stars(r.rating)}</span>} />
                    {r.comment && <p className="text-xs text-slate-600 mt-1 break-words">“{r.comment}”</p>}
                    {r.response_text && (
                      <p className="text-[11px] text-slate-400 mt-1 break-words">Response: {r.response_text}</p>
                    )}
                    <MRow label="Submitted" value={fmtDate(r.created_at)} />
                    {mayModerate && (
                      <div className="mt-2">
                        <Button
                          small
                          variant="ghost"
                          onClick={() => setActing({ review: r, mode: r.status === "hidden" ? "unhide" : "hide" })}
                        >
                          {r.status === "hidden" ? "Re-publish…" : "Hide…"}
                        </Button>
                      </div>
                    )}
                  </MCard>
                ))}
              </CardList>

              <TableWrap>
                <thead>
                  <tr>
                    <Th>Review</Th><Th>Rating</Th><Th>Comment</Th><Th>Status</Th><Th>When</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.reviews.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <div className="font-medium">{r.reviewer_name}</div>
                        <div className="text-xs text-slate-400">→ {r.reviewee_name} ({r.reviewer_role})</div>
                      </Td>
                      <Td><span className="text-amber-500 tracking-wider">{stars(r.rating)}</span></Td>
                      <Td className="max-w-[240px] truncate">{r.comment || "—"}</Td>
                      <Td><Badge tone={tone(r.status, r.flagged)}>{r.flagged ? "flagged" : r.status}</Badge></Td>
                      <Td><span className="text-xs text-slate-500">{fmtDate(r.created_at)}</span></Td>
                      <Td right>
                        {mayModerate && (
                          <Button
                            small
                            variant="ghost"
                            onClick={() => setActing({ review: r, mode: r.status === "hidden" ? "unhide" : "hide" })}
                          >
                            {r.status === "hidden" ? "Unhide…" : "Hide…"}
                          </Button>
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

      <ModerateModal
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

function ModerateModal({
  acting,
  onClose,
  onDone
}: {
  acting: { review: Review; mode: "hide" | "unhide" } | null;
  onClose: () => void;
  onDone: (msg: string, kind: "ok" | "error") => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!acting) return null;

  const { review, mode } = acting;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>(`admin/reviews/${review.id}/${mode}`, { reason });
      onDone(d.message, "ok");
    } catch (e: any) {
      setErr(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={mode === "hide" ? "Hide review" : "Re-publish review"} onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-sm text-slate-600 mb-3">
        {mode === "hide"
          ? `Hide the ${review.rating}-star review from ${review.reviewer_name} about ${review.reviewee_name}? It disappears from profiles immediately.`
          : `Re-publish the review from ${review.reviewer_name} about ${review.reviewee_name}?`}
      </p>
      <Field label="Reason (required, audit-trailed)">
        <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. suspected retaliation — withheld pending investigation" />
      </Field>
      <Button variant={mode === "hide" ? "danger" : "primary"} disabled={busy || reason.trim().length < 5} onClick={submit}>
        {busy ? "Saving…" : mode === "hide" ? "Hide review" : "Re-publish"}
      </Button>
    </Modal>
  );
}
