import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  corsHeaders,
  preflight,
  assertIngestToken,
  clientIp,
} from "@/lib/ingest";

/**
 * POST /api/leads/website
 *
 * Ingest a form submission from autometa-ai.com (contact forms, newsletter,
 * anything that's not the playbook sign-in or a Cal booking).
 *
 * Expected body (all fields optional except full_name):
 *   {
 *     full_name: string,
 *     email?: string,
 *     phone?: string,
 *     company_website?: string,
 *     message?: string,
 *     source_page?: string,     // e.g. "/blog/response-time-slas-that-stick"
 *     utm?: { source, medium, campaign },
 *     referrer?: string
 *   }
 *
 * Headers:
 *   x-ingest-token: <INGEST_TOKEN>
 */

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const authErr = assertIngestToken(req);
  if (authErr) return authErr;

  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400, headers: cors }
    );
  }

  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  if (!full_name) {
    return NextResponse.json(
      { error: "full_name is required" },
      { status: 400, headers: cors }
    );
  }

  const utm = (body.utm ?? {}) as Record<string, unknown>;
  const row = {
    full_name,
    email: str(body.email),
    phone: str(body.phone),
    company_website: str(body.company_website),
    message: str(body.message),
    source_page: str(body.source_page),
    referrer: str(body.referrer),
    utm_source: str(utm.source),
    utm_medium: str(utm.medium),
    utm_campaign: str(utm.campaign),
    user_agent: req.headers.get("user-agent"),
    ip_address: clientIp(req),
    submitted_at: new Date().toISOString(),
    raw_payload: body,
  };

  const { data, error } = await supabase
    .from("raw_website_leads")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: cors }
    );
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201, headers: cors });
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
