/**
 * Ingest a government-registry CSV into a raw_* table.
 *
 * Usage:
 *   npx tsx scripts/ingest_raw_govt.ts --source <name> --file <path>
 *
 * Add a new source by appending an entry to SOURCES below. Each entry declares:
 *   - target table
 *   - ON CONFLICT key for idempotent upserts
 *   - a `map` function that turns one CSV row into one DB row
 *
 * Idempotent: re-running upserts on the declared conflict key.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type CsvRow = Record<string, string>;
type DbRow = Record<string, unknown>;

type SourceConfig = {
  source_name: string;
  source_url: string;
  table: string;
  onConflict: string;
  /** Optional key in the mapped row used to skip rows with no unique identifier. */
  requireKey?: string;
  map: (row: CsvRow) => DbRow;
};

const nullIfBlank = (v: string | undefined): string | null => {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const parseDate = (v: string | undefined): string | null => {
  const t = nullIfBlank(v);
  if (!t) return null;
  // DLD exports "2026-01-01 00:00:00" — keep just the date part.
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};

const parseNumber = (v: string | undefined): number | null => {
  const t = nullIfBlank(v);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const parseInteger = (v: string | undefined): number | null => {
  const n = parseNumber(v);
  return n == null ? null : Math.trunc(n);
};

const SOURCES: Record<string, SourceConfig> = {
  dld_broker_offices: {
    source_name: "dld_broker_offices",
    source_url:
      "https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers-offices/licensed-real-estate-brokers-offices-list/",
    table: "raw_govt_data",
    onConflict: "source_name,license_number",
    requireKey: "license_number",
    map: (row) => ({
      company_name: row["Name English"]?.trim() || "UNKNOWN",
      license_number: nullIfBlank(row["Office Number"]),
      license_type: "real_estate_broker_office",
      emirate: "Dubai",
      phone: nullIfBlank(row["Phone Number"]),
      email: nullIfBlank(row["Email"]),
      website: nullIfBlank(row["Website"]),
    }),
  },

  dld_brokers_individuals: {
    source_name: "dld_brokers_individuals",
    source_url:
      "https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/licensed-real-estate-brokers-list/",
    table: "raw_govt_people_data",
    onConflict: "source_name,broker_number",
    requireKey: "broker_number",
    map: (row) => ({
      full_name: row["Name English"]?.trim() || "UNKNOWN",
      broker_number: nullIfBlank(row["Broker Number"]),
      office_name: nullIfBlank(row["Office Name English"]),
      emirate: "Dubai",
      phone: nullIfBlank(row["Phone Number"]),
      email: nullIfBlank(row["Email"]),
    }),
  },

  dld_projects: {
    source_name: "dld_projects",
    source_url: "https://dubailand.gov.ae/en/open-data/real-estate-data/",
    table: "raw_govt_projects_data",
    onConflict: "source_name,project_number",
    requireKey: "project_number",
    map: (row) => ({
      project_number: nullIfBlank(row["PROJECT_NUMBER"]),
      project_name: row["PROJECT_EN"]?.trim() || "UNKNOWN",
      developer_number: nullIfBlank(row["DEVELOPER_NUMBER"]),
      developer_name: nullIfBlank(row["DEVELOPER_EN"]),
      project_type: nullIfBlank(row["PRJ_TYPE_EN"]),
      project_status: nullIfBlank(row["PROJECT_STATUS"]),
      project_value: parseNumber(row["PROJECT_VALUE"]),
      percent_completed: parseNumber(row["PERCENT_COMPLETED"]),
      escrow_account_number: nullIfBlank(row["ESCROW_ACCOUNT_NUMBER"]),
      start_date: parseDate(row["START_DATE"]),
      end_date: parseDate(row["END_DATE"]),
      adoption_date: parseDate(row["ADOPTION_DATE"]),
      inspection_date: parseDate(row["INSPECTION_DATE"]),
      completion_date: parseDate(row["COMPLETION_DATE"]),
      description: nullIfBlank(row["DESCRIPTION_EN"]),
      area: nullIfBlank(row["AREA_EN"]),
      zone: nullIfBlank(row["ZONE_EN"]),
      master_project: nullIfBlank(row["MASTER_PROJECT_EN"]),
      cnt_land: parseInteger(row["CNT_LAND"]),
      cnt_building: parseInteger(row["CNT_BUILDING"]),
      cnt_villa: parseInteger(row["CNT_VILLA"]),
      cnt_unit: parseInteger(row["CNT_UNIT"]),
      emirate: "Dubai",
    }),
  },
};

function parseArgs(): { source: string; file: string } {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) out[a.slice(2)] = args[i + 1] ?? "";
  }
  if (!out.source || !out.file) {
    console.error("Usage: ingest_raw_govt.ts --source <name> --file <path>");
    process.exit(1);
  }
  return { source: out.source, file: out.file };
}

async function main() {
  const { source, file } = parseArgs();
  const cfg = SOURCES[source];
  if (!cfg) {
    console.error(`Unknown source "${source}". Known: ${Object.keys(SOURCES).join(", ")}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const text = readFileSync(resolve(file), "utf-8");
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });
  if (parsed.errors.length > 0) {
    const sample = parsed.errors.slice(0, 3).map((e) => `L${e.row}: ${e.message}`).join("; ");
    console.warn(`  ${parsed.errors.length} parser warning(s). Sample: ${sample}`);
  }
  const records = parsed.data;
  console.log(`Parsed ${records.length} rows from ${file}`);

  const rows: DbRow[] = records.map((r) => ({
    ...cfg.map(r),
    source_name: cfg.source_name,
    source_url: cfg.source_url,
    raw_payload: r,
  }));

  const keep = cfg.requireKey
    ? rows.filter((r) => r[cfg.requireKey!] != null && r[cfg.requireKey!] !== "")
    : rows;
  const skipped = rows.length - keep.length;

  const BATCH = 500;
  let upserted = 0;
  for (let i = 0; i < keep.length; i += BATCH) {
    const chunk = keep.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from(cfg.table)
      .upsert(chunk, { onConflict: cfg.onConflict, count: "exact" });
    if (error) {
      console.error(`Batch starting at ${i} failed:`, error.message);
      process.exit(1);
    }
    upserted += count ?? chunk.length;
    console.log(`  upserted ${Math.min(i + BATCH, keep.length)}/${keep.length}`);
  }

  console.log(`Done. Table: ${cfg.table}. Upserted: ${upserted}. Skipped (missing ${cfg.requireKey ?? "key"}): ${skipped}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
