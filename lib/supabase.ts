import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars not set. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local");
}

export const supabase = createClient(url ?? "http://localhost", key ?? "missing", {
  auth: { persistSession: false },
});
