-- 0008_bills.sql

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes int,
  status text not null default 'processing'
    check (status in ('processing','needs_review','confirmed','failed','discarded')),
  provider text,
  model text,
  document_type text,
  is_a_bill boolean,
  extraction jsonb,
  sanity_flags jsonb,
  confidence jsonb,
  error_message text,
  expense_id uuid references public.expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bills_user_time_idx
  on public.bills (user_id, created_at desc);
create index if not exists bills_user_status_idx
  on public.bills (user_id, status);

create table if not exists public.bill_items (
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

create index if not exists bill_items_bill_idx on public.bill_items (bill_id);

-- expenses.bill_id FK is added here (after bills exists).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_bill_fk'
  ) then
    alter table public.expenses
      add constraint expenses_bill_fk
      foreign key (bill_id) references public.bills(id) on delete set null;
  end if;
end $$;