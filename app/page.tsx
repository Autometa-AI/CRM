import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, KpiTile, SectionHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatRelative, prettyEnum } from "@/lib/format";

export const dynamic = "force-dynamic";

const STAGES = ["raw", "enriched", "outreach", "replied", "qualified", "client"] as const;

async function loadDashboard() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [
    companies,
    outreach30,
    deals,
    finances,
    hotLeads,
    recentOutreach,
  ] = await Promise.all([
    supabase.from("master_companies").select("id,pipeline_stage,outreach_status", { count: "exact" }),
    supabase.from("outreach_log").select("was_opened,was_replied,channel,sent_at").gte("sent_at", since30),
    supabase.from("deals").select("deal_value,currency,deal_stage,closed_at,created_at"),
    supabase.from("finances").select("amount,currency,date,is_active,recurrence,category").gte("date", monthStart),
    supabase
      .from("master_companies")
      .select("id,company_name,city,company_type,pipeline_stage,lead_score,last_contacted_at")
      .eq("is_archived", false)
      .is("last_contacted_at", null)
      .order("lead_score", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("outreach_log")
      .select("id,company_id,channel,action,subject,was_opened,was_replied,sent_at,reply_sentiment")
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  return { companies, outreach30, deals, finances, hotLeads, recentOutreach };
}

export default async function Dashboard() {
  const { companies, outreach30, deals, finances, hotLeads, recentOutreach } = await loadDashboard();

  const totalCompanies = companies.count ?? 0;
  const stageCounts = new Map<string, number>();
  (companies.data ?? []).forEach(r => {
    const s = String(r.pipeline_stage ?? "raw");
    stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
  });

  const sent = outreach30.data?.length ?? 0;
  const opened = outreach30.data?.filter(r => r.was_opened).length ?? 0;
  const replied = outreach30.data?.filter(r => r.was_replied).length ?? 0;
  const openRate = sent ? Math.round((opened / sent) * 100) : 0;
  const replyRate = sent ? Math.round((replied / sent) * 100) : 0;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const mtdDeals = (deals.data ?? []).filter(d =>
    d.closed_at && new Date(d.closed_at) >= monthStart && (d.deal_stage === "completed" || d.deal_stage === "active")
  );
  const mtdRevenue = mtdDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const currency = String(mtdDeals[0]?.currency ?? "AED");

  const mtdBurn = (finances.data ?? [])
    .filter(f => f.is_active !== false)
    .reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const burnCurrency = String((finances.data ?? [])[0]?.currency ?? "AED");

  const maxStageCount = Math.max(1, ...Array.from(stageCounts.values()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Pipeline, outreach, and revenue at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total companies" value={totalCompanies.toLocaleString()} hint="in master_companies" />
        <KpiTile label="Reply rate (30d)" value={`${replyRate}%`} hint={`${replied} of ${sent} messages`} tone={replyRate >= 10 ? "positive" : "default"} />
        <KpiTile label="MTD revenue" value={formatMoney(mtdRevenue, currency)} hint={`${mtdDeals.length} deal${mtdDeals.length === 1 ? "" : "s"} closed`} tone="positive" />
        <KpiTile label="MTD burn" value={formatMoney(mtdBurn, burnCurrency)} hint="expenses this month" tone={mtdBurn > mtdRevenue ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Pipeline funnel"
            subtitle="Companies per stage"
            action={<Link href="/pipeline" className="text-xs text-slate-500 hover:text-slate-900">View Kanban →</Link>}
          />
          <div className="space-y-2">
            {STAGES.map(s => {
              const c = stageCounts.get(s) ?? 0;
              const pct = (c / maxStageCount) * 100;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-24 shrink-0"><StatusPill value={s} kind="pipeline" /></div>
                  <div className="flex-1 h-6 rounded bg-slate-50 overflow-hidden relative">
                    <div className="h-6 bg-gradient-to-r from-slate-700 to-slate-500" style={{ width: `${pct}%` }} />
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-900 mix-blend-difference">
                      {c}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Outreach (30d)" subtitle="Aggregate touchpoint metrics" />
          <div className="space-y-3">
            <Metric label="Sent" value={sent} />
            <Metric label="Opened" value={`${opened} (${openRate}%)`} />
            <Metric label="Replied" value={`${replied} (${replyRate}%)`} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader
            title="Hottest leads"
            subtitle="High score · not yet contacted"
            action={<Link href="/leads" className="text-xs text-slate-500 hover:text-slate-900">All leads →</Link>}
          />
          {hotLeads.data && hotLeads.data.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {hotLeads.data.map(l => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <Avatar name={l.company_name} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">{l.company_name}</div>
                    <div className="text-xs text-slate-500">
                      {prettyEnum(l.city)} · {prettyEnum(l.company_type)}
                    </div>
                  </div>
                  <div className="w-20 shrink-0"><ScoreBar value={l.lead_score ?? null} size="sm" /></div>
                  <div className="w-20 shrink-0 text-right"><StatusPill value={l.pipeline_stage} kind="pipeline" /></div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No leads yet"
              description="Add companies to master_companies or import from raw sources."
              ctaLabel="Add company"
              ctaHref="/settings/tables/master_companies/new"
            />
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Recent outreach"
            subtitle="Latest touchpoints"
            action={<Link href="/outreach" className="text-xs text-slate-500 hover:text-slate-900">Full log →</Link>}
          />
          {recentOutreach.data && recentOutreach.data.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentOutreach.data.map(o => (
                <div key={o.id} className="py-2.5 flex items-start gap-3">
                  <div className="w-16 shrink-0 pt-0.5"><StatusPill value={o.channel} kind="channel" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 truncate">{o.subject || o.action || "—"}</div>
                    <div className="text-xs text-slate-500">{formatRelative(o.sent_at)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {o.was_replied && <StatusPill value={o.reply_sentiment ?? "replied"} kind="sentiment" />}
                    {!o.was_replied && o.was_opened && <StatusPill value="opened" kind="outreach" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No outreach yet"
              description="Log your first touchpoint to start tracking."
              ctaLabel="Log outreach"
              ctaHref="/outreach"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
