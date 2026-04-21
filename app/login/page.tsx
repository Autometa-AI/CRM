import { Card } from "@/components/ui/Card";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 50% 0%, var(--accent-soft) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(11,74,58,0.06) 0%, transparent 55%), var(--bg)",
      }}
    >
      <Card className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-brand-accent" aria-hidden />
            <span className="font-serif text-lg text-ink tracking-[-0.01em] font-medium">
              Autometa AI
            </span>
          </div>
          <h1 className="font-serif text-2xl text-ink mt-1">Welcome back</h1>
          <p className="text-sm text-ink-mute mt-1">Sign in to the CRM.</p>
        </div>
        <form action={login} className="space-y-3">
          <input type="hidden" name="from" value={searchParams.from ?? "/"} />
          <div>
            <label className="text-xs text-ink-soft font-medium">Username</label>
            <input
              name="username"
              required
              autoFocus
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-[--border] bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-soft font-medium">Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-[--border] bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
          {searchParams.error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2">
              {searchParams.error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Sign in
          </button>
        </form>
      </Card>
    </div>
  );
}
