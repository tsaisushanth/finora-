-- 0014_performance.sql
-- Cheap DB-side aggregates + a single sortable feed, so the wallet, dashboard
-- and transactions pages stop downloading the whole ledger to the browser.

-- ── wallet_stats: all five summary numbers in one indexed pass ────────────────
create or replace view public.wallet_stats
with (security_invoker = true) as
  select
    user_id,
    sum(amount) filter (where amount > 0)::numeric(12,2) as added,
    sum(-amount) filter (where amount < 0)::numeric(12,2) as moved_out,
    sum(-amount) filter (
      where type in ('goal_contribution', 'goal_withdrawal')
    )::numeric(12,2) as in_goals,
    sum(-amount) filter (
      where type in ('loan_given', 'loan_repayment_received')
    )::numeric(12,2) as lent_outstanding,
    sum(amount) filter (
      where type in ('loan_taken', 'loan_repayment_made')
    )::numeric(12,2) as borrowed_outstanding
  from public.wallet_entries
  group by user_id;

grant select on public.wallet_stats to authenticated;

-- ── transactions_feed: expenses + income as one sortable list ─────────────────
create or replace view public.transactions_feed
with (security_invoker = true) as
  select
    'expense'::text as kind,
    id,
    amount,
    category_id,
    payment_method_id,
    merchant as title,
    note,
    occurred_at,
    created_at
  from public.expenses
  union all
  select
    'income'::text as kind,
    id,
    amount,
    category_id,
    null::uuid as payment_method_id,
    source as title,
    note,
    occurred_at,
    created_at
  from public.income_entries;

grant select on public.transactions_feed to authenticated;

-- Composite indexes so page-sliced `ORDER BY occurred_at DESC, created_at DESC`
-- on the feed stays index-backed.
create index if not exists expenses_user_time2_idx
  on public.expenses (user_id, occurred_at desc, created_at desc);
create index if not exists income_user_time2_idx
  on public.income_entries (user_id, occurred_at desc, created_at desc);