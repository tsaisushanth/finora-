# Finora — Rebuild Plan

Rebuild of the existing Python/Streamlit + SQLite "Finora" app into a production-quality
Next.js + Supabase product, plus a new AI bill-scanning module and a full UI/UX redesign.

This document is the source of truth for architecture, schema and phases. It is written in
Phase 0 and frozen until a later phase explicitly amends it (amendments are noted inline).

---

## 0. Audit notes & limitations

- The audit was a **static read of every source file plus a read-only inspection of
  `data/expenses.db`**. An interactive browser click-through of the Streamlit app was not
  possible in the read-only/headless audit environment (no package install, no browser).
  Every defect listed below is verified by reading code or querying the SQLite file.
- The working copy is in a **broken intermediate state**: `data/expenses.db` contains an
  `auth_accounts` table, but the current `database.py` no longer defines the functions that
  create or use it. The Supabase auth layer is dead code and is not wired into `app.py`.

### Files read

`app.py`, `database.py`, `analytics.py`, `goals.py`, `utils.py`, `auth.py` (uncommitted),
`profiles.py`, `profile_view.py`, `supabase_client.py`, `supabase/schema.sql`,
`scratch/*.py`, `requirements.txt`, `.gitignore`, `AGENTS.md`, and `data/expenses.db`.

---

## Known bugs

### Blocking / broken code

1. `auth.py:27-28` imports `get_local_user_id_for_auth_account` and
   `link_auth_account_to_local_user` from `database.py` — **neither exists** in the current
   file → `import auth` raises `ImportError`. The entire Supabase auth + profile layer is
   non-functional.
2. `profile_view.py:440,492` calls `profiles_mod.parse_date(...)`; `profiles.py` only
   defines `_parse_date` → `AttributeError` when rendering profile goal progress.
3. `profile_view.py:530` calls `get_total_allocated_to_goals(...)` but only `get_user_goals`
   is imported from `database` → `NameError` in the sidebar account block.
4. `app.py` **never imports or gates on auth / profile_view**. There is no login screen,
   no identity, no `/profile` route. `profile_view` sets `nav_choice = "👤 My Profile"` but
   `app.py` has no branch for it → blank page. The app therefore runs as the pure
   single-user SQLite app; the half-built multi-user layer is unreachable.
5. `requirements.txt` lists only `streamlit`, `pandas`, `plotly`, but `supabase_client.py`
   needs `supabase`, `supabase_auth`, `httpx`; there is no `python-dotenv`. The auth layer
   cannot run even if it were imported.
6. `.venv/` is shipped in the workspace and `.venv.zip` (≈884 KB) is untracked.

### Data model

7. No `user_id` on `expenses`, `wallet_transactions`, `money_lent`, `money_borrowed`
   (only `goals` / `goal_transactions` have it).
8. Global `settings` table; `wallet_balance` and `current_user_id` are shared by all users.
   `init_db()` auto-creates a "Default User" (confirmed in DB: `users = [(1,'Default User')]`).
9. **Non-atomic wallet updates**: `add_expense` commits the insert, then calls
   `adjust_wallet_balance` on a *separate connection* (`database.py:313-317`). The same
   split-transaction pattern exists in `delete_expense`, `add_money_transaction`,
   `lend_money`, `borrow_money`, `receive_lent_repayment`, `repay_borrowed_loan`,
   `add_goal_contribution`, `remove_goal_contribution`. A crash in between silently
   corrupts the balance.
10. "Adjust Starting Wallet Balance (Override)" (`app.py:1306-1322`) rewrites
    `settings.wallet_balance` with **no ledger entry** — breaks the audit trail.
11. Money is stored as SQLite `REAL` (float). Dates/times are `TEXT`; `expense_time` uses
    the **server clock** (`datetime.datetime.now()`, `app.py:439`), not the user's timezone.
12. Categories, payment methods, money sources and goal categories are hardcoded
    (`database.py:9-53`).
13. `wallet_transactions.reference_id` is overloaded with no `ref_type` — expense ids,
    loan ids and goal ids share the column, disambiguated only by `type`.
14. `add_goal_contribution` caps saved at the target but still logs the **full** amount as a
    wallet debit (`database.py:878-904`) — over-contribution is prevented only in the UI,
    not in the data layer.
