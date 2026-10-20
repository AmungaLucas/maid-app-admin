export function kes(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `KES ${n.toLocaleString("en-KE")}`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function fmtDay(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
}

export function ago(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T") + (String(value).includes("Z") ? "" : "Z"));
  if (isNaN(d.getTime())) return String(value);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8);
}
