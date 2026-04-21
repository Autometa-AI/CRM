import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/webhooks/cal
 *
 * Receives booking events from Cal.com.
 *
 * Configure in Cal.com dashboard → Settings → Developer → Webhooks:
 *   URL:         https://crm.autometa-ai.com/api/webhooks/cal
 *   Secret:      <same value as CAL_WEBHOOK_SECRET env var>
 *   Event types: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
 *
 * Cal.com signs each request with X-Cal-Signature-256 (HMAC-SHA256).
 * We verify that signature here.
 *
 * Docs: https://cal.com/docs/core-features/webhooks
 */

export const runtime = "nodejs";

const STATUS_FROM_TRIGGER: Record<string, "accepted" | "cancelled" | "rescheduled"> = {
  BOOKING_CREATED: "accepted",
  BOOKING_CANCELLED: "cancelled",
  BOOKING_RESCHEDULED: "rescheduled",
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.CAL_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CAL_WEBHOOK_SECRET not configured on server" },
      { status: 500 }
    );
  }

  // Verify signature
  const sig = req.headers.get("x-cal-signature-256") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const trigger = event.triggerEvent as string | undefined;
  const payload = event.payload ?? {};

  const status = trigger ? STATUS_FROM_TRIGGER[trigger] ?? "accepted" : "accepted";
  const attendee = (payload.attendees ?? [])[0] ?? {};
  const booking_id: string | undefined =
    payload.uid ?? payload.bookingId ?? payload.id;

  const row = {
    booking_id: booking_id ?? null,
    full_name: typeof attendee.name === "string" ? attendee.name : "Unknown",
    email: typeof attendee.email === "string" ? attendee.email : null,
    phone: typeof payload.responses?.phone?.value === "string"
      ? payload.responses.phone.value
      : (typeof payload.smsReminderNumber === "string" ? payload.smsReminderNumber : null),
    additional_notes: typeof payload.additionalNotes === "string" ? payload.additionalNotes : null,
    event_name: typeof payload.title === "string" ? payload.title : payload.eventTitle ?? null,
    event_type_slug: typeof payload.eventTypeSlug === "string" ? payload.eventTypeSlug : null,
    event_duration_minutes: typeof payload.length === "number" ? payload.length : null,
    scheduled_start: payload.startTime ?? null,
    scheduled_end: payload.endTime ?? null,
    attendee_timezone: attendee.timeZone ?? null,
    meeting_location: typeof payload.location === "string" ? payload.location : null,
    status,
    submitted_at: new Date().toISOString(),
    raw_payload: event,
  };

  // Upsert on booking_id so rescheduled/cancelled events update the same row.
  const { data, error } = booking_id
    ? await supabase
        .from("raw_discovery_calls")
        .upsert(row, { onConflict: "booking_id" })
        .select("id")
        .single()
    : await supabase.from("raw_discovery_calls").insert(row).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
}
