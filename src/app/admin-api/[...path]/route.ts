import { NextRequest, NextResponse } from "next/server";

// Catch-all proxy to the gateway admin API.
//
// Why proxy: the gateway base URL and the admin JWT never reach the browser
// (httpOnly cookie), and Vercel -> cPanel calls are server-to-server, so no
// CORS involvement anywhere.
//
// Cookie contract:
//   hn_admin  httpOnly  — the gateway JWT (12h)
//   hn_role / hn_email  — non-sensitive display hints for the UI shell
//
// Login (POST admin/login) is special-cased to set the cookie; logout clears.

const GATEWAY = process.env.GATEWAY_URL || "https://gateway.jobready.co.ke";
const COOKIE = "hn_admin";
const TWELVE_HOURS = 60 * 60 * 12;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");

  if (path === "admin/logout") {
    const res = NextResponse.json({ success: true });
    clear(res);
    return res;
  }

  const body = await readBody(req);
  const target = `${GATEWAY}/api/${path}`;

  const r = await fetch(target, {
    method: "POST",
    headers: forward(req),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  const data = await r.json().catch(() => ({}));

  if (path === "admin/login" && r.ok && data?.token) {
    const res = NextResponse.json({
      success: true,
      admin: data.admin
    });
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(COOKIE, data.token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: TWELVE_HOURS
    });
    if (data.admin?.role) res.cookies.set("hn_role", data.admin.role, {
      sameSite: "lax",
      path: "/",
      maxAge: TWELVE_HOURS
    });
    if (data.admin?.email) res.cookies.set("hn_email", data.admin.email, {
      sameSite: "lax",
      path: "/",
      maxAge: TWELVE_HOURS
    });
    return res;
  }

  return NextResponse.json(data, { status: r.status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const search = req.nextUrl.search || "";
  const r = await fetch(`${GATEWAY}/api/${path}${search}`, {
    method: "GET",
    headers: forward(req),
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const body = await readBody(req);
  const r = await fetch(`${GATEWAY}/api/${path}`, {
    method: "PUT",
    headers: forward(req),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}

function forward(req: NextRequest): HeadersInit {
  const token = req.cookies.get(COOKIE)?.value || "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
  };
}

async function readBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function clear(res: NextResponse) {
  for (const name of [COOKIE, "hn_role", "hn_email"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}
