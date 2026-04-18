"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTable, coerceValue } from "@/lib/tables";

function buildPayload(table: string, form: FormData) {
  const def = getTable(table);
  if (!def) throw new Error(`Unknown table: ${table}`);
  const payload: Record<string, unknown> = {};
  for (const col of def.columns) {
    if (col.readonly) continue;
    if (col.type === "bool") {
      // checkbox: present → true, absent → false
      payload[col.name] = form.get(col.name) !== null;
      continue;
    }
    const raw = form.get(col.name);
    const val = coerceValue(col, raw);
    if (val !== null) payload[col.name] = val;
  }
  return { def, payload };
}

export async function createRow(table: string, form: FormData) {
  const { payload } = buildPayload(table, form);
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(error.message);
  revalidatePath(`/${table}`);
  const def = getTable(table)!;
  redirect(`/${table}/${encodeURIComponent(String(data[def.pk]))}`);
}

export async function updateRow(table: string, id: string, form: FormData) {
  const { def, payload } = buildPayload(table, form);
  const { error } = await supabase.from(table).update(payload).eq(def.pk, id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${table}`);
  revalidatePath(`/${table}/${id}`);
}

export async function deleteRow(table: string, id: string) {
  const def = getTable(table);
  if (!def) throw new Error(`Unknown table: ${table}`);
  const { error } = await supabase.from(table).delete().eq(def.pk, id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${table}`);
  redirect(`/${table}`);
}
