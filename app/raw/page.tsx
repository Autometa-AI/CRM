import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, KpiTile, SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

const SOURCES: { table: string; label: string; description: string; timeField: string }[] = [
  { table: "raw_govt_data", label: "Government", description: "DLD, RERA, Abu Dhabi TAMM/DMT", timeField: "scraped_at" },
  { table: "raw_directory_data", label: "Directory", description: "UAE business directories & listing sites", timeField: "scraped_at" },
  { table: "raw_paid_data", label: "Paid DB", description: "Apollo, Clay, Clearbit imports", timeField: "fetched_at" },
  { table: "raw_platform_data", label: "Platform", description: "Property Finder, Bayut agencies", timeField: "scraped_at" },
  { table: "raw_maps_data", label: "Maps", description: "Google Maps places & reviews", timeField: "scraped_at" },
];

export default async function RawDataPage() {
  const results = await Promise.all(
    SOURCES.map(async s => {
      const [{ count: total }, { count: matched }, latest] = await Promise.all([
        supabase.from(s.table).select("*", { count: "exact", head: true }),
        supabase.from(s.table).select("*", { count: "exact", head: true }).not("matched_master_id", "is", null),
        supabase.from(s.table).select(s.timeField).order(s.timeField, { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      ]);
      const latestAt = latest.data ? (latest.data as unknown as Record<string, unknown>)[s.timeField] : null;
      return {
        ...s,
        total: total ?? 0,
        matched: matched ?? 0,
        unmatched: (total ?? 0) - (matched ?? 0),
        latestAt,
      };
    })
  );

  const grandTotal = results.reduce((s, r) => s + r.total, 0);
  const grandMatched = results.reduce((s, r) => s + r.matched, 0);
  const grandUnmatched = grandTotal - grandMatched;
  const matchRate = grandTotal ? Math.round((grandMatched / grandTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Raw data</h1>
        <p className="text-sm text-slate-500">
          Data sources feeding master_companies. Match raw rows to master records to populate the pipeline.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total raw rows" value={grandTotal.toLocaleString()} hint={`${SOURCES.length} sources`} />
        <KpiTile label="Matched to master" value={grandMatched.toLocaleString()} tone="positive" />
        <KpiTile label="Unmatched" value={grandUnmatched.toLocaleString()} tone={grandUnmatched > 0 ? "warning" : "default"} />
        <KpiTile label="Match rate" value={`${matchRate}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map(r => (
          <Card key={r.table}>
            <SectionHeader
              title={r.label}
              subtitle={r.description}
              action={
                <Link
                  href={`/settings/tables/${r.table}`}
                  className="text-xs text-slate-500 hover:text-slate-900 whitespace-nowrap"
                >
                  Open table →
                </Link>
              }
            />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label="Total" value={r.total.toLocaleString()} />
              <Stat label="Matched" value={r.matched.toLocaleString()} tone={r.matched > 0 ? "emerald" : "slate"} />
              <Stat label="Unmatched" value={r.unmatched.toLocaleString()} tone={r.unmatched > 0 ? "amber" : "slate"} />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Last ingest: <span className="text-slate-700">{formatRelative(r.latestAt)}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/settings/tables/${r.table}/new`}
                className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50"
              >
                + Add row
              </Link>
              <Link
                href={`/settings/tables/${r.table}`}
                className="rounded bg-slate-900 text-white px-2.5 py-1 text-xs hover:bg-slate-700"
              >
                Browse {r.total} rows
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {grandTotal === 0 && (
        <Card>
          <EmptyState
            title="No raw data yet"
            description="Import from government registries, directories, paid DBs, property platforms, or Google Maps to feed your pipeline."
          />
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "emerald" | "amber" }) {
  const color =
    tone === "emerald" ? "text-emerald-700" :
    tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
