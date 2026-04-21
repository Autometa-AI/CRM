import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  corsHeaders,
  preflight,
  assertIngestToken,
  clientIp,
} from "@/lib/ingest";

/**
 * POST /api/leads/playbook-login
 *
 * Ingest a phone-OTP sign-in to /resources/login on the public site.
 *
 * Expected body:
 *   {
 *     country_code: "+971",
 *     phone_number: "50 123 4567",
 *     otp_verified?: true,          // default true
 *     source_page?: "/resources/login",
 *     referrer?: string
 *   }
 *
 * Each request inserts a new row — the CRM has a view
 * (playbook_logins_by_phone) that collapses to unique phones.
 */

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const authErr = assertIngestToken(req);
  if (authErr) return authErr;

  const cors = corsHeaders(req.headers.get("origin"));

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body" },
      { status: 400, headers: cors }
    );
  }

  const country_code = typeof body.country_code === "string" ? body.country_code.trim() : "";
  const phone_number = typeof body.phone_number === "string" ? body.phone_number.trim() : "";

  if (!country_code || !phone_number) {
    return NextResponse.json(
      { error: "country_code and phone_number are required" },
      { status: 400, headers: cors }
    );
  }

  const row = {
    country_code,
    phone_number,
    otp_verified: body.otp_verified !== false, // default true
    source_page: str(body.source_page),
    referrer: str(body.referrer),
    user_agent: req.headers.get("user-agent"),
    ip_address: clientIp(req),
    logged_in_at: new Date().toISOString(),
    raw_payload: body,
  };

  const { data, error } = await supabase
    .from("playbook_logins")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: cors }
    );
  }

  return NextResponse.json(
    { ok: true, id: data.id },
    { status: 201, headers: cors }
  );
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
