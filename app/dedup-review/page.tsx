import { unstable_noStore as noStore } from "next/cache";
import { supabase } from "@/lib/supabase";
import { Card, KpiTile } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewItem, type ReviewRow } from "@/components/dedup/ReviewItem";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DedupReviewPage() {
  noStore();

  const [pendingRes, resolvedRes] = await Promise.all([
    supabase.from("dedup_review_expanded").select("*").eq("status", "pending"),
    supabase
      .from("dedup_review_queue")
      .select("status", { count: "exact", head: true })
      .in("status", ["merge", "reject"]),
  ]);

  const pending = (pendingRes.data ?? []) as ReviewRow[];
  const resolved = resolvedRes.count ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Dedup review</h1>
        <p className="text-sm text-slate-500">
          Ambiguous fuzzy matches that need a human call — merge if they&apos;re the same company,
          keep separate if they aren&apos;t. Exact matches were already merged automatically.
        </p>
      </div>

      {pendingRes.error && (
        <Card className="border-red-200 bg-red-50 text-red-700 text-sm">{pendingRes.error.message}</Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiTile label="Pending" value={pending.length} tone={pending.length > 0 ? "warning" : "default"} />
        <KpiTile label="Already reviewed" value={resolved} />
        <KpiTile
          label="Queue source"
          value="DLD dedup pipeline"
          hint="Populated during phase 2"
        />
      </div>

      {pending.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing to review"
            description="No ambiguous matches waiting. New candidates appear here each time you re-run the dedup pipeline after ingesting more data."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => (
            <ReviewItem key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
