import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTable } from "@/lib/tables";
import { TableWorkspace } from "@/components/tables/TableWorkspace";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function TableListPage({
  params,
  searchParams,
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

  const rows = (data ?? []) as Record<string, unknown>[];
  const cols =
    def.listColumns ??
    (rows[0] ? Object.keys(rows[0]).slice(0, 8) : def.columns.map((c) => c.name).slice(0, 8));

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href="/settings/tables" className="text-slate-500 hover:text-slate-900">
          ← All tables
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error.message}
        </div>
      )}

      <TableWorkspace
        def={def}
        rows={rows}
        cols={cols}
        count={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
