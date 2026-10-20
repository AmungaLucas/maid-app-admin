import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "JobReady Admin",
  description: "Operations dashboard for JobReady (HelpNest) — users, pricing, payments, KYC, analytics."
};

export const viewport: Viewport = {
  themeColor: "#0b1220"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased font-sans">{children}</body>
    </html>
  );
}
