-- 0004_wallet_ledger.sql
-- `wallet_entries` is the single source of truth for money movement.
-- The balance is always derived; it is never stored.

create table if not exists public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'opening_balance','income','expense','loan_given','loan_repayment_received',
    'loan_taken','loan_repayment_made','goal_contribution','goal_withdrawal','adjustment')),
  amount numeric(12,2) not null check (amount <> 0),
  occurred_at timestamptz not null default now(),
  note text,
  ref_type text check (ref_type in ('expense','loan','goal','bill','income','adjustment')),
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists wallet_entries_user_time_idx
  on public.wallet_entries (user_id, occurred_at desc);
create index if not exists wallet_entries_ref_idx
  on public.wallet_entries (user_id, ref_type, ref_id);

create or replace view public.wallet_balances
with (security_invoker = true) as
  select user_id, coalesce(sum(amount), 0)::numeric(12,2) as balance
  from public.wallet_entries
  group by user_id;