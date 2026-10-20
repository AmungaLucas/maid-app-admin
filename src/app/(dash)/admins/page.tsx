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
  Icon,
  Spinner,
  TableWrap,
  Td,
  Th
} from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Admin = {
  id: string;
  email: string;
  role: "admin" | "support" | "finance";
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_NOTES: Record<string, string> = {
  admin: "Everything, including managing the dashboard team.",
  support: "Users, credits, KYC review, jobs moderation. No pricing, no reversals.",
  finance: "Pricing, pay options, transactions, M-Pesa reversals. No bans, no KYC."
};

export default function AdminsPage() {
  const { data, loading, error, refetch } = useApi<{ admins: Admin[] }>("admin/admins");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const toggle = async (admin: Admin) => {
    try {
      const d = await api.post<{ message: string }>(`admin/admins/${admin.id}/${admin.active ? "deactivate" : "activate"}`);
      setMsg({ kind: "ok", text: d.message });
      refetch();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard team"
        sub="Role separation per PRD §19.1. App accounts can never log in here."
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" className="w-4 h-4" /> Add member</Button>}
      />

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {data.admins.length === 0 ? (
            <Empty>No dashboard accounts.</Empty>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <CardList>
                {data.admins.map((a) => (
                  <MCard key={a.id}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-medium text-slate-800 truncate">{a.email}</span>
                      <Badge tone={a.active ? "green" : "red"}>{a.active ? "active" : "deactivated"}</Badge>
                    </div>
                    <MRow
                      label="Role"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Badge tone={a.role === "admin" ? "blue" : a.role === "finance" ? "green" : "violet"}>{a.role}</Badge>
                        </span>
                      }
                    />
                    <MRow label="Can" value={ROLE_NOTES[a.role]} />
                    <MRow label="Last login" value={a.lastLoginAt ? fmtDate(a.lastLoginAt) : "never"} />
                    <MRow label="Created" value={fmtDate(a.createdAt)} />
                    <div className="mt-2">
                      <Button small variant="ghost" onClick={() => toggle(a)}>
                        {a.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </MCard>
                ))}
              </CardList>

              {/* sm+: table */}
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Last login</Th><Th>Created</Th><Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.admins.map((a) => (
                    <tr key={a.id}>
                      <Td className="font-medium">{a.email}</Td>
                      <Td>
                        <div>
                          <Badge tone={a.role === "admin" ? "blue" : a.role === "finance" ? "green" : "violet"}>{a.role}</Badge>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-[220px]">{ROLE_NOTES[a.role]}</div>
                      </Td>
                      <Td>
                        <Badge tone={a.active ? "green" : "red"}>{a.active ? "active" : "deactivated"}</Badge>
                      </Td>
                      <Td><span className="text-xs text-slate-500">{a.lastLoginAt ? fmtDate(a.lastLoginAt) : "never"}</span></Td>
                      <Td><span className="text-xs text-slate-500">{fmtDate(a.createdAt)}</span></Td>
                      <Td right>
                        <Button small variant="ghost" onClick={() => toggle(a)}>
                          {a.active ? "Deactivate" : "Activate"}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
        </Card>
      )}

      <Card title="Your own password">
        <PasswordCard onDone={(text) => setMsg({ kind: "ok", text })} />
      </Card>

      <CreateAdminModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(text) => {
          setCreating(false);
          setMsg({ kind: "ok", text });
          refetch();
        }}
      />
    </div>
  );
}

function PasswordCard({ onDone }: { onDone: (msg: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ message: string }>("admin/me/password", { current, next });
      setCurrent("");
      setNext("");
      onDone(d.message + " Use it on your next sign-in.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {err && <Alert kind="error">{err}</Alert>}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Current password">
          <input className={inputCls} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password (min 10 chars)">
          <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
      <Button onClick={submit} disabled={busy || next.length < 10 || current.length < 1}>
        {busy ? "Updating…" : "Change password"}
      </Button>
    </div>
  );
}

function CreateAdminModal({
  open,
  onClose,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("support");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post("admin/admins", { email, password, role });
      onSaved(`${email} added as ${role}. Share the password securely — they change it after first sign-in.`);
      setEmail("");
      setPassword("");
      setRole("support");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Add dashboard member" onClose={onClose}>
      {err && <Alert kind="error">{err}</Alert>}
      <Field label="Email">
        <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Temporary password (min 10 chars)">
        <input className={inputCls} type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Role" hint={ROLE_NOTES[role]}>
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">admin</option>
          <option value="support">support</option>
          <option value="finance">finance</option>
        </select>
      </Field>
      <Button onClick={submit} disabled={busy || email.length < 5 || password.length < 10}>
        {busy ? "Creating…" : "Create account"}
      </Button>
    </Modal>
  );
}
