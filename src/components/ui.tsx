"use client";

import React, { useEffect, useRef, useState } from "react";

// Hand-rolled UI kit — zero extra dependencies. Tailwind-only.
// Design language: soft neutral canvas, white hairline cards, deep-navy
// chrome, emerald accent, tabular numerals, quiet motion.

/* ------------------------------------------------------------------ */
/* Icons — inline stroke SVG, lucide-style, 24px grid                  */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<string, React.ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20c.7-3.2 3.2-5 6.2-5s5.5 1.8 6.2 5" />
      <path d="M16.2 4.6a3.4 3.4 0 0 1 0 6.8" />
      <path d="M17.8 15.4c1.8.7 3 2.2 3.4 4.6" />
    </>
  ),
  plans: (
    <>
      <path d="M3 9.5V5.4C3 4.1 4.1 3 5.4 3h4.1c.6 0 1.2.2 1.6.7l9 9a2.3 2.3 0 0 1 0 3.3l-4.1 4.1a2.3 2.3 0 0 1-3.3 0l-9-9A2.3 2.3 0 0 1 3 9.5Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  transactions: (
    <>
      <path d="M4 8h13.2M14 4.5 17.5 8 14 11.5" />
      <path d="M20 16H6.8M10 12.5 6.5 16l3.5 3.5" />
    </>
  ),
  kyc: (
    <>
      <path d="M12 3l7.5 2.8v5.4c0 4.6-3 8.2-7.5 9.8-4.5-1.6-7.5-5.2-7.5-9.8V5.8L12 3Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  jobs: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </>
  ),
  metrics: (
    <>
      <path d="M3.5 3.5v16a1 1 0 0 0 1 1H21" />
      <path d="M8 16.5v-5" />
      <path d="M13 16.5V8" />
      <path d="M18 16.5v-7.5" />
    </>
  ),
  audit: (
    <>
      <path d="M5 4.5h14a1 1 0 0 1 1 1V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19V5.5a1 1 0 0 1 1-1Z" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </>
  ),
  team: (
    <>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20.5c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4H17a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2.5" />
      <path d="M10 8.5 6.5 12l3.5 3.5" />
      <path d="M6.5 12H15" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 5.5v5h-5" />
      <path d="M4 18.5v-5h5" />
      <path d="M19.3 10.5A7.6 7.6 0 0 0 5.6 8M4.7 13.5A7.6 7.6 0 0 0 18.4 16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4 2.8 20h18.4L12 4Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r=".4" fill="currentColor" />
    </>
  ),
  chevronLeft: <path d="M14.5 6 9 12l5.5 6" />,
  chevronRight: <path d="m9.5 6 5.5 6-5.5 6" />,
  chevronDown: <path d="m6 9.5 6 5.5 6-5.5" />,
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.4" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  activity: <path d="M3 12h4l2.5-7 4.5 14 2.5-7H21" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  verified: (
    <>
      <path d="M12 2.8 14.6 5l3.4.3.3 3.4L20.5 11l-2.2 2.6-.3 3.4-3.4.3-2.6 2.2-2.6-2.2-3.4-.3-.3-3.4L3.5 11l2.2-2.6.3-3.4 3.4-.3L12 2.8Z" />
      <path d="m9 11.8 2.1 2.1 3.9-4" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5.5a1.5 1.5 0 0 1 1.4-1h9.2a1.5 1.5 0 0 1 1.4 1l2.5 8" />
      <path d="M3.5 13.5h5l1 2.5h5l1-2.5h5v5a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-5Z" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m3.5 17 4.8-4.8a1.5 1.5 0 0 1 2.1 0l5.8 5.8" />
      <path d="m14.5 14.5 1.9-1.9a1.5 1.5 0 0 1 2.1 0l2 2" />
    </>
  ),
  arrowUp: <path d="M7 17 17 7M9 7h8v8" />,
  shield: (
    <>
      <path d="M12 3l7.5 2.8v5.4c0 4.6-3 8.2-7.5 9.8-4.5-1.6-7.5-5.2-7.5-9.8V5.8L12 3Z" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.2V19l-3.6-2v-4.3L4 5.5Z" />
};

export function Icon({
  name,
  className = "w-5 h-5",
  strokeWidth = 1.7
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICON_PATHS[name] ?? ICON_PATHS.overview}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  sub,
  actions
}: {
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile card list — table alternative below the sm breakpoint         */
/* ------------------------------------------------------------------ */

export function CardList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-slate-100 sm:hidden">{children}</div>;
}

