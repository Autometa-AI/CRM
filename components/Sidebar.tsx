"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Send,
  Coins,
  Receipt,
  Database,
  Table2,
  GitMerge,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/login/actions";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { section?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Sales",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/outreach", label: "Outreach", icon: Send },
      { href: "/deals", label: "Deals", icon: Coins },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/finances", label: "Finances", icon: Receipt },
      { href: "/raw", label: "Data sources", icon: Database },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/settings/tables", label: "Tables", icon: Table2 },
      { href: "/dedup-review", label: "Dedup review", icon: GitMerge },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-white h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-line">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white text-sm font-semibold">
            A
          </span>
          <div>
            <div className="font-semibold text-ink leading-tight">Autometa</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-subtle">CRM</div>
          </div>
        </Link>
      </div>
      <nav className="p-2 text-sm flex-1 overflow-y-auto">
        {NAV.map((group, i) => (
          <div key={i} className={i > 0 ? "mt-5" : ""}>
            {group.section && (
              <div className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-subtle font-medium">
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                    active ? "bg-ink text-white" : "text-ink-muted hover:bg-line/60 hover:text-ink"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-ink-subtle group-hover:text-ink-muted"}`}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-2 border-t border-line">
        <form action={logout}>
          <button
            type="submit"
            className="group w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-muted hover:bg-line/60 hover:text-ink transition-colors"
          >
            <LogOut className="h-4 w-4 text-ink-subtle group-hover:text-ink-muted" strokeWidth={1.75} />
            <span className="font-medium">Sign out</span>
          </button>
        </form>
        <div className="px-2 pt-1 text-[10px] text-ink-subtle">Signed in as admin</div>
      </div>
    </aside>
  );
}
