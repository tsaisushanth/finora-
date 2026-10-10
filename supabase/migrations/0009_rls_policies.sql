-- 0009_rls_policies.sql
-- Every table: RLS enabled + owner-only policies, with explicit grants to
-- `authenticated` (this project has "automatically expose new tables" OFF).

grant usage on schema public to authenticated;

-- ── Tables keyed by a `user_id` column ────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'categories','payment_methods','wallet_entries','expenses','income_entries',
    'loans','loan_repayments','goals','goal_contributions','bills','bill_items'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select using ((select auth.uid()) = user_id)',
      t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);

    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ── profiles (keyed by `id`, no delete — cascade from auth.users) ─────────────
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;

-- ── Derived views ─────────────────────────────────────────────────────────────
grant select on public.wallet_balances to authenticated;
grant select on public.goal_progress to authenticated;