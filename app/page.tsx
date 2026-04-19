import Link from "next/link";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Flame,
  ArrowUpRight,
  Receipt,
} from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { supabase } from "@/lib/supabase";
import { Card, KpiTile, SectionHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageRefresher } from "@/components/util/PageRefresher";
import { formatINR, formatRelative, prettyEnum } from "@/lib/format";
import { convertSum } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGES = ["raw", "enriched", "outreach", "replied", "qualified", "client"] as const;

async function loadDashboard() {
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  // master_companies counts — head queries bypass the 1,000 row limit
  const stageCountPromises = STAGES.map((s) =>
    supabase
      .from("master_companies")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_stage", s),
  );

  const [
    totalCompaniesRes,
    ...stageCounts
  ] = await Promise.all([
    supabase.from("master_companies").select("*", { count: "exact", head: true }),
    ...stageCountPromises,
  ]);

  const [
    outreach30,
    deals,
    finances,
    hotLeads,
    recentOutreach,
  ] = await Promise.all([
    supabase.from("outreach_log").select("was_opened,was_replied,channel,sent_at").gte("sent_at", since30),
    supabase.from("deals").select("deal_value,currency,deal_stage,closed_at,created_at"),
    supabase.from("finances").select("amount,currency,date,is_active,recurrence,category").gte("date", monthStart),
    supabase
      .from("master_companies")
      .select("id,company_name,city,company_type,pipeline_stage,lead_score,last_contacted_at")
      .eq("is_archived", false)
      .is("last_contacted_at", null)
      .order("lead_score", { ascending: false, nullsFirst: false })
      .limit(6),
    supabase
      .from("outreach_log")
      .select("id,company_id,channel,action,subject,was_opened,was_replied,sent_at,reply_sentiment")
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  const totalCompanies = totalCompaniesRes.count ?? 0;
  const stageCountMap: Record<string, number> = {};
  STAGES.forEach((s, i) => {
    stageCountMap[s] = stageCounts[i].count ?? 0;
  });

  return { totalCompanies, stageCountMap, outreach30, deals, finances, hotLeads, recentOutreach };
}

export default async function Dashboard() {
  noStore();
  const { totalCompanies, stageCountMap, outreach30, deals, finances, hotLeads, recentOutreach } = await loadDashboard();

  const sent = outreach30.data?.length ?? 0;
  const opened = outreach30.data?.filter((r) => r.was_opened).length ?? 0;
  const replied = outreach30.data?.filter((r) => r.was_replied).length ?? 0;
  const openRate = sent ? Math.round((opened / sent) * 100) : 0;
  const replyRate = sent ? Math.round((replied / sent) * 100) : 0;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const mtdDeals = (deals.data ?? []).filter(
    (d) =>
      d.closed_at &&
      new Date(d.closed_at) >= monthStart &&
      (d.deal_stage === "completed" || d.deal_stage === "active"),
  );
  const mtdRevenue = await convertSum(
    mtdDeals.map((d) => ({ amount: Number(d.deal_value) || 0, currency: String(d.currency ?? "AED") })),
    "INR",
  );

  const mtdBurn = await convertSum(
    (finances.data ?? [])
      .filter((f) => f.is_active !== false)
      .map((f) => ({ amount: Number(f.amount) || 0, currency: String(f.currency ?? "AED") })),
    "INR",
  );

  const maxStageCount = Math.max(1, ...Object.values(stageCountMap));
  const funnel = STAGES.map((s) => ({
    stage: s,
    count: stageCountMap[s] ?? 0,
    pct: ((stageCountMap[s] ?? 0) / maxStageCount) * 100,
  }));

  return (
    <div className="space-y-8 max-w-[1400px]">
      <PageRefresher intervalMs={30_000} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pipeline health, outreach performance, and revenue at a glance.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Amounts in <span className="font-medium text-slate-500">INR</span> · live FX
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Total leads"
          value={totalCompanies.toLocaleString()}
          hint="companies in master list"
          icon={<Users className="h-3.5 w-3.5" strokeWidth={2} />}
          tone="brand"
        />
        <KpiTile
          label="Reply rate · 30d"
          value={`${replyRate}%`}
          hint={`${replied.toLocaleString()} of ${sent.toLocaleString()} messages`}
          icon={<MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />}
          tone={replyRate >= 10 ? "positive" : "default"}
        />
        <KpiTile
          label="MTD revenue"
          value={formatINR(mtdRevenue)}
          hint={`${mtdDeals.length} deal${mtdDeals.length === 1 ? "" : "s"} closed`}
          icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />}
          tone="positive"
        />
        <KpiTile
          label="MTD burn"
          value={formatINR(mtdBurn)}
          hint="expenses this month"
          icon={<Receipt className="h-3.5 w-3.5" strokeWidth={2} />}
          tone={mtdBurn > mtdRevenue && mtdBurn > 0 ? "warning" : "default"}
        />
      </div>

      {/* Pipeline + outreach metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Pipeline funnel"
            subtitle="Companies by stage"
            action={
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium"
              >
                Kanban <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            }
          />
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-4">
                <div className="w-24 shrink-0">
                  <StatusPill value={f.stage} kind="pipeline" />
                </div>
                <div className="flex-1 h-7 rounded-lg bg-slate-100 overflow-hidden relative">
                  <div
                    className="h-7 bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                    style={{ width: `${f.pct}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-3 text-xs font-semibold tabular-nums">
                    <span className={f.pct > 25 ? "text-white" : "text-slate-900"}>
                      {f.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Outreach · 30d" subtitle="Aggregate performance" />
          <div className="space-y-4">
            <Metric label="Sent" value={sent} />
            <Metric label="Opened" value={`${opened} (${openRate}%)`} />
            <Metric label="Replied" value={`${replied} (${replyRate}%)`} tone={replyRate >= 10 ? "positive" : "default"} />
            <div className="pt-3 border-t border-slate-200">
              <Link
                href="/outreach"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View outreach log <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Hot leads + recent outreach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" strokeWidth={2} /> Hot leads
              </span>
            }
            subtitle="High score · not yet contacted"
            action={
              <Link
                href="/leads"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium"
              >
                All leads <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            }
          />
          {hotLeads.data && hotLeads.data.length > 0 ? (
            <div className="divide-y divide-line">
              {hotLeads.data.map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-3 px-3 rounded-lg transition-colors"
                >
                  <Avatar name={l.company_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">{l.company_name}</div>
                    <div className="text-xs text-slate-400">
                      {prettyEnum(l.city)} · {prettyEnum(l.company_type)}
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <ScoreBar value={l.lead_score ?? null} size="sm" />
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <StatusPill value={l.pipeline_stage} kind="pipeline" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No leads yet"
              description="Add companies or import from raw sources to start scoring."
              ctaLabel="Add company"
              ctaHref="/settings/tables/master_companies"
            />
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Recent activity"
            subtitle="Latest outreach touchpoints"
            action={
              <Link
                href="/outreach"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium"
              >
                Full log <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            }
          />
          {recentOutreach.data && recentOutreach.data.length > 0 ? (
            <div className="divide-y divide-line">
              {recentOutreach.data.map((o) => (
                <div key={o.id} className="py-3 flex items-start gap-3">
                  <div className="w-16 shrink-0 pt-0.5">
                    <StatusPill value={o.channel} kind="channel" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 truncate">{o.subject || o.action || "—"}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatRelative(o.sent_at)}</div>
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

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "positive";
}) {
  const valueClass = tone === "positive" ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
