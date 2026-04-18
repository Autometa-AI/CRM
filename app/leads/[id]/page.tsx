import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, SectionHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative, formatDateTime, formatDate, prettyEnum, formatMoney } from "@/lib/format";
import {
  advanceStage,
  archiveCompany,
  logOutreach,
} from "@/app/actions";

export const dynamic = "force-dynamic";

const STAGES = ["raw", "enriched", "outreach", "replied", "qualified", "client"];
const CHANNELS = ["email", "linkedin", "phone", "whatsapp"];

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);

  const [{ data: company }, { data: enrichment }, { data: ai }, { data: score }, { data: touchpoints }, { data: deals }, rawMatches] = await Promise.all([
    supabase.from("master_companies").select("*").eq("id", id).maybeSingle(),
    supabase.from("enrichment_data").select("*").eq("company_id", id).order("enriched_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from("ai_insights").select("*").eq("company_id", id).order("generated_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from("lead_scores").select("*").eq("company_id", id).order("scored_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from("outreach_log").select("*").eq("company_id", id).order("sent_at", { ascending: false, nullsFirst: false }).limit(25),
    supabase.from("deals").select("*").eq("company_id", id).order("created_at", { ascending: false, nullsFirst: false }),
    loadRawMatches(id),
  ]);

  if (!company) notFound();

  async function doAdvance(form: FormData) {
    "use server";
    await advanceStage(id, String(form.get("stage")));
  }

  async function doArchive() {
    "use server";
    await archiveCompany(id, !company.is_archived);
  }

  async function doLogOutreach(form: FormData) {
    "use server";
    form.set("company_id", id);
    await logOutreach(form);
  }

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/leads" className="text-slate-500 hover:text-slate-900">← All leads</Link>
      </div>

      {/* Header */}
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={company.company_name} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900">{company.company_name}</h1>
              <StatusPill value={company.pipeline_stage} kind="pipeline" />
              <StatusPill value={company.outreach_status} kind="outreach" />
              {company.is_archived && <StatusPill value="archived" />}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {[company.domain, prettyEnum(company.city), prettyEnum(company.company_type)].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {company.email && <Contact label="Email" value={company.email} href={`mailto:${company.email}`} />}
              {company.phone && <Contact label="Phone" value={company.phone} href={`tel:${company.phone}`} />}
              {company.whatsapp && <Contact label="WhatsApp" value={company.whatsapp} />}
              {company.license_number && <Contact label="License" value={company.license_number} />}
            </div>
          </div>
          <div className="shrink-0 w-44 space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Lead score</div>
            <ScoreBar value={company.lead_score ?? null} />
            <div className="text-xs text-slate-500 pt-2">
              Last contacted: <span className="text-slate-700">{formatRelative(company.last_contacted_at)}</span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="border-t border-slate-100 mt-5 pt-4 flex flex-wrap items-center gap-2">
          <form action={doAdvance} className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500">Advance to</label>
            <select name="stage" defaultValue={company.pipeline_stage ?? "raw"} className="rounded border border-slate-300 px-2 py-1 text-sm">
              {STAGES.map(s => <option key={s} value={s}>{prettyEnum(s)}</option>)}
            </select>
            <button type="submit" className="rounded bg-slate-900 text-white px-2.5 py-1 text-xs">Apply</button>
          </form>
          <form action={doArchive}>
            <button type="submit" className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">
              {company.is_archived ? "Unarchive" : "Archive"}
            </button>
          </form>
          <Link href={`/settings/tables/master_companies/${id}`} className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">
            Edit raw
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI insights */}
          <Card>
            <SectionHeader title="AI insights" subtitle={ai ? `Generated ${formatRelative(ai.generated_at)} · ${ai.ai_model ?? ""}` : "No AI run yet"} />
            {ai ? (
              <div className="space-y-3 text-sm">
                {ai.business_summary && <p className="text-slate-700">{ai.business_summary}</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="ICP fit" value={ai.icp_fit_score ?? "—"} />
                  <Stat label="Digital presence" value={ai.digital_presence_score ?? "—"} />
                  <Stat label="Tech maturity" value={<StatusPill value={ai.tech_maturity} />} />
                  <Stat label="Website" value={<StatusPill value={ai.website_quality} />} />
                </div>
                {ai.pain_points && ai.pain_points.length > 0 && (
                  <TagList label="Pain points" items={ai.pain_points} tone="rose" />
                )}
                {ai.ai_opportunities && ai.ai_opportunities.length > 0 && (
                  <TagList label="Opportunities" items={ai.ai_opportunities} tone="emerald" />
                )}
                {ai.outreach_hooks && ai.outreach_hooks.length > 0 && (
                  <TagList label="Outreach hooks" items={ai.outreach_hooks} tone="blue" />
                )}
                {ai.recommended_service && (
                  <div className="text-sm">
                    <span className="text-slate-500">Recommended service: </span>
                    <span className="font-medium">{ai.recommended_service}</span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title="No AI insights yet" description="Run the AI enrichment pipeline to generate ICP fit, pain points, and outreach hooks." />
            )}
          </Card>

          {/* Outreach timeline */}
          <Card>
            <SectionHeader title="Outreach timeline" subtitle={`${touchpoints?.length ?? 0} touchpoint${touchpoints?.length === 1 ? "" : "s"}`} />
            {touchpoints && touchpoints.length > 0 ? (
              <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {touchpoints.map(t => (
                  <li key={t.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-slate-300 border-2 border-white" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusPill value={t.channel} kind="channel" />
                      <span className="text-xs text-slate-500">{formatDateTime(t.sent_at)}</span>
                      {t.was_replied && <StatusPill value={t.reply_sentiment ?? "replied"} kind="sentiment" />}
                      {!t.was_replied && t.was_opened && <StatusPill value="opened" kind="outreach" />}
                    </div>
                    <div className="text-sm font-medium text-slate-900 mt-0.5">
                      {t.subject || t.action || "—"}
                    </div>
                    {t.message_preview && <div className="text-sm text-slate-600 mt-0.5">{t.message_preview}</div>}
                    {t.sent_via && <div className="text-xs text-slate-400 mt-0.5">via {t.sent_via}</div>}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No touchpoints yet" description="Use the form on the right to log your first outreach." />
            )}
          </Card>

          {/* Deals */}
          <Card>
            <SectionHeader
              title="Deals"
              subtitle={deals ? `${deals.length} deal${deals.length === 1 ? "" : "s"}` : ""}
              action={<Link href="/deals" className="text-xs text-slate-500 hover:text-slate-900">All deals →</Link>}
            />
            {deals && deals.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {deals.map(d => (
                  <div key={d.id} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{d.deal_name}</div>
                      <div className="text-xs text-slate-500">{prettyEnum(d.service_type)} · {formatDate(d.started_at)}</div>
                    </div>
                    <div className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(d.deal_value, d.currency)}</div>
                    <div className="w-28 shrink-0 text-right"><StatusPill value={d.deal_stage} kind="deal" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No deals yet" description="Link a deal once this lead signs." />
            )}
          </Card>

          {/* Raw sources */}
          <Card>
            <SectionHeader title="Raw sources" subtitle={`Matched across ${Object.values(rawMatches).filter(a => a.length > 0).length} source${Object.values(rawMatches).filter(a => a.length > 0).length === 1 ? "" : "s"}`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(rawMatches).map(([key, rows]) => (
                <div key={key} className="text-sm">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">{sourceLabel(key)}</div>
                  {rows.length === 0 ? (
                    <div className="text-xs text-slate-400 mt-1">No matches</div>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {rows.map((r: Record<string, unknown>) => (
                        <li key={String(r.id)} className="text-slate-700 truncate">
                          · {String(r.company_name ?? "—")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Log outreach form */}
          <Card>
            <SectionHeader title="Log outreach" subtitle="Record a touchpoint" />
            <form action={doLogOutreach} className="space-y-2.5 text-sm">
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
              <div>
                <label className="text-xs text-slate-500">Sent via</label>
                <input name="sent_via" placeholder="e.g. Instantly, manual" className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
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

          {/* Score breakdown */}
          <Card>
            <SectionHeader title="Score breakdown" subtitle={score ? `v${score.scoring_version ?? "?"} · ${formatRelative(score.scored_at)}` : "No scoring run yet"} />
            {score ? (
              <div className="space-y-2">
                <ScoreBar value={score.total_score ?? null} label="total" />
                <ScoreLine label="Website" v={score.score_website} />
                <ScoreLine label="Listings" v={score.score_listings} />
                <ScoreLine label="Hiring" v={score.score_hiring} />
                <ScoreLine label="Poor tech" v={score.score_poor_tech} />
                <ScoreLine label="Reviews" v={score.score_reviews} />
                <ScoreLine label="ICP fit" v={score.score_icp_fit} />
                <ScoreLine label="Engagement" v={score.score_engagement} />
              </div>
            ) : (
              <div className="text-xs text-slate-500">No lead_scores row yet.</div>
            )}
          </Card>

          {/* Enrichment */}
          <Card>
            <SectionHeader title="Enrichment" subtitle={enrichment ? `${enrichment.enriched_by ?? "—"} · ${formatRelative(enrichment.enriched_at)}` : "Not enriched"} />
            {enrichment ? (
              <div className="space-y-2 text-sm">
                <KeyVal k="Industry" v={enrichment.linkedin_industry} />
                <KeyVal k="Employees" v={enrichment.linkedin_employee_count ?? enrichment.employee_count_range} />
                <KeyVal k="Founded" v={enrichment.founded_year} />
                <KeyVal k="Revenue range" v={enrichment.annual_revenue_range} />
                <KeyVal k="Has CRM" v={enrichment.has_crm ? `Yes${enrichment.crm_name ? ` (${enrichment.crm_name})` : ""}` : "No"} />
                <KeyVal k="Active listings" v={enrichment.active_listings} />
                <KeyVal k="Google rating" v={enrichment.google_rating ? `${enrichment.google_rating} (${enrichment.google_review_count ?? 0})` : null} />
                <KeyVal k="Is hiring" v={enrichment.is_hiring ? "Yes" : "No"} />
                {enrichment.tech_stack && enrichment.tech_stack.length > 0 && (
                  <div className="pt-1">
                    <div className="text-xs text-slate-500">Tech stack</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {enrichment.tech_stack.map((t: string) => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">No enrichment_data row yet.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

async function loadRawMatches(id: string) {
  const tables = ["raw_govt_data", "raw_directory_data", "raw_paid_data", "raw_platform_data", "raw_maps_data"];
  const results = await Promise.all(
    tables.map(t =>
      supabase.from(t).select("id,company_name").eq("matched_master_id", id).limit(5).then(r => [t, r.data ?? []] as const)
    )
  );
  return Object.fromEntries(results);
}

function sourceLabel(t: string) {
  return t.replace("raw_", "").replace("_data", "").replace("_", " ");
}

function Contact({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      {href ? (
        <a href={href} className="text-slate-900 hover:underline">{value}</a>
      ) : (
        <span className="text-slate-900">{value}</span>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function TagList({ label, items, tone }: { label: string; items: string[]; tone: "rose" | "emerald" | "blue" }) {
  const cls =
    tone === "rose" ? "bg-rose-50 text-rose-700 border-rose-200" :
    tone === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(t => (
          <span key={t} className={`text-xs border rounded-full px-2 py-0.5 ${cls}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function ScoreLine({ label, v }: { label: string; v: unknown }) {
  const display = v === null || v === undefined ? "—" : String(v);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums">{display}</span>
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: unknown }) {
  const display = v === null || v === undefined || v === "" ? "—" : String(v);
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 text-xs">{k}</span>
      <span className="text-slate-900 text-right truncate">{display}</span>
    </div>
  );
}
