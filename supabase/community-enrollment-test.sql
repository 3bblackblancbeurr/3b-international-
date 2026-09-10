-- Transactional security test. No accounts or messages survive this transaction.
begin;
select set_config('test3b.a',gen_random_uuid()::text,true),set_config('test3b.b',gen_random_uuid()::text,true),set_config('test3b.session',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('test3b.a')::uuid,'qa-'||current_setting('test3b.a')||'@example.invalid'),(current_setting('test3b.b')::uuid,'qa-'||current_setting('test3b.b')||'@example.invalid');
insert into auth.sessions(id,user_id,created_at,updated_at) values(current_setting('test3b.session')::uuid,current_setting('test3b.a')::uuid,now(),now());
insert into public.community_profiles(user_id,handle,name) values(current_setting('test3b.a')::uuid,'qa-'||left(current_setting('test3b.a'),12),'Test A'),(current_setting('test3b.b')::uuid,'qa-'||left(current_setting('test3b.b'),12),'Test B');
insert into public.community_chat(author_id,room,body) values(current_setting('test3b.b')::uuid,'general','Test transactionnel');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test3b.a'),'role','authenticated','session_id',current_setting('test3b.session'))::text,true);
set local role authenticated;
do $$ begin
 if member_private.community_enrolled() then raise exception 'Consent bypassed';end if;
 if exists(select 1 from public.community_chat) then raise exception 'Chat readable before consent';end if;
 begin update public.community_profiles set rules_version='2026-09-v1',rules_accepted_at=now() where user_id=auth.uid();raise exception 'Client can forge consent';exception when insufficient_privilege then null;end;
 begin insert into public.community_chat(author_id,room,body) values(auth.uid(),'general','Forged');raise exception 'Direct chat write succeeded';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.community_profiles set rules_version='2026-09-v1',rules_accepted_at=now() where user_id=current_setting('test3b.a')::uuid;
set local role authenticated;
do $$ begin
 if not member_private.community_enrolled() then raise exception 'Valid member refused';end if;
 if not exists(select 1 from public.community_chat where author_id=current_setting('test3b.b')::uuid) then raise exception 'Valid member cannot read chat';end if;
end $$;
reset role;
insert into public.community_blocks(user_id,target_id) values(current_setting('test3b.b')::uuid,current_setting('test3b.a')::uuid);
set local role authenticated;
do $$ begin if exists(select 1 from public.community_chat where author_id=current_setting('test3b.b')::uuid) then raise exception 'Two-way block bypassed';end if;end $$;
reset role;
update public.community_profiles set listed=false where user_id=current_setting('test3b.a')::uuid;
set local role authenticated;
do $$ begin if member_private.community_enrolled() or exists(select 1 from public.community_chat) then raise exception 'Hidden profile can read chat';end if;end $$;
reset role;
update public.community_profiles set listed=true where user_id=current_setting('test3b.a')::uuid;
delete from auth.sessions where id=current_setting('test3b.session')::uuid;
set local role authenticated;
do $$ begin if member_private.community_enrolled() or exists(select 1 from public.community_chat) then raise exception 'Revoked session can read chat';end if;end $$;
reset role;
set local role anon;
do $$ begin begin perform 1 from public.community_chat;raise exception 'Anonymous chat read succeeded';exception when insufficient_privilege then null;end;end $$;
reset role;
select jsonb_build_object('consent_required',true,'direct_writes_rejected',true,'valid_enrollment_accepted',true,'two_way_blocks_enforced',true,'hidden_profile_rejected',true,'revoked_session_rejected',true,'anonymous_access_rejected',true,'fixtures','rolled back') as test_result;
rollback;

