"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const NAV: { section?: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: "◆" },
    ],
  },
  {
    section: "Sales",
    items: [
      { href: "/leads", label: "Leads", icon: "◎" },
      { href: "/pipeline", label: "Pipeline", icon: "▤" },
      { href: "/outreach", label: "Outreach", icon: "➤" },
      { href: "/deals", label: "Deals", icon: "$" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/finances", label: "Finances", icon: "₪" },
      { href: "/raw", label: "Raw Data", icon: "⇲" },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/settings/tables", label: "Tables", icon: "▥" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white text-sm font-bold">A</span>
          <div>
            <div className="font-semibold text-slate-900 leading-tight">Autometa</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">CRM</div>
          </div>
        </Link>
      </div>
      <nav className="p-2 text-sm flex-1 overflow-y-auto">
        {NAV.map((group, i) => (
          <div key={i} className={i > 0 ? "mt-4" : ""}>
            {group.section && (
              <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                {group.section}
              </div>
            )}
            {group.items.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className={`w-4 text-center text-xs ${active ? "text-white/70" : "text-slate-400"}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-2 border-t border-slate-200">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="w-4 text-center text-xs text-slate-400">⎋</span>
            <span>Sign out</span>
          </button>
        </form>
        <div className="px-2 pt-1 text-[10px] text-slate-400">Signed in as admin</div>
      </div>
    </aside>
  );
}
