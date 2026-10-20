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
  promotionCancel: (r: Role) => r === "admin"
};

export const NAV: {
  href: string;
  label: string;
  roles: Role[];
  icon: string;
  group: "Insights" | "Operations" | "Money" | "Governance";
}[] = [
  { href: "/", label: "Overview", roles: ["admin", "support", "finance"], icon: "overview", group: "Insights" },
  { href: "/metrics", label: "Metrics", roles: ["admin", "support", "finance"], icon: "metrics", group: "Insights" },
  { href: "/users", label: "Users", roles: ["admin", "support", "finance"], icon: "users", group: "Operations" },
  { href: "/kyc", label: "KYC Review", roles: ["admin", "support"], icon: "kyc", group: "Operations" },
  { href: "/jobs", label: "Jobs", roles: ["admin", "support", "finance"], icon: "jobs", group: "Operations" },
  { href: "/plans", label: "Plans & Pricing", roles: ["admin", "support", "finance"], icon: "plans", group: "Money" },
  { href: "/transactions", label: "Transactions", roles: ["admin", "support", "finance"], icon: "transactions", group: "Money" },
  { href: "/referrals", label: "Referrals", roles: ["admin", "support", "finance"], icon: "gift", group: "Money" },
  { href: "/chats", label: "Chats", roles: ["admin", "support", "finance"], icon: "chat", group: "Operations" },
  { href: "/appeals", label: "Appeals", roles: ["admin", "support", "finance"], icon: "flag", group: "Operations" },
  { href: "/promotions", label: "Promotions", roles: ["admin", "support", "finance"], icon: "boost", group: "Money" },
  { href: "/audit", label: "Audit Trail", roles: ["admin", "support", "finance"], icon: "audit", group: "Governance" },
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
