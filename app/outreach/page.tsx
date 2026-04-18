import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, SectionHeader, KpiTile } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, prettyEnum } from "@/lib/format";
import { logOutreach } from "@/app/actions";

export const dynamic = "force-dynamic";

const CHANNELS = ["email", "linkedin", "phone", "whatsapp"];

export default async function OutreachPage() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [recent, stats, companies] = await Promise.all([
    supabase
      .from("outreach_log")
      .select("id,company_id,channel,action,subject,message_preview,sent_via,sent_at,was_opened,was_replied,reply_sentiment")
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(80),
    supabase
      .from("outreach_log")
      .select("channel,was_opened,was_replied,sent_at")
      .gte("sent_at", since30),
    supabase
      .from("master_companies")
      .select("id,company_name")
      .eq("is_archived", false)
      .order("company_name")
      .limit(500),
  ]);

  const byChannel = new Map<string, { sent: number; opened: number; replied: number }>();
  (stats.data ?? []).forEach(r => {
    const c = String(r.channel ?? "email");
    const e = byChannel.get(c) ?? { sent: 0, opened: 0, replied: 0 };
    e.sent++;
    if (r.was_opened) e.opened++;
    if (r.was_replied) e.replied++;
    byChannel.set(c, e);
  });

  const totalSent = (stats.data ?? []).length;
  const totalOpened = (stats.data ?? []).filter(r => r.was_opened).length;
  const totalReplied = (stats.data ?? []).filter(r => r.was_replied).length;

  const companyMap = new Map((companies.data ?? []).map(c => [c.id, c.company_name]));

  type Touchpoint = NonNullable<typeof recent.data>[number];
  const byDay = new Map<string, Touchpoint[]>();
  (recent.data ?? []).forEach(r => {
    const d = r.sent_at ? new Date(r.sent_at).toDateString() : "Undated";
    const list = byDay.get(d) ?? [];
    list.push(r);
    byDay.set(d, list);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Outreach</h1>
          <p className="text-sm text-slate-500">Activity log and touchpoint metrics (30-day window).</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Sent (30d)" value={totalSent.toLocaleString()} />
        <KpiTile label="Open rate" value={`${totalSent ? Math.round((totalOpened / totalSent) * 100) : 0}%`} hint={`${totalOpened} opens`} />
        <KpiTile label="Reply rate" value={`${totalSent ? Math.round((totalReplied / totalSent) * 100) : 0}%`} hint={`${totalReplied} replies`} tone={totalSent && totalReplied / totalSent >= 0.1 ? "positive" : "default"} />
        <KpiTile label="Channels used" value={byChannel.size} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader title="Activity feed" subtitle="Latest 80 touchpoints" />
          {recent.data && recent.data.length > 0 ? (
            <div className="space-y-5">
              {Array.from(byDay.entries()).map(([day, rows]) => (
                <div key={day}>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{day}</div>
                  <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                    {rows.map(r => (
                      <li key={r.id} className="ml-4">
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-slate-300 border-2 border-white" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusPill value={r.channel} kind="channel" />
                          {r.company_id && (
                            <Link href={`/leads/${r.company_id}`} className="text-sm font-medium text-slate-900 hover:underline">
                              {companyMap.get(r.company_id) ?? "Unknown"}
                            </Link>
                          )}
                          <span className="text-xs text-slate-400">{formatDateTime(r.sent_at)}</span>
                          {r.was_replied && <StatusPill value={r.reply_sentiment ?? "replied"} kind="sentiment" />}
                          {!r.was_replied && r.was_opened && <StatusPill value="opened" kind="outreach" />}
                        </div>
                        <div className="text-sm text-slate-700 mt-0.5">{r.subject || r.action || "—"}</div>
                        {r.message_preview && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.message_preview}</div>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No outreach logged yet"
              description="Use the form on the right to record your first touchpoint."
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Log outreach" subtitle="Record a new touchpoint" />
            <form action={logOutreach} className="space-y-2.5 text-sm">
              <div>
                <label className="text-xs text-slate-500">Company *</label>
                <select name="company_id" required className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="">Select…</option>
                  {(companies.data ?? []).map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Channel *</label>
                <select name="channel" required className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                  {CHANNELS.map(c => <option key={c} value={c}>{prettyEnum(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Subject</label>
                <input name="subject" className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Message / notes</label>
                <textarea name="message_preview" rows={3} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" name="was_opened" className="h-4 w-4" /> Opened
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" name="was_replied" className="h-4 w-4" /> Replied
                </label>
              </div>
              <button type="submit" className="w-full rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700">
                Log touchpoint
              </button>
            </form>
          </Card>

          <Card>
            <SectionHeader title="Per-channel (30d)" />
            {byChannel.size === 0 ? (
              <div className="text-xs text-slate-500">No data yet.</div>
            ) : (
              <div className="space-y-2">
                {Array.from(byChannel.entries()).map(([channel, s]) => (
                  <div key={channel} className="flex items-center justify-between text-sm">
                    <StatusPill value={channel} kind="channel" />
                    <div className="text-xs text-slate-500 tabular-nums">
                      {s.sent} sent · {s.replied} replied ({s.sent ? Math.round((s.replied / s.sent) * 100) : 0}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