15. Goal deletion removes `goal_allocation` / `goal_removal` wallet rows by `reference_id`
    while `app.py` separately adds `saved_amount` back to the wallet (`app.py:918-921`) —
    risk of double counting / inconsistency after partial contribution reversals.

### UI/UX

16. ~800 lines of CSS injected from `utils.py` (`apply_custom_css`); 78 `unsafe_allow_html`
    call sites; heavy inline styles.
17. Button-based navigation mutating `st.session_state`; no URLs, no back button, no deep
    links, full script rerun on every click.
18. Three "Quick Action" tiles (Add Money / To Receive / Borrowed) all route to the same
    Wallet page (`app.py:212-231`).
19. Emoji used as icons everywhere; `st.balloons()` fires after **every** saved expense
    (`app.py:452`) and on goal completion.
20. `app.py:162` claims "🔒 Encrypted Local SQLite Storage" — false (plain SQLite file).
21. Wallet page crams 6 tabs plus a hand-built transaction table; the Expenses list has
    **no pagination**, **no edit**, no bulk actions (only delete), and one-click delete with
    no confirmation (`app.py:519`).
22. `format_currency` uses Western grouping (`f"{amount:,.2f}"`), not Indian
    (`₹1,23,456.00`), and inconsistently drops decimals for whole numbers.
23. Week boundary is always Monday (`get_date_bounds`); there is no user `week_start_day`.
24. `reset_all_data` plus `scratch/reset_data.py` wipe data with no test coverage; `scratch/`
    holds ad-hoc scripts.
25. `supabase/schema.sql` implements the **old** profile model (college/course/year) and
    deliberately does *not* auto-create profiles — contradicts the new trigger-on-`auth.users`
    requirement.

### Fix map (which phase closes each)

- 1,2,3,4,5,6 → Phase 1 (scaffold) / Phase 3 (auth) / Phase 8 (legacy removal).
- 7,8,9,10,11,13,14,15 → Phase 2 (schema + RPCs) and Phase 4/5 (callers).
- 12,25 → Phase 2 (categories/payment methods; new profiles model).
- 16,17,18,19,20,21,22,23 → Phases 1,4,6,8 (design system, real routes, pages).
- 24 → Phase 8 (real tests, delete `scratch/`).

---

## 1. Target architecture

- **Next.js 15 (App Router) · TypeScript strict**, deployed on Vercel.
- **Supabase**: Auth (email + password, Google OAuth), Postgres (RLS on every table),
  Storage (private `avatars`, `bills` buckets).
- **Data access split**: reads use the Supabase server/client SDK under RLS; **every
  multi-table write is a `SECURITY INVOKER` Postgres RPC** (atomic, owner-checked). No
  business write touches more than one table outside an RPC.
- **Wallet is a derived ledger**: `wallet_entries` is the single source of truth;
  `wallet_balance` is a view/function over the ledger. No stored balance, no override.
- **Server-only secrets**: Supabase service-role key and the AI vision key exist only in
  route handlers / server actions.
- **AI vision** behind `lib/ai/vision.ts` (provider interface; `VISION_PROVIDER`,
  `VISION_MODEL`, `*_API_KEY` env-swappable). JSON-schema output validated with zod.
- **UI**: Tailwind + shadcn/ui + lucide-react + Recharts; Inter/Geist; light + dark;
  tabular figures; Indian ₹ grouping.
- **State**: TanStack Query for server state with optimistic mutations/undo;
  react-hook-form + zod for forms.
- **Tests**: Vitest (unit) + Playwright (one happy path, mocked AI). RLS proven by SQL tests.

---

## 2. Folder structure

