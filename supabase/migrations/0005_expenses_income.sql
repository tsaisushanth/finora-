-- 0005_expenses_income.sql

create table if not exists public.expenses (
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

create index if not exists expenses_user_time_idx
  on public.expenses (user_id, occurred_at desc);
create index if not exists expenses_user_cat_idx
  on public.expenses (user_id, category_id);
create index if not exists expenses_merchant_trgm_idx
  on public.expenses using gin (merchant extensions.gin_trgm_ops);

create table if not exists public.income_entries (
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

create index if not exists income_user_time_idx
  on public.income_entries (user_id, occurred_at desc);