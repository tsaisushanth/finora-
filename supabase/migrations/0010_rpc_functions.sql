-- 0010_rpc_functions.sql
-- Every multi-table write is an atomic, owner-checked SECURITY INVOKER function.

-- ── Current wallet balance (derived) ─────────────────────────────────────────
create or replace function public.wallet_balance()
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount), 0)::numeric(12,2)
  from public.wallet_entries
  where user_id = (select auth.uid());
$$;
grant execute on function public.wallet_balance() to authenticated;

-- ── Opening balance (onboarding, once) ───────────────────────────────────────
create or replace function public.set_opening_balance(p_amount numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount < 0 then
    raise exception 'opening balance cannot be negative';
  end if;
  if exists (
    select 1 from public.wallet_entries
    where user_id = v_uid and type = 'opening_balance'
  ) then
    raise exception 'opening balance already set';
  end if;

  insert into public.wallet_entries (user_id, type, amount, note, ref_type)
  values (v_uid, 'opening_balance', v_amount, 'Opening balance', 'adjustment');
end;
$$;
grant execute on function public.set_opening_balance(numeric) to authenticated;

-- ── Expenses ─────────────────────────────────────────────────────────────────
create or replace function public.create_expense(
  p_amount numeric,
  p_category_id uuid default null,
  p_payment_method_id uuid default null,
  p_merchant text default null,
  p_note text default null,
  p_occurred_at timestamptz default now(),
  p_bill_id uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id and user_id = v_uid
  ) then raise exception 'invalid category'; end if;
  if p_payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_uid
  ) then raise exception 'invalid payment method'; end if;
  if p_bill_id is not null and not exists (
    select 1 from public.bills where id = p_bill_id and user_id = v_uid
  ) then raise exception 'invalid bill'; end if;

  insert into public.expenses (
    user_id, category_id, payment_method_id, amount, merchant, note, occurred_at, bill_id
  ) values (
    v_uid, p_category_id, p_payment_method_id, v_amount,
    nullif(btrim(p_merchant), ''), nullif(btrim(p_note), ''),
    coalesce(p_occurred_at, now()), p_bill_id
  ) returning id into v_id;

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid, 'expense', -v_amount, coalesce(p_occurred_at, now()),
    nullif(btrim(p_merchant), ''), 'expense', v_id
  );

  return v_id;
end;
$$;
grant execute on function public.create_expense(numeric, uuid, uuid, text, text, timestamptz, uuid) to authenticated;

create or replace function public.update_expense(
  p_id uuid,
  p_amount numeric,
  p_category_id uuid default null,
  p_payment_method_id uuid default null,
  p_merchant text default null,
  p_note text default null,
  p_occurred_at timestamptz default now()
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id and user_id = v_uid
  ) then raise exception 'invalid category'; end if;
  if p_payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_uid
  ) then raise exception 'invalid payment method'; end if;

  update public.expenses
  set category_id = p_category_id,
      payment_method_id = p_payment_method_id,
      amount = v_amount,
      merchant = nullif(btrim(p_merchant), ''),
      note = nullif(btrim(p_note), ''),
      occurred_at = coalesce(p_occurred_at, occurred_at)
  where id = p_id and user_id = v_uid;

  if not found then raise exception 'expense not found'; end if;

  update public.wallet_entries
  set amount = -v_amount,
      occurred_at = coalesce(p_occurred_at, occurred_at),
      note = nullif(btrim(p_merchant), '')
  where user_id = v_uid and ref_type = 'expense' and ref_id = p_id;

  if not found then
    insert into public.wallet_entries (
      user_id, type, amount, occurred_at, note, ref_type, ref_id
    ) values (
      v_uid, 'expense', -v_amount, coalesce(p_occurred_at, now()),
      nullif(btrim(p_merchant), ''), 'expense', p_id
    );
  end if;
end;
$$;
grant execute on function public.update_expense(uuid, numeric, uuid, uuid, text, text, timestamptz) to authenticated;

create or replace function public.delete_expense(p_id uuid)
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
  where user_id = v_uid and ref_type = 'expense' and ref_id = p_id;

  delete from public.expenses where id = p_id and user_id = v_uid;
  if not found then raise exception 'expense not found'; end if;
end;
$$;
grant execute on function public.delete_expense(uuid) to authenticated;

