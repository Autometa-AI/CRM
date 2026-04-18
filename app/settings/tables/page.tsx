import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TABLES } from "@/lib/tables";
import { Card, SectionHeader } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

async function counts() {
  const results = await Promise.all(
    TABLES.map(async t => {
      const { count, error } = await supabase.from(t.name).select("*", { count: "exact", head: true });
      return { name: t.name, label: t.label, count: error ? null : (count ?? 0), readOnly: t.readOnly, error: error?.message };
    })
  );
  return results;
}

export default async function TablesIndex() {
  const rows = await counts();
  const editable = rows.filter(r => !r.readOnly);
  const views = rows.filter(r => r.readOnly);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Tables</h1>
        <p className="text-sm text-slate-500">
          Raw Supabase editor — full CRUD access for every table. Prefer the CRM views where available.
        </p>
      </div>

      <Card>
        <SectionHeader title="Editable tables" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {editable.map(r => (
            <Link
              key={r.name}
              href={`/settings/tables/${r.name}`}
              className="block border border-slate-200 rounded-lg p-3 hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">{r.label}</div>
              <div className="text-xl font-semibold mt-1">
                {r.count === null ? <span className="text-red-500 text-sm">error</span> : r.count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">{r.name}</div>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Views" subtitle="Read-only database views" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {views.map(r => (
            <Link
              key={r.name}
              href={`/settings/tables/${r.name}`}
              className="block border border-slate-200 rounded-lg p-3 hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-xs text-slate-500">{r.label}</div>
              <div className="text-xl font-semibold mt-1">
                {r.count === null ? <span className="text-red-500 text-sm">error</span> : r.count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">{r.name}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
