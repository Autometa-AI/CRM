import { NextResponse } from "next/server";

/**
 * Shared helpers for public ingestion endpoints (/api/leads/*, /api/webhooks/*).
 *
 * - CORS: only the public website origin may POST from a browser.
 * - Auth:  a shared-secret header (x-ingest-token) on the two /leads/* routes.
 *          Cal.com uses its own HMAC signature verified in its handler.
 */

const ALLOWED_ORIGINS = new Set([
  "https://autometa-ai.com",
  "https://www.autometa-ai.com",
  // Local dev:
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-ingest-token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(origin: string | null): Response {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

/** Returns Response on failure, null on success. */
export function assertIngestToken(req: Request): Response | null {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "INGEST_TOKEN not configured on server" },
      { status: 500 }
    );
  }
  const token = req.headers.get("x-ingest-token");
  if (token !== expected) {
    return NextResponse.json(
      { error: "unauthorised" },
      { status: 401, headers: corsHeaders(req.headers.get("origin")) }
    );
  }
  return null;
}

/** Pulls client IP from Vercel / generic proxy headers. */
export function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}
