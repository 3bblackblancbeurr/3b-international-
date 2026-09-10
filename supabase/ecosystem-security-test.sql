-- Entirely transactional fixtures: no test accounts or messages are retained.
begin;
select set_config('test3b.a',gen_random_uuid()::text,true),set_config('test3b.b',gen_random_uuid()::text,true),set_config('test3b.session',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('test3b.a')::uuid,'test-a-'||current_setting('test3b.a')||'@example.invalid'),(current_setting('test3b.b')::uuid,'test-b-'||current_setting('test3b.b')||'@example.invalid');
insert into auth.sessions(id,user_id,created_at,updated_at) values(current_setting('test3b.session')::uuid,current_setting('test3b.a')::uuid,now(),now());
insert into public.community_profiles(user_id,handle,name) values(current_setting('test3b.a')::uuid,'test-'||left(current_setting('test3b.a'),12),'Test A'),(current_setting('test3b.b')::uuid,'test-'||left(current_setting('test3b.b'),12),'Test B');
insert into public.community_posts(author_id,title,body,category,status) values(current_setting('test3b.a')::uuid,'Test A','Test transactionnel','discussion','visible'),(current_setting('test3b.b')::uuid,'Test B','Test transactionnel','discussion','visible'),(current_setting('test3b.b')::uuid,'Hidden','Masqué','discussion','hidden');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test3b.a'),'role','authenticated','session_id',current_setting('test3b.session'))::text,true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.community_posts where author_id in (current_setting('test3b.a')::uuid,current_setting('test3b.b')::uuid))<>2 then raise exception 'Visibility policy failed';end if;
 begin insert into public.community_posts(author_id,title,body,category) values(current_setting('test3b.b')::uuid,'Forged','Injected','discussion');raise exception 'Direct forged write succeeded';exception when insufficient_privilege then null;end;
 begin perform 1 from public.community_reports;raise exception 'Private reports accessible';exception when insufficient_privilege then null;end;
 begin perform 1 from public.community_staff;raise exception 'Staff accessible';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into public.community_blocks(user_id,target_id) values(current_setting('test3b.b')::uuid,current_setting('test3b.a')::uuid);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.community_posts where author_id=current_setting('test3b.b')::uuid) then raise exception 'Blocked author visible';end if;
 if exists(select 1 from public.community_profiles where user_id=current_setting('test3b.b')::uuid) then raise exception 'Blocked profile visible';end if;
end $$;
reset role;
delete from auth.sessions where id=current_setting('test3b.session')::uuid;
set local role authenticated;
do $$ begin if exists(select 1 from public.community_posts) then raise exception 'Revoked session can read';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.community_posts;raise exception 'Guest can read posts';exception when insufficient_privilege then null;end;
 begin perform 1 from public.messages;raise exception 'Legacy chat is public';exception when insufficient_privilege then null;end;
end $$;
reset role;
select jsonb_build_object('rls','passed','blocked_members','passed','forged_writes','rejected','revoked_session','rejected','anonymous_access','rejected','private_reports','protected','fixtures','rolled back') as test_result;
rollback;