```
expenx/
├─ legacy/                          # old Streamlit app moved here (scratch/ deleted)
├─ supabase/
│  ├─ migrations/                   # ordered, idempotent
│  │  0001_extensions.sql
│  │  0002_profiles.sql
│  │  0003_categories_payment_methods.sql
│  │  0004_wallet_ledger.sql
│  │  0005_expenses_income.sql
│  │  0006_loans.sql
│  │  0007_goals.sql
│  │  0008_bills.sql
│  │  0009_rls_policies.sql
│  │  0010_rpc_functions.sql
│  │  0011_triggers_and_seed.sql
│  │  0012_storage_buckets.sql
│  ├─ tests/rls_test.sql
│  └─ seed.sql                      # local dev only
├─ scripts/import-sqlite.ts
├─ e2e/happy-path.spec.ts + e2e/fixtures/mock-vision.json
├─ tests/{money,goals,bill-sanity,bill-schema}.test.ts
├─ public/
├─ src/
│  ├─ middleware.ts                 # route protection
│  ├─ app/
│  │  ├─ layout.tsx  globals.css  error.tsx  not-found.tsx
│  │  ├─ (auth)/{login,signup,reset-password,update-password}/page.tsx
│  │  ├─ auth/callback/route.ts     # OAuth + email-confirm exchange
│  │  ├─ (app)/layout.tsx           # app shell (sidebar/topbar/bottom-nav)
│  │  ├─ (app)/dashboard/page.tsx
│  │  ├─ (app)/transactions/page.tsx
│  │  ├─ (app)/wallet/page.tsx
│  │  ├─ (app)/goals/page.tsx
│  │  ├─ (app)/insights/page.tsx
│  │  ├─ (app)/scan/page.tsx
│  │  ├─ (app)/scan/[id]/page.tsx   # review screen
│  │  ├─ (app)/profile/page.tsx     # tabbed
│  │  ├─ (app)/onboarding/page.tsx  # 3 steps
│  │  ├─ @modal/(.)add/page.tsx     # intercepting route: quick-add sheet
│  │  └─ api/
│  │     ├─ bills/scan/route.ts
│  │     ├─ bills/[id]/route.ts     # discard / delete image
│  │     ├─ export/route.ts         # JSON + CSV
│  │     └─ account/route.ts        # delete account + all data
│  ├─ components/
│  │  ├─ ui/                        # shadcn
│  │  ├─ layout/{app-shell,sidebar,topbar,bottom-nav,quick-add-sheet,theme-toggle}.tsx
│  │  ├─ dashboard/ transactions/ wallet/ goals/ insights/ profile/ scan/
│  │  └─ shared/{money,empty-state,error-state,skeletons,confirm-dialog,undo-toast,command-palette}.tsx
│  ├─ lib/
│  │  ├─ supabase/{client,server,middleware,admin}.ts
│  │  ├─ ai/{vision,prompt,schema,sanity}.ts + providers/{gemini,openai,anthropic}.ts
│  │  ├─ money.ts  format.ts  dates.ts  constants.ts  rpc.ts
│  │  └─ validations/*.ts           # zod
│  ├─ hooks/{use-expenses,use-wallet,use-goals,use-profile,use-bill-scan}.ts
│  └─ types/database.ts             # generated: supabase gen types
├─ .env.example  README.md  PLAN.md  AGENTS.md
└─ next.config.ts  tailwind.config.ts  tsconfig.json  components.json
   vitest.config.ts  playwright.config.ts  package.json
```

---

## 3. Database schema (SQL)

Conventions: money is `numeric(12,2)` in Postgres and integer paise in TypeScript; every
table has `user_id uuid not null references auth.users(id) on delete cascade`, RLS enabled,
grants to `authenticated`, indexes on `(user_id, <date>)`, and
`(select auth.uid()) = user_id` policies. `updated_at` is maintained by trigger.

