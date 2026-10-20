"use client";

import { useState } from "react";
import Link from "next/link";
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
  PageHeader,
  Pagination,
  Spinner,
  TableWrap,
  Td,
  Th,
  statusTone
} from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { ago, fmtDate } from "@/lib/format";

type UserRow = {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
  kycStatus: string;
  accountStatus: string;
  activeCredits: number;
  locationLabel: string | null;
  createdAt: string;
};

type ListResponse = { users: UserRow[]; total: number; page: number; pageSize: number };

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [kyc, setKyc] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState("");

  const query = `admin/users?page=${page}${applied ? `&${applied}` : ""}`;
  const { data, loading, error, refetch } = useApi<ListResponse>(query);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (kyc) params.set("kyc", kyc);
    if (status) params.set("status", status);
    setApplied(params.toString());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        sub="Maids and employers on the platform."
        actions={<Button small variant="ghost" onClick={() => refetch()}>Refresh</Button>}
      />

      <Card>
        <form onSubmit={apply} className="grid sm:grid-cols-5 gap-2 items-end">
          <Field label="Search name / phone / email">
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jane / 2547… / @mail" />
          </Field>
          <Field label="Role">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All</option>
              <option value="maid">Maid</option>
              <option value="employer">Employer</option>
            </select>
          </Field>
          <Field label="Verification">
            <select className={inputCls} value={kyc} onChange={(e) => setKyc(e.target.value)}>
              <option value="">All</option>
              {["unverified", "pending", "verified", "rejected", "suspended"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Account status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {["active", "restricted", "suspended"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={loading}>Filter</Button>
        </form>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <Spinner />}

      {data && (
        <Card>
          {data.users.length === 0 ? (
            <Empty>No users match these filters.</Empty>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <CardList>
                {data.users.map((u) => (
                  <MCard key={u.id}>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`w-9 h-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
                          u.role === "maid"
                            ? "bg-gradient-to-br from-violet-400 to-violet-600"
                            : "bg-gradient-to-br from-sky-400 to-sky-600"
                        }`}
                      >
                        {(u.name || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/users/${u.id}`}
                          className="font-medium text-slate-800 hover:text-brand-700 transition-colors block truncate"
                        >
                          {u.name}
                        </Link>
                        <div className="text-xs text-slate-400 tnum truncate">{u.phone}</div>
                      </div>
                    </div>
                    <MRow label="Role" value={<Badge tone={u.role === "maid" ? "violet" : "blue"}>{u.role}</Badge>} />
                    <MRow label="Verification" value={<Badge tone={statusTone(u.kycStatus)}>{u.kycStatus}</Badge>} />
                    <MRow label="Status" value={<Badge tone={statusTone(u.accountStatus)}>{u.accountStatus}</Badge>} />
                    <MRow label="Credits" value={u.activeCredits} strong />
                    <MRow label="Joined" value={ago(u.createdAt)} />
                  </MCard>
                ))}
              </CardList>

              {/* sm+: table */}
              <TableWrap>
                <thead>
                  <tr>
                    <Th>User</Th>
                    <Th>Role</Th>
                    <Th>Verification</Th>
                    <Th>Status</Th>
                    <Th right>Active credits</Th>
                    <Th>Joined</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
                              u.role === "maid"
                                ? "bg-gradient-to-br from-violet-400 to-violet-600"
                                : "bg-gradient-to-br from-sky-400 to-sky-600"
                            }`}
                          >
                            {(u.name || "?").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/users/${u.id}`}
                              className="font-medium text-slate-800 hover:text-brand-700 transition-colors"
                            >
                              {u.name}
                            </Link>
                            <div className="text-xs text-slate-400 tnum">{u.phone}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={u.role === "maid" ? "violet" : "blue"}>{u.role}</Badge>
                      </Td>
                      <Td><Badge tone={statusTone(u.kycStatus)}>{u.kycStatus}</Badge></Td>
                      <Td><Badge tone={statusTone(u.accountStatus)}>{u.accountStatus}</Badge></Td>
                      <Td right className="font-medium">{u.activeCredits}</Td>
                      <Td><span className="text-xs text-slate-500">{ago(u.createdAt)}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </>
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
