import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const users=Array.from({length:9},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const sessions=users.map((_,i)=>'00000000-0000-4000-8001-'+String(i+1).padStart(12,'0'));
const realms=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
const CURRENT='echoes-autumn-2026',FUTURE='echoes-winter-2026';
const tables=['invisible_echo_contributions','invisible_echo_solutions','invisible_events','invisible_event_contributions','invisible_event_solutions'];
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid);
 create table public.member_profiles(user_id uuid primary key,country text,passport_state text);
 create table public.member_world_state(user_id uuid primary key,data jsonb);
 create function public.loyalty_session_valid(p_user uuid,p_session uuid) returns boolean language sql security invoker set search_path='' as $$ select exists(select 1 from auth.sessions where user_id=p_user and id=p_session) $$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant all on public.member_profiles,public.member_world_state to service_role;grant select on auth.sessions to service_role;
 -- Match Supabase's table defaults: a later limited GRANT cannot remove an inherited ALL.
 alter default privileges in schema public grant all on tables to service_role;`);
 for(const name of ['20261009132008_invisible_eight_echoes.sql','20261009143229_invisible_collective_puzzles_and_seasons_v2.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const inherited=(await db.query("select t,has_table_privilege('service_role',t,'UPDATE') as update_all,has_table_privilege('service_role',t,'DELETE') as delete_all from unnest($1::text[]) t",[tables])).rows;
 await db.exec(readFileSync(new URL('../supabase/migrations/20261009144311_invisible_runtime_table_grants_v3.sql',import.meta.url),'utf8'));
 for(let i=0;i<users.length;i++){
  await db.query('insert into auth.users values($1)',[users[i]]);await db.query('insert into auth.sessions values($1,$2)',[sessions[i],users[i]]);
  await db.query("insert into member_profiles values($1,'France','active')",[users[i]]);
  await db.query('insert into member_world_state values($1,$2::jsonb)',[users[i],JSON.stringify({invisible:{started:true,solved:['rive','balance','preuve'],chestOpened:true}})]);
 }
 // Move only fixture dates around database now(); all tested decisions still use the real SQL clock.
 await db.query("update invisible_events set starts_at=now()-interval '1 day',ends_at=now()+interval '1 day' where code=$1",[CURRENT]);
 await db.query("update invisible_events set starts_at=now()+interval '2 days',ends_at=now()+interval '30 days' where code=$1",[FUTURE]);
 const call=async(name,i=0,...params)=>(await db.query('select '+name+'('+[users[i],sessions[i],...params].map((_,n)=>'$'+(n+1)).join(',')+') v',[users[i],sessions[i],...params])).rows[0].v;
 return{db,call,inherited};
}

test('runtime grants remove inherited Supabase defaults and retain only immutable inserts and completion updates',async()=>{
 const {db,inherited}=await fixture();try{
  assert.equal(inherited.length,5);assert.ok(inherited.every(row=>row.update_all&&row.delete_all),'The fixture must reproduce the production DEFAULT PRIVILEGES issue');
  for(const table of tables){
   const rights=(await db.query("select has_table_privilege('service_role',$1,'SELECT') as read,has_table_privilege('service_role',$1,'INSERT') as insert,has_table_privilege('service_role',$1,'UPDATE') as update_all,has_table_privilege('service_role',$1,'DELETE') as delete,has_table_privilege('service_role',$1,'TRUNCATE') as truncate,has_table_privilege('service_role',$1,'REFERENCES') as references,has_table_privilege('service_role',$1,'TRIGGER') as trigger",[table])).rows[0];
   assert.deepEqual(rights,{read:true,insert:table!=='invisible_events',update_all:false,delete:false,truncate:false,references:false,trigger:false},table);
  }
  const columns=(await db.query("select column_name,has_column_privilege('service_role','invisible_events',column_name,'UPDATE') as editable from information_schema.columns where table_schema='public' and table_name='invisible_events' order by column_name")).rows;
  assert.equal(columns.length,7);assert.ok(columns.every(row=>row.editable===(row.column_name==='completed_at')));
  await db.exec('set role service_role');
  for(const table of tables){
   await assert.rejects(db.query('delete from '+table),/permission denied/);
   await assert.rejects(db.query('truncate '+table),/permission denied/);
  }
  for(const table of ['invisible_echo_contributions','invisible_event_contributions'])await assert.rejects(db.query('update '+table+" set realm='maroc'"),/permission denied/);
  for(const table of ['invisible_echo_solutions','invisible_event_solutions'])await assert.rejects(db.query('update '+table+' set solved_at=now()'),/permission denied/);
  await assert.rejects(db.query("insert into invisible_events(code,title,starts_at,ends_at,solution,clue) values('echoes-fake-2028','Fake',now(),now()+interval '1 day','ENSEMBLE','Fake')"),/permission denied/);
 }finally{await db.close();}
});

test('permanent letters require real affinities and the final answer is immutable per account',async()=>{
 const {db,call}=await fixture();try{
  await db.exec('set role service_role');
  assert.ok((await call('invisible_echo_snapshot')).puzzle.letters.every(row=>row.symbol===null));
  await call('invisible_echo_contribute',0,'france');
  const one=await call('invisible_echo_snapshot');assert.equal(one.puzzle.letters[0].symbol,'T');assert.ok(one.puzzle.letters.slice(1).every(row=>row.symbol===null));
  await assert.rejects(call('invisible_echo_solve',0,'TRANSMET'),/echoes_incomplete/);
  for(let i=1;i<8;i++)await call('invisible_echo_contribute',i,realms[i]);
  const ready=await call('invisible_echo_snapshot');assert.equal(ready.puzzle.letters.map(row=>row.symbol).join(''),'TRANSMET');assert.equal(ready.puzzle.unlocked,true);assert.equal(ready.puzzle.solved,false);
  await assert.rejects(call('invisible_echo_solve',0,'ENSEMBLE'),/invalid_answer/);
  const solved=await call('invisible_echo_solve',0,' transmet ');assert.equal(solved.puzzle.solved,true);
  const replays=await Promise.all([call('invisible_echo_solve',0,'TRANSMET'),call('invisible_echo_solve',0,'not a new grant')]);assert.ok(replays.every(row=>row.puzzle.solvedAt===solved.puzzle.solvedAt));
  assert.equal((await db.query('select count(*)::integer n from invisible_echo_solutions')).rows[0].n,1);
  assert.equal((await call('invisible_echo_snapshot',1)).puzzle.solved,false);
  await assert.rejects(call('invisible_echo_solve',8,'TRANSMET'),/contribution_required/);
  await db.query("update member_profiles set passport_state='suspended' where user_id=$1",[users[0]]);await assert.rejects(call('invisible_echo_solve',0,'TRANSMET'),/passport_required/);
 }finally{await db.close();}
});

test('server calendar and separate seasonal contributions drive a real completion, never automatic attendance',async()=>{
 const {db,call}=await fixture();try{
  const actual=(await db.query("select starts_at,ends_at,solution from invisible_events where code='echoes-spring-2027'")).rows[0];
  assert.equal(new Date(actual.starts_at).toISOString(),'2027-03-01T00:00:00.000Z');assert.equal(new Date(actual.ends_at).toISOString(),'2027-06-01T00:00:00.000Z');assert.equal(actual.solution,'ENSEMBLE');
  await db.exec('set role service_role');
  for(let i=0;i<8;i++)await call('invisible_echo_contribute',i,realms[i]);
  const first=await call('invisible_event_snapshot',0,null);assert.equal(first.event,CURRENT);assert.equal(first.phase,'open');assert.equal(first.contributors,0);assert.ok(first.puzzle.letters.every(row=>row.symbol===null));
  assert.ok(first.calendar.some(row=>row.event===FUTURE&&row.phase==='upcoming'));
  await assert.rejects(call('invisible_event_contribute',0,FUTURE,'france'),/event_not_open/);
  await assert.rejects(call('invisible_event_snapshot',0,'echoes-unlisted-2028'),/event_unavailable/);
  await call('invisible_event_contribute',0,CURRENT,'france');await assert.rejects(call('invisible_event_contribute',0,CURRENT,'maroc'),/realm_locked/);
  await assert.rejects(call('invisible_event_solve',0,CURRENT,'ENSEMBLE'),/echoes_incomplete/);
  for(let i=1;i<8;i++)await call('invisible_event_contribute',i,CURRENT,realms[i]);
  const ready=await call('invisible_event_snapshot',0,CURRENT);assert.equal(ready.puzzle.letters.map(row=>row.symbol).join(''),'ENSEMBLE');assert.equal(ready.phase,'open','Eight contributions alone do not manufacture a resolution');
  await assert.rejects(call('invisible_event_solve',0,CURRENT,'TRANSMET'),/invalid_answer/);
  assert.equal((await db.query('select completed_at from invisible_events where code=$1',[CURRENT])).rows[0].completed_at,null);
  const solved=await call('invisible_event_solve',0,CURRENT,' ensemble ');assert.equal(solved.phase,'complete');assert.equal(solved.puzzle.solved,true);assert.ok(Date.parse(solved.completedAt)<=Date.parse(solved.serverNow));
  const other=await call('invisible_event_snapshot',1,CURRENT);assert.equal(other.phase,'complete');assert.equal(other.puzzle.solved,false);
  const second=await call('invisible_event_solve',1,CURRENT,'ENSEMBLE');assert.equal(second.completedAt,solved.completedAt);assert.equal(second.puzzle.solved,true);
  await call('invisible_event_solve',0,CURRENT,'ENSEMBLE');assert.equal((await db.query('select count(*)::integer n from invisible_event_solutions')).rows[0].n,2);
  await db.exec('reset role');await db.query("update invisible_events set starts_at=now()-interval '3 days',ends_at=now()-interval '1 day' where code=$1",[CURRENT]);await db.exec('set role service_role');
  assert.equal((await call('invisible_event_solve',0,CURRENT,'ENSEMBLE')).puzzle.solved,true,'A previous achievement remains readable after the closing date');
  await assert.rejects(call('invisible_event_solve',2,CURRENT,'ENSEMBLE'),/event_not_open/);await assert.rejects(call('invisible_event_contribute',8,CURRENT,'france'),/event_not_open/);
 }finally{await db.close();}
});

test('finals and season tables reject direct clients, calendar edits, missing fragments and revoked sessions',async()=>{
 const {db,call}=await fixture();try{
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   for(const table of ['invisible_events','invisible_echo_solutions','invisible_event_contributions','invisible_event_solutions'])await assert.rejects(db.query('select * from '+table),/permission denied/);
   await assert.rejects(call('invisible_echo_solve',0,'TRANSMET'),/permission denied/);await assert.rejects(call('invisible_event_snapshot',0,CURRENT),/permission denied/);
   await assert.rejects(call('invisible_event_contribute',0,CURRENT,'france'),/permission denied/);await assert.rejects(call('invisible_event_solve',0,CURRENT,'ENSEMBLE'),/permission denied/);
   await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await assert.rejects(db.query("update invisible_events set solution='XXXXXXXX' where code=$1",[CURRENT]),/permission denied/);
  await assert.rejects(db.query("update invisible_events set starts_at=now() where code=$1",[CURRENT]),/permission denied/);
  await db.query("update member_world_state set data='{}' where user_id=$1",[users[0]]);await assert.rejects(call('invisible_event_contribute',0,CURRENT,'france'),/fragment_required/);
  await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[sessions[0]]);await db.exec('set role service_role');
  await assert.rejects(call('invisible_event_snapshot',0,CURRENT),/session_expired/);await assert.rejects(call('invisible_echo_solve',0,'TRANSMET'),/session_expired/);
  const snapshot=await call('invisible_event_snapshot',1,CURRENT);assert.doesNotMatch(JSON.stringify(snapshot),/user_id|latitude|longitude|00000000|"solution"/);
 }finally{await db.close();}
});
