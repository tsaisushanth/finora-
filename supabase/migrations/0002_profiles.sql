-- 0002_profiles.sql
-- 1:1 with auth.users. `id` is the user id (not `user_id`).

create table if not exists public.profiles (
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
  savings_target_percent numeric(5,2) not null default 0
    check (savings_target_percent between 0 and 100),
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

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;