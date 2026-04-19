import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, SectionHeader, KpiTile } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageRefresher } from "@/components/util/PageRefresher";
import { formatINR, formatDate, prettyEnum } from "@/lib/format";
import { convertSum, getRatesFromAED } from "@/lib/currency";

export const dynamic = "force-dynamic";

type FinanceRow = {
  id: string;
  name: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  recipient: string | null;
  recurrence: string | null;
  date: string | null;
  is_active: boolean | null;
};

export default async function FinancesPage() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("finances")
    .select("*")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(500);

  const rows = (data ?? []) as FinanceRow[];

  // Pre-fetch rates once (Next caches for 5 min) so the many convertSum calls
  // below are cheap.
  await getRatesFromAED();
  const sumINR = (items: FinanceRow[]) =>
    convertSum(
      items.map((r) => ({ amount: r.amount, currency: r.currency })),
      "INR",
    );

  const active = rows.filter((r) => r.is_active !== false);
  const ytd = await sumINR(active.filter((r) => r.date && r.date >= yearStart));
  const mtd = await sumINR(active.filter((r) => r.date && r.date >= monthStart));
  const recurring = active.filter((r) => r.recurrence && r.recurrence !== "one_time");
  const recurringTotal = await sumINR(recurring);

  // Category breakdown (this month, in INR)
  const catGroups = new Map<string, FinanceRow[]>();
  active.filter((r) => r.date && r.date >= monthStart).forEach((r) => {
    const k = String(r.category ?? "other");
    if (!catGroups.has(k)) catGroups.set(k, []);
    catGroups.get(k)!.push(r);
  });
  const byCategory = new Map<string, number>();
  for (const [k, items] of catGroups) byCategory.set(k, await sumINR(items));
  const maxCat = Math.max(1, ...Array.from(byCategory.values()));

  // Monthly breakdown — last 6 months in INR
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const startIso = d.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);
    const total = await sumINR(
      active.filter((r) => r.date && r.date >= startIso && r.date < endIso),
    );
    months.push({ key: startIso.slice(0, 7), label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), total });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.total));

  // Per-row INR amount for the "All expenses" table
  const rowInrs = await Promise.all(
    rows.map(async (r) => (await convertSum([{ amount: r.amount, currency: r.currency }], "INR")) as number),
  );

  return (
    <div className="space-y-5">
      <PageRefresher intervalMs={20_000} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finances</h1>
          <p className="text-sm text-slate-500">Agency expense tracker — all amounts converted to INR (live rate).</p>
        </div>
        <Link
          href="/settings/tables/finances/new"
          className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
        >
          + New expense
        </Link>
      </div>

      {error && <Card className="border-red-200 bg-red-50 text-red-700 text-sm">{error.message}</Card>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="This month" value={formatINR(mtd)} />
        <KpiTile label="YTD" value={formatINR(ytd)} />
        <KpiTile label="Recurring (active)" value={formatINR(recurringTotal)} hint={`${recurring.length} item${recurring.length === 1 ? "" : "s"}`} />
        <KpiTile label="Expense count" value={rows.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Last 6 months" subtitle="Total spend per month (INR)" />
          {months.every((m) => m.total === 0) ? (
            <EmptyState title="No spend history" />
          ) : (
            <div className="space-y-1.5">
              {months.map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <div className="w-14 text-xs text-slate-500">{m.label}</div>
                  <div className="flex-1 h-5 rounded bg-slate-50 overflow-hidden">
                    <div
                      className="h-5 bg-gradient-to-r from-rose-400 to-rose-300"
                      style={{ width: `${(m.total / maxMonth) * 100}%` }}
                    />
                  </div>
                  <div className="w-28 text-right text-xs font-medium tabular-nums">{formatINR(m.total)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="This month by category" subtitle="INR" />
          {byCategory.size === 0 ? (
            <EmptyState title="No expenses this month" />
          ) : (
            <div className="space-y-1.5">
              {Array.from(byCategory.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-28 text-xs">
                      <StatusPill value={cat} />
                    </div>
                    <div className="flex-1 h-5 rounded bg-slate-50 overflow-hidden">
                      <div
                        className="h-5 bg-gradient-to-r from-slate-700 to-slate-500"
                        style={{ width: `${(amt / maxCat) * 100}%` }}
                      />
                    </div>
                    <div className="w-28 text-right text-xs font-medium tabular-nums">{formatINR(amt)}</div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      <Card padding="p-0">
        <SectionHeader title="All expenses" subtitle={`${rows.length} row${rows.length === 1 ? "" : "s"}`} />
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-left font-medium">Recipient</th>
                  <th className="px-4 py-2 text-left font-medium">Recurrence</th>
                  <th className="px-4 py-2 text-right font-medium">Amount (INR)</th>
                  <th className="px-4 py-2 text-right font-medium">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.name}</div>
                      {r.is_active === false && <div className="text-xs text-slate-400">inactive</div>}
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill value={r.category ?? ""} />
                    </td>
                    <td className="px-4 py-2 text-slate-600">{r.recipient ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{prettyEnum(r.recurrence)}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums" title={`${r.currency ?? "AED"} ${r.amount ?? 0}`}>
                      {formatINR(rowInrs[i])}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/settings/tables/finances/${r.id}`} className="text-xs text-slate-500 hover:text-slate-900 underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No expenses" description="Add your first expense to start tracking." ctaLabel="Add expense" ctaHref="/settings/tables/finances/new" />
        )}
      </Card>
    </div>
  );
}