-- ── Income ───────────────────────────────────────────────────────────────────
create or replace function public.add_income(
  p_amount numeric,
  p_source text default null,
  p_category_id uuid default null,
  p_note text default null,
  p_occurred_at timestamptz default now()
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id and user_id = v_uid
  ) then raise exception 'invalid category'; end if;

  insert into public.income_entries (
    user_id, amount, source, category_id, note, occurred_at
  ) values (
    v_uid, v_amount, nullif(btrim(p_source), ''), p_category_id,
    nullif(btrim(p_note), ''), coalesce(p_occurred_at, now())
  ) returning id into v_id;

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid, 'income', v_amount, coalesce(p_occurred_at, now()),
    nullif(btrim(p_source), ''), 'income', v_id
  );

  return v_id;
end;
$$;
grant execute on function public.add_income(numeric, text, uuid, text, timestamptz) to authenticated;

-- ── Goals ────────────────────────────────────────────────────────────────────
create or replace function public.create_goal(
  p_name text,
  p_target_amount numeric,
  p_category_id uuid default null,
  p_priority text default 'medium',
  p_target_date date default null,
  p_description text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_target numeric(12,2) := round(p_target_amount, 2);
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'goal name is required'; end if;
  if v_target is null or v_target <= 0 then raise exception 'target amount must be greater than zero'; end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id and user_id = v_uid
  ) then raise exception 'invalid category'; end if;

  insert into public.goals (
    user_id, name, target_amount, category_id, priority, target_date, description
  ) values (
    v_uid, btrim(p_name), v_target, p_category_id, p_priority, p_target_date,
    nullif(btrim(p_description), '')
  ) returning id into v_id;

  return v_id;
end;
$$;
grant execute on function public.create_goal(text, numeric, uuid, text, date, text) to authenticated;

