# Finora

A personal finance tracker for students and young earners in India. Track wallet money, expenses, income, goals, and loans in ₹ — and scan a bill with your camera to auto-enter it as an expense.

> Money is handled as integer **paise** in the app and `numeric(12,2)` in Postgres. The wallet balance is always **derived** from a ledger, never stored.

## Features

- **Wallet ledger** — every rupee movement (income, expense, loans, goal transfers, adjustments) is one row; the balance is always derived from it.
- **Expenses & income** — categories, payment methods (UPI/cash/card), notes, calendar picker, and a single combined feed with free-text search, category/payment-method filters, and pagination.
- **Goals** — save toward things with a target amount and date, transfer money in and out.
- **Loans** — lend to and borrow from friends; outstanding amounts are tracked (not paid back) in the wallet.
- **Insights** — net worth journey, 6-month trends, category breakdowns, and plain-language summaries.
- **Bill scanning** — AI vision extracts items + tax + total from a bill photo; review and confirm before it posts to your expenses.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript (strict) + Tailwind CSS
- [Supabase](https://supabase.com/) — Auth, Postgres, Storage (private buckets)
- Recharts for charts, zod for validation, react-hook-form for forms
- Vitest for unit tests, Playwright for a happy-path e2e
- shadcn/ui-style components + lucide-react icons

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project (or `supabase start` for local) — [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Install

```bash
npm install
```

### 2. Set up the database

```bash
npx supabase link --project-ref YOUR_PROJECT_REF   # once per project
npx supabase db push
```

Migrations live in `supabase/migrations/`. They create tables, indexes, views, grants, and RLS policies — RLS is on everywhere and every query is scoped to `auth.uid()`.

Optional: load dev-only seed data.

```bash
npx supabase db reset   # applies migrations + supabase/seed.sql for local dev
```

### 3. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Client-side anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | no¹ | Server-only admin client (bill scan storage reads, confirm) |
| `VISION_PROVIDER` | no | `google` (default), `openai`, or `anthropic` |
| `VISION_MODEL` | no | Override the default model for the chosen provider |
| `GEMINI_API_KEY` | no | Required when `VISION_PROVIDER=google` |
| `OPENAI_API_KEY` | no | Required when `VISION_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | no | Required when `VISION_PROVIDER=anthropic` |

¹ Needed for bill scanning. Service-role and AI keys are **server-only** — they are never exposed to the browser.

> Run `npx supabase db push` again whenever you pull new migrations.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000 and sign up.

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # run the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests
npm run test:e2e   # Playwright happy-path e2e
```

## Project structure

```
src/
  app/
    api/bills/scan/   # AI bill scan route handler (server-only keys)
    (app)/            # authenticated pages: overview, wallet, transactions,
                      # expenses, income, goals, loans, insights, bills
  components/         # UI + feature components (dashboard, wallet, bills, ...)
  lib/
    auth/             # session helpers
    supabase/         # server/browser/admin clients
    validations/      # zod schemas shared by forms + server actions
    transactions/     # queries + server actions for wallet/expenses/income
    goals/ loans/ bills/ insights/ ai/
  types/database.ts   # generated Supabase types
supabase/
  migrations/         # ordered SQL migrations (tables, RLS, grants, views, RPCs)
```

## How money moves

- **Transactions touch more than one table** → they run through Postgres **RPC functions** so they are atomic (e.g. `create_expense`, `add_income`, `set_opening_balance`, `adjust_balance`, `confirm_bill`, `contribute_to_goal`, `record_loan`).
- `wallet_balances`, `wallet_stats`, and `transactions_feed` are database views with `security_invoker = true` — the wallet summary and combined feed are computed and paginated **inside Postgres**, not by pulling rows into the app.
- RLS is enabled on every table with policies scoped to `auth.uid()`.

## Testing

- Unit tests live next to the code (`*.test.ts`) and use fixtures only — `npm test`.
- One Playwright happy-path e2e covers sign-up → add money → add expense (`npm run test:e2e`).

## License

TBD — add a license before publishing.