```sql
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";  -- search

-- updated_at helper
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

-- ─────────────────────────── profiles (1:1 auth.users) ───────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text,
  avatar_url text,
  phone text,
  date_of_birth date,
  occupation text check (occupation in ('student','salaried','self_employed','other')),
  city text,
  currency text not null default 'INR',
  locale text not null default 'en-IN',
  timezone text not null default 'Asia/Kolkata',
  monthly_income numeric(12,2) not null default 0 check (monthly_income >= 0),
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0),
  savings_target_percent numeric(5,2) not null default 0 check (savings_target_percent between 0 and 100),
  week_start_day smallint not null default 1 check (week_start_day between 0 and 6),
  theme text not null default 'system' check (theme in ('system','light','dark')),
  notify_email boolean not null default true,
  notify_push boolean not null default false,
  notify_budget_alerts boolean not null default true,
  notify_bill_reminders boolean not null default true,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (lower(username)) where username is not null;

-- ─────────────────────────── categories ───────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('expense','goal','income')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  color text not null default '#0B6E5F',
  icon text not null default 'circle',
  sort_order int not null default 0,
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_user_kind_name_key on public.categories (user_id, kind, lower(name));

-- ─────────────────────────── payment_methods ───────────────────────────
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  type text not null default 'other' check (type in ('cash','upi','card','bank','other')),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payment_methods_user_name_key on public.payment_methods (user_id, lower(name));

-- ─────────────────────────── wallet ledger (SOURCE OF TRUTH) ───────────────────────────
create table public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'opening_balance','income','expense','loan_given','loan_repayment_received',
    'loan_taken','loan_repayment_made','goal_contribution','goal_withdrawal','adjustment')),
  amount numeric(12,2) not null check (amount <> 0),   -- signed
  occurred_at timestamptz not null default now(),
  note text,
  ref_type text,                                        -- 'expense','loan','goal','bill','income','adjustment'
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index wallet_entries_user_time_idx on public.wallet_entries (user_id, occurred_at desc);
create index wallet_entries_ref_idx on public.wallet_entries (user_id, ref_type, ref_id);

create view public.wallet_balances with (security_invoker = true) as
  select user_id, coalesce(sum(amount), 0)::numeric(12,2) as balance
  from public.wallet_entries group by user_id;

-- ─────────────────────────── expenses / income ───────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  merchant text,
  note text,
  occurred_at timestamptz not null default now(),
  bill_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_user_time_idx on public.expenses (user_id, occurred_at desc);
create index expenses_user_cat_idx on public.expenses (user_id, category_id);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  source text,
  category_id uuid references public.categories(id) on delete set null,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index income_user_time_idx on public.income_entries (user_id, occurred_at desc);

-- ─────────────────────────── loans ───────────────────────────
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('lent','borrowed')),
  person text not null check (char_length(btrim(person)) between 1 and 80),
  principal numeric(12,2) not null check (principal > 0),
  due_date date,
  note text,
  status text not null default 'active' check (status in ('active','partially_repaid','settled','written_off')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loans_user_status_idx on public.loans (user_id, status);

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index loan_repayments_loan_idx on public.loan_repayments (loan_id);

-- ─────────────────────────── goals ───────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_amount numeric(12,2) not null check (target_amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  target_date date,
  description text,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_status_idx on public.goals (user_id, status);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  kind text not null default 'contribution' check (kind in ('contribution','withdrawal')),
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id);

create view public.goal_progress with (security_invoker = true) as
  select g.id, g.user_id, g.target_amount,
    coalesce(sum(case when c.kind='contribution' then c.amount else -c.amount end),0)::numeric(12,2) as saved_amount
  from public.goals g left join public.goal_contributions c on c.goal_id = g.id
  group by g.id, g.user_id, g.target_amount;

-- ─────────────────────────── bills ───────────────────────────
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes int,
  status text not null default 'processing'
    check (status in ('processing','needs_review','confirmed','failed','discarded')),
  provider text, model text,
  document_type text, is_a_bill boolean,
  extraction jsonb, sanity_flags jsonb, confidence jsonb,
  error_message text,
  expense_id uuid references public.expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bills_user_time_idx on public.bills (user_id, created_at desc);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  description text,
  quantity numeric(10,3),
  unit_price numeric(12,2),
  amount numeric(12,2),
  suggested_category text,
  created_at timestamptz not null default now()
);
create index bill_items_bill_idx on public.bill_items (bill_id);

alter table public.expenses
  add constraint expenses_bill_fk foreign key (bill_id) references public.bills(id) on delete set null;
```

### RLS (migration 0009)

Pattern applied to every table above (`profiles` uses `id` instead of `user_id`):

```sql
alter table public.expenses enable row level security;
create policy expenses_select_own on public.expenses for select using ((select auth.uid()) = user_id);
create policy expenses_insert_own on public.expenses for insert with check ((select auth.uid()) = user_id);
create policy expenses_update_own on public.expenses for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy expenses_delete_own on public.expenses for delete using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.expenses to authenticated;
-- profiles: select/insert/update using (select auth.uid()) = id, no delete (cascade via auth.users)
-- wallet_entries / categories / payment_methods / income_entries / loans / loan_repayments /
-- goals / goal_contributions / bills / bill_items: the same four policies on user_id
grant usage on schema public to authenticated;
```

### Storage (migration 0012)

Buckets `avatars` and `bills`, both private. Object policies key off the first path segment:

