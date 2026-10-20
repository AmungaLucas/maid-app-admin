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
  // Guard pages only — everything under /api/* is the server-side gateway
  // proxy (it enforces its own auth via the gateway JWT).
  matcher: ["/((?!api/|_next|favicon.ico).*)"]
};
