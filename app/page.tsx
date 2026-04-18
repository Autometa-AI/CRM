import Link from "next/link";
import { TABLES } from "@/lib/tables";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function counts() {
  const results = await Promise.all(
    TABLES.filter(t => !t.readOnly).map(async t => {
      const { count, error } = await supabase.from(t.name).select("*", { count: "exact", head: true });
      return { name: t.name, label: t.label, count: error ? null : (count ?? 0), error: error?.message };
    })
  );
  return results;
}

export default async function Home() {
  const rows = await counts();
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Overview</h1>
      <p className="text-slate-600 mb-6">Row counts across all editable tables.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map(r => (
          <Link key={r.name} href={`/${r.name}`}
            className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400">
            <div className="text-sm text-slate-500">{r.label}</div>
            <div className="text-2xl font-semibold mt-1">
              {r.count === null ? <span className="text-red-500 text-sm">error</span> : r.count.toLocaleString()}
            </div>
            {r.error && <div className="text-xs text-red-500 mt-1">{r.error}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
