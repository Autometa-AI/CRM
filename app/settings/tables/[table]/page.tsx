import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTable, formatCell } from "@/lib/tables";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function TableListPage({
  params, searchParams,
}: {
  params: { table: string };
  searchParams: { page?: string };
}) {
  const def = getTable(params.table);
  if (!def) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase.from(def.name).select("*", { count: "exact" }).range(from, to);
  if (def.orderBy) q = q.order(def.orderBy.col, { ascending: def.orderBy.asc });

  const { data, count, error } = await q;

  const cols =
    def.listColumns ??
    (data?.[0] ? Object.keys(data[0]).slice(0, 8) : def.columns.map(c => c.name).slice(0, 8));

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href="/settings/tables" className="text-slate-500 hover:text-slate-900">← All tables</Link>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{def.label}</h1>
          <div className="text-sm text-slate-500">
            <span className="font-mono text-xs">{def.name}</span> · {count ?? 0} rows
            {def.readOnly && <span className="ml-2 text-amber-600">(read-only view)</span>}
          </div>
        </div>
        {!def.readOnly && (
          <Link href={`/settings/tables/${def.name}/new`} className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">
            + New
          </Link>
        )}
      </div>

      {error && <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error.message}</div>}

      <div className="overflow-auto bg-white border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {cols.map(c => (
                <th key={c} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap">{c}</th>
              ))}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row: Record<string, unknown>, i: number) => {
              const id = String(row[def.pk] ?? "");
              const colDefs = new Map(def.columns.map(c => [c.name, c]));
              return (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  {cols.map(c => {
                    const col = colDefs.get(c);
                    const cell = col ? formatCell(col, row[c]) : formatCell({ name: c, type: "text" }, row[c]);
                    const short = cell.length > 80 ? cell.slice(0, 80) + "…" : cell;
                    return <td key={c} className="px-3 py-2 whitespace-nowrap">{short}</td>;
                  })}
                  <td className="px-3 py-2 text-right">
                    {!def.readOnly && id && (
                      <Link href={`/settings/tables/${def.name}/${encodeURIComponent(id)}`} className="text-slate-700 underline">Edit</Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!data || data.length === 0) && (
              <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-slate-500">No rows.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4 text-sm">
        {page > 1 && <Link href={`/settings/tables/${def.name}?page=${page - 1}`} className="underline">← Prev</Link>}
        <span className="text-slate-500">Page {page}</span>
        {count !== null && count !== undefined && page * PAGE_SIZE < count && (
          <Link href={`/settings/tables/${def.name}?page=${page + 1}`} className="underline">Next →</Link>
        )}
      </div>
    </div>
  );
}
