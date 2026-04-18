import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative, prettyEnum } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const STAGES = ["raw", "enriched", "outreach", "replied", "qualified", "client"];
const CITIES = ["dubai", "abu_dhabi", "sharjah", "ajman", "umm_al_quwain", "ras_al_khaimah", "fujairah"];
const TYPES = ["broker", "developer", "both", "property_management"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; stage?: string; city?: string; type?: string; archived?: string; page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("master_companies")
    .select("id,company_name,domain,city,company_type,pipeline_stage,outreach_status,lead_score,last_contacted_at,is_archived", { count: "exact" })
    .order("lead_score", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (searchParams.archived !== "true") q = q.eq("is_archived", false);
  if (searchParams.stage) q = q.eq("pipeline_stage", searchParams.stage);
  if (searchParams.city) q = q.eq("city", searchParams.city);
  if (searchParams.type) q = q.eq("company_type", searchParams.type);
  if (searchParams.q) {
    const s = searchParams.q.replace(/[%,]/g, "");
    q = q.or(`company_name.ilike.%${s}%,domain.ilike.%${s}%`);
  }

  const { data, count, error } = await q;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-slate-500">
            {count ?? 0} compan{count === 1 ? "y" : "ies"}
            {searchParams.archived === "true" ? " (including archived)" : ""}
          </p>
        </div>
        <Link
          href="/settings/tables/master_companies/new"
          className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
        >
          + New lead
        </Link>
      </div>

      <Card padding="p-3">
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search name or domain…"
            className="rounded border border-slate-300 px-2.5 py-1.5 text-sm flex-1 min-w-[200px]"
          />
          <FilterSelect name="stage" value={searchParams.stage} options={STAGES} placeholder="Stage" />
          <FilterSelect name="city" value={searchParams.city} options={CITIES} placeholder="City" />
          <FilterSelect name="type" value={searchParams.type} options={TYPES} placeholder="Type" />
          <label className="flex items-center gap-1.5 text-sm text-slate-600 px-2">
            <input
              type="checkbox"
              name="archived"
              value="true"
              defaultChecked={searchParams.archived === "true"}
              className="h-4 w-4"
            />
            Archived
          </label>
          <button type="submit" className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Apply</button>
          <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-900 px-2">Clear</Link>
        </form>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-700 text-sm">{error.message}</Card>
      )}

      <Card padding="p-0">
        {data && data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 rounded-t-lg">
              <div className="col-span-4">Company</div>
              <div className="col-span-2">Stage</div>
              <div className="col-span-2">Outreach</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2 text-right">Last contacted</div>
            </div>
            {data.map(l => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-slate-50"
              >
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <Avatar name={l.company_name} size={36} />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {l.company_name} {l.is_archived && <span className="text-xs text-slate-400">(archived)</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {l.domain || "—"} · {prettyEnum(l.city)} · {prettyEnum(l.company_type)}
                    </div>
                  </div>
                </div>
                <div className="col-span-2"><StatusPill value={l.pipeline_stage} kind="pipeline" /></div>
                <div className="col-span-2"><StatusPill value={l.outreach_status} kind="outreach" /></div>
                <div className="col-span-2"><ScoreBar value={l.lead_score ?? null} size="sm" /></div>
                <div className="col-span-2 text-right text-xs text-slate-500">{formatRelative(l.last_contacted_at)}</div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No leads match your filters"
            description="Try clearing filters, or add a new company."
            ctaLabel="Add company"
            ctaHref="/settings/tables/master_companies/new"
          />
        )}
      </Card>

      {count !== null && count !== undefined && count > PAGE_SIZE && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={buildPageUrl(searchParams, page - 1)} className="underline">← Prev</Link>}
          <span className="text-slate-500">Page {page} of {Math.ceil(count / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < count && <Link href={buildPageUrl(searchParams, page + 1)} className="underline">Next →</Link>}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  name, value, options, placeholder,
}: { name: string; value?: string; options: string[]; placeholder: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o}>{prettyEnum(o)}</option>
      ))}
    </select>
  );
}

function buildPageUrl(sp: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
  params.set("page", String(page));
  return `/leads?${params.toString()}`;
}
