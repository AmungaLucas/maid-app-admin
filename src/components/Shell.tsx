"use client";

// Dashboard shell: fixed sidebar + topbar around every authed page.
// Role/email come from cookies; the gateway enforces the real RBAC.

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navFor, Role } from "@/lib/permissions";
import { emailFromCookie, roleFromCookie } from "@/lib/api";
import { Icon, Toaster } from "@/components/ui";

const TITLES: Record<string, { t: string; s: string }> = {
  "/": { t: "Overview", s: "Live platform health and revenue" },
  "/users": { t: "Users", s: "Maids and employers on the platform" },
  "/plans": { t: "Plans & Pricing", s: "Pricing is served from the database — edits apply to new purchases instantly" },
  "/transactions": { t: "Transactions", s: "M-Pesa payments, grants and manual refunds" },
  "/kyc": { t: "KYC Review", s: "Identity documents awaiting verification" },
  "/jobs": { t: "Jobs", s: "Listings across the 30-day publication window" },
  "/metrics": { t: "Metrics", s: "PRD §21 growth and funnel indicators" },
  "/audit": { t: "Audit Trail", s: "Every dashboard action, who did it and why" },
  "/admins": { t: "Dashboard Team", s: "Admin, support and finance accounts" }
};

const ROLE_CHIP: Record<Role, string> = {
  admin: "bg-brand-500/15 text-brand-300 ring-brand-400/30",
  support: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  finance: "bg-amber-400/15 text-amber-300 ring-amber-400/30"
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const r = (roleFromCookie() || "admin") as Role;
    setRole(r);
    setEmail(emailFromCookie());
  }, [pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const groups = useMemo(() => navFor(role), [role]);

  const logout = async () => {
    await fetch("/admin-api/admin/logout", { method: "POST" });
    router.replace("/login");
  };

  const head = TITLES[pathname] || { t: pathname, s: "" };
  const initials = (email || "a").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100/70">
      <Toaster />

      {/* Mobile drawer backdrop */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-[2px] lg:hidden animate-fade-in"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-50 lg:z-10 h-screen w-64 shrink-0 flex flex-col bg-ink-900 transition-transform duration-300 ease-out lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
          <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 items-center justify-center shadow-glow">
            <Icon name="shield" className="w-5 h-5 text-white" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold tracking-tight leading-4">
              JobReady Admin
            </div>
            <div className="text-[11px] text-slate-500 leading-4">operations console</div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto scrollbar-dark px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {g.name}
              </div>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all duration-150 ${
                        active
                          ? "bg-white/[0.07] text-white font-medium"
                          : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-brand-400 shadow-glow" />
                      )}
                      <Icon
                        name={item.icon}
                        className={`w-[18px] h-[18px] shrink-0 ${active ? "text-brand-400" : "text-slate-500"}`}
                      />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.04]">
            <span className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-slate-200 truncate">
                {email || "admin"}
              </div>
              <span
                className={`inline-block mt-0.5 px-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${ROLE_CHIP[role]}`}
              >
                {role}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition"
            >
              <Icon name="logout" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/75 backdrop-blur-md border-b border-slate-200/70">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setNavOpen(!navOpen)}
                className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
                aria-label="Menu"
              >
                <Icon name={navOpen ? "x" : "menu"} className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-800 leading-4 truncate">
                  {head.t}
                </h2>
                <p className="text-[11px] text-slate-400 leading-4 truncate hidden sm:block">
                  {head.s}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 ring-1 ring-inset ring-emerald-200/70 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                Live · jobready.co.ke
              </span>
              <button
                onClick={logout}
                className="sm:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
                aria-label="Sign out"
              >
                <Icon name="logout" className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>

        <footer className="px-4 sm:px-6 py-4 text-[11px] text-slate-400 flex flex-col sm:flex-row gap-1 sm:items-center sm:justify-between">
          <span>JobReady · HelpNest ops console</span>
          <span>Gateway build 2026-10-21.15</span>
        </footer>
      </div>
    </div>
  );
}