create or replace function public.update_goal(
  p_id uuid,
  p_name text,
  p_target_amount numeric,
  p_category_id uuid default null,
  p_priority text default 'medium',
  p_target_date date default null,
  p_description text default null,
  p_status text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_target numeric(12,2) := round(p_target_amount, 2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'goal name is required'; end if;
  if v_target is null or v_target <= 0 then raise exception 'target amount must be greater than zero'; end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id and user_id = v_uid
  ) then raise exception 'invalid category'; end if;

  update public.goals
  set name = btrim(p_name),
      target_amount = v_target,
      category_id = p_category_id,
      priority = p_priority,
      target_date = p_target_date,
      description = nullif(btrim(p_description), ''),
      status = coalesce(p_status, status)
  where id = p_id and user_id = v_uid;

  if not found then raise exception 'goal not found'; end if;
end;
$$;
grant execute on function public.update_goal(uuid, text, numeric, uuid, text, date, text, text) to authenticated;

create or replace function public.contribute_to_goal(
  p_goal_id uuid,
  p_amount numeric,
  p_occurred_at timestamptz default now(),
  p_note text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
  v_goal public.goals%rowtype;
  v_saved numeric(12,2);
  v_balance numeric(12,2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  select * into v_goal from public.goals where id = p_goal_id and user_id = v_uid;
  if not found then raise exception 'goal not found'; end if;
  if v_goal.status not in ('active', 'paused') then
    raise exception 'goal is not accepting contributions';
  end if;

  select coalesce(sum(case when kind = 'contribution' then amount else -amount end), 0)
    into v_saved
  from public.goal_contributions where goal_id = p_goal_id;

  if v_amount > v_goal.target_amount - v_saved then
    raise exception 'contribution exceeds remaining goal amount';
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from public.wallet_entries where user_id = v_uid;

  if v_amount > v_balance then
    raise exception 'insufficient wallet balance';
  end if;

  insert into public.goal_contributions (
    user_id, goal_id, amount, kind, occurred_at, note
  ) values (
    v_uid, p_goal_id, v_amount, 'contribution',
    coalesce(p_occurred_at, now()), nullif(btrim(p_note), '')
  );

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid, 'goal_contribution', -v_amount, coalesce(p_occurred_at, now()),
    nullif(btrim(p_note), ''), 'goal', p_goal_id
  );

  if v_saved + v_amount >= v_goal.target_amount then
    update public.goals set status = 'completed' where id = p_goal_id and user_id = v_uid;
  end if;
end;
$$;
grant execute on function public.contribute_to_goal(uuid, numeric, timestamptz, text) to authenticated;

create or replace function public.withdraw_from_goal(
  p_goal_id uuid,
  p_amount numeric,
  p_occurred_at timestamptz default now(),
  p_note text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
  v_goal public.goals%rowtype;
  v_saved numeric(12,2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  select * into v_goal from public.goals where id = p_goal_id and user_id = v_uid;
  if not found then raise exception 'goal not found'; end if;

  select coalesce(sum(case when kind = 'contribution' then amount else -amount end), 0)
    into v_saved
  from public.goal_contributions where goal_id = p_goal_id;

  if v_amount > v_saved then
    raise exception 'withdrawal exceeds saved amount';
  end if;

  insert into public.goal_contributions (
    user_id, goal_id, amount, kind, occurred_at, note
  ) values (
    v_uid, p_goal_id, v_amount, 'withdrawal',
    coalesce(p_occurred_at, now()), nullif(btrim(p_note), '')
  );

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid, 'goal_withdrawal', v_amount, coalesce(p_occurred_at, now()),
    nullif(btrim(p_note), ''), 'goal', p_goal_id
  );

  if v_saved - v_amount < v_goal.target_amount and v_goal.status = 'completed' then
    update public.goals set status = 'active' where id = p_goal_id and user_id = v_uid;
  end if;
end;
$$;
grant execute on function public.withdraw_from_goal(uuid, numeric, timestamptz, text) to authenticated;

create or replace function public.delete_goal(p_goal_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_saved numeric(12,2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  if not exists (
    select 1 from public.goals where id = p_goal_id and user_id = v_uid
  ) then raise exception 'goal not found'; end if;

  select coalesce(sum(case when kind = 'contribution' then amount else -amount end), 0)
    into v_saved
  from public.goal_contributions where goal_id = p_goal_id;

  if v_saved > 0 then
    insert into public.wallet_entries (
      user_id, type, amount, note, ref_type, ref_id
    ) values (
      v_uid, 'goal_withdrawal', v_saved,
      'Goal deleted - funds returned to wallet', 'goal', p_goal_id
    );
  end if;

  delete from public.goals where id = p_goal_id and user_id = v_uid;
end;
$$;
grant execute on function public.delete_goal(uuid) to authenticated;

-- ── Loans ────────────────────────────────────────────────────────────────────
create or replace function public.record_loan(
  p_direction text,
  p_person text,
  p_principal numeric,
  p_due_date date default null,
  p_note text default null,
  p_occurred_at timestamptz default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_principal numeric(12,2) := round(p_principal, 2);
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_direction not in ('lent', 'borrowed') then
    raise exception 'direction must be lent or borrowed';
  end if;
  if p_person is null or btrim(p_person) = '' then
    raise exception 'person is required';
  end if;
  if v_principal is null or v_principal <= 0 then
    raise exception 'principal must be greater than zero';
  end if;

  insert into public.loans (
    user_id, direction, person, principal, due_date, note, occurred_at
  ) values (
    v_uid, p_direction, btrim(p_person), v_principal, p_due_date,
    nullif(btrim(p_note), ''), coalesce(p_occurred_at, now())
  ) returning id into v_id;

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid,
    case when p_direction = 'lent' then 'loan_given' else 'loan_taken' end,
    case when p_direction = 'lent' then -v_principal else v_principal end,
    coalesce(p_occurred_at, now()),
    btrim(p_person), 'loan', v_id
  );

  return v_id;
end;
$$;
grant execute on function public.record_loan(text, text, numeric, date, text, timestamptz) to authenticated;

create or replace function public.repay_loan(
  p_loan_id uuid,
  p_amount numeric,
  p_occurred_at timestamptz default now(),
  p_note text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount, 2);
  v_loan public.loans%rowtype;
  v_repaid numeric(12,2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  select * into v_loan from public.loans where id = p_loan_id and user_id = v_uid;
  if not found then raise exception 'loan not found'; end if;
  if v_loan.status in ('settled', 'written_off') then
    raise exception 'loan is already closed';
  end if;

  select coalesce(sum(amount), 0) into v_repaid
  from public.loan_repayments where loan_id = p_loan_id;

  if v_amount > v_loan.principal - v_repaid then
    raise exception 'repayment exceeds outstanding balance';
  end if;

  insert into public.loan_repayments (
    user_id, loan_id, amount, occurred_at, note
  ) values (
    v_uid, p_loan_id, v_amount, coalesce(p_occurred_at, now()),
    nullif(btrim(p_note), '')
  );

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid,
    case when v_loan.direction = 'lent'
      then 'loan_repayment_received' else 'loan_repayment_made' end,
    case when v_loan.direction = 'lent' then v_amount else -v_amount end,
    coalesce(p_occurred_at, now()),
    v_loan.person, 'loan', p_loan_id
  );

  update public.loans
  set status = case
    when v_repaid + v_amount >= v_loan.principal then 'settled'
    else 'partially_repaid'
  end
  where id = p_loan_id and user_id = v_uid;
end;
$$;
grant execute on function public.repay_loan(uuid, numeric, timestamptz, text) to authenticated;

-- ── Manual adjustment (replaces the old editable balance) ────────────────────
create or replace function public.adjust_balance(
  p_amount_delta numeric,
  p_reason text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_amount numeric(12,2) := round(p_amount_delta, 2);
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_amount is null or v_amount = 0 then
    raise exception 'adjustment amount cannot be zero';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason is required for an adjustment';
  end if;

  insert into public.wallet_entries (
    user_id, type, amount, note, ref_type
  ) values (
    v_uid, 'adjustment', v_amount, btrim(p_reason), 'adjustment'
  );
end;
$$;
grant execute on function public.adjust_balance(numeric, text) to authenticated;

-- ── Confirm a scanned bill → expense + ledger (atomic) ───────────────────────
create or replace function public.confirm_bill(
  p_bill_id uuid,
  p_payload jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_bill public.bills%rowtype;
  v_amount numeric(12,2);
  v_category_id uuid;
  v_payment_method_id uuid;
  v_occurred_at timestamptz;
  v_expense_id uuid;
  v_item jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_bill from public.bills where id = p_bill_id and user_id = v_uid;
  if not found then raise exception 'bill not found'; end if;
  if v_bill.status = 'confirmed' then raise exception 'bill already confirmed'; end if;

  if p_payload is null or not (p_payload ? 'amount') then
    raise exception 'payload.amount is required';
  end if;
  v_amount := round((p_payload->>'amount')::numeric, 2);
  if v_amount is null or v_amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  v_category_id := nullif(p_payload->>'category_id', '')::uuid;
  v_payment_method_id := nullif(p_payload->>'payment_method_id', '')::uuid;
  v_occurred_at := coalesce(nullif(p_payload->>'occurred_at', '')::timestamptz, now());

  if v_category_id is not null and not exists (
    select 1 from public.categories where id = v_category_id and user_id = v_uid
  ) then raise exception 'invalid category'; end if;
  if v_payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = v_payment_method_id and user_id = v_uid
  ) then raise exception 'invalid payment method'; end if;

  insert into public.expenses (
    user_id, category_id, payment_method_id, amount, merchant, note, occurred_at, bill_id
  ) values (
    v_uid, v_category_id, v_payment_method_id, v_amount,
    nullif(btrim(p_payload->>'merchant'), ''),
    nullif(btrim(p_payload->>'note'), ''),
    v_occurred_at, p_bill_id
  ) returning id into v_expense_id;

  insert into public.wallet_entries (
    user_id, type, amount, occurred_at, note, ref_type, ref_id
  ) values (
    v_uid, 'expense', -v_amount, v_occurred_at,
    nullif(btrim(p_payload->>'merchant'), ''), 'expense', v_expense_id
  );

  if p_payload ? 'items' then
    delete from public.bill_items where bill_id = p_bill_id;
    for v_item in select * from jsonb_array_elements(p_payload->'items') loop
      insert into public.bill_items (
        user_id, bill_id, description, quantity, unit_price, amount, suggested_category
      ) values (
        v_uid, p_bill_id,
        nullif(btrim(v_item->>'description'), ''),
        nullif(v_item->>'quantity', '')::numeric,
        nullif(v_item->>'unit_price', '')::numeric,
        nullif(v_item->>'amount', '')::numeric,
        nullif(btrim(v_item->>'suggested_category'), '')
      );
    end loop;
  end if;

  update public.bills
  set expense_id = v_expense_id, status = 'confirmed'
  where id = p_bill_id and user_id = v_uid;

  return v_expense_id;
end;
$$;
grant execute on function public.confirm_bill(uuid, jsonb) to authenticated;