"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

async function fetchReview(reviewId: string) {
  const { data, error } = await supabase
    .from("dedup_review_expanded")
    .select("id, status, candidate_master_id, source_master_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Review not found");
  if (data.status !== "pending") throw new Error("Review already resolved");
  return data;
}

export async function mergeReview(reviewId: string) {
  const r = await fetchReview(reviewId);
  if (!r.candidate_master_id || !r.source_master_id) {
    throw new Error("Missing candidate or source master");
  }

  const { error: rpcErr } = await supabase.rpc("merge_master_companies", {
    cand_id: r.candidate_master_id,
    src_id: r.source_master_id,
  });
  if (rpcErr) throw new Error(rpcErr.message);

  const { error: updErr } = await supabase
    .from("dedup_review_queue")
    .update({ status: "merge", reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
    .eq("id", reviewId);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/dedup-review");
  revalidatePath("/settings/tables/master_companies");
  revalidatePath("/settings/tables");
}

export async function rejectReview(reviewId: string) {
  await fetchReview(reviewId);
  const { error } = await supabase
    .from("dedup_review_queue")
    .update({ status: "reject", reviewed_at: new Date().toISOString(), reviewed_by: "admin" })
    .eq("id", reviewId);
  if (error) throw new Error(error.message);
  revalidatePath("/dedup-review");
}
