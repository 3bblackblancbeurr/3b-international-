import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createCompetitionSchema} from './helpers/loyalty-competition-schema.js';

const A='00000000-0000-4000-8000-000000000001';
const B='00000000-0000-4000-8000-000000000002';
const REVIEWER='00000000-0000-4000-8000-000000000003';
const RUN='00000000-0000-4000-8000-000000000011';
const ROOM='00000000-0000-4000-8000-000000000021';
const MATCH='00000000-0000-4000-8000-000000000031';
const sql=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const patch='supabase/migrations/20261005131925_loyalty_refund_ledger_reversal_v1.sql';
function functionSql(path,name){
 const source=sql(path),start=source.search(new RegExp('create(?: or replace)? function public\\.'+name+'\\(','i'));
 assert.notEqual(start,-1,'function exists: '+name);
 const body=source.slice(start),delimiter=body.match(/\bas\s+(\$[a-z_]*\$)/i)?.[1];
 assert.ok(delimiter,'function body exists: '+name);
 const end=body.indexOf(delimiter,body.indexOf(delimiter)+delimiter.length);
 assert.notEqual(end,-1,'function terminates: '+name);
 return body.slice(0,end+delimiter.length)+';';
}

// PGlite exposes PostgreSQL advisory locks but has only one backend. These
// assertions observe the real lock held at each profile/FK boundary; they are
// regression tests for the necessary lock order, not a two-session deadlock test.
async function fixture(){
 const db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table member_profiles(user_id uuid primary key,xp bigint not null default 0,points bigint not null default 0);
  create table member_ledger(id bigint generated always as identity primary key,user_id uuid not null references member_profiles(user_id),event_key text not null unique,source text not null,label text not null,xp integer not null,points integer not null,created_at timestamptz default now());
  create table member_purchase_rewards(session_id text primary key,user_id uuid not null references member_profiles(user_id),payment_intent text unique not null,merchandise_cents bigint not null,refunded_cents bigint not null default 0,points integer not null,xp integer not null,created_at timestamptz default now());
  create table economy_accounts(user_id uuid primary key,xp integer not null default 0,coins bigint not null default 0,updated_at timestamptz default now());
  create table economy_transactions(user_id uuid not null,asset text not null,amount bigint not null,kind text not null,source text not null,idempotency_key text not null,metadata jsonb not null,unique(user_id,idempotency_key,asset));
  create table threeb_wallet_ledger(id bigint generated always as identity primary key,user_id uuid not null,event_key text not null,event_id text not null,xp_delta integer not null,coins_delta bigint not null,source text not null,economy_version text not null,rule_version text,metadata jsonb,created_at timestamptz default now(),unique(user_id,event_key,event_id));
  create table threeb_economy_flags(singleton boolean primary key,economy_version text,xp_curve_version text);
  create table threeb_level_curve(level integer,xp_required bigint,curve_version text);
  create function threeb_level_from_xp(bigint) returns integer language sql as $$select 1$$;
  create table community_staff(user_id uuid primary key);
  insert into threeb_economy_flags values(true,'2026.2','test-curve');
  insert into threeb_level_curve values(1,0,'test-curve'),(2,1000,'test-curve');
  insert into member_profiles(user_id) values('${A}'),('${B}');
 `);
 await createCompetitionSchema(db);
 await db.exec(functionSql('supabase/migrations/20260920162537_threeb_global_xp_150_antifarm_token_foundation.sql','threeb_wallet_apply_server'));
 await db.exec(sql('supabase/migrations/20260920162852_threeb_loyalty_global_ledger_unification.sql'));
 for(const [path,name] of [
  ['20260910110824_settle_purchase_rewards_with_existing_refunds.sql','loyalty_record_purchase'],
  ['20260922141232_register_penalty_rush_global_game_v1.sql','loyalty_game_beat'],
  ['20260910230210_card_arena_capped_account_rewards.sql','card_arena_commit'],
  ['20260921130205_sport_challenge_tracking_v1.sql','sport_challenge_review_server']
 ])await db.exec(functionSql('supabase/migrations/'+path,name));
 await db.exec(`
  insert into auth.users values('${A}'),('${B}'),('${REVIEWER}');
  insert into community_staff values('${REVIEWER}');
  insert into member_game_runs(id,user_id,game,active_seconds,last_beat)
   values('${RUN}','${A}','world',40,now()-interval '20 seconds');
  insert into card_arena_profiles(user_id,handle,deck)
   values('${A}','player-a','{"cards":["card-a"]}'),('${B}','player-b','{"cards":["card-b"]}');
  insert into card_arena_rooms(id,mode,host,status) values('${ROOM}','ranked','${B}','active');
  -- Reverse participant order to catch taking only the first participant lock.
  insert into card_arena_matches(id,room_id,p1,p2,decks,created_at)
   values('${MATCH}','${ROOM}','${B}','${A}','[{"cards":["card-b"]},{"cards":["card-a"]}]',now()-interval '2 minutes');
  insert into sport_challenge_entries(user_id,challenge_id,status)
   values('${A}','steps-10000','submitted'),('${B}','steps-10000','submitted');
  grant all on all tables in schema public to service_role;
  grant usage,select on all sequences in schema public to service_role;
  grant usage on schema auth to service_role;
  grant select on auth.users to service_role;

  create function test_require_advisory_lock(lock_key bigint) returns boolean language plpgsql as $$
  begin
   if not exists(select 1 from pg_locks
    where locktype='advisory' and pid=pg_backend_pid() and granted
     and classid=((lock_key>>32)&4294967295)::oid
     and objid=(lock_key&4294967295)::oid and objsubid=1
   ) then raise exception 'required_advisory_lock_missing_before_profile';end if;
   return true;
  end $$;
  create function test_require_account_lock(p_user uuid) returns boolean language sql volatile as $$
   select public.test_require_advisory_lock(hashtextextended(p_user::text,0))
  $$;
  -- A role policy observes the first explicit SELECT FOR UPDATE, before a later
  -- loyalty_grant could hide the inversion by acquiring its own account lock.
  alter table member_profiles enable row level security;
  create policy test_profile_lock_order on member_profiles to service_role
   using(test_require_account_lock(user_id)) with check(test_require_account_lock(user_id));

  create function test_review_lock_order() returns trigger language plpgsql as $$
  begin
   perform public.test_require_account_lock(new.user_id);
   return new;
  end $$;
  -- This executes before the review INSERT's implicit member_profiles FK lock.
  create trigger review_lock_order before insert on sport_challenge_reviews
   for each row execute function test_review_lock_order();
  create function test_arena_lock_order() returns trigger language plpgsql as $$
  begin
   perform public.test_require_advisory_lock(733303);
   perform public.test_require_account_lock('${A}');
   perform public.test_require_account_lock('${B}');
   return new;
  end $$;
  create trigger arena_lock_order before update on card_arena_profiles
   for each row execute function test_arena_lock_order();
 `);
 // Live service_role bypasses RLS. This fixture deliberately does not, so it can
 // instrument member_profiles; unrelated tables keep permissive fixture policies.
 for(const table of ['card_arena_profiles','card_arena_rooms','card_arena_matches','sport_challenges','sport_challenge_entries','sport_challenge_checkins','sport_challenge_reviews']){
  await db.exec(`create policy test_service_access on ${table} to service_role using(true) with check(true)`);
 }
 return db;
}

const serviceQuery=(db,query,args=[])=>db.transaction(async tx=>{
 await tx.exec('set local role service_role');
 return tx.query(query,args);
});
const purchase=db=>serviceQuery(db,'select loyalty_record_purchase($1,$2,$3,$4,$5) awarded',[A,'cs_lock_test','pi_lock_test',9000,0]);
const beat=(db,seq=1)=>serviceQuery(db,'select loyalty_game_beat($1,$2,$3) reward',[A,RUN,seq]);
const arena=db=>serviceQuery(db,'select card_arena_commit($1,$2,$3::jsonb) committed',[MATCH,0,JSON.stringify({winner:'0',round:12})]);
const review=(db,user=A,approve=true)=>serviceQuery(db,'select sport_challenge_review_server($1,$2,$3,$4,$5) reward',[REVIEWER,user,'steps-10000',approve,'Validation du test']);

test('all four legacy callers fail the profile lock boundary, then their real reward flows pass unchanged',async()=>{
 const db=await fixture();
 try{
  for(const action of [purchase,beat,arena,review]){
   await assert.rejects(action(db),/required_advisory_lock_missing_before_profile/);
  }
  assert.equal((await db.query('select count(*) n from member_ledger')).rows[0].n,0);
  await db.exec(sql(patch));
  assert.equal((await purchase(db)).rows[0].awarded,true);
  assert.equal((await purchase(db)).rows[0].awarded,false);
  assert.deepEqual((await beat(db)).rows[0].reward,{xp:10,points:1});
  assert.deepEqual((await beat(db)).rows[0].reward,{xp:0,points:0});
  assert.equal((await arena(db)).rows[0].committed,true);
  assert.equal((await arena(db)).rows[0].committed,false,'match revision still prevents duplicate rewards');
  const approved=(await review(db)).rows[0].reward;
  assert.equal(approved.status,'verified');
  assert.equal(approved.xp_awarded,60);
  await assert.rejects(review(db),/challenge_not_pending/);
  const rejected=(await review(db,B,false)).rows[0].reward;
  assert.equal(rejected.status,'eligible');
  assert.equal(rejected.xp_awarded,0);
  assert.deepEqual((await db.query('select user_id,xp,points from member_profiles order by user_id')).rows,[
   {user_id:A,xp:990,points:902},{user_id:B,xp:40,points:1}
  ]);
  assert.deepEqual((await db.query('select user_id,xp,coins from economy_accounts order by user_id')).rows,[
   {user_id:A,xp:990,coins:0},{user_id:B,xp:40,coins:0}
  ]);
  assert.deepEqual((await db.query('select user_id,wins,losses,rating,mastery,reward_count from card_arena_profiles order by user_id')).rows,[
   {user_id:A,wins:0,losses:1,rating:984,mastery:{'card-a':15},reward_count:1},
   {user_id:B,wins:1,losses:0,rating:1016,mastery:{'card-b':30},reward_count:1}
  ]);
  const signatures=[
   'loyalty_record_purchase(uuid,text,text,bigint,bigint)',
   'loyalty_game_beat(uuid,uuid,integer)',
   'card_arena_commit(uuid,integer,jsonb)',
   'sport_challenge_review_server(uuid,uuid,text,boolean,text)'
  ];
  for(const signature of signatures){
   const privileges=(await db.query("select has_function_privilege('anon',$1,'EXECUTE') anon,has_function_privilege('authenticated',$1,'EXECUTE') member,has_function_privilege('service_role',$1,'EXECUTE') service,(select prosecdef from pg_proc where oid=$1::regprocedure) definer",['public.'+signature])).rows[0];
   assert.deepEqual(privileges,{anon:false,member:false,service:true,definer:false});
  }
 }finally{await db.close();}
});

test('lock harmonization preserves shared daily game caps and Penalty Rush tracking without an extra reward',async()=>{
 const db=await fixture();
 try{
  await db.exec(sql(patch));
  await db.query('select loyalty_grant($1,$2,$3,$4,$5,$6)',[A,'game:already-earned','game','Existing daily reward',595,20]);
  assert.deepEqual((await beat(db)).rows[0].reward,{xp:5,points:0});
  await db.exec("update member_game_runs set active_seconds=40,game='penalty-rush',last_beat=now()-interval '20 seconds'");
  const before=(await db.query('select count(*) n from member_ledger')).rows[0].n;
  assert.deepEqual((await beat(db,2)).rows[0].reward,{xp:0,points:0,tracked_seconds:60,reward_source:'penalty-rush'});
  assert.equal((await db.query('select count(*) n from member_ledger')).rows[0].n,before);
  assert.deepEqual((await db.query('select xp,points from member_profiles where user_id=$1',[A])).rows[0],{xp:600,points:20});
 }finally{await db.close();}
});
