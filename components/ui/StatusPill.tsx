import { prettyEnum } from "@/lib/format";

type Tone = "slate" | "blue" | "indigo" | "amber" | "emerald" | "rose" | "purple" | "cyan";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const PIPELINE_TONES: Record<string, Tone> = {
  raw: "slate",
  enriched: "cyan",
  outreach: "blue",
  replied: "indigo",
  qualified: "amber",
  client: "emerald",
};

const OUTREACH_TONES: Record<string, Tone> = {
  not_started: "slate",
  queued: "slate",
  sent: "blue",
  opened: "cyan",
  replied: "indigo",
  meeting_booked: "purple",
  closed_won: "emerald",
  closed_lost: "rose",
};

const DEAL_TONES: Record<string, Tone> = {
  proposal: "slate",
  negotiation: "amber",
  contract: "indigo",
  active: "blue",
  completed: "emerald",
  cancelled: "rose",
};

const SENTIMENT_TONES: Record<string, Tone> = {
  positive: "emerald",
  neutral: "slate",
  negative: "rose",
  not_interested: "rose",
};

const CHANNEL_TONES: Record<string, Tone> = {
  email: "blue",
  linkedin: "indigo",
  phone: "amber",
  whatsapp: "emerald",
};

export function StatusPill({
  value,
  kind = "generic",
}: {
  value: string | null | undefined;
  kind?: "pipeline" | "outreach" | "deal" | "sentiment" | "channel" | "generic";
}) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;
  const map =
    kind === "pipeline" ? PIPELINE_TONES :
    kind === "outreach" ? OUTREACH_TONES :
    kind === "deal" ? DEAL_TONES :
    kind === "sentiment" ? SENTIMENT_TONES :
    kind === "channel" ? CHANNEL_TONES : {};
  const tone: Tone = map[value] ?? "slate";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {prettyEnum(value)}
    </span>
  );
}
