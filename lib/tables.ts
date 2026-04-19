// Schema config for the dashboard. Drives list columns, edit forms, and enum dropdowns.
// Editable tables only — views (active_leads, qualified_leads, clients, pipeline_summary,
// monthly_spend) are read-only and rendered by the same list page.

export type ColType =
  | "uuid"
  | "text"
  | "textarea"
  | "int"
  | "numeric"
  | "bool"
  | "date"
  | "timestamptz"
  | "json"
  | "text_array"
  | "enum";

export interface Column {
  name: string;
  type: ColType;
  required?: boolean;
  readonly?: boolean;      // auto-generated (id, created_at, updated_at)
  hiddenInList?: boolean;  // don't show in row list (wide payloads)
  enumValues?: string[];
}

export interface TableDef {
  name: string;
  label: string;
  pk: string;
  readOnly?: boolean;        // view
  orderBy?: { col: string; asc: boolean };
  listColumns?: string[];    // subset to show in list
  columns: Column[];
}

// ---------- enum value lists (mirrors migration) ----------
const EMIRATE = ["dubai","abu_dhabi","sharjah","ajman","umm_al_quwain","ras_al_khaimah","fujairah","unknown"];
const COMPANY_TYPE = ["broker","developer","both","property_management","unknown"];
const PIPELINE_STAGE = ["raw","enriched","outreach","replied","qualified","client"];
const ENRICHMENT_STATUS = ["pending","in_progress","done","failed"];
const OUTREACH_STATUS = ["not_started","queued","sent","opened","replied","meeting_booked","closed_won","closed_lost"];
const DATA_SOURCE = ["govt","directory","paid","platform","maps","manual"];
const OUTREACH_CHANNEL = ["email","linkedin","phone","whatsapp"];
const EXPENSE_CATEGORY = ["salary","subscription","tools","marketing","office","travel","other"];
const RECURRENCE = ["one_time","monthly","quarterly","yearly"];

// ---------- helpers ----------
const ID: Column = { name: "id", type: "uuid", readonly: true };
const CREATED: Column = { name: "created_at", type: "timestamptz", readonly: true };
const UPDATED: Column = { name: "updated_at", type: "timestamptz", readonly: true };

