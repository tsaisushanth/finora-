-- 0006_loans.sql

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('lent','borrowed')),
  person text not null check (char_length(btrim(person)) between 1 and 80),
  principal numeric(12,2) not null check (principal > 0),
  due_date date,
  note text,
  status text not null default 'active'
    check (status in ('active','partially_repaid','settled','written_off')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loans_user_status_idx on public.loans (user_id, status);

create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists loan_repayments_loan_idx
  on public.loan_repayments (loan_id);
create index if not exists loan_repayments_user_idx
  on public.loan_repayments (user_id);