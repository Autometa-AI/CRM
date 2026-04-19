import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTable } from "@/lib/tables";
import { RowForm } from "@/components/RowForm";
import { createRow } from "@/app/actions";

export default function NewRowPage({ params }: { params: { table: string } }) {
  const def = getTable(params.table);
  if (!def || def.readOnly) notFound();

  async function action(form: FormData) {
    "use server";
    await createRow(params.table, form);
    redirect(`/settings/tables/${params.table}`);
  }

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/settings/tables/${def.name}`} className="text-slate-500 hover:underline">← {def.label}</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-6">New {def.label}</h1>
      <RowForm def={def} action={action} submitLabel="Create" />
    </div>
  );
}
