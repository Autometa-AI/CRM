import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  corsHeaders,
  preflight,
  assertIngestToken,
} from "@/lib/ingest";

/**
 * POST /api/blog/drafts
 *
 * Accept a blog draft from an AI agent (Claude Code routine, etc.).
 * The row lands with status='pending_review' — a human approves or
 * rejects in the CRM before it goes live.
 *
 * Headers:
 *   x-ingest-token: <INGEST_TOKEN>
 *
 * Required body:
 *   slug, title, excerpt, category, body_html
 *
 * Optional:
 *   lede, subtitle, tags[], cover_image_url, read_minutes,
 *   author_name, author_role, seo_title, seo_description,
 *   source_model (e.g. 'claude-opus-4-7'), created_by (e.g. 'ai:routine-name')
 *
 * Responses:
 *   201 — { ok: true, id, slug, review_url }
 *   400 — missing required fields
 *   401 — bad token
 *   409 — slug already exists
 */

export const runtime = "nodejs";

const ALLOWED_CATEGORIES = new Set(["core", "ai", "custom", "ops"]);

export async function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}

export async function POST(req: Request) {
  const authErr = assertIngestToken(req);
  if (authErr) return authErr;

  const cors = corsHeaders(req.headers.get("origin"));

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: cors });
  }

  // ---- Required fields ----
  const slug = str(body.slug);
  const title = str(body.title);
  const excerpt = str(body.excerpt);
  const category = str(body.category);
  const body_html = str(body.body_html);

  const missing: string[] = [];
  if (!slug) missing.push("slug");
  if (!title) missing.push("title");
  if (!excerpt) missing.push("excerpt");
  if (!category) missing.push("category");
  if (!body_html) missing.push("body_html");
  if (missing.length) {
    return NextResponse.json(
      { error: "missing_fields", fields: missing },
      { status: 400, headers: cors }
    );
  }

  if (!slugValid(slug!)) {
    return NextResponse.json(
      { error: "invalid_slug", message: "lowercase letters, digits and hyphens only" },
      { status: 400, headers: cors }
    );
  }
  if (!ALLOWED_CATEGORIES.has(category!)) {
    return NextResponse.json(
      { error: "invalid_category", allowed: Array.from(ALLOWED_CATEGORIES) },
      { status: 400, headers: cors }
    );
  }

  // ---- Build row ----
  const row = {
    slug: slug!,
    status: "pending_review" as const,
    source: "ai_agent" as const,
    source_model: str(body.source_model),
    title: title!,
    subtitle: str(body.subtitle),
    lede: str(body.lede),
    excerpt: excerpt!,
    category: category!,
    tags: Array.isArray(body.tags) ? body.tags.filter(t => typeof t === "string") : [],
    cover_image_url: str(body.cover_image_url),
    read_minutes: typeof body.read_minutes === "number" ? body.read_minutes : null,
    author_name: str(body.author_name) ?? "Autometa AI (AI draft)",
    author_role: str(body.author_role),
    author_avatar_url: str(body.author_avatar_url),
    body_html: body_html!,
    seo_title: str(body.seo_title),
    seo_description: str(body.seo_description) ?? excerpt,
    created_by: str(body.created_by) ?? "ai:unknown",
    raw_payload: body,
  };

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(row)
    .select("id,slug")
    .single();

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json(
        { error: "slug_taken", slug: row.slug },
        { status: 409, headers: cors }
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: cors }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      id: data.id,
      slug: data.slug,
      status: "pending_review",
      review_url: `https://crm.autometa-ai.com/blog/${data.id}`,
    },
    { status: 201, headers: cors }
  );
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function slugValid(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s) && !s.includes("--");
}