export function MCard({
  children,
  onClick
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`py-3.5 first:pt-1 last:pb-1 ${onClick ? "cursor-pointer active:bg-slate-50 -mx-1 px-1 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

export function MRow({
  label,
  value,
  strong
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-400 shrink-0">{label}</span>
      <span
        className={`text-sm text-right min-w-0 truncate ${strong ? "font-semibold text-slate-800" : "text-slate-600"}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  title,
  right,
  children,
  className = "",
  pad = true
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section
      className={`bg-white border border-slate-200/80 rounded-2xl shadow-card ${className}`}
    >
      {(title || right) && (
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {right}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const STAT_TONES: Record<string, { text: string; tile: string; ring: string }> = {
  default: { text: "text-slate-900", tile: "bg-slate-100 text-slate-600", ring: "" },
  good: { text: "text-emerald-600", tile: "bg-emerald-50 text-emerald-600", ring: "" },
  warn: { text: "text-amber-600", tile: "bg-amber-50 text-amber-600", ring: "" },
  bad: { text: "text-rose-600", tile: "bg-rose-50 text-rose-600", ring: "" },
  accent: { text: "text-brand-600", tile: "bg-brand-50 text-brand-600", ring: "" }
};

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  icon
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "accent";
  icon?: string;
}) {
  const t = STAT_TONES[tone] || STAT_TONES.default;
  return (
    <div className="group bg-white border border-slate-200/80 rounded-2xl shadow-card p-3.5 sm:p-4 hover:shadow-lift sm:hover:-translate-y-0.5 transition-all duration-200 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">
          {label}
        </div>
        {icon && (
          <span className={`inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-xl items-center justify-center shrink-0 ${t.tile}`}>
            <Icon name={icon} className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className={`tnum mt-1.5 sm:mt-2 text-[20px] sm:text-[26px] leading-7 sm:leading-8 font-semibold truncate ${t.text}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] sm:text-xs text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & pills                                                      */
/* ------------------------------------------------------------------ */

const BADGE_TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  red: "bg-rose-50 text-rose-700 ring-rose-200/70",
  blue: "bg-sky-50 text-sky-700 ring-sky-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/70"
};

const DOT_TONES: Record<string, string> = {
  slate: "bg-slate-400",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500"
};

export function Badge({
  children,
  tone = "slate",
  dot = false
}: {
  children: React.ReactNode;
  tone?: keyof typeof BADGE_TONES;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${BADGE_TONES[tone]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_TONES[tone]}`} />}
      {children}
    </span>
  );
}

export function statusTone(status: string | null | undefined): keyof typeof BADGE_TONES {
  switch (status) {
    case "verified":
    case "success":
    case "active":
    case "approved":
    case "open":
    case "hired":
      return "green";
    case "pending":
    case "viewed":
    case "shortlisted":
    case "restricted":
      return "amber";
    case "failed":
    case "suspended":
    case "rejected":
    case "timeout":
      return "red";
    case "closed":
    case "withdrawn":
      return "slate";
    default:
      return "slate";
  }
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  small,
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  disabled?: boolean;
  small?: boolean;
  type?: "button" | "submit";
}) {
  const base = small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/25 hover:from-brand-400 hover:to-brand-600 active:scale-[.98] disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none",
    subtle:
      "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70 hover:bg-brand-100 active:scale-[.98] disabled:text-slate-400 disabled:bg-slate-50 disabled:ring-slate-200",
    ghost:
      "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-800 active:scale-[.98] disabled:text-slate-300",
    danger:
      "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-600/25 hover:from-rose-400 hover:to-rose-600 active:scale-[.98] disabled:from-rose-200 disabled:to-rose-200"
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-150 ${base} ${variants[variant]} disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  title,
  onClose,
  children,
  wide
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative bg-white shadow-pop w-full sm:w-auto ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-scale-in rounded-t-2xl sm:rounded-2xl`}
      >
        <header className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur rounded-t-2xl">
          <h3 className="text-sm font-semibold text-slate-800 pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 -mr-1.5 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </header>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-3.5">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1.5 text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400";

/* ------------------------------------------------------------------ */
/* Alerts & toasts                                                     */
/* ------------------------------------------------------------------ */

export function Alert({ kind, children }: { kind: "error" | "ok" | "info"; children: React.ReactNode }) {
  const map = {
    error: "bg-rose-50 text-rose-700 border-rose-200/80",
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    info: "bg-sky-50 text-sky-700 border-sky-200/80"
  };
  const icon = { error: "alert", ok: "check", info: "activity" }[kind];
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-sm flex items-start gap-2.5 mb-3.5 animate-fade-in ${map[kind]}`}>
      <Icon name={icon} className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

type ToastKind = "ok" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };
type Listener = (t: Toast[]) => void;

let toastState: Toast[] = [];
const toastListeners = new Set<Listener>();
let toastSeq = 1;

export function toast(message: string, kind: ToastKind = "ok") {
  const t = { id: toastSeq++, kind, message };
  toastState = [...toastState, t];
  toastListeners.forEach((l) => l(toastState));
  setTimeout(() => {
    toastState = toastState.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l(toastState));
  }, 3800);
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toastState);
  useEffect(() => {
    const l: Listener = (t) => setItems([...t]);
    toastListeners.add(l);
    return () => {
      toastListeners.delete(l);
    };
  }, []);

  const styles: Record<ToastKind, string> = {
    ok: "border-emerald-200 bg-white",
    error: "border-rose-200 bg-white",
    info: "border-sky-200 bg-white"
  };
  const iconTones: Record<ToastKind, string> = {
    ok: "bg-emerald-50 text-emerald-600",
    error: "bg-rose-50 text-rose-600",
    info: "bg-sky-50 text-sky-600"
  };
  const icons: Record<ToastKind, string> = { ok: "check", error: "alert", info: "activity" };

  return (
    <div className="fixed top-4 right-4 z-[70] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 rounded-xl border shadow-lift px-3.5 py-3 animate-slide-in ${styles[t.kind]}`}
        >
          <span className={`w-6 h-6 rounded-lg inline-flex items-center justify-center shrink-0 ${iconTones[t.kind]}`}>
            <Icon name={icons[t.kind]} className="w-3.5 h-3.5" strokeWidth={2.2} />
          </span>
          <p className="text-sm text-slate-700 min-w-0">{t.message}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

// Contained horizontal scroll for wide tables. Sits INSIDE the card
// padding — the old -mx/-my full-bleed trick made tables overlap the
// card frame and adjacent blocks on phones. sm+ gets the framed table;
// below sm pages render CardList cards instead.
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden sm:block overflow-x-auto rounded-xl ring-1 ring-slate-100">
      <table className="min-w-full divide-y divide-slate-100">{children}</table>
    </div>
  );
}

