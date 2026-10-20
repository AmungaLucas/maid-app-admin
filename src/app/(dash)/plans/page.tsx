"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardList,
  Field,
  inputCls,
  MCard,
  MRow,
  Modal,
  PageHeader,
  Icon,
  Spinner,
  TableWrap,
  Td,
  Th
} from "@/components/ui";
import { api, useApi, roleFromCookie } from "@/lib/api";
import { can } from "@/lib/permissions";
import { fmtDate, kes } from "@/lib/format";

type Grant = { kind: "chat" | "job_post" | "apply"; qty: number; windowDays: number | null };

type Plan = {
  code: string;
  role: "maid" | "employer" | null;
  label: string;
  amountKes: number;
  windowDays: number | null;
  workerScoped: boolean;
  isSubscription: boolean;
  grants: Grant[];
  displayOrder: number;
  legacy: boolean;
  active: boolean;
  updatedAt: string;
};

export default function PlansPage() {
  const { data, loading, error, refetch } = useApi<{ source: string; plans: Plan[] }>("admin/plans");
  const { data: opts } = useApi<{ options: Record<string, { plan: string; why: string }[]> }>("admin/pay-options");

  const role = (roleFromCookie() || "admin") as "admin" | "support" | "finance";
  const editable = can.planEdit(role);

  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <PageHeader
            title="Plans &amp; pricing"
            sub={
              <>
                Live from the <code className="text-xs bg-slate-100 px-1 rounded">plans</code> table — edits apply to
                <strong> new purchases only</strong> (PRD §6.2), no redeploy needed.
              </>
            }
          />
        </div>
        {editable && <Button onClick={() => setCreating(true)}><Icon name="plus" className="w-4 h-4" /> New plan</Button>}
      </div>

      {!editable && (
        <Alert kind="info">
          Your role has read-only access to pricing. Finance and admin can make changes.
        </Alert>
      )}
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {/* Mobile: stacked cards */}
          <CardList>
            {data.plans.map((p) => (
              <MCard key={p.code}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{p.label}</div>
                    <div className="font-mono text-[10px] text-slate-400">{p.code}</div>
                  </div>
                  <span className={`font-semibold tnum shrink-0 ${p.active ? "" : "line-through opacity-50"}`}>{kes(p.amountKes)}</span>
                </div>
                <MRow label="Role" value={<Badge tone={p.role === "maid" ? "violet" : p.role === "employer" ? "blue" : "slate"}>{p.role || "any"}</Badge>} />
                <MRow label="Window" value={p.windowDays ? `${p.windowDays} days` : "—"} />
                <MRow
                  label="Grants"
                  value={p.grants.length === 0 ? "—" : p.grants.map((g) => `${g.qty}× ${g.kind}${g.windowDays ? `/${g.windowDays}d` : ""}`).join(" + ")}
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.isSubscription && <Badge tone="green">subscription</Badge>}
                  {p.workerScoped && <Badge tone="amber">worker-scoped</Badge>}
                  {p.legacy && <Badge tone="slate">legacy</Badge>}
                  {!p.active && <Badge tone="red">inactive</Badge>}
                </div>
                {editable && (
                  <div className="mt-2">
                    <Button small variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                  </div>
                )}
              </MCard>
            ))}
          </CardList>

          {/* sm+: table */}
          <TableWrap>
            <thead>
              <tr>
                <Th>Plan</Th><Th>Role</Th><Th right>Price</Th><Th>Window</Th><Th>Grants</Th><Th>Flags</Th><Th right>Order</Th><Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.plans.map((p) => (
                <tr key={p.code} className={p.active ? "" : "opacity-50"}>
                  <Td>
                    <div className="font-medium">{p.label}</div>
                    <div className="font-mono text-xs text-slate-400">{p.code}</div>
                  </Td>
                  <Td>
                    <Badge tone={p.role === "maid" ? "violet" : p.role === "employer" ? "blue" : "slate"}>
                      {p.role || "any"}
                    </Badge>
                  </Td>
                  <Td right className="font-semibold">{kes(p.amountKes)}</Td>
                  <Td>{p.windowDays ? `${p.windowDays} days` : "—"}</Td>
                  <Td>
                    {p.grants.length === 0
                      ? "—"
                      : p.grants
                          .map((g) => `${g.qty}× ${g.kind}${g.windowDays ? `/${g.windowDays}d` : ""}`)
                          .join(" + ")}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {p.isSubscription && <Badge tone="green">subscription</Badge>}
                      {p.workerScoped && <Badge tone="amber">worker-scoped</Badge>}
                      {p.legacy && <Badge tone="slate">legacy</Badge>}
                      {!p.active && <Badge tone="red">inactive</Badge>}
                    </div>
                  </Td>
                  <Td right>{p.displayOrder}</Td>
                  <Td right>
                    {editable && (
                      <Button small variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}

      {data && (
        <PayOptionsCard
          options={opts?.options || {}}
          editable={editable}
          onSaved={(text) => {
            setMsg({ kind: "ok", text });
            refetch();
          }}
        />
      )}

      <EditPlanModal
        plan={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={(text) => {
          setMsg({ kind: "ok", text });
          setEditing(null);
          refetch();
        }}
      />

      <CreatePlanModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(text) => {
          setMsg({ kind: "ok", text });
          setCreating(false);
          refetch();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- edit modal

function EditPlanModal({
  plan,
  open,
  onClose,
  onSaved
}: {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [label, setLabel] = useState("");
  const [windowDays, setWindowDays] = useState<string>("");
  const [active, setActive] = useState(true);
  const [workerScoped, setWorkerScoped] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [reason, setReason] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // hydrate fields when a different plan is opened
  if (open && plan && loadedFor !== plan.code) {
    setLoadedFor(plan.code);
    setAmount(plan.amountKes);
    setLabel(plan.label);
    setWindowDays(plan.windowDays == null ? "" : String(plan.windowDays));
    setActive(plan.active);
    setWorkerScoped(plan.workerScoped);
    setLegacy(plan.legacy);
    setGrants(plan.grants.map((g) => ({ ...g })));
    setReason("");
    setErr(null);
  }

  if (!plan) return null;

  const changed =
    amount !== plan.amountKes ||
    label !== plan.label ||
    (windowDays === "" ? null : Number(windowDays)) !== plan.windowDays ||
    active !== plan.active ||
    workerScoped !== plan.workerScoped ||
    legacy !== plan.legacy ||
    JSON.stringify(grants) !== JSON.stringify(plan.grants);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const body: any = {
        label,
        amountKes: Number(amount),
        windowDays: windowDays === "" ? null : Number(windowDays),
        active,
        workerScoped,
        legacy,
        grants: grants.map((g) => ({
          kind: g.kind,
          qty: Number(g.qty),
          windowDays: g.windowDays == null ? null : Number(g.windowDays)
        })),
        reason
      };
      await api.put(`admin/plans/${plan.code}`, body);
      onSaved(`Saved ${plan.code}. The gateway picked it up instantly — new purchases charge ${kes(amount)}.`);
    } catch (e: any) {
      setErr(e.message);
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open} title={`Edit plan — ${plan.code}`} onClose={onClose} wide>
        {err && <Alert kind="error">{err}</Alert>}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Label (shown in the app)">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Price (KES)">
            <input className={inputCls} type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <Field label="Window (days, empty = never expires)" hint="Plan-level expiry: 7 for subscriptions, 14 hire/chat, 90 apply.">
            <input className={inputCls} type="number" min={1} value={windowDays} onChange={(e) => setWindowDays(e.target.value)} placeholder="never" />
          </Field>
          <Field label="Display order">
            <input className={inputCls} type="number" value={plan.displayOrder} disabled />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-sm mb-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (bookable)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={workerScoped} onChange={(e) => setWorkerScoped(e.target.checked)} />
            Worker-scoped
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={legacy} onChange={(e) => setLegacy(e.target.checked)} />
            Legacy (hidden in paywalls)
          </label>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 mb-3">
          <div className="text-xs font-medium text-slate-600 mb-2">
            Grants — what one successful purchase creates in the ledger
          </div>
          {grants.map((g, i) => (
            <div key={i} className="grid grid-cols-[1fr_64px_64px_32px] min-[420px]:grid-cols-[1fr_80px_80px_36px] gap-2 mb-2 items-center">
              <select
                className={inputCls}
                value={g.kind}
                onChange={(e) => setGrants(grants.map((x, j) => (j === i ? { ...x, kind: e.target.value as Grant["kind"] } : x)))}
              >
                <option value="chat">chat</option>
                <option value="job_post">job_post</option>
                <option value="apply">apply</option>
              </select>
              <input
                className={inputCls}
                type="number"
                min={1}
                value={g.qty}
                onChange={(e) => setGrants(grants.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))}
              />
              <input
                className={inputCls}
                type="number"
                placeholder="∞"
                value={g.windowDays ?? ""}
                onChange={(e) =>
                  setGrants(
                    grants.map((x, j) =>
                      j === i ? { ...x, windowDays: e.target.value === "" ? null : Number(e.target.value) } : x
                    )
                  )
                }
              />
              <button
                className="text-slate-400 hover:text-rose-600"
                onClick={() => setGrants(grants.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          {grants.length < 4 && (
            <Button
              small
              variant="subtle"
              onClick={() => setGrants([...grants, { kind: "chat", qty: 1, windowDays: null }])}
            >
              + Add grant
            </Button>
          )}
        </div>

        <Field label="Reason for this change (audit-trailed)">
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. price experiment — weekly underperforming" />
        </Field>

        <Button disabled={!changed || busy || reason.trim().length < 3} onClick={() => setConfirmOpen(true)}>
          Review changes…
        </Button>
      </Modal>

      {/* PRD §6.2 confirm dialog */}
      <Modal open={confirmOpen} title="Confirm pricing change" onClose={() => setConfirmOpen(false)}>
        <div className="space-y-3 text-sm">
          <p>
            You are about to change <strong>{plan.code}</strong> ({plan.role || "any role"}).
          </p>
          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Price</span>
              <span>
                {kes(plan.amountKes)} → <strong>{kes(amount)}</strong>
                {amount !== plan.amountKes && (
                  <span className="text-xs text-slate-400">
                    {" "}({plan.amountKes > amount ? "−" : "+"}{kes(Math.abs(amount - plan.amountKes))})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Label</span>
              <span>{plan.label} → <strong>{label}</strong></span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bookable</span>
              <span>{plan.active ? "yes" : "no"} → <strong>{active ? "yes" : "no"}</strong></span>
            </div>
          </div>
          <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
            <li>Takes effect <strong>immediately</strong> for new purchases.</li>
            <li>Active subscriptions keep their price until the period ends (PRD §6.2).</li>
            <li>Existing completed purchases are never altered.</li>
            <li>Recorded in the audit trail under your account.</li>
          </ul>
          <Button variant={amount > plan.amountKes ? "primary" : "danger"} disabled={busy} onClick={submit}>
            {busy ? "Applying…" : `Apply — new purchases charge ${kes(amount)}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------- create modal

function CreatePlanModal({
  open,
  onClose,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    role: "employer",
    label: "",
    amountKes: 100,
    windowDays: "",
    workerScoped: false,
    isSubscription: false,
    legacy: false,
    active: true,
    displayOrder: 500
  });
  const [grants, setGrants] = useState<Grant[]>([{ kind: "chat", qty: 1, windowDays: null }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post("admin/plans", {
        code: form.code,
        role: form.role,
        label: form.label,
        amountKes: Number(form.amountKes),
        windowDays: form.windowDays === "" ? null : Number(form.windowDays),
        workerScoped: form.workerScoped,
        isSubscription: form.isSubscription,
        legacy: form.legacy,
        active: form.active,
        displayOrder: Number(form.displayOrder),
        grants: grants.map((g) => ({
          kind: g.kind,
          qty: Number(g.qty),
          windowDays: g.windowDays == null ? null : Number(g.windowDays)
        }))
      });
      onSaved(`Plan ${form.code} created and bookable.`);
      setForm({ code: "", role: "employer", label: "", amountKes: 100, windowDays: "", workerScoped: false, isSubscription: false, legacy: false, active: true, displayOrder: 500 });
      setGrants([]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Create plan" onClose={onClose} wide>
      {err && <Alert kind="error">{err}</Alert>}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Code (immutable, e.g. boost_profile)">
          <input className={inputCls} value={form.code} onChange={(e) => set("code", e.target.value.toLowerCase())} placeholder="boost_profile" />
        </Field>
        <Field label="Role">
          <select className={inputCls} value={form.role} onChange={(e) => set("role", e.target.value)}>
            <option value="employer">employer</option>
            <option value="maid">maid</option>
            <option value="none">any / dev</option>
          </select>
        </Field>
        <Field label="Label">
          <input className={inputCls} value={form.label} onChange={(e) => set("label", e.target.value)} />
        </Field>
        <Field label="Price (KES)">
          <input className={inputCls} type="number" min={1} value={form.amountKes} onChange={(e) => set("amountKes", Number(e.target.value))} />
        </Field>
        <Field label="Window days (empty = never)">
          <input className={inputCls} type="number" value={form.windowDays} onChange={(e) => set("windowDays", e.target.value)} />
        </Field>
        <Field label="Display order">
          <input className={inputCls} type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value))} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm mb-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.isSubscription} onChange={(e) => set("isSubscription", e.target.checked)} />
          Subscription (dup-purchase blocked)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.workerScoped} onChange={(e) => set("workerScoped", e.target.checked)} />
          Worker-scoped
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Active
        </label>
      </div>
      <GrantsEditor grants={grants} setGrants={setGrants} />
      <Button onClick={submit} disabled={busy || form.code.length < 3 || form.label.length < 3}>
        {busy ? "Creating…" : "Create plan"}
      </Button>
    </Modal>
  );
}

function GrantsEditor({ grants, setGrants }: { grants: Grant[]; setGrants: (g: Grant[]) => void }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 mb-3">
      <div className="text-xs font-medium text-slate-600 mb-2">Grants</div>
      {grants.map((g, i) => (
        <div key={i} className="grid grid-cols-[1fr_64px_64px_32px] min-[420px]:grid-cols-[1fr_80px_80px_36px] gap-2 mb-2 items-center">
          <select className={inputCls} value={g.kind} onChange={(e) => setGrants(grants.map((x, j) => (j === i ? { ...x, kind: e.target.value as Grant["kind"] } : x)))}>
            <option value="chat">chat</option>
            <option value="job_post">job_post</option>
            <option value="apply">apply</option>
          </select>
          <input className={inputCls} type="number" min={1} value={g.qty} onChange={(e) => setGrants(grants.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
          <input
            className={inputCls}
            type="number"
            placeholder="∞"
            value={g.windowDays ?? ""}
            onChange={(e) => setGrants(grants.map((x, j) => (j === i ? { ...x, windowDays: e.target.value === "" ? null : Number(e.target.value) } : x)))}
          />
          <button className="text-slate-400 hover:text-rose-600" onClick={() => setGrants(grants.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {grants.length < 4 && (
        <Button small variant="subtle" onClick={() => setGrants([...grants, { kind: "chat", qty: 1, windowDays: null }])}>
          + Add grant
        </Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------ pay options

function PayOptionsCard({
  options,
  editable,
  onSaved
}: {
  options: Record<string, { plan: string; why: string }[]>;
  editable: boolean;
  onSaved: (msg: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const labels: Record<string, string> = {
    postJob: "Post a job — 402 options",
    startChat: "Start a chat — 402 options",
    applyJob: "Apply to a job — 402 options"
  };

  return (
    <Card title="Payment options shown on 402 paywalls">
      <div className="grid lg:grid-cols-3 gap-4">
        {Object.entries(labels).map(([action, label]) => (
          <div key={action} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">{label}</span>
              {editable && (
                <Button small variant="ghost" onClick={() => setEditing(action)}>Edit</Button>
              )}
            </div>
            <ol className="text-sm space-y-1">
              {(options[action] || []).map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-4 text-xs text-slate-400">{i + 1}.</span>
                  <span className="font-mono text-xs text-brand-700">{o.plan}</span>
                  <span className="text-xs text-slate-400 truncate">{o.why}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {editing && (
        <PayOptionsEditor
          action={editing}
          options={options[editing] || []}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            onSaved(text);
          }}
        />
      )}
    </Card>
  );
}

function PayOptionsEditor({
  action,
  options,
  onClose,
  onSaved
}: {
  action: string;
  options: { plan: string; why: string }[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [rows, setRows] = useState(options.map((o) => ({ ...o })));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.put(`admin/pay-options/${action}`, { options: rows });
      onSaved(`${action} options updated.`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={`Edit ${action} options`} onClose={onClose} wide>
      {err && <Alert kind="error">{err}</Alert>}
      <p className="text-xs text-slate-500 mb-3">
        Order = display order. These are the plans offered when a user without credits hits a paywall.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr_36px] gap-2 mb-2 items-center">
          <input className={inputCls} value={row.plan} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, plan: e.target.value } : x)))} />
          <input className={inputCls} value={row.why} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, why: e.target.value } : x)))} />
          <button className="text-slate-400 hover:text-rose-600" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button small variant="subtle" onClick={() => setRows([...rows, { plan: "", why: "" }])}>+ Add option</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save options"}</Button>
      </div>
    </Modal>
  );
}
