import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = "p-5",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`bg-surface border border-line rounded-xl shadow-card ${
        interactive ? "hover:shadow-card-hover hover:border-line transition-shadow" : ""
      } ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "danger" | "brand";
  icon?: ReactNode;
  /** Optional delta indicator, e.g. "+12%" */
  delta?: { value: string; positive?: boolean };
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-rose-700"
      : tone === "brand"
      ? "text-brand-700"
      : "text-ink";

  const iconClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "warning"
      ? "bg-amber-50 text-amber-600"
      : tone === "danger"
      ? "bg-rose-50 text-rose-600"
      : tone === "brand"
      ? "bg-brand-50 text-brand-600"
      : "bg-line/60 text-ink-muted";

  return (
    <div className="bg-surface border border-line rounded-xl p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-ink-muted">{label}</div>
        {icon && (
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${iconClass}`}>
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        {hint && <div className="text-xs text-ink-subtle truncate">{hint}</div>}
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              delta.positive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {delta.positive ? "↑" : "↓"} {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4 gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink tracking-tight">{title}</h2>
        {subtitle && <div className="text-xs text-ink-muted mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
