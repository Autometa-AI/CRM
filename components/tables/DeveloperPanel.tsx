"use client";

import { useEffect, useState } from "react";
import { getDeveloperDetail } from "@/app/actions";

type ProjectRow = {
  id: string;
  project_name: string;
  project_status?: string | null;
  project_value?: number | string | null;
  percent_completed?: number | string | null;
  area?: string | null;
  cnt_unit?: number | null;
};

type DeveloperStats = {
  developer_number?: string;
  developer_name?: string;
  project_count?: number;
  active_projects?: number;
  finished_projects?: number;
  total_value_aed?: number | string;
  total_units?: number;
  areas?: string[] | null;
};

const AED = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

/**
 * Shown inside the project-detail modal. Fetches the developer's aggregate stats
 * from dld_developers plus the list of their other projects, and lets the user
 * jump to any sibling project.
 */
export function DeveloperPanel({
  developerNumber,
  developerName,
  excludeProjectId,
  onSelectProject,
}: {
  developerNumber: string;
  developerName?: string | null;
  excludeProjectId?: string;
  onSelectProject: (projectId: string) => void;
}) {
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    getDeveloperDetail(developerNumber, excludeProjectId)
      .then((res) => {
        if (cancel) return;
        setStats((res.stats ?? null) as DeveloperStats | null);
        setProjects((res.projects ?? []) as unknown as ProjectRow[]);
      })
      .catch((e) => {
        if (!cancel) setError(e instanceof Error ? e.message : "Failed to load developer");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [developerNumber, excludeProjectId]);

  const displayName = stats?.developer_name || developerName || "—";

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Developer</div>
          <div className="text-lg font-semibold text-slate-900 mt-0.5">{displayName}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">#{developerNumber}</div>
        </div>
      </div>

      {loading && <SkeletonPanel />}
      {error && <div className="rounded bg-red-50 border border-red-200 text-red-700 p-2.5 text-sm">{error}</div>}

      {!loading && !error && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <Stat label="Total projects" value={stats.project_count ?? 0} />
          <Stat label="Active" value={stats.active_projects ?? 0} />
          <Stat label="Units built" value={(stats.total_units ?? 0).toLocaleString()} />
          <Stat label="Total value" value={`AED ${AED.format(Number(stats.total_value_aed ?? 0))}`} />
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">
            Other projects by this developer ({projects.length})
          </div>
          <div className="overflow-auto border border-slate-200 rounded-md bg-white max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-2.5 py-1.5 text-left font-medium text-slate-600">Project</th>
                  <th className="px-2.5 py-1.5 text-left font-medium text-slate-600">Status</th>
                  <th className="px-2.5 py-1.5 text-right font-medium text-slate-600">Value</th>
                  <th className="px-2.5 py-1.5 text-right font-medium text-slate-600">%</th>
                  <th className="px-2.5 py-1.5 text-right font-medium text-slate-600">Units</th>
                  <th className="px-2.5 py-1.5 text-left font-medium text-slate-600">Area</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProject(String(p.id))}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-2.5 py-1.5 font-medium text-slate-900">{p.project_name}</td>
                    <td className="px-2.5 py-1.5">
                      <StatusBadge status={p.project_status} />
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-700">
                      {p.project_value ? AED.format(Number(p.project_value)) : "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-700">
                      {p.percent_completed != null ? `${Number(p.percent_completed)}%` : "—"}
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-700">
                      {p.cnt_unit ?? 0}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-500 truncate max-w-[140px]">{p.area || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && projects.length === 0 && stats && (
        <div className="text-sm text-slate-500">No other projects by this developer.</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-base font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : status === "FINISHED"
      ? "bg-sky-100 text-sky-700"
      : status === "PENDING"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {status.toLowerCase()}
    </span>
  );
}

function SkeletonPanel() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-md bg-slate-100" />
        ))}
      </div>
      <div className="h-48 rounded-md bg-slate-100" />
    </div>
  );
}
