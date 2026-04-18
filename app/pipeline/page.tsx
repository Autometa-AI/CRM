import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative, prettyEnum } from "@/lib/format";
import { advanceStage } from "@/app/actions";

export const dynamic = "force-dynamic";

const STAGES = ["raw", "enriched", "outreach", "replied", "qualified", "client"] as const;
const COLUMN_CAP = 25;

export default async function PipelinePage() {
  const { data, error } = await supabase
    .from("master_companies")
    .select("id,company_name,city,company_type,pipeline_stage,lead_score,last_contacted_at,outreach_status")
    .eq("is_archived", false)
    .order("lead_score", { ascending: false, nullsFirst: false })
    .limit(500);

  const byStage = new Map<string, typeof data>();
  STAGES.forEach(s => byStage.set(s, []));
  (data ?? []).forEach(r => {
    const s = String(r.pipeline_stage ?? "raw");
    if (!byStage.has(s)) byStage.set(s, []);
    byStage.get(s)!.push(r);
  });

  async function doAdvance(form: FormData) {
    "use server";
    await advanceStage(String(form.get("id")), String(form.get("stage")));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-slate-500">
          {data?.length ?? 0} active companies across {STAGES.length} stages
        </p>
      </div>

      {error && <Card className="border-red-200 bg-red-50 text-red-700 text-sm">{error.message}</Card>}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const rows = byStage.get(stage) ?? [];
          const visible = rows.slice(0, COLUMN_CAP);
          return (
            <div key={stage} className="shrink-0 w-72 bg-slate-100 rounded-lg p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <StatusPill value={stage} kind="pipeline" />
                <span className="text-xs text-slate-500 font-medium">{rows.length}</span>
              </div>
              <div className="space-y-2 mt-2">
                {visible.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">Empty</div>
                ) : (
                  visible.map(c => (
                    <div key={c.id} className="bg-white rounded-md border border-slate-200 p-2.5">
                      <Link href={`/leads/${c.id}`} className="font-medium text-sm text-slate-900 hover:underline line-clamp-1">
                        {c.company_name}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {prettyEnum(c.city)} · {prettyEnum(c.company_type)}
                      </div>
                      <div className="mt-2"><ScoreBar value={c.lead_score ?? null} size="sm" /></div>
                      <div className="text-xs text-slate-400 mt-1.5">
                        Last contact: {formatRelative(c.last_contacted_at)}
                      </div>
                      <form action={doAdvance} className="mt-2 flex items-center gap-1">
                        <input type="hidden" name="id" value={c.id} />
                        <select
                          name="stage"
                          defaultValue={stage}
                          className="flex-1 rounded border border-slate-200 text-xs px-1.5 py-1"
                        >
                          {STAGES.map(s => <option key={s} value={s}>{prettyEnum(s)}</option>)}
                        </select>
                        <button type="submit" className="rounded bg-slate-900 text-white px-2 py-1 text-xs">Move</button>
                      </form>
                    </div>
                  ))
                )}
                {rows.length > COLUMN_CAP && (
                  <Link
                    href={`/leads?stage=${stage}`}
                    className="block text-center text-xs text-slate-500 hover:text-slate-900 py-2"
                  >
                    + {rows.length - COLUMN_CAP} more →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(!data || data.length === 0) && (
        <Card>
          <EmptyState
            title="Pipeline is empty"
            description="Add your first company to get started."
            ctaLabel="Add company"
            ctaHref="/settings/tables/master_companies/new"
          />
        </Card>
      )}
    </div>
  );
}
