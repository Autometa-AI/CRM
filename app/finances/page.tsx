import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, SectionHeader, KpiTile } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDate, prettyEnum } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("finances")
    .select("*")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(500);

  const rows = data ?? [];
  const currency = String(rows[0]?.currency ?? "AED");

  const ytd = rows
    .filter(r => r.date && r.date >= yearStart && r.is_active !== false)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const mtd = rows
    .filter(r => r.date && r.date >= monthStart && r.is_active !== false)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const recurring = rows.filter(r => r.recurrence && r.recurrence !== "one_time" && r.is_active !== false);
  const recurringTotal = recurring.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const byCategory = new Map<string, number>();
  rows.filter(r => r.date && r.date >= monthStart && r.is_active !== false).forEach(r => {
    const k = String(r.category ?? "other");
    byCategory.set(k, (byCategory.get(k) ?? 0) + (Number(r.amount) || 0));
  });
  const maxCat = Math.max(1, ...Array.from(byCategory.values()));

  // Monthly breakdown (last 6 months)
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = d.toISOString().slice(0, 7);
    const total = rows
      .filter(r => r.date && r.date >= d.toISOString().slice(0, 10) && r.date < end.toISOString().slice(0, 10) && r.is_active !== false)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    months.push({ key, label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }), total });
  }
  const maxMonth = Math.max(1, ...months.map(m => m.total));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finances</h1>
          <p className="text-sm text-slate-500">Agency expense tracker — recurring and one-time.</p>
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
        <KpiTile label="This month" value={formatMoney(mtd, currency)} />
        <KpiTile label="YTD" value={formatMoney(ytd, currency)} />
        <KpiTile label="Recurring (active)" value={formatMoney(recurringTotal, currency)} hint={`${recurring.length} item${recurring.length === 1 ? "" : "s"}`} />
        <KpiTile label="Expense count" value={rows.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Last 6 months" subtitle="Total spend per month" />
          {months.every(m => m.total === 0) ? (
            <EmptyState title="No spend history" />
          ) : (
            <div className="space-y-1.5">
              {months.map(m => (
                <div key={m.key} className="flex items-center gap-3">
                  <div className="w-14 text-xs text-slate-500">{m.label}</div>
                  <div className="flex-1 h-5 rounded bg-slate-50 overflow-hidden">
                    <div
                      className="h-5 bg-gradient-to-r from-rose-400 to-rose-300"
                      style={{ width: `${(m.total / maxMonth) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-xs font-medium tabular-nums">{formatMoney(m.total, currency)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="This month by category" />
          {byCategory.size === 0 ? (
            <EmptyState title="No expenses this month" />
          ) : (
            <div className="space-y-1.5">
              {Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="w-28 text-xs"><StatusPill value={cat} /></div>
                  <div className="flex-1 h-5 rounded bg-slate-50 overflow-hidden">
                    <div
                      className="h-5 bg-gradient-to-r from-slate-700 to-slate-500"
                      style={{ width: `${(amt / maxCat) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-xs font-medium tabular-nums">{formatMoney(amt, currency)}</div>
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
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-right font-medium">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.name}</div>
                      {r.is_active === false && <div className="text-xs text-slate-400">inactive</div>}
                    </td>
                    <td className="px-4 py-2"><StatusPill value={r.category} /></td>
                    <td className="px-4 py-2 text-slate-600">{r.recipient ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{prettyEnum(r.recurrence)}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatMoney(r.amount, r.currency)}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/settings/tables/finances/${r.id}`} className="text-xs text-slate-500 hover:text-slate-900 underline">Edit</Link>
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
