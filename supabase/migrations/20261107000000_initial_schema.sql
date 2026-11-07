create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) between 1 and 100),
  country text not null default 'Zambia' check (char_length(country) between 1 and 80),
  currency text not null default 'ZMW' check (currency = 'ZMW'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  type text not null check (type in ('cash','bank','mtn_money','airtel_money','other')),
  opening_balance_minor bigint not null default 0 check (opening_balance_minor >= 0),
  archived boolean not null default false, created_at timestamptz not null default now(), unique (user_id, id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60), type text not null check (type in ('income','expense')),
  created_at timestamptz not null default now(), unique (user_id, id), unique (user_id, name, type)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  title text not null check (char_length(trim(title)) between 1 and 60), amount_minor bigint not null check (amount_minor > 0),
  transaction_date date not null, note text check (note is null or char_length(note) <= 500),
  category_id uuid, account_id uuid, from_account_id uuid, to_account_id uuid, created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, category_id) references public.categories(user_id, id),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  foreign key (user_id, from_account_id) references public.accounts(user_id, id),
  foreign key (user_id, to_account_id) references public.accounts(user_id, id),
  check (
    (type = 'income' and category_id is not null and account_id is not null and from_account_id is null and to_account_id is null)
    or (type = 'expense' and category_id is not null and account_id is not null and from_account_id is null and to_account_id is null)
    or (type = 'transfer' and category_id is null and account_id is null and from_account_id is not null and to_account_id is not null and from_account_id <> to_account_id)
  )
);
create table public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null, limit_minor bigint not null check (limit_minor > 0),
  period text not null default 'monthly' check (period in ('monthly','custom')),
  start_date date, end_date date, warning_threshold integer not null default 80 check (warning_threshold between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (user_id, category_id) references public.categories(user_id, id), unique (user_id, category_id),
  check ((period = 'monthly' and start_date is null and end_date is null) or (period = 'custom' and start_date is not null and end_date is not null and end_date >= start_date))
);
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80), target_minor bigint not null check (target_minor > 0),
  target_date date, completed boolean not null default false, created_at timestamptz not null default now(), unique (user_id, id)
);
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null, amount_minor bigint not null check (amount_minor > 0),
  type text not null check (type in ('contribution','withdrawal')), contribution_date date not null default current_date,
  created_at timestamptz not null default now(),
  foreign key (user_id, goal_id) references public.savings_goals(user_id, id) on delete cascade
);

create index accounts_user_id_idx on public.accounts(user_id);
create index categories_user_id_idx on public.categories(user_id);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index budgets_user_id_idx on public.budgets(user_id);
create index savings_goals_user_id_idx on public.savings_goals(user_id);
create index goal_contributions_user_goal_idx on public.goal_contributions(user_id, goal_id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'));
  insert into public.categories (user_id, name, type) values
    (new.id,'Food','expense'),(new.id,'Transport','expense'),(new.id,'Accommodation','expense'),
    (new.id,'Airtime and data','expense'),(new.id,'Education','expense'),(new.id,'Entertainment','expense'),
    (new.id,'Shopping','expense'),(new.id,'Healthcare','expense'),(new.id,'Personal care','expense'),
    (new.id,'Utilities','expense'),(new.id,'Other expenses','expense'),(new.id,'Allowance','income'),
    (new.id,'Salary','income'),(new.id,'Freelance','income'),(new.id,'Business','income'),
    (new.id,'Scholarship','income'),(new.id,'Gifts','income'),(new.id,'Other income','income');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

create function public.validate_transaction_category() returns trigger
language plpgsql set search_path = '' as $$
declare category_type text;
begin
  if new.type = 'transfer' then return new; end if;
  select c.type into category_type from public.categories c
  where c.user_id = new.user_id and c.id = new.category_id;
  if category_type is null or category_type <> new.type then
    raise exception 'Category type does not match financial record' using errcode = '23514';
  end if;
  return new;
end;
$$;
create function public.validate_budget_category() returns trigger
language plpgsql set search_path = '' as $$
declare category_type text;
begin
  select c.type into category_type from public.categories c
  where c.user_id = new.user_id and c.id = new.category_id;
  if category_type is distinct from 'expense' then
    raise exception 'Budgets require an expense category' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger transactions_category_type before insert or update on public.transactions
for each row execute procedure public.validate_transaction_category();
create trigger budgets_category_type before insert or update on public.budgets
for each row execute procedure public.validate_budget_category();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
create policy "profile owner access" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "account owner access" on public.accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "category owner access" on public.categories for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transaction owner access" on public.transactions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "budget owner access" on public.budgets for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "savings goal owner access" on public.savings_goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goal contribution owner access" on public.goal_contributions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.profiles, public.accounts, public.categories, public.transactions, public.budgets, public.savings_goals, public.goal_contributions to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

create function public.save_finance_snapshot(
  p_accounts jsonb, p_transactions jsonb, p_budgets jsonb, p_savings_goals jsonb
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := (select auth.uid());
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_accounts) <> 'array' or jsonb_typeof(p_transactions) <> 'array'
    or jsonb_typeof(p_budgets) <> 'array' or jsonb_typeof(p_savings_goals) <> 'array' then
    raise exception 'Invalid finance snapshot';
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
end;
$$;
revoke all on function public.save_finance_snapshot(jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.save_finance_snapshot(jsonb,jsonb,jsonb,jsonb) to authenticated;
