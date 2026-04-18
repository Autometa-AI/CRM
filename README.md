# Autometa CRM

## 1. Apply the migration

In the Supabase SQL Editor, paste and run `supabase/migrations/0001_initial_schema.sql`.
(Or use the Supabase CLI: `supabase db push`.)

## 2. Dashboard setup

```bash
cp .env.local.example .env.local   # then fill in URL + service_role key
npm install
npm run dev
```

Open http://localhost:3000.

**Security:** the dashboard uses the Supabase `service_role` key server-side to bypass RLS.
Never deploy this publicly without auth in front of it.

## Structure

- `supabase/migrations/0001_initial_schema.sql` — full schema (enums, tables, indexes, triggers, views)
- `lib/tables.ts` — table/column definitions that drive the UI (add new columns here)
- `app/[table]/` — list, create, edit/delete pages (generic, works for every table)
- `app/actions.ts` — server actions for CRUD
