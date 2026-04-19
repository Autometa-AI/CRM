import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, SectionHeader, KpiTile } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney, formatDate, prettyEnum } from "@/lib/format";
import { updateDealStage, createDeal } from "@/app/actions";

export const dynamic = "force-dynamic";

const STAGES = ["proposal", "negotiation", "contract", "active", "completed", "cancelled"] as const;
const SERVICES = ["ai_integration", "website", "app_development", "server_management", "lead_funnel", "agentic_ai"];

export default async function DealsPage() {
  const [deals, companies] = await Promise.all([
    supabase.from("deals").select("*").order("created_at", { ascending: false, nullsFirst: false }).limit(500),
    supabase.from("master_companies").select("id,company_name").eq("is_archived", false).order("company_name").limit(500),
  ]);

  const companyMap = new Map((companies.data ?? []).map(c => [c.id, c.company_name]));
  const byStage = new Map<string, typeof deals.data>();
  STAGES.forEach(s => byStage.set(s, []));
  (deals.data ?? []).forEach(d => {
    const s = String(d.deal_stage ?? "proposal");
    if (!byStage.has(s)) byStage.set(s, []);
    byStage.get(s)!.push(d);
  });

  const totalValue = (deals.data ?? []).reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const wonValue = (deals.data ?? [])
    .filter(d => d.deal_stage === "completed" || d.deal_stage === "active")
    .reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const openValue = totalValue - wonValue;
  const defaultCurrency = String((deals.data ?? [])[0]?.currency ?? "AED");

  async function doUpdateStage(form: FormData) {
    "use server";
    await updateDealStage(String(form.get("id")), String(form.get("stage")));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Deals</h1>
        <p className="text-sm text-slate-500">{deals.data?.length ?? 0} deals across {STAGES.length} stages</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Pipeline value" value={formatMoney(totalValue, defaultCurrency)} />
        <KpiTile label="Won / active" value={formatMoney(wonValue, defaultCurrency)} tone="positive" />
        <KpiTile label="Open" value={formatMoney(openValue, defaultCurrency)} />
        <KpiTile label="Deal count" value={deals.data?.length ?? 0} />
      </div>

      <Card>
        <SectionHeader title="New deal" subtitle="Log an opportunity with a prospect. Stage moves it through your sales pipeline — proposal → negotiation → contract → active → completed (won)." />
        <form action={createDeal} className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
          <select name="company_id" required className="rounded border border-slate-300 px-2 py-1.5 md:col-span-2">
            <option value="">Prospect company *</option>
            {(companies.data ?? []).map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <input name="deal_name" required placeholder="Deal name *" className="rounded border border-slate-300 px-2 py-1.5 md:col-span-2" />
          <select name="service_type" className="rounded border border-slate-300 px-2 py-1.5">
            <option value="">Service</option>
            {SERVICES.map(s => <option key={s} value={s}>{prettyEnum(s)}</option>)}
          </select>
          <input name="deal_value" type="number" step="any" placeholder="Value" className="rounded border border-slate-300 px-2 py-1.5" />
          <select name="currency" defaultValue="AED" className="rounded border border-slate-300 px-2 py-1.5">
            <option value="AED">AED</option>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
          <select name="deal_stage" defaultValue="proposal" className="rounded border border-slate-300 px-2 py-1.5">
            {STAGES.map(s => <option key={s} value={s}>{prettyEnum(s)}</option>)}
          </select>
          <textarea name="notes" placeholder="Notes" rows={1} className="rounded border border-slate-300 px-2 py-1.5 md:col-span-3" />
          <button type="submit" className="rounded bg-slate-900 text-white px-3 py-1.5 md:col-span-1">Create deal</button>
        </form>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const rows = byStage.get(stage) ?? [];
          const subtotal = rows.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
          const stageCurrency = String(rows[0]?.currency ?? defaultCurrency);
          return (
            <div key={stage} className="shrink-0 w-72 bg-slate-100 rounded-lg p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <StatusPill value={stage} kind="deal" />
                <span className="text-xs text-slate-500 font-medium tabular-nums">
                  {rows.length} · {formatMoney(subtotal, stageCurrency)}
                </span>
              </div>
              <div className="space-y-2 mt-2">
                {rows.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">Empty</div>
                ) : (
                  rows.map(d => (
                    <div key={d.id} className="bg-white rounded-md border border-slate-200 p-2.5">
                      <Link href={`/leads/${d.company_id}`} className="text-xs text-slate-500 hover:underline">
                        {companyMap.get(d.company_id) ?? "Unknown company"}
                      </Link>
                      <div className="font-medium text-sm text-slate-900 mt-0.5 line-clamp-1">{d.deal_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{prettyEnum(d.service_type)}</div>
                      <div className="text-sm font-semibold text-slate-900 mt-1 tabular-nums">
                        {formatMoney(d.deal_value, d.currency)}
                      </div>
                      {d.closed_at && (
                        <div className="text-xs text-slate-400 mt-0.5">Closed {formatDate(d.closed_at)}</div>
                      )}
                      <form action={doUpdateStage} className="mt-2 flex items-center gap-1">
                        <input type="hidden" name="id" value={d.id} />
                        <select
                          name="stage"
                          defaultValue={stage}
                          className="flex-1 rounded border border-slate-200 text-xs px-1.5 py-1"
                        >
                          {STAGES.map(s => <option key={s} value={s}>{prettyEnum(s)}</option>)}
                        </select>
                        <button type="submit" className="rounded bg-slate-900 text-white px-2 py-1 text-xs">Move</button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(!deals.data || deals.data.length === 0) && (
        <Card>
          <EmptyState
            title="No deals yet"
            description="Create your first deal using the form above."
          />
        </Card>
      )}
    </div>
  );
}