export function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/70 whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  mono,
  className = ""
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 text-sm text-slate-700 align-middle ${right ? "text-right tnum" : ""} ${mono ? "font-mono text-xs" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100 px-1">
      <span className="text-xs text-slate-400 tnum">
        {total.toLocaleString()} record{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex items-center gap-1.5">
        <Button small variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevronLeft" className="w-3.5 h-3.5" /> Prev
        </Button>
        <Button small variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <Icon name="chevronRight" className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

export function Bars({
  data,
  valueKey,
  labelKey,
  fmt
}: {
  data: any[];
  valueKey: string;
  labelKey: string;
  fmt?: (v: any) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  if (!data.length) return <Empty>No data in this window.</Empty>;
  return (
    <div>
      <div className="relative flex items-end gap-[3px] h-32 sm:h-40">
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <div
            key={g}
            className="absolute left-0 right-0 border-t border-dashed border-slate-100 pointer-events-none"
            style={{ bottom: `${g * 100}%` }}
          >
            <span className="absolute -top-2 -right-0.5 text-[9px] text-slate-300 tnum">
              {fmt ? fmt(Math.round(max * g)) : Math.round(max * g)}
            </span>
          </div>
        ))}
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0;
          const h = Math.max(2, (v / max) * 100);
          return (
            <div key={i} className="relative flex-1 h-full flex items-end group">
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-ink-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lift">
                  <span className="font-medium">{fmt ? fmt(v) : String(v)}</span>
                  <span className="text-slate-400"> · {String(d[labelKey]).slice(5)}</span>
                </div>
              </div>
              <div
                className={`w-full rounded-t-[4px] bg-gradient-to-t transition-all duration-200 group-hover:brightness-110 ${
                  v > 0
                    ? "from-brand-600 to-brand-400 group-hover:shadow-glow"
                    : "from-slate-200 to-slate-200"
                }`}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="hidden sm:flex gap-[3px] mt-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-[9px] text-slate-300 truncate text-center">
            {String(d[labelKey]).slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <span className="inline-flex w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 items-center justify-center mb-3">
        <Icon name="inbox" className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-400">{children}</p>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-slate-400 gap-2.5">
      <span className="inline-block w-4 h-4 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200/80 rounded-2xl shadow-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16 mt-3" />
          <Skeleton className="h-3 w-24 mt-2.5" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-1 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden sm:block" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
