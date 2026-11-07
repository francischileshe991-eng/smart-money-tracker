begin;
select plan(14);
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
 ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','rls-a@example.test','',now(),now(),now()),
 ('20000000-0000-4000-8000-000000000002','authenticated','authenticated','rls-b@example.test','',now(),now(),now()) on conflict (id) do nothing;
insert into public.accounts (id,user_id,name,type,opening_balance_minor)
values ('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','A wallet','cash',10000);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.accounts),1,'owner reads own account');
select is((select count(*)::int from public.profiles),1,'owner reads own profile');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.accounts),0,'other user cannot read account');
select is((select count(*)::int from public.profiles),1,'other user sees only own profile');
select throws_ok($$insert into public.accounts(user_id,name,type) values ('10000000-0000-4000-8000-000000000001','forged','cash')$$,'42501',null,'cannot create row for another user');
select throws_ok($$select public.save_finance_snapshot('[]','[{"id":"40000000-0000-4000-8000-000000000004","type":"expense","title":"cross account","amountMinor":100,"date":"2026-11-07","category":"Food","accountId":"30000000-0000-4000-8000-000000000003"}]','[]','[]')$$,'23503',null,'snapshot cannot reference another user account');
select lives_ok($$update public.accounts set name='stolen' where id='30000000-0000-4000-8000-000000000003'$$,'other user update cannot affect owner data');
select lives_ok($$delete from public.accounts where id='30000000-0000-4000-8000-000000000003'$$,'other user delete cannot affect owner data');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select name from public.accounts where id='30000000-0000-4000-8000-000000000003'),'A wallet','owner data remains unchanged');
select is((select count(*)::int from public.categories),18,'signup seeds private categories');
select is((select count(*)::int from public.budgets),0,'user cannot read another budget');
select is((select count(*)::int from public.savings_goals),0,'user cannot read another goal');
select is((select count(*)::int from public.goal_contributions),0,'user cannot read another contribution');
select is((select count(*)::int from public.transactions),0,'user cannot read another transaction');
select * from finish();
rollback;