// ---------- table defs ----------
export const TABLES: TableDef[] = [
  {
    name: "master_companies",
    label: "Master Companies",
    pk: "id",
    orderBy: { col: "created_at", asc: false },
    listColumns: ["company_name","domain","city","company_type","pipeline_stage","lead_score","is_archived"],
    columns: [
      ID,
      { name: "company_name", type: "text", required: true },
      { name: "domain", type: "text" },
      { name: "email", type: "text" },
      { name: "phone", type: "text" },
      { name: "secondary_phone", type: "text" },
      { name: "whatsapp", type: "text" },
      { name: "city", type: "enum", enumValues: EMIRATE },
      { name: "address", type: "textarea" },
      { name: "company_type", type: "enum", enumValues: COMPANY_TYPE },
      { name: "license_number", type: "text" },
      { name: "primary_source", type: "enum", enumValues: DATA_SOURCE },
      { name: "source_ids", type: "json" },
      { name: "sources_matched", type: "int" },
      { name: "pipeline_stage", type: "enum", enumValues: PIPELINE_STAGE },
      { name: "enrichment_status", type: "enum", enumValues: ENRICHMENT_STATUS },
      { name: "outreach_status", type: "enum", enumValues: OUTREACH_STATUS },
      { name: "lead_score", type: "int" },
      { name: "confidence_score", type: "numeric" },
      { name: "last_enriched_at", type: "timestamptz" },
      { name: "last_contacted_at", type: "timestamptz" },
      { name: "is_archived", type: "bool" },
      CREATED, UPDATED,
    ],
  },
  {
    name: "raw_govt_data",
    label: "Raw • Govt",
    pk: "id",
    orderBy: { col: "scraped_at", asc: false },
    listColumns: ["company_name","license_number","emirate","status","scraped_at"],
    columns: [
      ID,
      { name: "company_name", type: "text", required: true },
      { name: "license_number", type: "text" },
      { name: "license_type", type: "text" },
      { name: "trade_name", type: "text" },
      { name: "legal_form", type: "text" },
      { name: "issue_date", type: "date" },
      { name: "expiry_date", type: "date" },
      { name: "status", type: "text" },
      { name: "emirate", type: "text" },
      { name: "address", type: "textarea" },
      { name: "activities", type: "text_array" },
      { name: "source_url", type: "text" },
      { name: "source_name", type: "text" },
      { name: "raw_payload", type: "json", hiddenInList: true },
      { name: "scraped_at", type: "timestamptz" },
      { name: "matched_master_id", type: "uuid" },
    ],
  },
  {
    name: "raw_govt_people_data",
    label: "Raw • Govt People",
    pk: "id",
    orderBy: { col: "scraped_at", asc: false },
    listColumns: ["full_name","broker_number","office_name","email","phone","scraped_at"],
    columns: [
      ID,
      { name: "full_name", type: "text", required: true },
      { name: "broker_number", type: "text" },
      { name: "office_name", type: "text" },
      { name: "email", type: "text" },
      { name: "phone", type: "text" },
      { name: "emirate", type: "text" },
      { name: "source_url", type: "text" },
      { name: "source_name", type: "text" },
      { name: "raw_payload", type: "json", hiddenInList: true },
      { name: "scraped_at", type: "timestamptz" },
      { name: "matched_master_id", type: "uuid" },
      { name: "matched_contact_id", type: "uuid" },
    ],
  },
  {
    name: "raw_govt_projects_data",
    label: "Raw • Govt Projects",
    pk: "id",
    orderBy: { col: "scraped_at", asc: false },
    listColumns: ["project_name","developer_name","project_status","project_value","area","scraped_at"],
    columns: [
      ID,
      { name: "project_number", type: "text" },
      { name: "project_name", type: "text", required: true },
      { name: "developer_number", type: "text" },
      { name: "developer_name", type: "text" },
      { name: "project_type", type: "text" },
      { name: "project_status", type: "text" },
      { name: "project_value", type: "numeric" },
      { name: "percent_completed", type: "numeric" },
      { name: "escrow_account_number", type: "text" },
      { name: "start_date", type: "date" },
      { name: "end_date", type: "date" },
      { name: "adoption_date", type: "date" },
      { name: "inspection_date", type: "date" },
      { name: "completion_date", type: "date" },
      { name: "description", type: "textarea" },
      { name: "area", type: "text" },
      { name: "zone", type: "text" },
      { name: "master_project", type: "text" },
      { name: "cnt_land", type: "int" },
      { name: "cnt_building", type: "int" },
      { name: "cnt_villa", type: "int" },
      { name: "cnt_unit", type: "int" },
      { name: "emirate", type: "text" },
      { name: "source_url", type: "text" },
      { name: "source_name", type: "text" },
      { name: "raw_payload", type: "json", hiddenInList: true },
      { name: "scraped_at", type: "timestamptz" },
      { name: "matched_master_id", type: "uuid" },
    ],
  },
  {
    name: "raw_paid_data",
    label: "Raw • Paid",
    pk: "id",
    orderBy: { col: "fetched_at", asc: false },
    listColumns: ["company_name","domain","employee_count","industry","source_provider","fetched_at"],
    columns: [
      ID,
      { name: "company_name", type: "text", required: true },
      { name: "domain", type: "text" },
      { name: "email", type: "text" },
      { name: "phone", type: "text" },
      { name: "linkedin_url", type: "text" },
      { name: "employee_count", type: "int" },
      { name: "industry", type: "text" },
      { name: "city", type: "text" },
      { name: "country", type: "text" },
      { name: "technologies", type: "text_array" },
      { name: "source_provider", type: "text" },
      { name: "raw_payload", type: "json", hiddenInList: true },
      { name: "fetched_at", type: "timestamptz" },
      { name: "matched_master_id", type: "uuid" },
    ],
  },
  {
    name: "raw_platform_data",
    label: "Raw • Platform",
    pk: "id",
    orderBy: { col: "scraped_at", asc: false },
    listColumns: ["company_name","platform","listing_count","active_listings","rating","scraped_at"],
    columns: [
      ID,
      { name: "company_name", type: "text", required: true },
      { name: "platform", type: "text" },
      { name: "profile_url", type: "text" },
      { name: "listing_count", type: "int" },
      { name: "active_listings", type: "int" },
      { name: "agent_count", type: "int" },
      { name: "rating", type: "numeric" },
      { name: "city", type: "text" },
      { name: "raw_payload", type: "json", hiddenInList: true },
      { name: "scraped_at", type: "timestamptz" },
      { name: "matched_master_id", type: "uuid" },
    ],
  },
  {
    name: "enrichment_data",
    label: "Enrichment Data",
    pk: "id",
    orderBy: { col: "enriched_at", asc: false },
    listColumns: ["company_id","linkedin_industry","linkedin_employee_count","has_crm","is_hiring","enriched_at"],
    columns: [
      ID,
      { name: "company_id", type: "uuid", required: true },
      { name: "linkedin_url", type: "text" },
      { name: "linkedin_employee_count", type: "int" },
      { name: "linkedin_industry", type: "text" },
      { name: "tech_stack", type: "text_array" },
      { name: "has_crm", type: "bool" },
      { name: "crm_name", type: "text" },
      { name: "has_chatbot", type: "bool" },
      { name: "has_live_chat", type: "bool" },
      { name: "decision_makers", type: "json" },
      { name: "founded_year", type: "int" },
      { name: "employee_count_range", type: "text" },
      { name: "annual_revenue_range", type: "text" },
      { name: "property_finder_url", type: "text" },
      { name: "bayut_url", type: "text" },
      { name: "listing_count", type: "int" },
      { name: "active_listings", type: "int" },
      { name: "google_rating", type: "numeric" },
      { name: "google_review_count", type: "int" },
      { name: "is_hiring", type: "bool" },
      { name: "hiring_roles", type: "text_array" },
      { name: "enriched_by", type: "text" },
      { name: "enriched_at", type: "timestamptz" },
    ],
  },
  {
    name: "ai_insights",
    label: "AI Insights",
    pk: "id",
    orderBy: { col: "generated_at", asc: false },
    listColumns: ["company_id","icp_fit_score","tech_maturity","website_quality","recommended_service","generated_at"],
    columns: [
      ID,
      { name: "company_id", type: "uuid", required: true },
      { name: "business_summary", type: "textarea" },
      { name: "icp_fit_score", type: "int" },
      { name: "icp_fit_reasoning", type: "textarea" },
      { name: "pain_points", type: "text_array" },
      { name: "ai_opportunities", type: "text_array" },
      { name: "tech_maturity", type: "enum", enumValues: ["low","medium","high"] },
      { name: "digital_presence_score", type: "int" },
      { name: "website_quality", type: "enum", enumValues: ["poor","average","good","excellent"] },
      { name: "website_issues", type: "text_array" },
      { name: "outreach_hooks", type: "text_array" },
      { name: "recommended_service", type: "text" },
      { name: "ai_model", type: "text" },
      { name: "prompt_version", type: "text" },
      { name: "generated_at", type: "timestamptz" },
    ],
  },
  {
    name: "lead_scores",
    label: "Lead Scores",
    pk: "id",
    orderBy: { col: "total_score", asc: false },
    listColumns: ["company_id","total_score","score_website","score_listings","score_hiring","score_poor_tech","score_reviews"],
    columns: [
      ID,
      { name: "company_id", type: "uuid", required: true },
      { name: "total_score", type: "int" },
      { name: "score_website", type: "int" },
      { name: "score_listings", type: "int" },
      { name: "score_hiring", type: "int" },
      { name: "score_poor_tech", type: "int" },
      { name: "score_reviews", type: "int" },
      { name: "score_icp_fit", type: "int" },
      { name: "score_engagement", type: "int" },
      { name: "scoring_version", type: "text" },
      { name: "scored_at", type: "timestamptz" },
    ],
  },
  {
    name: "outreach_log",
    label: "Outreach Log",
    pk: "id",
    orderBy: { col: "sent_at", asc: false },
    listColumns: ["company_id","channel","action","subject","was_opened","was_replied","sent_at"],
    columns: [
      ID,
      { name: "company_id", type: "uuid", required: true },
      { name: "channel", type: "enum", enumValues: OUTREACH_CHANNEL, required: true },
      { name: "action", type: "text" },
      { name: "subject", type: "text" },
      { name: "message_preview", type: "textarea" },
      { name: "template_used", type: "text" },
      { name: "personalization_fields", type: "json" },
      { name: "was_opened", type: "bool" },
      { name: "was_clicked", type: "bool" },
      { name: "was_replied", type: "bool" },
      { name: "reply_sentiment", type: "enum", enumValues: ["positive","neutral","negative","not_interested"] },
      { name: "sent_via", type: "text" },
      { name: "external_id", type: "text" },
      { name: "sent_at", type: "timestamptz" },
      { name: "opened_at", type: "timestamptz" },
      { name: "replied_at", type: "timestamptz" },
      { name: "sequence_step", type: "int" },
      { name: "sequence_name", type: "text" },
    ],
  },
  {
    name: "deals",
    label: "Deals",
    pk: "id",
    orderBy: { col: "created_at", asc: false },
    listColumns: ["deal_name","company_id","service_type","deal_value","currency","deal_stage","closed_at"],
    columns: [
      ID,
      { name: "company_id", type: "uuid", required: true },
      { name: "deal_name", type: "text", required: true },
      { name: "service_type", type: "enum", enumValues: ["ai_integration","website","app_development","server_management","lead_funnel","agentic_ai"] },
      { name: "deal_value", type: "numeric" },
      { name: "currency", type: "text" },
      { name: "deal_stage", type: "enum", enumValues: ["proposal","negotiation","contract","active","completed","cancelled"] },
      { name: "started_at", type: "date" },
      { name: "closed_at", type: "date" },
      { name: "notes", type: "textarea" },
      CREATED, UPDATED,
    ],
  },
  {
    name: "finances",
    label: "Finances",
    pk: "id",
    orderBy: { col: "date", asc: false },
    listColumns: ["name","category","amount","currency","recipient","date","recurrence","is_active"],
    columns: [
      ID,
      { name: "name", type: "text", required: true },
      { name: "category", type: "enum", enumValues: EXPENSE_CATEGORY, required: true },
      { name: "description", type: "textarea" },
      { name: "amount", type: "numeric", required: true },
      { name: "currency", type: "text" },
      { name: "recipient", type: "text" },
      { name: "date", type: "date" },
      { name: "recurrence", type: "enum", enumValues: RECURRENCE },
      { name: "is_active", type: "bool" },
      CREATED, UPDATED,
    ],
  },

  // ---- Read-only views ----
  {
    name: "active_leads", label: "View • Active Leads", pk: "id", readOnly: true,
    orderBy: { col: "total_score", asc: false },
    listColumns: ["company_name","city","pipeline_stage","total_score","icp_fit_score","touchpoint_count","last_outreach_at"],
    columns: [{ name: "*", type: "text" }],
  },
  {
    name: "qualified_leads", label: "View • Qualified Leads", pk: "id", readOnly: true,
    listColumns: ["company_name","city","total_score","icp_fit_score","latest_reply_sentiment"],
    columns: [{ name: "*", type: "text" }],
  },
  {
    name: "clients", label: "View • Clients", pk: "id", readOnly: true,
    listColumns: ["company_name","city","recommended_service"],
    columns: [{ name: "*", type: "text" }],
  },
  {
    name: "pipeline_summary", label: "View • Pipeline Summary", pk: "pipeline_stage", readOnly: true,
    listColumns: ["pipeline_stage","city","company_type","company_count","avg_lead_score","enrichment_rate","reply_rate"],
    columns: [{ name: "*", type: "text" }],
  },
  {
    name: "monthly_spend", label: "View • Monthly Spend", pk: "month", readOnly: true,
    listColumns: ["month","category","currency","total_amount","expense_count"],
    columns: [{ name: "*", type: "text" }],
  },
  {
    name: "dld_developers", label: "View • DLD Developers", pk: "developer_number", readOnly: true,
    orderBy: { col: "project_count", asc: false },
    listColumns: ["developer_name","project_count","active_projects","finished_projects","total_value_aed","total_units"],
    columns: [{ name: "*", type: "text" }],
  },
];

export const TABLE_MAP: Record<string, TableDef> = Object.fromEntries(TABLES.map(t => [t.name, t]));

export function getTable(name: string): TableDef | undefined {
  return TABLE_MAP[name];
}

// Convert form input (strings) into values the Supabase client expects.
export function coerceValue(col: Column, raw: FormDataEntryValue | null): unknown {
  if (raw === null) return null;
  const s = typeof raw === "string" ? raw : String(raw);
  if (s === "" ) return null;
  switch (col.type) {
    case "int":      return parseInt(s, 10);
    case "numeric":  return parseFloat(s);
    case "bool":     return s === "true" || s === "on" || s === "1";
    case "json":     try { return JSON.parse(s); } catch { return s; }
    case "text_array":
      return s.split(",").map(v => v.trim()).filter(Boolean);
    default:         return s;
  }
}

export function formatCell(col: Column, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "✓" : "✗";
  return String(value);
}
