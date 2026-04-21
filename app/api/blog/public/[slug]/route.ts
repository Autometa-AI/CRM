import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/blog/public/:slug
 *
 * Returns a single published blog post, including body HTML,
 * for the marketing site to render a full post page.
 *
 * Public (no token). Returns 404 for drafts, pending, or archived posts.
 */

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const { data, error } = await supabase
    .from("blog_posts_public")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    { post: data },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
      },
    }
  );
}
