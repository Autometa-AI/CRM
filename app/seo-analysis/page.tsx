import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { Card, KpiTile } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  runHogQL,
  getExperimentSummary,
  PostHogConfigError,
} from "@/lib/posthog";

export const dynamic = "force-dynamic";
export const revalidate = 60; // cache PostHog responses for 60s at most

const POSTHOG_PROJECT_URL = "https://us.posthog.com/project/397069";
const HERO_EXPERIMENT_ID = 368421;
const HERO_FLAG_KEY = "hero-experiment";

type Row = Record<string, unknown>;

/**
 * Run a HogQL query, but never throw — return null and let the card render
 * a "—" so a single failed query doesn't take the whole page down.
 */
async function safeQuery<T = Row>(hogql: string): Promise<T[] | null> {
  try {
    return (await runHogQL(hogql)) as T[];
  } catch (e) {
    console.error("[seo-analysis] HogQL query failed:", e);
    return null;
  }
}

const fmtInt = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("en-US") : "—";
const fmtPct = (v: unknown, digits = 1) =>
  typeof v === "number" ? `${v.toFixed(digits)}%` : "—";
const fmtMs = (v: unknown) =>
  typeof v === "number"
    ? v >= 1000
      ? `${(v / 1000).toFixed(2)}s`
      : `${Math.round(v)}ms`
    : "—";
const fmtFloat = (v: unknown, digits = 2) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

function vitalsTone(metric: "LCP" | "CLS" | "INP", v: unknown) {
  if (typeof v !== "number") return "default" as const;
  if (metric === "LCP") return v < 2500 ? "positive" : v < 4000 ? "warning" : "danger";
  if (metric === "CLS") return v < 0.1 ? "positive" : v < 0.25 ? "warning" : "danger";
  return v < 200 ? "positive" : v < 500 ? "warning" : "danger";
}

