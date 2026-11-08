-- Offline-first support: track a per-user revision so clients can detect a
-- cloud copy that changed while they were offline, and fail the save instead of
-- silently overwriting it.

create table if not exists public.finance_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.finance_sync_state enable row level security;

create policy "finance sync state owner access" on public.finance_sync_state
  for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.finance_sync_state to authenticated;

-- Existing users written by earlier app versions have data but no revision row.
-- Start them at revision 1 so a fresh offline client does not treat cloud data as
-- an empty local snapshot.
insert into public.finance_sync_state (user_id, revision)
select u.id, 1
from auth.users u
where exists (select 1 from public.accounts a where a.user_id = u.id)
   or exists (select 1 from public.transactions t where t.user_id = u.id)
   or exists (select 1 from public.budgets b where b.user_id = u.id)
   or exists (select 1 from public.savings_goals g where g.user_id = u.id)
on conflict (user_id) do nothing;

drop function if exists public.save_finance_snapshot(jsonb, jsonb, jsonb, jsonb);

create function public.save_finance_snapshot(
  p_accounts jsonb,
  p_transactions jsonb,
  p_budgets jsonb,
  p_savings_goals jsonb,
  p_expected_revision bigint default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := (select auth.uid());
  current_revision bigint;
  next_revision bigint;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_expected_revision is not null and p_expected_revision < 0 then
    raise exception 'Invalid revision';
  end if;
  if p_accounts is null or jsonb_typeof(p_accounts) <> 'array'
    or p_transactions is null or jsonb_typeof(p_transactions) <> 'array'
    or p_budgets is null or jsonb_typeof(p_budgets) <> 'array'
    or p_savings_goals is null or jsonb_typeof(p_savings_goals) <> 'array' then
    raise exception 'Invalid finance snapshot';
  end if;

  -- Serialise writers per user. If the row does not exist yet, create it at
  -- revision 0, then lock it for the duration of this transaction.
  insert into public.finance_sync_state (user_id) values (owner_id)
  on conflict (user_id) do nothing;

  select revision into current_revision
  from public.finance_sync_state
  where user_id = owner_id
  for update;

  -- Optimistic concurrency: a different revision means another device wrote
  -- since this client last synced, so report a conflict and write nothing.
  if p_expected_revision is not null and p_expected_revision <> current_revision then
    return jsonb_build_object('conflict', true, 'revision', current_revision);
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_transactions) as x(type text,category text)
    where x.type <> 'transfer' and not exists (
      select 1 from public.categories c where c.user_id=owner_id and c.name=x.category and c.type=x.type
    )
  ) then raise exception 'Transaction category is invalid'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_budgets) as x(category text)
    where not exists (
      select 1 from public.categories c where c.user_id=owner_id and c.name=x.category and c.type='expense'
    )
  ) then raise exception 'Budget category is invalid'; end if;

  delete from public.goal_contributions where user_id = owner_id;
  delete from public.savings_goals where user_id = owner_id;
  delete from public.budgets where user_id = owner_id;
  delete from public.transactions where user_id = owner_id;
  delete from public.accounts where user_id = owner_id;

  insert into public.accounts (id,user_id,name,type,opening_balance_minor,archived)
  select x.id,owner_id,x.name,x.type,x."openingBalanceMinor",coalesce(x.archived,false)
  from jsonb_to_recordset(p_accounts) as x(id uuid,name text,type text,"openingBalanceMinor" bigint,archived boolean);

  insert into public.transactions (id,user_id,type,title,amount_minor,transaction_date,note,category_id,account_id,from_account_id,to_account_id)
  select x.id,owner_id,x.type,x.title,x."amountMinor",x.date::date,x.note,c.id,x."accountId",x."fromAccountId",x."toAccountId"
  from jsonb_to_recordset(p_transactions) as x(id uuid,type text,title text,"amountMinor" bigint,date text,note text,category text,"accountId" uuid,"fromAccountId" uuid,"toAccountId" uuid)
  left join public.categories c on c.user_id=owner_id and c.name=x.category and c.type=x.type;

  insert into public.budgets (user_id,category_id,limit_minor,period,start_date,end_date,warning_threshold)
  select owner_id,c.id,x."limitMinor",coalesce(x.period,'monthly'),x."startDate"::date,x."endDate"::date,coalesce(x."warningThreshold",80)
  from jsonb_to_recordset(p_budgets) as x(category text,"limitMinor" bigint,period text,"startDate" text,"endDate" text,"warningThreshold" integer)
  join public.categories c on c.user_id=owner_id and c.name=x.category and c.type='expense';

  insert into public.savings_goals (id,user_id,name,target_minor,target_date,completed)
  select x.id,owner_id,x.name,x."targetMinor",x."targetDate"::date,coalesce(x.completed,false)
  from jsonb_to_recordset(p_savings_goals) as x(id uuid,name text,"targetMinor" bigint,"targetDate" text,completed boolean);

  insert into public.goal_contributions (id,user_id,goal_id,amount_minor,type,contribution_date)
  select (event->>'id')::uuid,owner_id,g.id,(event->>'amountMinor')::bigint,event->>'type',(event->>'date')::date
  from jsonb_array_elements(p_savings_goals) as goal
  join public.savings_goals g on g.user_id=owner_id and g.id=(goal->>'id')::uuid
  cross join lateral jsonb_array_elements(coalesce(goal->'history','[]'::jsonb)) as event;

  update public.finance_sync_state
  set revision = revision + 1, updated_at = now()
  where user_id = owner_id
  returning revision into next_revision;

  return jsonb_build_object('conflict', false, 'revision', next_revision);
end;
$$;

revoke all on function public.save_finance_snapshot(jsonb, jsonb, jsonb, jsonb, bigint) from public, anon;
grant execute on function public.save_finance_snapshot(jsonb, jsonb, jsonb, jsonb, bigint) to authenticated;
