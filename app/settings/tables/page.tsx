import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabase } from "@/lib/supabase";
import { TABLES, TableCategory, TableDef } from "@/lib/tables";
import { Card, SectionHeader } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = { def: TableDef; count: number | null; error?: string };

async function tableCounts(): Promise<Row[]> {
  return Promise.all(
    TABLES.map(async (def) => {
      const { count, error } = await supabase.from(def.name).select("*", { count: "exact", head: true });
      return { def, count: error ? null : (count ?? 0), error: error?.message };
    }),
  );
}

async function masterBreakdown() {
  // Supabase's default row limit is 1000; using head:true + count:exact
  // gives the real total without dragging rows across the wire.
  const stages = ["raw", "enriched", "outreach", "replied", "qualified", "client"] as const;
  const [totalRes, ...stageRes] = await Promise.all([
    supabase.from("master_companies").select("*", { count: "exact", head: true }),
    ...stages.map((s) =>
      supabase
        .from("master_companies")
        .select("*", { count: "exact", head: true })
        .eq("pipeline_stage", s),
    ),
  ]);
  const byStage: Record<string, number> = {};
  stages.forEach((s, i) => {
    byStage[s] = stageRes[i].count ?? 0;
  });
  return { byStage, byType: {} as Record<string, number>, total: totalRes.count ?? 0 };
}

const STAGE_ORDER = ["raw", "enriched", "outreach", "replied", "qualified", "client"];
const STAGE_LABEL: Record<string, string> = {
  raw: "Raw",
  enriched: "Enriched",
  outreach: "In Outreach",
  replied: "Replied",
  qualified: "Qualified",
  client: "Clients",
};

export default async function TablesIndex() {
  noStore();
  const [rows, master] = await Promise.all([tableCounts(), masterBreakdown()]);
  const byCategory = (cat: TableCategory) => rows.filter((r) => r.def.category === cat);

  const sources = byCategory("sources");
  const pipeline = byCategory("pipeline");
  const operations = byCategory("operations");
  const views = byCategory("views");
  const masterRow = rows.find((r) => r.def.name === "master_companies");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your CRM data</h1>
        <p className="text-sm text-slate-500">An overview of every piece of data powering your pipeline.</p>
      </div>

      {/* ---- Hero: Master Leads ---- */}
      <Link href="/settings/tables/master_companies" className="block group">
        <Card className="group-hover:border-slate-400 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Master Leads</div>
              <div className="flex items-baseline gap-3 mt-1">
                <div className="text-4xl font-semibold">{master.total.toLocaleString()}</div>
                <div className="text-sm text-slate-500">companies in your master list</div>
              </div>
              {masterRow?.def.description && (
                <div className="text-sm text-slate-500 mt-2">{masterRow.def.description}</div>
              )}
            </div>
            <div className="text-xs text-slate-400 group-hover:text-slate-700">Open →</div>
          </div>

          <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-3">
            {STAGE_ORDER.map((s) => (
              <StageChip key={s} label={STAGE_LABEL[s]} value={master.byStage[s] ?? 0} />
            ))}
          </div>
        </Card>
      </Link>

      {/* ---- Data sources ---- */}
      <Section title="Data sources" subtitle="Where your raw lead data comes from — imports, scrapers, and enrichment providers">
        <CardGrid>
          {sources.map((r) => <TableCard key={r.def.name} row={r} />)}
        </CardGrid>
      </Section>

      {/* ---- Sales pipeline ---- */}
      <Section title="Sales pipeline" subtitle="Enrichment, scoring, and outreach activity across your leads">
        <CardGrid>
          {pipeline.map((r) => <TableCard key={r.def.name} row={r} />)}
        </CardGrid>
      </Section>

      {/* ---- Operations ---- */}
      <Section title="Operations" subtitle="Agency-side finances and expenses">
        <CardGrid>
          {operations.map((r) => <TableCard key={r.def.name} row={r} />)}
        </CardGrid>
      </Section>

      {/* ---- Saved views ---- */}
      <Section title="Saved views" subtitle="Read-only views rolling up your CRM data">
        <CardGrid>
          {views.map((r) => <TableCard key={r.def.name} row={r} />)}
        </CardGrid>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

function TableCard({ row }: { row: Row }) {
  const { def, count, error } = row;
  return (
    <Link
      href={`/settings/tables/${def.name}`}
      className="block border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{def.label}</div>
          {def.description && (
            <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{def.description}</div>
          )}
        </div>
        {def.readOnly && (
          <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">
            View
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-semibold">
          {error ? <span className="text-red-500 text-sm">error</span> : count?.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400">Open →</div>
      </div>
    </Link>
  );
}

function StageChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
