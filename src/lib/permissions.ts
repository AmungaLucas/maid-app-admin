export type Role = "admin" | "support" | "finance";

// Mirrors the gateway's requireAdmin() allow-lists — this only drives the
// UI (hiding buttons/menus); the API enforces the real boundaries.
export const can = {
  planEdit: (r: Role) => r === "admin" || r === "finance",
  payOptionsEdit: (r: Role) => r === "admin" || r === "finance",
  userActions: (r: Role) => r === "admin" || r === "support",
  kycReview: (r: Role) => r === "admin" || r === "support",
  jobActions: (r: Role) => r === "admin" || r === "support",
  reverse: (r: Role) => r === "admin" || r === "finance",
  adminsManage: (r: Role) => r === "admin",
  referralSettings: (r: Role) => r === "admin",
  referralPayout: (r: Role) => r === "admin" || r === "finance",
  referralReject: (r: Role) => r === "admin",
  chatView: (r: Role) => true,
  chatModerate: (r: Role) => r === "admin" || r === "support",
  chatUnrestrict: (r: Role) => r === "admin",
  ban: (r: Role) => r === "admin",
  appealDecide: (r: Role) => r === "admin" || r === "support",
  reportDecide: (r: Role) => r === "admin" || r === "support",
  promotionCancel: (r: Role) => r === "admin"
};

// Nav visibility mirrors the gateway requireAdmin() allow-lists — including the
// read endpoints (adminAuth.js: support = users/KYC/jobs/moderation, finance =
// pricing/transactions/referrals). Pages reached by direct URL still enforce
// server-side; buttons inside shared pages stay gated by can.*.
export const NAV: {
  href: string;
  label: string;
  roles: Role[];
  icon: string;
  group: "Insights" | "Operations" | "Money" | "Governance";
}[] = [
  { href: "/", label: "Overview", roles: ["admin", "support", "finance"], icon: "overview", group: "Insights" },
  { href: "/metrics", label: "Metrics", roles: ["admin", "finance"], icon: "metrics", group: "Insights" },
  { href: "/users", label: "Users", roles: ["admin", "support"], icon: "users", group: "Operations" },
  { href: "/kyc", label: "KYC Review", roles: ["admin", "support"], icon: "kyc", group: "Operations" },
  { href: "/jobs", label: "Jobs", roles: ["admin", "support"], icon: "jobs", group: "Operations" },
  { href: "/plans", label: "Plans & Pricing", roles: ["admin", "finance"], icon: "plans", group: "Money" },
  { href: "/transactions", label: "Transactions", roles: ["admin", "finance"], icon: "transactions", group: "Money" },
  { href: "/referrals", label: "Referrals", roles: ["admin", "finance"], icon: "gift", group: "Money" },
  { href: "/chats", label: "Chats", roles: ["admin", "support"], icon: "chat", group: "Operations" },
  { href: "/appeals", label: "Appeals", roles: ["admin", "support"], icon: "flag", group: "Operations" },
  { href: "/reports", label: "Reports", roles: ["admin", "support"], icon: "reports", group: "Operations" },
  { href: "/reviews", label: "Reviews", roles: ["admin", "support"], icon: "star", group: "Operations" },
  { href: "/promotions", label: "Promotions", roles: ["admin"], icon: "boost", group: "Money" },
  { href: "/audit", label: "Audit Trail", roles: ["admin"], icon: "audit", group: "Governance" },
  { href: "/admins", label: "Dashboard Team", roles: ["admin"], icon: "team", group: "Governance" }
];

const GROUP_ORDER: NavGroup[] = ["Insights", "Operations", "Money", "Governance"];
export type NavGroup = "Insights" | "Operations" | "Money" | "Governance";

export function navFor(role: Role) {
  const items = NAV.filter((item) => item.roles.includes(role));
  const groups: { name: NavGroup; items: typeof NAV }[] = [];
  for (const g of GROUP_ORDER) {
    const inGroup = items.filter((i) => i.group === g);
    if (inGroup.length) groups.push({ name: g, items: inGroup });
  }
  return groups;
}

// Page-level guard for direct URL entry. The sidebar hides sections, but
// nothing stopped a finance account from typing /kyc — the page shell would
// render and then die on the gateway's 403. Derived from NAV so there is
// exactly one source of truth; the gateway remains the real boundary.
export function canViewPath(role: Role, pathname: string): boolean {
  for (const item of NAV) {
    if (!item.roles.includes(role)) continue;
    if (item.href === "/") {
      if (pathname === "/") return true;
    } else if (
      pathname === item.href ||
      pathname.startsWith(item.href + "/")
    ) {
      return true;
    }
  }
  return false;
}

// Which roles a path belongs to — used by the "not available for your role"
// panel so the user knows who to ask for access.
export function rolesForPath(pathname: string): Role[] {
  const item = NAV.find(
    (i) =>
      i.href !== "/" &&
      (pathname === i.href || pathname.startsWith(i.href + "/"))
  );
  return item ? item.roles : ["admin"];
}
