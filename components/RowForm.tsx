import type { TableDef } from "@/lib/tables";

export function RowForm({
  def, row, action, submitLabel,
}: {
  def: TableDef;
  row?: Record<string, unknown>;
  action: (form: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4 max-w-3xl">
      {def.columns.map(col => {
        if (col.name === "*") return null;
        const val = row?.[col.name];
        const common = "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500";
        const displayVal =
          val === null || val === undefined ? ""
          : col.type === "json" ? JSON.stringify(val, null, 2)
          : col.type === "text_array" ? (Array.isArray(val) ? (val as string[]).join(", ") : String(val))
          : col.type === "timestamptz" ? String(val).replace("T", " ").slice(0, 19)
          : String(val);

        return (
          <div key={col.name} className="grid grid-cols-[200px_1fr] gap-3 items-start">
            <label className="pt-1.5 text-sm font-medium text-slate-700">
              {col.name}
              {col.required && <span className="text-red-500"> *</span>}
              <div className="text-xs text-slate-400 font-normal">{col.type}</div>
            </label>
            <div>
              {col.readonly ? (
                <input name={col.name} defaultValue={displayVal} disabled className={common} />
              ) : col.type === "bool" ? (
                <input type="checkbox" name={col.name} defaultChecked={Boolean(val)} className="h-4 w-4" />
              ) : col.type === "enum" ? (
                <select name={col.name} defaultValue={displayVal} className={common}>
                  <option value="">— null —</option>
                  {col.enumValues?.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : col.type === "textarea" || col.type === "json" ? (
                <textarea name={col.name} defaultValue={displayVal} rows={col.type === "json" ? 5 : 3} className={`${common} font-mono`} />
              ) : col.type === "date" ? (
                <input type="date" name={col.name} defaultValue={displayVal ? displayVal.slice(0, 10) : ""} className={common} />
              ) : col.type === "int" || col.type === "numeric" ? (
                <input type="number" step={col.type === "numeric" ? "any" : "1"} name={col.name} defaultValue={displayVal} className={common} />
              ) : (
                <input type="text" name={col.name} defaultValue={displayVal} className={common} />
              )}
              {col.type === "text_array" && <div className="text-xs text-slate-400 mt-1">Comma-separated</div>}
              {col.type === "json" && <div className="text-xs text-slate-400 mt-1">JSON (leave blank for null)</div>}
            </div>
          </div>
        );
      })}
      <div className="pt-4">
        <button type="submit" className="rounded bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
