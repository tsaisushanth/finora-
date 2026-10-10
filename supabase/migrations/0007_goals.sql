-- 0007_goals.sql

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_amount numeric(12,2) not null check (target_amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  target_date date,
  description text,
  status text not null default 'active'
    check (status in ('active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_status_idx on public.goals (user_id, status);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  kind text not null default 'contribution'
    check (kind in ('contribution','withdrawal')),
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_goal_idx
  on public.goal_contributions (goal_id);
create index if not exists goal_contributions_user_idx
  on public.goal_contributions (user_id);

create or replace view public.goal_progress
with (security_invoker = true) as
  select
    g.id,
    g.user_id,
    g.target_amount,
    coalesce(sum(case when c.kind = 'contribution' then c.amount else -c.amount end), 0)
      ::numeric(12,2) as saved_amount
  from public.goals g
  left join public.goal_contributions c on c.goal_id = g.id
  group by g.id, g.user_id, g.target_amount;