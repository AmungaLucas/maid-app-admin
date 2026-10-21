import { NextRequest, NextResponse } from "next/server";

// Auth gate: any page except /login needs the admin cookie.
export function middleware(req: NextRequest) {
  const authed = Boolean(req.cookies.get("hn_admin")?.value);
  const { pathname } = req.nextUrl;

  if (pathname === "/login") {
    if (authed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Guard pages only — /admin-api/* is the server-side gateway proxy (it
  // enforces its own auth via the gateway JWT). "api/" excluded for safety.
  // Auth gate for every page. Exemptions: the admin API proxy, the gateway
  // proxy, Next internals, and the brand icons (favicon.ico/png, Next App
  // Router icon.png / apple-icon.png served from src/app).
  matcher: ["/((?!admin-api|api/|_next|favicon|icon|apple-icon).*)"],
};