```sql
insert into storage.buckets (id, name, public) values ('avatars','avatars',false), ('bills','bills',false)
  on conflict (id) do nothing;
create policy "own avatar read"   on storage.objects for select using (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own avatar write"  on storage.objects for insert with check (bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own bills read"    on storage.objects for select using (bucket_id='bills'   and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own bills write"   on storage.objects for insert with check (bucket_id='bills' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own bills delete"  on storage.objects for delete using (bucket_id='bills' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

### RPCs (migration 0010)

All functions are `security invoker`, `set search_path = public`, `grant execute … to
authenticated`, and each asserts row ownership via RLS / primary keys.

| RPC | Purpose |
|---|---|
| `set_opening_balance(p_amount)` | onboarding; only if no `opening_balance` entry exists |
| `create_expense(p_amount, p_category_id, p_payment_method_id, p_merchant, p_note, p_occurred_at, p_bill_id)` | expense + ledger `-amount` |
| `update_expense(p_id, …)` | expense + resync its ledger entry |
| `delete_expense(p_id)` | delete linked ledger entry + expense |
| `add_income(…)` | income entry + ledger `+amount` |
| `create_goal(…)`, `update_goal(…)` | goals CRUD |
| `contribute_to_goal(p_goal_id, p_amount, p_occurred_at, p_note)` | validates available balance and remaining-to-target; goal_contribution + ledger `-amount`; auto-completes |
| `withdraw_from_goal(p_goal_id, p_amount, …)` | goal_contribution(kind=withdrawal) + ledger `+amount` |
| `delete_goal(p_goal_id)` | restores saved to wallet as `goal_withdrawal`, deletes contributions + goal |
| `record_loan(p_direction, …)` | loan + ledger (`loan_given -p` or `loan_taken +p`) |
| `repay_loan(p_loan_id, p_amount, …)` | loan_repayments + ledger, updates status |
| `adjust_balance(p_amount_delta, p_reason)` | `adjustment` ledger row, **reason required** (replaces override) |
| `confirm_bill(p_bill_id, p_payload jsonb)` | atomic: expense(s) + ledger(s) + link `bills.expense_id` + status `confirmed` |

### Triggers / seed (migration 0011)

- `after insert on auth.users` → create the `profiles` row (id, full_name/email from
  metadata) and seed default expense/income/goal categories + default payment methods for
  that user. Nothing else is seeded (no seed users; `seed.sql` is local-dev only).
- `touch_updated_at` before update on all tables with `updated_at`.

---

## 4. Pages / routes

**Public:** `/login`, `/signup`, `/reset-password`, `/update-password`, `/auth/callback`

**Protected (app shell, middleware-gated):**

- `/onboarding` — 3 steps (name & occupation → income & budget → starting balance →
  `opening_balance` ledger entry).
- `/dashboard` — greeting; hero card (available / allocated to goals / net worth); month
  spend vs budget; to-receive & to-pay tiles; category donut; daily trend; 5 recent
  transactions; top goal; 2–3 plain-language insights. Every tile links to a real page.
- `/transactions` — search, category/payment/date filters, pagination, edit, delete
  (confirm + undo toast), CSV export.
- `/wallet` — balance + add money + goals allocated; loans given/taken; repayments; full
  wallet ledger with filters.
- `/goals` — cards with priority/status, target date, required monthly saving, progress
  stages, contributions history; create/edit/pause/resume/archive/delete.
- `/insights` — spending insights + goal insights + trends.
- `/scan` — capture/upload, scan history with statuses, shortcuts.
- `/scan/[id]` — review screen (image + editable form + line-items table + sanity/confidence
  flags + duplicate warning + split mode).
- `/profile` — tabs: Personal · Financial preferences · Categories & payment methods ·
  Appearance · Security (password, connected accounts, sign out all) · Data (export JSON/CSV,
  delete account with typed confirmation).
- `@modal/(.)add` — quick-add sheet (Add expense / Scan bill / Add money / Lend / Borrow),
  reachable everywhere.

Middleware: logged-out users only see the public routes; protected routes redirect to
`/login`; users without a completed profile are redirected to `/onboarding`.

---

## 5. Bill scanning module (`/scan`)

Flow: capture/gallery/drag-drop → client EXIF-rotate, downscale longest side to ~1600px,
JPEG-compress + preview/crop/rotate → validate MIME by content (magic bytes) ≤ 8 MB → upload
to private `bills` bucket at `{user_id}/{uuid}.jpg` and create a `bills` row `processing` →
`POST /api/bills/scan` (authenticated, rate-limited 10 scans/hour/user by counting `bills`
rows created in the last hour) → download, call `lib/ai/vision.ts` provider with JSON-schema
output → validate with zod (retry once, then fail gracefully) → server sanity checks
(`sum(items) ≈ subtotal`; `subtotal + tax − discount ≈ grand_total`, flag if `|Δ| > ₹1`;
date not in the future; amount > 0) → review screen (zoomable image, editable form,
add/remove/edit line items, low-confidence/failed fields highlighted, "Save as one expense"
vs "Split by category", duplicate warning on merchant + date + total) → Confirm calls
`confirm_bill` RPC (never auto-save) → history with thumbnails and re-open / re-scan / delete
(also deletes the Storage object).

`is_a_bill = false` → clear "not a bill" message, create nothing. Blurry/unreadable → friendly
retake tips + "Enter manually" opening the add sheet pre-filled with whatever was extracted.
Images are never logged and stored only in the user's private bucket.

Tests: zod schema, sanity function, and `confirm_bill` RPC — fixtures only, no live API.

---

## 6. Phase plan (commit after each)

| Phase | Deliverable | Commit |
|---|---|---|
| **0** | Audit + `PLAN.md` with Known bugs. Stop for approval. | `docs: add rebuild PLAN.md and legacy audit` |
| **1** | `create-next-app`, strict TS, Tailwind tokens, shadcn init, design system (light/dark, Indian ₹ money utils), app shell (sidebar/topbar/bottom-nav/quick-add), Supabase client wrappers, move old app to `legacy/`, delete `scratch/`, `.env.example`, scripts (`lint`/`typecheck`/`test`). | `feat: scaffold Next.js app, design system and layout shell` |
| **2** | Migrations 0001–0012, RLS, RPCs, triggers/seed, storage policies, `rls_test.sql` proving cross-user isolation (incl. storage). | `feat: database schema, RLS and atomic RPC functions` |
| **3** | Auth (email + Google), middleware protection, reset/verify, 3-step onboarding, full profile section incl. categories/payment-method management, export, account deletion. | `feat: auth, onboarding and profile` |
| **4** | Wallet/ledger + add income/expense + `/transactions` (filter/search/date/pagination/edit/delete/CSV) with optimistic updates + undo. | `feat: wallet ledger, expenses and transactions` |
| **5** | Loans (lent/borrowed, partial repayments) + goals (full parity: priority/status/target date/required monthly/progress stages/insights, allocate, reverse). | `feat: loans and goals with full parity` |
| **6** | Dashboard + insights (donut, trend, tiles, recent, top goal, plain-language insights). | `feat: dashboard and insights` |
| **7** | Bill scanning module end to end + tests. | `feat: bill scanning with AI extraction` |
| **8** | A11y pass, dark mode contrast (WCAG AA), empty/error states, Vitest + Playwright e2e, README, `import-sqlite.ts`, remove `legacy/`. | `chore: polish, tests, docs; remove legacy` |

Every phase ends with `npm run lint && npm run typecheck && npm test`; commit after each phase.

---

## 7. Assumptions

1. **Repo layout**: build the Next app at the repo root (`expenx/`); the old app moves to
   `legacy/` and is deleted in Phase 8.
2. **Tooling**: npm; Node 20+; shadcn "new-york" style; font Geist with Inter fallback.
3. **AI vision default**: Google **Gemini 2.x Flash** (cheap, strong on receipts), swappable
   via `VISION_PROVIDER` / `VISION_MODEL` / `GEMINI_API_KEY`; OpenAI and Anthropic adapters
   included.
4. **Old profile fields dropped**: legacy `college` / `course` / `year` are replaced by the
   new model (`occupation`, `city`, etc.); the import script maps `college → city?` and
   `occupation='student'`.
5. **Supabase project**: created/provided by the owner; migrations are idempotent and run via
   `supabase db push`. No project keys are committed.
6. **Rate limiting**: enforced in Postgres by counting `bills` rows in the last hour (robust
   on serverless); documented as swappable for Upstash.
7. **Legacy DB is empty** (verified: 0 expenses, 1 default user), so `import-sqlite.ts` is
   best-effort and mainly preserves the migration path.
8. `savings_target_percent` and the notification preferences are stored and editable; only
   the budget-alert notification is wired in v1.
