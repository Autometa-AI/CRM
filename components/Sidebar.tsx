import Link from "next/link";
import { TABLES } from "@/lib/tables";

export function Sidebar({ active }: { active?: string }) {
  const editable = TABLES.filter(t => !t.readOnly);
  const views = TABLES.filter(t => t.readOnly);

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-slate-200">
        <Link href="/" className="font-semibold text-slate-900">Autometa CRM</Link>
        <div className="text-xs text-slate-500">Admin dashboard</div>
      </div>
      <nav className="p-2 text-sm">
        <div className="px-2 pt-2 pb-1 text-xs uppercase tracking-wide text-slate-400">Tables</div>
        {editable.map(t => (
          <Link key={t.name} href={`/${t.name}`}
            className={`block rounded px-2 py-1.5 ${active === t.name ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>
            {t.label}
          </Link>
        ))}
        <div className="px-2 pt-4 pb-1 text-xs uppercase tracking-wide text-slate-400">Views</div>
        {views.map(t => (
          <Link key={t.name} href={`/${t.name}`}
            className={`block rounded px-2 py-1.5 ${active === t.name ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
