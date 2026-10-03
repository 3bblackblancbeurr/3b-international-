import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

const A='00000000-0000-4000-8000-000000000001';
const B='00000000-0000-4000-8000-000000000002';
const OP='10000000-0000-4000-8000-000000000001';
test('real save RPC rejects stale writes, replays receipts and isolates accounts',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
  await db.exec(`
   create role anon; create role authenticated; create role service_role;
   create schema extensions; create extension pgcrypto with schema extensions;
   create table member_profiles(user_id uuid primary key);
   create table member_game_saves(user_id uuid primary key references member_profiles(user_id),data jsonb not null,updated_at timestamptz default now());
   alter table member_game_saves enable row level security;
   grant select,insert,update on member_game_saves to authenticated;
   insert into member_profiles values('${A}'),('${B}');
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261003233000_member_game_save_cas_v1.sql',import.meta.url),'utf8'));
  const write=async(user,revision,data,operation=OP)=>(await db.query('select member_game_save_sync_server($1,$2,$3::jsonb,$4) as result',[user,revision,JSON.stringify(data),operation])).rows[0].result;
  const first={version:1,records:{arena:{plays:1}}};
  assert.equal((await write(A,0,first)).revision,1);
  const conflict=await write(A,0,{version:1,records:{}},B);
  assert.equal(conflict.conflict,true);assert.deepEqual(conflict.data,first);
  const replay=await write(A,0,first);
  assert.equal(replay.idempotent,true);assert.equal(replay.revision,1);
  await assert.rejects(write(A,0,{version:1,records:{}},OP),/game_save_operation_mismatch/);
  assert.equal((await write(B,0,{version:1,records:{}})).revision,1);
  assert.equal((await db.query('select count(*)::int as n from member_game_save_operations')).rows[0].n,2);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('update member_game_saves set data=$1 where user_id=$2',[JSON.stringify({version:1,records:{}}),A]),/permission denied/);
  await assert.rejects(write(A,1,first,B),/permission denied/);
  await db.exec('reset role');
  assert.deepEqual((await db.query('select data from member_game_saves where user_id=$1',[A])).rows[0].data,first);
 }finally{await db.close();}
});
