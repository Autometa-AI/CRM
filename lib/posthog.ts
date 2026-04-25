/**
 * Server-side helper for the PostHog Query API.
 *
 * Reads POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY from env.
 * The personal API key MUST stay server-side — never import this module
 * from a client component.
 */

const POSTHOG_HOST = "https://us.posthog.com";

export class PostHogConfigError extends Error {}

function getConfig() {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!projectId || !apiKey) {
    throw new PostHogConfigError(
      "POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY env vars must be set"
    );
  }
  return { projectId, apiKey };
}

/**
 * Run a HogQL query and return rows as an array of plain objects.
 * Throws on HTTP failure or empty response.
 */
export async function runHogQL<Row = Record<string, unknown>>(
  hogql: string,
  opts: { revalidateSeconds?: number } = {}
): Promise<Row[]> {
  const { projectId, apiKey } = getConfig();
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${projectId}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query: hogql },
      }),
      next: { revalidate: opts.revalidateSeconds ?? 60 },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `PostHog query failed: HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    results?: unknown[][];
    columns?: string[];
  };
  const rows = data.results ?? [];
  const cols = data.columns ?? [];
  return rows.map((r) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      obj[c] = r[i];
    });
    return obj as Row;
  });
}

/**
 * Fetch a single experiment's status + result summary from PostHog.
 * Returns null if the API call fails — caller decides how to render.
 */
export async function getExperimentSummary(experimentId: number) {
  try {
    const { projectId, apiKey } = getConfig();
    const res = await fetch(
      `${POSTHOG_HOST}/api/projects/${projectId}/experiments/${experimentId}/`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id as number,
      name: data.name as string,
      start_date: data.start_date as string | null,
      end_date: data.end_date as string | null,
      feature_flag_key: data.feature_flag_key as string,
      archived: data.archived as boolean,
    };
  } catch {
    return null;
  }
}
