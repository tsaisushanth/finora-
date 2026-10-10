-- 0011_triggers_and_seed.sql
-- On signup: create the profile and seed per-user default categories /
-- payment methods. No demo users or fake financial data are ever seeded here.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id,
    v_name,
    new.raw_user_meta_data->>'avatar_url',
    nullif(lower(new.raw_user_meta_data->>'username'), '')
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, kind, name, color, icon, sort_order, is_default)
  values
    (new.id, 'expense', 'Food & Dining', '#0B6E5F', 'utensils', 1, true),
    (new.id, 'expense', 'Groceries', '#0EA5A4', 'shopping-cart', 2, true),
    (new.id, 'expense', 'Transport', '#2563EB', 'bus', 3, true),
    (new.id, 'expense', 'Rent & Bills', '#7C3AED', 'home', 4, true),
    (new.id, 'expense', 'Shopping', '#DB2777', 'shopping-bag', 5, true),
    (new.id, 'expense', 'Entertainment', '#F59E0B', 'clapperboard', 6, true),
    (new.id, 'expense', 'Health', '#DC2626', 'heart-pulse', 7, true),
    (new.id, 'expense', 'Education', '#0891B2', 'graduation-cap', 8, true),
    (new.id, 'expense', 'Subscriptions', '#9333EA', 'repeat', 9, true),
    (new.id, 'expense', 'Other', '#64748B', 'circle', 99, true),
    (new.id, 'income', 'Salary', '#2563EB', 'briefcase', 1, true),
    (new.id, 'income', 'Pocket Money', '#0B6E5F', 'gift', 2, true),
    (new.id, 'income', 'Freelance', '#0EA5A4', 'laptop', 3, true),
    (new.id, 'income', 'Interest', '#F59E0B', 'percent', 4, true),
    (new.id, 'income', 'Other', '#64748B', 'circle', 99, true),
    (new.id, 'goal', 'Emergency Fund', '#DC2626', 'shield', 1, true),
    (new.id, 'goal', 'Travel', '#0891B2', 'plane', 2, true),
    (new.id, 'goal', 'Gadget', '#7C3AED', 'smartphone', 3, true),
    (new.id, 'goal', 'Education', '#2563EB', 'graduation-cap', 4, true)
  on conflict do nothing;

  insert into public.payment_methods (user_id, name, type, is_default)
  values
    (new.id, 'Cash', 'cash', true),
    (new.id, 'UPI', 'upi', false),
    (new.id, 'Bank Account', 'bank', false),
    (new.id, 'Card', 'card', false)
  on conflict do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at maintenance ───────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'profiles','categories','payment_methods','expenses','income_entries',
    'loans','goals','bills'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;