import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTable } from "@/lib/tables";
import { RowForm } from "@/components/RowForm";
import { updateRow, deleteRow } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function EditRowPage({ params }: { params: { table: string; id: string } }) {
  const def = getTable(params.table);
  if (!def || def.readOnly) notFound();

  const id = decodeURIComponent(params.id);
  const { data: row, error } = await supabase.from(def.name).select("*").eq(def.pk, id).single();
  if (error || !row) notFound();

  async function save(form: FormData) {
    "use server";
    await updateRow(params.table, id, form);
  }

  async function destroy() {
    "use server";
    await deleteRow(params.table, id);
    redirect(`/settings/tables/${params.table}`);
  }

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/settings/tables/${def.name}`} className="text-slate-500 hover:underline">← {def.label}</Link>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Edit {def.label}</h1>
        <form action={destroy}>
          <button type="submit" className="rounded bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700">
            Delete
          </button>
        </form>
      </div>
      <RowForm def={def} row={row} action={save} submitLabel="Save changes" />
    </div>
  );
}
