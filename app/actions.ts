"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getTable, coerceValue } from "@/lib/tables";

function buildPayload(table: string, form: FormData) {
  const def = getTable(table);
  if (!def) throw new Error(`Unknown table: ${table}`);
  const payload: Record<string, unknown> = {};
  for (const col of def.columns) {
    if (col.readonly) continue;
    if (col.type === "bool") {
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
  revalidatePath(`/settings/tables/${table}`);
  const def = getTable(table)!;
  return { id: String(data[def.pk]) };
}

export async function updateRow(table: string, id: string, form: FormData) {
  const { def, payload } = buildPayload(table, form);
  const { error } = await supabase.from(table).update(payload).eq(def.pk, id);
  if (error) throw new Error(error.message);
  revalidatePath(`/settings/tables/${table}`);
  revalidatePath(`/settings/tables/${table}/${id}`);
}

export async function deleteRow(table: string, id: string) {
  const def = getTable(table);
  if (!def) throw new Error(`Unknown table: ${table}`);
  const { error } = await supabase.from(table).delete().eq(def.pk, id);
  if (error) throw new Error(error.message);
  revalidatePath(`/settings/tables/${table}`);
}

// ------------- CRM actions -------------

export async function advanceStage(companyId: string, stage: string) {
  const { error } = await supabase
    .from("master_companies")
    .update({ pipeline_stage: stage })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/pipeline");
  revalidatePath("/leads");
  revalidatePath(`/leads/${companyId}`);
}

export async function setOutreachStatus(companyId: string, status: string) {
  const { error } = await supabase
    .from("master_companies")
    .update({ outreach_status: status })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath(`/leads/${companyId}`);
}

export async function archiveCompany(companyId: string, archived: boolean) {
  const { error } = await supabase
    .from("master_companies")
    .update({ is_archived: archived })
    .eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath(`/leads/${companyId}`);
}

export async function logOutreach(form: FormData) {
  const company_id = String(form.get("company_id") ?? "").trim();
  const channel = String(form.get("channel") ?? "").trim();
  if (!company_id || !channel) throw new Error("company_id and channel are required");

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    company_id,
    channel,
    action: String(form.get("action") ?? "") || null,
    subject: String(form.get("subject") ?? "") || null,
    message_preview: String(form.get("message_preview") ?? "") || null,
    sent_via: String(form.get("sent_via") ?? "") || null,
    sent_at: now,
    was_opened: form.get("was_opened") !== null,
    was_replied: form.get("was_replied") !== null,
  };

  const { error } = await supabase.from("outreach_log").insert(payload);
  if (error) throw new Error(error.message);

  await supabase
    .from("master_companies")
    .update({ last_contacted_at: now, outreach_status: "sent" })
    .eq("id", company_id);

  revalidatePath("/outreach");
  revalidatePath("/leads");
  revalidatePath(`/leads/${company_id}`);
}

export async function updateDealStage(dealId: string, stage: string) {
  const patch: Record<string, unknown> = { deal_stage: stage };
  if (stage === "completed" || stage === "active") patch.closed_at = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("deals").update(patch).eq("id", dealId);
  if (error) throw new Error(error.message);
  revalidatePath("/deals");
}

export async function createDeal(form: FormData) {
  const payload: Record<string, unknown> = {
    company_id: String(form.get("company_id") ?? "") || null,
    deal_name: String(form.get("deal_name") ?? "") || null,
    service_type: String(form.get("service_type") ?? "") || null,
    deal_value: form.get("deal_value") ? parseFloat(String(form.get("deal_value"))) : null,
    currency: String(form.get("currency") ?? "AED"),
    deal_stage: String(form.get("deal_stage") ?? "proposal"),
    notes: String(form.get("notes") ?? "") || null,
  };
  if (!payload.company_id || !payload.deal_name) throw new Error("company_id and deal_name are required");
  const { error } = await supabase.from("deals").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/deals");
  revalidatePath(`/leads/${payload.company_id}`);
}

export async function matchRawToMaster(rawTable: string, rawId: string, masterId: string) {
  const allowed = ["raw_govt_data", "raw_govt_people_data", "raw_govt_projects_data", "raw_paid_data", "raw_platform_data"];
  if (!allowed.includes(rawTable)) throw new Error("Invalid raw table");
  const { error } = await supabase.from(rawTable).update({ matched_master_id: masterId }).eq("id", rawId);
  if (error) throw new Error(error.message);
  revalidatePath("/raw");
}

// ------------- Detail drill-downs -------------

/** Full row for a given table + id (used when clicking from a related panel). */
export async function getRow(table: string, id: string): Promise<Record<string, unknown> | null> {
  const def = getTable(table);
  if (!def) throw new Error(`Unknown table: ${table}`);
  const { data, error } = await supabase.from(table).select("*").eq(def.pk, id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Decision-makers + aggregate enrichment for a master company. */
export async function getCompanyDecisionMakers(companyId: string): Promise<{
  decision_makers: Array<Record<string, unknown>>;
  enriched_by: string | null;
  enriched_at: string | null;
}> {
  const { data } = await supabase
    .from("enrichment_data")
    .select("decision_makers, enriched_by, enriched_at")
    .eq("company_id", companyId)
    .maybeSingle();
  const dm = data?.decision_makers;
  const list = Array.isArray(dm) ? (dm as Array<Record<string, unknown>>) : [];
  return {
    decision_makers: list,
    enriched_by: (data?.enriched_by as string | null) ?? null,
    enriched_at: (data?.enriched_at as string | null) ?? null,
  };
}

/** Bookings + event history for a person (by email) in the Cal.com feed. */
export async function getDiscoveryCallHistory(email: string): Promise<{
  bookings: Record<string, unknown>[];
  events: Record<string, unknown>[];
}> {
  const [bookingsRes, eventsRes] = await Promise.all([
    supabase
      .from("raw_discovery_calls")
      .select("id,booking_id,event_name,scheduled_start,scheduled_end,status,meeting_location,additional_notes,submitted_at")
      .eq("email", email)
      .order("scheduled_start", { ascending: false, nullsFirst: false }),
    supabase
      .from("raw_discovery_call_events")
      .select("id,booking_id,trigger_event,status,scheduled_start,received_at")
      .eq("email", email)
      .order("received_at", { ascending: true }),
  ]);
  return {
    bookings: bookingsRes.data ?? [],
    events: eventsRes.data ?? [],
  };
}

/** Developer stats (from dld_developers view) + their projects. Optionally exclude one project. */
export async function getDeveloperDetail(
  developerNumber: string,
  excludeProjectId?: string,
): Promise<{
  stats: Record<string, unknown> | null;
  projects: Record<string, unknown>[];
}> {
  const [statsRes, projectsRes] = await Promise.all([
    supabase.from("dld_developers").select("*").eq("developer_number", developerNumber).maybeSingle(),
    supabase
      .from("raw_govt_projects_data")
      .select("id,project_name,project_status,project_value,percent_completed,area,cnt_unit")
      .eq("developer_number", developerNumber)
      .order("project_value", { ascending: false, nullsFirst: false })
      .limit(100),
  ]);
  const projects = (projectsRes.data ?? []).filter((p) => !excludeProjectId || String(p.id) !== excludeProjectId);
  return { stats: statsRes.data ?? null, projects };
}
