-- 0001_extensions.sql
-- Extensions and shared helper functions used by later migrations.

create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Keeps `updated_at` honest on every table that has it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;