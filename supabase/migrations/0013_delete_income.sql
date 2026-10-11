-- 0013_delete_income.sql
-- Phase 4: income deletion must be atomic with its wallet ledger entry,
-- so it is an owner-checked SECURITY INVOKER function like delete_expense.

create or replace function public.delete_income(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  delete from public.wallet_entries
  where user_id = v_uid and ref_type = 'income' and ref_id = p_id;

  delete from public.income_entries where id = p_id and user_id = v_uid;
  if not found then raise exception 'income not found'; end if;
end;
$$;
grant execute on function public.delete_income(uuid) to authenticated;