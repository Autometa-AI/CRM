import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "autometa-auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);

  // Public endpoints (authenticate themselves via shared secret / HMAC).
  if (pathname.startsWith("/login")) return res;
  if (pathname.startsWith("/api/leads/")) return res;
  if (pathname.startsWith("/api/webhooks/")) return res;

  const secret = process.env.SESSION_SECRET ?? "autometa-crm-default-secret-change-in-production-2026";
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (token === secret) return res;

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
