-- 0003_categories_payment_methods.sql

create table if not exists public.categories (
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

create unique index if not exists categories_user_kind_name_key
  on public.categories (user_id, kind, lower(name));

create index if not exists categories_user_kind_idx
  on public.categories (user_id, kind) where archived_at is null;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  type text not null default 'other' check (type in ('cash','upi','card','bank','other')),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_methods_user_name_key
  on public.payment_methods (user_id, lower(name));