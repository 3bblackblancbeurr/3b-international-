import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const users=Array.from({length:9},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const sessions=users.map((_,i)=>'00000000-0000-4000-8001-'+String(i+1).padStart(12,'0'));
const realms=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
const won={invisible:{started:true,solved:['rive','balance','preuve'],chestOpened:true}};
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid);
 create table public.member_profiles(user_id uuid primary key,country text,passport_state text);
 create table public.member_world_state(user_id uuid primary key,data jsonb);
 create function public.loyalty_session_valid(p_user uuid,p_session uuid) returns boolean language sql security invoker set search_path='' as $$ select exists(select 1 from auth.sessions where user_id=p_user and id=p_session) $$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant all on public.member_profiles,public.member_world_state to service_role;grant select on auth.sessions to service_role;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261009132008_invisible_eight_echoes.sql',import.meta.url),'utf8'));
 for(let i=0;i<users.length;i++){
  await db.query('insert into auth.users values($1)',[users[i]]);await db.query('insert into auth.sessions values($1,$2)',[sessions[i],users[i]]);
  await db.query("insert into member_profiles values($1,'France','active')",[users[i]]);
  await db.query('insert into member_world_state values($1,$2::jsonb)',[users[i],JSON.stringify(won)]);
 }
 const snapshot=async(i=0)=>(await db.query('select invisible_echo_snapshot($1,$2) as v',[users[i],sessions[i]])).rows[0].v;
 const contribute=async(i=0,realm=null)=>(await db.query('select invisible_echo_contribute($1,$2,$3) as v',[users[i],sessions[i],realm])).rows[0].v;
 return{db,snapshot,contribute};
}

test('eight real account affinities unlock once; replay and one-account realm switching cannot fill the circle',async()=>{
 const f=await fixture();try{
  await f.db.exec('set role service_role');
  assert.equal((await f.snapshot()).covered,0);assert.equal((await f.snapshot()).awakened,false);
  assert.equal((await f.contribute(0)).contributedRealm,'france');
  const replay=await Promise.all([f.contribute(0),f.contribute(0)]);assert.ok(replay.every(s=>s.contributors===1));
  await assert.rejects(f.contribute(0,'maroc'),/realm_locked/);
  await f.contribute(8,'france');assert.equal((await f.snapshot()).covered,1);
  for(let i=1;i<8;i++){const s=await f.contribute(i,realms[i]);assert.equal(s.covered,i+1);assert.equal(s.awakened,i===7);}
  const complete=await f.snapshot();assert.equal(complete.contributors,9);assert.equal(complete.awakened,true);
  assert.equal(complete.realms.length,8);assert.ok(complete.realms.every(row=>Object.keys(row).sort().join(',')==='contributors,realm'));
  assert.doesNotMatch(JSON.stringify(complete),/user_id|latitude|longitude|created_at|00000000/);
 }finally{await f.db.close();}
});

test('SQL rejects missing fragment, inconsistent progress, suspended passport and revoked or foreign sessions',async()=>{
 const f=await fixture();try{
  await f.db.query("update member_world_state set data='{}' where user_id=$1",[users[0]]);
  await assert.rejects(f.contribute(),/fragment_required/);
  await f.db.query('update member_world_state set data=$2::jsonb where user_id=$1',[users[0],JSON.stringify({invisible:{started:true,solved:['rive'],chestOpened:true}})]);
  await assert.rejects(f.contribute(),/fragment_required/);
  await f.db.query('update member_world_state set data=$2::jsonb where user_id=$1',[users[0],JSON.stringify(won)]);
  await f.db.query("update member_profiles set passport_state='suspended' where user_id=$1",[users[0]]);
  assert.equal((await f.snapshot()).eligible,false);await assert.rejects(f.contribute(),/passport_required/);
  await f.db.query("update member_profiles set passport_state='active' where user_id=$1",[users[0]]);
  await assert.rejects(f.contribute(0,'ninth'),/invalid_realm/);
  await assert.rejects(f.db.query('select invisible_echo_contribute($1,$2,$3)',[users[0],sessions[1],'france']),/session_expired/);
  await f.db.query('delete from auth.sessions where id=$1',[sessions[0]]);
  await assert.rejects(f.snapshot(),/session_expired/);await assert.rejects(f.contribute(),/session_expired/);
  assert.equal((await f.db.query('select count(*)::integer n from invisible_echo_contributions')).rows[0].n,0);
 }finally{await f.db.close();}
});

test('anonymous and authenticated clients cannot read identities, forge echoes or call service RPCs',async()=>{
 const f=await fixture();try{
  for(const role of ['anon','authenticated']){
   await f.db.exec('set role '+role);
   await assert.rejects(f.db.query('select * from invisible_echo_contributions'),/permission denied/);
   await assert.rejects(f.db.query('insert into invisible_echo_contributions(user_id,realm) values($1,$2)',[users[0],'france']),/permission denied/);
   await assert.rejects(f.snapshot(),/permission denied/);await assert.rejects(f.contribute(),/permission denied/);
   await f.db.exec('reset role');
  }
 }finally{await f.db.close();}
});
