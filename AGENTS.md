# Finora — engineering rules

Finora is a personal finance tracker for students/young earners in India (₹, UPI, cash, lending to friends).

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui + lucide-react icons
- Supabase: Auth, Postgres (RLS on everything), Storage (private buckets)
- Recharts for charts, zod for validation, react-hook-form for forms, TanStack Query only if needed
- Vitest for unit tests, Playwright for one happy-path e2e

## Hard rules
- Never put secrets in client code. Service-role key and any AI API key are server-only (route handlers / server actions).
- Every table has `user_id uuid not null references auth.users on delete cascade`, RLS enabled, and policies using `(select auth.uid()) = user_id`.
- Supabase project has "automatically expose new tables" OFF and "automatic RLS" ON, so every migration must explicitly `grant` privileges to `authenticated` and create RLS policies.
- Money is `numeric(12,2)` in Postgres and handled as integer paise in TypeScript. Never use floats for money.
- Wallet balance is DERIVED from a ledger. It is never stored as an editable number.
- Any operation touching more than one table goes through a Postgres function (RPC) so it is atomic.
- No demo/default/seed users or fake data in production code paths. Seed data lives only in `supabase/seed.sql` for local dev.
- No `any`, no unused code, no emoji used as UI icons (use lucide-react). All dates stored as `date`/`timestamptz`, displayed in the user's profile timezone.
- Every page needs loading, empty, and error states. Mobile-first; must work at 360px width.
- Run `npm run lint && npm run typecheck && npm test` before declaring a phase done. Commit after each phase with a clear message.