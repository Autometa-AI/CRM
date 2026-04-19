"use client";

import { useEffect, useState } from "react";
import { getCompanyDecisionMakers } from "@/app/actions";

type Person = {
  name?: string;
  email?: string;
  phone?: string;
  broker_number?: string;
};

const initials = (s: string) => {
  const parts = s.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
};

const normalizePhone = (p: string | undefined) => {
  if (!p) return null;
  const trimmed = p.trim();
  if (!trimmed || trimmed === "0" || trimmed === "null") return null;
  return trimmed;
};

export function DecisionMakersPanel({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [enrichedAt, setEnrichedAt] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getCompanyDecisionMakers(companyId)
      .then((r) => {
        if (cancel) return;
        setPeople((r.decision_makers ?? []) as Person[]);
        setEnrichedAt(r.enriched_at);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [companyId]);

  const visible = showAll ? people : people.slice(0, 8);

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Decision makers</div>
          <div className="text-sm text-slate-700 mt-0.5">
            {loading ? "Loading…" : people.length > 0 ? `${people.length} brokers at this office` : "No decision makers linked yet"}
          </div>
        </div>
        {enrichedAt && (
          <div className="text-xs text-slate-400">
            Enriched {new Date(enrichedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {loading && <SkeletonList />}

      {!loading && people.length === 0 && (
        <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
          No individual brokers found for this company yet. If this is a developer-only record, this is expected.
          Otherwise the office name may not match — try the enrichment pipeline or a manual link.
        </div>
      )}

      {!loading && people.length > 0 && (
        <>
          <div className="overflow-hidden border border-slate-200 rounded-md bg-white">
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {visible.map((p, i) => (
                <PersonRow key={`${p.broker_number ?? i}-${p.email ?? ""}`} person={p} />
              ))}
            </div>
          </div>
          {people.length > 8 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 text-sm text-slate-600 hover:text-slate-900"
            >
              {showAll ? `Show fewer (collapse to 8)` : `Show all ${people.length} brokers`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: Person }) {
  const name = person.name?.trim() || "Unknown";
  const email = person.email?.trim() || null;
  const phone = normalizePhone(person.phone);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
      <div className="shrink-0 h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {person.broker_number && <span className="font-mono">#{person.broker_number}</span>}
          {email && (
            <a
              href={`mailto:${email}`}
              onClick={(e) => e.stopPropagation()}
              className="text-slate-700 hover:text-slate-900 hover:underline truncate"
            >
              {email}
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-slate-700 hover:text-slate-900"
            >
              {phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-md">
          <div className="h-8 w-8 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-2/5 bg-slate-100 rounded" />
            <div className="h-3 w-3/5 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
