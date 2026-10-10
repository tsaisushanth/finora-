-- 0012_storage_buckets.sql
-- Private buckets; objects are namespaced by the owner's uid as the first
-- path segment: `<uid>/<file>`.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('bills', 'bills', false)
on conflict (id) do nothing;

-- ── avatars ──────────────────────────────────────────────────────────────────
drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── bills ────────────────────────────────────────────────────────────────────
drop policy if exists "bills_select_own" on storage.objects;
create policy "bills_select_own" on storage.objects for select
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "bills_insert_own" on storage.objects;
create policy "bills_insert_own" on storage.objects for insert
  with check (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "bills_update_own" on storage.objects;
create policy "bills_update_own" on storage.objects for update
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "bills_delete_own" on storage.objects;
create policy "bills_delete_own" on storage.objects for delete
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text);