export function ScoreBar({
  value,
  max = 100,
  label,
  size = "md",
}: {
  value: number | null | undefined;
  max?: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const v = typeof value === "number" && isFinite(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  const color =
    pct >= 75 ? "bg-emerald-500" :
    pct >= 50 ? "bg-blue-500" :
    pct >= 25 ? "bg-amber-500" : "bg-slate-300";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="min-w-[80px]">
      <div className="flex items-center justify-between text-xs text-slate-600 mb-0.5">
        <span className="font-medium tabular-nums">{value ?? "—"}</span>
        {label && <span className="text-slate-400">{label}</span>}
      </div>
      <div className={`w-full ${h} rounded bg-slate-100 overflow-hidden`}>
        <div className={`${h} ${color} rounded`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
