import { Card } from "@/components/ui/Card";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-900 text-white text-lg font-bold">
            A
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mt-3">Autometa CRM</h1>
          <p className="text-sm text-slate-500">Admin sign in</p>
        </div>
        <form action={login} className="space-y-3">
          <input type="hidden" name="from" value={searchParams.from ?? "/"} />
          <div>
            <label className="text-xs text-slate-500">Username</label>
            <input
              name="username"
              required
              autoFocus
              autoComplete="username"
              className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-2 text-sm"
            />
          </div>
          {searchParams.error && (
            <div className="rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs px-2.5 py-1.5">
              {searchParams.error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded bg-slate-900 text-white px-3 py-2 text-sm font-medium hover:bg-slate-700"
          >
            Sign in
          </button>
        </form>
      </Card>
    </div>
  );
}
