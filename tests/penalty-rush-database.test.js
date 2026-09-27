import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql = name => readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
test('Postgres executes settlement, seasons, anti-farming and selection boundaries',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql as $$select null::uuid$$;
   create table public.member_profiles(user_id uuid primary key,passport_state text);
   create table public.threeb_reward_outbox(user_id uuid,reward_code text,event_id text,source text,unique(user_id,reward_code,event_id));`);
  await db.exec(sql('20260921194443_penalty_rush_multiplayer_v1.sql').replace('alter publication supabase_realtime add table public.penalty_rooms;',''));
  for(const file of ['20260927103000_penalty_appearance_v1.sql','20260927104000_penalty_ranked_integrity_v1.sql','20260927105000_penalty_selection_authority_v1.sql'])await db.exec(sql(file));
  const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
  for(const id of [a,b]) {
   await db.query('insert into auth.users values($1)',[id]);
   await db.query("insert into member_profiles values($1,'active')",[id]);
   await db.query("insert into penalty_profiles(user_id,display_name,shirt_name) values($1,'Player','PLAYER')",[id]);
  }
  let serial=0;
  const settle=async mode=>{
   serial++;
   const result=await db.query("insert into penalty_rooms(code,mode,host_user_id,status,member_ids,started_at,state) values($1,$2,$3,'finished',array[$3::uuid,$4::uuid],now(),'{\"lastEvent\":{\"type\":\"goal\"}}') returning id",['AAAAA'+['B','C','D','E','F','G','H','J'][serial-1],mode,a,b]);
   const id=result.rows[0].id;
   const args=[id,a,3,1,JSON.stringify([{shots:4,saves:2},{shots:4,saves:1}])];
   const first=await db.query('select penalty_settle_match($1,$2,$3,$4,$5) as settled',args);
   const repeat=await db.query('select penalty_settle_match($1,$2,$3,$4,$5) as settled',args);
   assert.equal(first.rows[0].settled,true);assert.equal(repeat.rows[0].settled,false);
  };
  await settle('private');await settle('quick');
  assert.equal((await db.query('select games from penalty_ratings where user_id=$1',[a])).rows[0].games,0);
  assert.equal((await db.query('select reputation from penalty_profiles where user_id=$1',[a])).rows[0].reputation,0);
  for(let i=0;i<4;i++)await settle('ranked');
  const rating=(await db.query('select * from penalty_ratings where user_id=$1',[a])).rows[0];
  assert.equal(rating.games,3);assert.equal(rating.wins,3);assert.ok(rating.rating>1000);
  const season=(await db.query('select * from penalty_season_ratings where user_id=$1',[a])).rows[0];
  assert.equal(season.games,3);assert.equal(season.rating,rating.rating);
  assert.equal((await db.query('select count(*)::integer as n from penalty_match_history')).rows[0].n,6);
  const window=(await db.query("insert into penalty_international_windows(name,competition,status,starts_at,ends_at) values('Test season','3b-nations','selection',now()-interval '1 hour',now()+interval '1 hour') returning id")).rows[0].id;
  const selection=(await db.query("insert into penalty_international_selections(window_id,user_id,country_id) values($1,$2,'fr') returning id",[window,a])).rows[0].id;
  await assert.rejects(db.query('select penalty_respond_selection($1,$2,true)',[b,selection]),/introuvable/);
  await assert.rejects(db.query('select penalty_respond_selection($1,$2,true)',[a,selection]),/sportifs/);
  await db.query('update penalty_ratings set games=10 where user_id=$1',[a]);
  await db.query('update penalty_profiles set reputation=700 where user_id=$1',[a]);
  await db.query("update member_profiles set passport_state='suspended' where user_id=$1",[a]);
  await assert.rejects(db.query('select penalty_respond_selection($1,$2,true)',[a,selection]),/Passeport/);
  await db.query("update member_profiles set passport_state='active' where user_id=$1",[a]);
  const accepted=await db.query('select penalty_respond_selection($1,$2,true) as decision',[a,selection]);
  assert.equal(accepted.rows[0].decision.status,'selected');
  assert.equal((await db.query('select penalty_respond_selection($1,$2,true) as decision',[a,selection])).rows[0].decision.status,'selected');
  await assert.rejects(db.query('select penalty_respond_selection($1,$2,false)',[a,selection]),/traitée/);
  const club=(await db.query("insert into penalty_clubs(code,owner_user_id,name) values('CLUBAA',$1,'Test club') returning id",[a])).rows[0].id;
  assert.equal((await db.query('select penalty_join_club($1,$2) as joined',[b,club])).rows[0].joined,true);
  assert.equal((await db.query('select penalty_join_club($1,$2) as joined',[b,club])).rows[0].joined,true);
  assert.equal((await db.query('select count(*)::integer as n from penalty_club_members where club_id=$1',[club])).rows[0].n,1);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select penalty_join_club($1,$2)',[a,club]),/permission denied/);
  await assert.rejects(db.query('select penalty_respond_selection($1,$2,true)',[a,selection]),/permission denied/);
  await assert.rejects(db.query('select * from penalty_season_ratings'),/permission denied/);
 } finally {await db.close();}
});
