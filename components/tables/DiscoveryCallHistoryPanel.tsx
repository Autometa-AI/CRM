"use client";

import { useEffect, useState } from "react";
import { getDiscoveryCallHistory } from "@/app/actions";

type Booking = {
  id: string;
  booking_id: string | null;
  event_name: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: string | null;
  meeting_location: string | null;
  additional_notes: string | null;
  submitted_at: string | null;
};

type Event = {
  id: string;
  booking_id: string | null;
  trigger_event: string | null;
  status: string | null;
  scheduled_start: string | null;
  received_at: string | null;
};

function fmt(dt: string | null | undefined): string {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const tone =
    status === "accepted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "cancelled"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "rescheduled"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : status === "completed"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : status === "no_show"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const EVENT_ICON: Record<string, string> = {
  BOOKING_CREATED: "✓",
  BOOKING_REQUESTED: "·",
  BOOKING_CANCELLED: "✕",
  BOOKING_RESCHEDULED: "↻",
  MEETING_ENDED: "✓",
  BOOKING_NO_SHOW: "—",
};

export function DiscoveryCallHistoryPanel({ email }: { email: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    getDiscoveryCallHistory(email)
      .then((r) => {
        if (cancel) return;
        setBookings(r.bookings as unknown as Booking[]);
        setEvents(r.events as unknown as Event[]);
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : "Failed to load history");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [email]);

  // Group events under their booking
  const eventsByBooking = new Map<string, Event[]>();
  for (const e of events) {
    const key = e.booking_id ?? "unknown";
    if (!eventsByBooking.has(key)) eventsByBooking.set(key, []);
    eventsByBooking.get(key)!.push(e);
  }

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">Booking history</div>

      {loading && <div className="space-y-2 animate-pulse"><div className="h-16 rounded-md bg-slate-100" /><div className="h-16 rounded-md bg-slate-100" /></div>}
      {error && <div className="rounded bg-rose-50 border border-rose-200 text-rose-700 p-2.5 text-sm">{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="text-sm text-slate-500">No bookings yet.</div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((b) => {
            const evs = eventsByBooking.get(b.booking_id ?? "") ?? [];
            return (
              <div key={b.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      {b.event_name || "Discovery Call"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">#{b.booking_id}</div>
                  </div>
                  <div className="shrink-0">{statusBadge(b.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mt-3">
                  <Field label="Scheduled" value={fmt(b.scheduled_start)} />
                  <Field label="Location" value={b.meeting_location || "—"} />
                  {b.additional_notes && (
                    <div className="col-span-2">
                      <div className="text-slate-500 font-medium mb-0.5">Notes</div>
                      <div className="text-slate-700 whitespace-pre-wrap">{b.additional_notes}</div>
                    </div>
                  )}
                </div>

                {evs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Event log</div>
                    <div className="space-y-1">
                      {evs.map((e) => (
                        <div key={e.id} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-semibold">
                            {EVENT_ICON[e.trigger_event ?? ""] ?? "•"}
                          </span>
                          <span className="font-medium text-slate-700">
                            {e.trigger_event?.replace(/_/g, " ").toLowerCase() ?? "event"}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="tabular-nums">{fmt(e.received_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-slate-500 font-medium w-20 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
