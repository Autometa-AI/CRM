import Link from "next/link";
import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  icon,
}: {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      {icon && <div className="text-4xl mb-3 opacity-70">{icon}</div>}
      <div className="text-slate-900 font-medium">{title}</div>
      {description && <div className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{description}</div>}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-block mt-4 rounded bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-slate-700"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
