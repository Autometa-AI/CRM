"use client";

import { useEffect, useMemo, useState, useTransition, FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { DeveloperPanel } from "@/components/tables/DeveloperPanel";
import { DecisionMakersPanel } from "@/components/tables/DecisionMakersPanel";
import { formatCell, type Column, type TableDef } from "@/lib/tables";
import { createRow, updateRow, deleteRow, getRow } from "@/app/actions";

type Row = Record<string, unknown>;

// Fields we hide from the primary form/detail sections — they're system metadata.
const SYSTEM_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "scraped_at",
  "fetched_at",
  "imported_at",
  "raw_payload",
  "matched_master_id",
  "matched_contact_id",
]);

export function TableWorkspace({
  def,
  rows,
  cols,
  count,
  page,
  pageSize,
  initialQuery = "",
  searchableColumns = [],
}: {
  def: TableDef;
  rows: Row[];
  cols: string[];
  count: number | null;
  page: number;
  pageSize: number;
  initialQuery?: string;
  searchableColumns?: string[];
}) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const colDefs = useMemo(() => new Map(def.columns.map((c) => [c.name, c])), [def.columns]);
  const rowTitle = (row: Row) => String(row.company_name ?? row.full_name ?? row.project_name ?? row.name ?? row.deal_name ?? row[def.pk] ?? "");

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{def.label}</h1>
          <div className="text-sm text-slate-500">
            {count?.toLocaleString() ?? 0} {initialQuery ? "matches" : "rows"}
            {def.readOnly && <span className="ml-2 text-amber-600">· read-only view</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {searchableColumns.length > 0 && (
            <SearchBox tableName={def.name} initialValue={initialQuery} columnHints={searchableColumns} />
          )}
          {!def.readOnly && (
            <button
              onClick={() => setAdding(true)}
              className="shrink-0 rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      <div className="overflow-auto bg-white border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap">
                  {prettyLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => {
                  setSelected(row);
                  setEditing(false);
                }}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              >
                {cols.map((c) => {
                  const col = colDefs.get(c);
                  const cell = col ? formatCell(col, row[c]) : formatCell({ name: c, type: "text" }, row[c]);
                  const short = cell.length > 80 ? cell.slice(0, 80) + "…" : cell;
                  return (
                    <td key={c} className="px-3 py-2 whitespace-nowrap">
                      {short}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-3 py-10 text-center text-slate-500">
                  No rows yet. {!def.readOnly && <button onClick={() => setAdding(true)} className="text-slate-900 underline">Add the first one</button>}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination tableName={def.name} page={page} pageSize={pageSize} count={count ?? 0} />

      {/* Detail / Edit modal */}
      {selected && (
        <RowModal
          def={def}
          row={selected}
          editing={editing && !def.readOnly}
          onEdit={() => setEditing(true)}
          onCancelEdit={() => setEditing(false)}
          onClose={() => {
            setSelected(null);
            setEditing(false);
          }}
          onSelectRow={(row) => {
            setSelected(row);
            setEditing(false);
          }}
          title={rowTitle(selected)}
        />
      )}

      {/* Add modal */}
      {adding && !def.readOnly && (
        <RowModal
          def={def}
          row={null}
          editing={true}
          isNew
          onEdit={() => {}}
          onCancelEdit={() => setAdding(false)}
          onClose={() => setAdding(false)}
          title={`New ${def.label}`}
        />
      )}
    </div>
  );
}

/* ----- modal (shared for detail + edit + add) ----- */

function RowModal({
  def,
  row,
  editing,
  isNew = false,
  onEdit,
  onCancelEdit,
  onClose,
  onSelectRow,
  title,
}: {
  def: TableDef;
  row: Row | null;
  editing: boolean;
  isNew?: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onSelectRow?: (row: Row) => void;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Which columns are "primary" (shown by default) vs "more" (behind toggle)?
  // Primary = required fields + listColumns (the ones a user sees in the table)
  const listSet = new Set(def.listColumns ?? []);
  const primaryCols: Column[] = [];
  const moreCols: Column[] = [];
  const systemCols: Column[] = [];
  for (const c of def.columns) {
    if (c.name === "*") continue;
    if (SYSTEM_FIELDS.has(c.name) || c.readonly) systemCols.push(c);
    else if (c.required || listSet.has(c.name)) primaryCols.push(c);
    else moreCols.push(c);
  }

  // If editing an existing row and any "more" field has data, expand by default
  const hasMoreData = row ? moreCols.some((c) => row[c.name] != null && row[c.name] !== "") : false;
  const [showMore, setShowMore] = useState(hasMoreData);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (isNew) {
          await createRow(def.name, fd);
        } else if (row) {
          await updateRow(def.name, String(row[def.pk]), fd);
        }
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  async function handleDelete() {
    if (!row) return;
    if (!confirm("Delete this row? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteRow(def.name, String(row[def.pk]));
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={title || (isNew ? `New ${def.label}` : def.label)}
      subtitle={isNew ? def.description : undefined}
      size="lg"
      footer={
        editing ? (
          <div className="flex items-center justify-between gap-2">
            <div>
              {!isNew && row && (
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="rounded border border-red-200 bg-white text-red-700 px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={isNew ? onClose : onCancelEdit}
                disabled={pending}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="row-form"
                disabled={pending}
                className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {pending ? "Saving…" : isNew ? "Create" : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Close
            </button>
            {!def.readOnly && (
              <button
                onClick={onEdit}
                className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
              >
                Edit
              </button>
            )}
          </div>
        )
      }
    >
      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 text-red-700 p-2.5 text-sm">{error}</div>
      )}

      {editing ? (
        <form id="row-form" onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup cols={primaryCols} row={row} />
          {moreCols.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <span className="inline-block w-4">{showMore ? "▾" : "▸"}</span>
                {showMore ? "Hide optional fields" : `Show ${moreCols.length} more field${moreCols.length === 1 ? "" : "s"}`}
              </button>
              {showMore && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <FieldGroup cols={moreCols} row={row} />
                </div>
              )}
            </div>
          )}
        </form>
      ) : (
        row && (
          <>
            <DetailView def={def} row={row} primaryCols={primaryCols} moreCols={moreCols} systemCols={systemCols} />
            {def.name === "raw_govt_projects_data" && row.developer_number && onSelectRow && (
              <DeveloperPanel
                developerNumber={String(row.developer_number)}
                developerName={typeof row.developer_name === "string" ? row.developer_name : null}
                excludeProjectId={String(row[def.pk] ?? "")}
                onSelectProject={async (id) => {
                  const fresh = await getRow(def.name, id);
                  if (fresh) onSelectRow(fresh);
                }}
              />
            )}
            {def.name === "master_companies" && row.id && (
              <DecisionMakersPanel companyId={String(row.id)} />
            )}
          </>
        )
      )}
    </Modal>
  );
}

/* ----- read-only detail view ----- */

function DetailView({
  def,
  row,
  primaryCols,
  moreCols,
  systemCols,
}: {
  def: TableDef;
  row: Row;
  primaryCols: Column[];
  moreCols: Column[];
  systemCols: Column[];
}) {
  const [showMore, setShowMore] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const filtered = (cols: Column[]) => cols.filter((c) => row[c.name] != null && row[c.name] !== "");

  const primaryShown = filtered(primaryCols);
  const moreShown = filtered(moreCols);
  const systemShown = filtered(systemCols);

  // For view-type tables (columns: [{ name: "*", ...}]) we don't have typed columns.
  // Render all fields of the row directly.
  const isStarColumn = def.columns.length === 1 && def.columns[0].name === "*";

  if (isStarColumn) {
    const entries = Object.entries(row).filter(([_, v]) => v != null && v !== "");
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <DetailField key={k} label={prettyLabel(k)} value={formatCell({ name: k, type: "text" }, v)} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {primaryShown.length > 0 && (
        <div className="space-y-2">
          {primaryShown.map((c) => (
            <DetailField key={c.name} label={prettyLabel(c.name)} value={formatCell(c, row[c.name])} mono={c.type === "json" || c.type === "uuid"} />
          ))}
        </div>
      )}

      {moreShown.length > 0 && (
        <div>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <span className="inline-block w-4">{showMore ? "▾" : "▸"}</span>
            {showMore ? "Hide additional details" : `Show ${moreShown.length} more detail${moreShown.length === 1 ? "" : "s"}`}
          </button>
          {showMore && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              {moreShown.map((c) => (
                <DetailField key={c.name} label={prettyLabel(c.name)} value={formatCell(c, row[c.name])} mono={c.type === "json" || c.type === "uuid"} />
              ))}
            </div>
          )}
        </div>
      )}

      {systemShown.length > 0 && (
        <div>
          <button
            onClick={() => setShowSystem((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
          >
            <span className="inline-block w-4">{showSystem ? "▾" : "▸"}</span>
            System metadata
          </button>
          {showSystem && (
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
              {systemShown.map((c) => (
                <DetailField key={c.name} label={prettyLabel(c.name)} value={formatCell(c, row[c.name])} mono small />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className={`grid grid-cols-[160px_1fr] gap-3 items-start ${small ? "text-xs" : "text-sm"}`}>
      <div className={`${small ? "text-slate-400" : "text-slate-500"} font-medium`}>{label}</div>
      <div className={`${mono ? "font-mono text-xs" : ""} text-slate-900 break-words whitespace-pre-wrap`}>
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

/* ----- field group (edit form) ----- */

function FieldGroup({ cols, row }: { cols: Column[]; row: Row | null }) {
  return (
    <div className="space-y-3">
      {cols.map((col) => (
        <FieldRow key={col.name} col={col} row={row} />
      ))}
    </div>
  );
}

function FieldRow({ col, row }: { col: Column; row: Row | null }) {
  const val = row?.[col.name];
  const common = "w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

  const displayVal =
    val === null || val === undefined ? ""
      : col.type === "json" ? JSON.stringify(val, null, 2)
      : col.type === "text_array" ? (Array.isArray(val) ? (val as string[]).join(", ") : String(val))
      : col.type === "timestamptz" ? String(val).replace("T", " ").slice(0, 19)
      : String(val);

  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 items-start">
      <label className="pt-1.5 text-sm text-slate-700">
        {prettyLabel(col.name)}
        {col.required && <span className="text-red-500"> *</span>}
      </label>
      <div>
        {col.type === "bool" ? (
          <input type="checkbox" name={col.name} defaultChecked={Boolean(val)} className="h-4 w-4 mt-2" />
        ) : col.type === "enum" ? (
          <select name={col.name} defaultValue={displayVal} className={common}>
            <option value="">—</option>
            {col.enumValues?.map((v) => (
              <option key={v} value={v}>
                {v.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : col.type === "textarea" || col.type === "json" ? (
          <textarea
            name={col.name}
            defaultValue={displayVal}
            rows={col.type === "json" ? 5 : 3}
            className={`${common} ${col.type === "json" ? "font-mono text-xs" : ""}`}
          />
        ) : col.type === "date" ? (
          <input type="date" name={col.name} defaultValue={displayVal ? displayVal.slice(0, 10) : ""} className={common} />
        ) : col.type === "int" || col.type === "numeric" ? (
          <input
            type="number"
            step={col.type === "numeric" ? "any" : "1"}
            name={col.name}
            defaultValue={displayVal}
            className={common}
          />
        ) : (
          <input type="text" name={col.name} defaultValue={displayVal} className={common} />
        )}
        {col.type === "text_array" && <div className="text-xs text-slate-400 mt-1">Comma-separated</div>}
        {col.type === "json" && <div className="text-xs text-slate-400 mt-1">JSON (leave blank for null)</div>}
      </div>
    </div>
  );
}

/* ----- helpers ----- */

function Pagination({ tableName, page, pageSize, count }: { tableName: string; page: number; pageSize: number; count: number }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (count <= pageSize) return null;
  return (
    <div className="flex items-center gap-3 mt-4 text-sm text-slate-600">
      {page > 1 && <a href={`/settings/tables/${tableName}?page=${page - 1}`} className="hover:underline">← Prev</a>}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages && <a href={`/settings/tables/${tableName}?page=${page + 1}`} className="hover:underline">Next →</a>}
    </div>
  );
}

function SearchBox({
  tableName,
  initialValue,
  columnHints,
}: {
  tableName: string;
  initialValue: string;
  columnHints: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  // Debounce URL updates so we don't navigate on every keystroke
  useEffect(() => {
    if (value === initialValue) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      params.delete("page"); // reset to first page on new search
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const placeholder = columnHints.length
    ? `Search ${columnHints.slice(0, 3).map(prettyLabel).join(", ")}${columnHints.length > 3 ? "…" : ""}`
    : "Search";

  return (
    <div className="relative">
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={`Search ${tableName}`}
        className="w-56 md:w-80 rounded border border-slate-300 bg-white pl-8 pr-8 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function prettyLabel(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bAed\b/g, "AED")
    .replace(/\bCrm\b/g, "CRM")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bIcp\b/g, "ICP")
    .replace(/\bDld\b/g, "DLD");
}
