"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeReview, rejectReview } from "@/app/dedup-review/actions";

export type ReviewRow = {
  id: string;
  similarity: number | string | null;
  source_name_value: string | null;
  candidate_name_value: string | null;
  source_master_name: string | null;
  source_master_type: string | null;
  source_project_count: number | null;
  source_dev_number: string | null;
  candidate_name: string | null;
  candidate_type: string | null;
  candidate_city: string | null;
  candidate_sources_matched: number | null;
};

export function ReviewItem({ row }: { row: ReviewRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: (id: string) => Promise<void>) => {
    if (pending) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await fn(row.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const sim = typeof row.similarity === "string" ? parseFloat(row.similarity) : row.similarity ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">
            Similarity {(sim * 100).toFixed(0)}%
          </span>
          {row.source_dev_number && (
            <span className="text-xs text-slate-500 font-mono">Dev #{row.source_dev_number}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <Side
          label="Incoming (developer)"
          name={row.source_name_value || row.source_master_name || "—"}
          type={row.source_master_type ?? "—"}
          extra={row.source_project_count != null ? `${row.source_project_count} project${row.source_project_count === 1 ? "" : "s"}` : null}
        />
        <div className="flex items-center justify-center">
          <div className="text-slate-400 text-2xl">⇄</div>
        </div>
        <Side
          label="Existing master"
          name={row.candidate_name ?? row.candidate_name_value ?? "—"}
          type={row.candidate_type ?? "—"}
          extra={row.candidate_sources_matched != null ? `${row.candidate_sources_matched} source${row.candidate_sources_matched === 1 ? "" : "s"}` : null}
          secondaryLine={row.candidate_city ? `${row.candidate_city}` : null}
        />
      </div>

      {error && (
        <div className="mt-3 rounded bg-red-50 border border-red-200 text-red-700 p-2 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          disabled={pending}
          onClick={() => run(rejectReview)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Keep separate (reject)
        </button>
        <button
          disabled={pending}
          onClick={() => run(mergeReview)}
          className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Merging…" : "Merge into existing"}
        </button>
      </div>
    </div>
  );
}

function Side({
  label,
  name,
  type,
  extra,
  secondaryLine,
}: {
  label: string;
  name: string;
  type: string;
  extra?: string | null;
  secondaryLine?: string | null;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-900 break-words">{name}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5">{type.replace(/_/g, " ")}</span>
        {extra && <span>{extra}</span>}
      </div>
      {secondaryLine && <div className="text-xs text-slate-400 mt-1">{secondaryLine}</div>}
    </div>
  );
}