export default async function SeoAnalysisPage() {
  noStore();

  // Fail fast if env vars aren't set yet — show a friendly setup screen
  // instead of an opaque "PostHog query failed" message.
  if (!process.env.POSTHOG_PROJECT_ID || !process.env.POSTHOG_PERSONAL_API_KEY) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">SEO Analysis</h1>
          <p className="text-sm text-slate-500">
            Live marketing performance from autometa-ai.com.
          </p>
        </div>
        <Card>
          <EmptyState
            title="PostHog not configured yet"
            description="Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY in this project's Vercel environment variables, then redeploy."
          />
        </Card>
      </div>
    );
  }

  // All queries run in parallel — fastest first paint.
  const [
    visits7d,
    ctaClicks7d,
    surveysCount,
    topPages,
    abByVariant,
    vitals,
    experiment,
  ] = await Promise.all([
    safeQuery<{ visits: number }>(
      `SELECT count(DISTINCT distinct_id) AS visits
       FROM events
       WHERE event = '$pageview'
         AND timestamp > now() - INTERVAL 7 DAY`
    ),
    safeQuery<{ clicks: number }>(
      `SELECT count() AS clicks
       FROM events
       WHERE event = 'book_audit_clicked'
         AND timestamp > now() - INTERVAL 7 DAY`
    ),
    safeQuery<{ responses: number }>(
      `SELECT count() AS responses
       FROM events
       WHERE event = 'survey sent'
         AND timestamp > now() - INTERVAL 7 DAY`
    ),
    safeQuery<{ page: string; visits: number }>(
      `SELECT properties.$pathname AS page, count(DISTINCT distinct_id) AS visits
       FROM events
       WHERE event = '$pageview'
         AND timestamp > now() - INTERVAL 7 DAY
         AND properties.$pathname IS NOT NULL
       GROUP BY page
       ORDER BY visits DESC
       LIMIT 5`
    ),
    safeQuery<{ variant: string; visitors: number; clickers: number }>(
      `SELECT
         properties.hero_experiment_variant AS variant,
         count(DISTINCT distinct_id) AS visitors,
         count(DISTINCT if(event = 'book_audit_clicked', distinct_id, NULL)) AS clickers
       FROM events
       WHERE timestamp > now() - INTERVAL 14 DAY
         AND properties.hero_experiment_variant IS NOT NULL
       GROUP BY variant
       ORDER BY variant`
    ),
    safeQuery<{ avg_lcp: number; avg_cls: number; avg_inp: number }>(
      `SELECT
         avg(properties.$web_vitals_LCP_value) AS avg_lcp,
         avg(properties.$web_vitals_CLS_value) AS avg_cls,
         avg(properties.$web_vitals_INP_value) AS avg_inp
       FROM events
       WHERE event = '$web_vitals'
         AND timestamp > now() - INTERVAL 7 DAY`
    ),
    getExperimentSummary(HERO_EXPERIMENT_ID),
  ]);

  const visits = visits7d?.[0]?.visits;
  const clicks = ctaClicks7d?.[0]?.clicks;
  const surveys = surveysCount?.[0]?.responses;
  const conversion =
    typeof visits === "number" && typeof clicks === "number" && visits > 0
      ? (clicks / visits) * 100
      : undefined;

  const v = vitals?.[0];

  const control = abByVariant?.find((r) => r.variant === "control");
  const test = abByVariant?.find((r) => r.variant === "test");
  const controlRate =
    control && control.visitors > 0
      ? (control.clickers / control.visitors) * 100
      : undefined;
  const testRate =
    test && test.visitors > 0 ? (test.clickers / test.visitors) * 100 : undefined;
  const lift =
    typeof controlRate === "number" &&
    typeof testRate === "number" &&
    controlRate > 0
      ? ((testRate - controlRate) / controlRate) * 100
      : undefined;

  const expRunningDays =
    experiment?.start_date
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(experiment.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">SEO Analysis</h1>
          <p className="text-sm text-slate-500">
            Live marketing performance from autometa-ai.com — last 7 days.
            <span className="text-slate-400"> Powered by PostHog · cached 60s.</span>
          </p>
        </div>
        <Link
          href={`${POSTHOG_PROJECT_URL}/web`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand hover:underline whitespace-nowrap mt-1"
        >
          Open PostHog ↗
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Visitors (7d)" value={fmtInt(visits)} hint="Unique distinct IDs" />
        <KpiTile label="CTA clicks (7d)" value={fmtInt(clicks)} hint="book_audit_clicked" />
        <KpiTile
          label="Conversion rate"
          value={fmtPct(conversion)}
          tone={typeof conversion === "number" && conversion >= 10 ? "positive" : "default"}
          hint="CTA clicks ÷ visitors"
        />
        <KpiTile
          label="Survey responses"
          value={fmtInt(surveys)}
          hint="Last 7 days"
        />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold">Hero A/B experiment</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {experiment?.name ?? "Hero — Partner vs Outcome framing"}
              {expRunningDays !== null && (
                <span> · running {expRunningDays} day{expRunningDays === 1 ? "" : "s"}</span>
              )}
              {experiment && !experiment.start_date && <span> · DRAFT (not launched)</span>}
            </p>
          </div>
          <Link
            href={`${POSTHOG_PROJECT_URL}/experiments/${HERO_EXPERIMENT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand hover:underline whitespace-nowrap"
          >
            Open experiment ↗
          </Link>
        </div>

        {!control && !test ? (
          <EmptyState
            title="No data yet"
            description={`Waiting for visitors. The flag "${HERO_FLAG_KEY}" assigns variants on first visit; results show up here within minutes of the first traffic.`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-500">Control</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {fmtPct(controlRate)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {fmtInt(control?.clickers)} clicks · {fmtInt(control?.visitors)} visitors
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-500">Test</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {fmtPct(testRate)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {fmtInt(test?.clickers)} clicks · {fmtInt(test?.visitors)} visitors
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-500">Lift (test vs control)</div>
              <div
                className={`text-2xl font-semibold tabular-nums mt-1 ${
                  typeof lift === "number"
                    ? lift > 0
                      ? "text-emerald-700"
                      : lift < 0
                      ? "text-rose-700"
                      : ""
                    : ""
                }`}
              >
                {typeof lift === "number" ? `${lift > 0 ? "+" : ""}${lift.toFixed(1)}%` : "—"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Significance shown in PostHog →
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-semibold mb-3">Top pages (7d)</h2>
          {!topPages || topPages.length === 0 ? (
            <EmptyState title="No pageviews yet" />
          ) : (
            <ol className="space-y-1.5">
              {topPages.map((p) => (
                <li
                  key={p.page}
                  className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5 last:border-b-0"
                >
                  <span className="font-mono text-slate-700 truncate">{p.page || "/"}</span>
                  <span className="tabular-nums text-slate-500">{fmtInt(p.visits)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold mb-3">Core Web Vitals (avg, 7d)</h2>
          <div className="grid grid-cols-3 gap-3">
            <KpiTile label="LCP" value={fmtMs(v?.avg_lcp)} tone={vitalsTone("LCP", v?.avg_lcp)} hint="< 2.5s = good" />
            <KpiTile label="CLS" value={fmtFloat(v?.avg_cls, 3)} tone={vitalsTone("CLS", v?.avg_cls)} hint="< 0.1 = good" />
            <KpiTile label="INP" value={fmtMs(v?.avg_inp)} tone={vitalsTone("INP", v?.avg_inp)} hint="< 200ms = good" />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold mb-3">Deeper dives</h2>
        <p className="text-xs text-slate-500 mb-3">
          Anything that needs heatmap rendering, replay video, or raw event drill-down lives in
          PostHog — these links open the right page in a new tab.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Full PostHog dashboard", href: `${POSTHOG_PROJECT_URL}/dashboard/1510223` },
            { label: "Session replays", href: `${POSTHOG_PROJECT_URL}/replay/recent` },
            { label: "Heatmaps", href: `${POSTHOG_PROJECT_URL}/heatmaps` },
            { label: "Survey responses", href: `${POSTHOG_PROJECT_URL}/surveys` },
            { label: "Hero experiment", href: `${POSTHOG_PROJECT_URL}/experiments/${HERO_EXPERIMENT_ID}` },
            { label: "Web Analytics", href: `${POSTHOG_PROJECT_URL}/web` },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm rounded-md border border-slate-200 px-3 py-1.5 hover:border-brand hover:text-brand transition-colors"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
