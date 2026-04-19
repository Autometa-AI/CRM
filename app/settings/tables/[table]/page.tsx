import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTable, TableDef } from "@/lib/tables";
import { TableWorkspace } from "@/components/tables/TableWorkspace";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Column names that are safe to include in an ILIKE OR-filter.
const SAFE_TEXT_NAME = /name|email|phone|number|website|city|address|domain|title|subject|area|zone|status|office|recipient/i;

function getSearchableColumns(def: TableDef): string[] {
  // Views have a single wildcard column; use listColumns filtered by name heuristic.
  if (def.columns.length === 1 && def.columns[0].name === "*") {
    return (def.listColumns ?? []).filter((c) => SAFE_TEXT_NAME.test(c));
  }
  const listCols = def.listColumns ?? def.columns.map((c) => c.name);
  const colMap = new Map(def.columns.map((c) => [c.name, c]));
  const textLike = new Set<string>(["text", "textarea"]);
  return listCols.filter((c) => {
    const col = colMap.get(c);
    return col && textLike.has(col.type);
  });
}

export default async function TableListPage({
  params,
  searchParams,
}: {
  params: { table: string };
  searchParams: { page?: string; q?: string };
}) {
  const def = getTable(params.table);
  if (!def) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const qRaw = (searchParams.q ?? "").trim();
  const q = qRaw.slice(0, 100).replace(/[%(),]/g, "");
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const searchable = getSearchableColumns(def);
  let query = supabase.from(def.name).select("*", { count: "exact" });
  if (q && searchable.length > 0) {
    const filter = searchable.map((c) => `${c}.ilike.%${q}%`).join(",");
    query = query.or(filter);
  }
  query = query.range(from, to);
  if (def.orderBy) query = query.order(def.orderBy.col, { ascending: def.orderBy.asc });

  const { data, count, error } = await query;

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
        initialQuery={qRaw}
        searchableColumns={searchable}
      />
    </div>
  );
}
