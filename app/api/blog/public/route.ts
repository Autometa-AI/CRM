import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/blog/public
 *
 * Returns all published blog posts, newest first.
 * Used by the marketing site's /blog listing page.
 *
 * This endpoint is public (no token required) — it only returns rows
 * from the `blog_posts_public` view, which filters to status='published'.
 * Body HTML is omitted from the list response (use /api/blog/public/:slug
 * to get the full content).
 *
 * Optional query params:
 *   ?category=core|ai|custom|ops
 *   ?limit=20  (default 50, max 100)
 */

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
    100
  );

  let q = supabase
    .from("blog_posts_public")
    .select(
      "id,slug,title,lede,excerpt,category,tags,cover_image_url," +
        "author_name,author_avatar_url,author_role,read_minutes,published_at"
    )
    .order("published_at", { ascending: false })
    .limit(limit);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { posts: data ?? [] },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
      },
    }
  );
}
