import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const OWNER='00000000-0000-4000-8000-000000000001';
const OTHER='00000000-0000-4000-8000-000000000002';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const outboxSchema=read('supabase/migrations/20260920163347_threeb_world_reward_transactional_outbox_v1.sql')
 .split('create or replace function public.world_commit_v2(')[0];
const migration=read('supabase/migrations/20261005130821_threeb_reward_outbox_retry_accounting_v1.sql');

test('real reward outbox preserves retry accounting and atomic settlement',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon; create role authenticated; create role service_role;
   create schema auth; create table auth.users(id uuid primary key);
   create table public.reward_definitions(code text primary key);
   insert into public.reward_definitions values('test_reward');
  `);
  await db.query('insert into auth.users values($1),($2)',[OWNER,OTHER]);
  await db.exec(outboxSchema);
  // Inject faults at the credit boundary while executing the real outbox SQL.
  await db.exec(`
   create table public.test_faults(
    singleton boolean primary key default true check(singleton),
    credit_error text not null default '',
    fail_after_credit boolean not null default false,
    fail_finalize boolean not null default false
   );
   insert into public.test_faults(singleton) values(true);
   create table public.test_credit_ledger(
    user_id uuid, reward_code text, event_id text,
    primary key(user_id,reward_code,event_id)
   );
   create table public.test_wallet(user_id uuid primary key,credits integer not null);
   create function public.threeb_credit_reward_server(p_user uuid,p_reward text,p_event text)
   returns jsonb language plpgsql set search_path='' as $$
   declare fault public.test_faults%rowtype;
   begin
    select * into fault from public.test_faults where singleton;
    if fault.credit_error<>'' then raise exception '%',fault.credit_error; end if;
    insert into public.test_credit_ledger values(p_user,p_reward,p_event)
    on conflict do nothing;
    if found then
     insert into public.test_wallet values(p_user,1)
     on conflict(user_id) do update set credits=public.test_wallet.credits+1;
    end if;
    if fault.fail_after_credit then raise exception 'credit_unavailable'; end if;
    return '{"ok":true}'::jsonb;
   end $$;
   create function public.test_fail_finalization() returns trigger
   language plpgsql set search_path='' as $$
   begin
    if new.status='credited' and (select fail_finalize from public.test_faults where singleton) then
     raise exception 'settlement_unavailable';
    end if;
    return new;
   end $$;
   create trigger test_fail_finalization before update on public.threeb_reward_outbox
   for each row execute function public.test_fail_finalization();
  `);
  await db.exec(migration);
  const reset=async()=>{
   await db.exec(`
    truncate public.threeb_reward_outbox,public.test_credit_ledger,public.test_wallet restart identity;
    update public.test_faults set credit_error='',fail_after_credit=false,fail_finalize=false;
   `);
  };
  const queue=(attempts=0,user=OWNER,event='event:one')=>db.query(
   'insert into public.threeb_reward_outbox(user_id,reward_code,event_id,attempts) values($1,$2,$3,$4)',
   [user,'test_reward',event,attempts]
  );
  const process=async(user=OWNER)=>(await db.query(
   'select public.threeb_process_reward_outbox_server($1,32) as result',[user]
  )).rows[0].result;
  const row=async(user=OWNER)=>(await db.query(
   'select attempts,status,last_error,processed_at from public.threeb_reward_outbox where user_id=$1',[user]
  )).rows[0];
  const credits=async()=>(await db.query(
   'select (select count(*)::integer from public.test_credit_ledger) as receipts,coalesce(sum(credits),0)::integer as total from public.test_wallet'
  )).rows[0];
  const fail=message=>db.query('update public.test_faults set credit_error=$1',[message]);

  await t.test('generic failures are counted once and stop exactly at the fifth failure',async()=>{
   await reset();await queue();await fail('backend_unavailable');
   for(let attempt=1;attempt<=5;attempt++){
    assert.deepEqual(await process(),{credited:0,rejected:attempt===5?1:0,pending:attempt<5?1:0});
    const current=await row();
    assert.equal(current.attempts,attempt);
    assert.equal(current.status,attempt===5?'rejected':'pending');
    assert.equal(current.last_error,'backend_unavailable');
    assert.equal(current.processed_at!==null,attempt===5);
   }
   assert.deepEqual(await process(),{credited:0,rejected:0,pending:0});
   assert.deepEqual(await credits(),{receipts:0,total:0});
  });

  await t.test('cooldown and manual review preserve the previous failure count',async()=>{
   for(const message of ['reward_cooldown','sensitive_reward_review_required']){
    for(const previousAttempts of [0,4,100]){
     await reset();await queue(previousAttempts);await fail(message);
     for(let retry=0;retry<2;retry++){
      assert.deepEqual(await process(),{credited:0,rejected:0,pending:1});
      const current=await row();
      assert.equal(current.attempts,previousAttempts);
      assert.equal(current.status,'pending');
      assert.equal(current.last_error,message);
      assert.equal(current.processed_at,null);
     }
    }
   }
   assert.deepEqual(await credits(),{receipts:0,total:0});
  });

  await t.test('a permanent policy failure rejects once without granting a reward',async()=>{
   await reset();await queue();await fail('unknown_reward');
   assert.deepEqual(await process(),{credited:0,rejected:1,pending:0});
   const current=await row();
   assert.equal(current.status,'rejected');assert.equal(current.attempts,1);
   assert.equal(current.last_error,'unknown_reward');assert.ok(current.processed_at);
   assert.deepEqual(await process(),{credited:0,rejected:0,pending:0});
   assert.deepEqual(await credits(),{receipts:0,total:0});
  });

  await t.test('a recovered fifth attempt credits once and leaves another owner untouched',async()=>{
   await reset();await queue(4);await queue(0,OTHER,'event:other');
   assert.deepEqual(await process(),{credited:1,rejected:0,pending:0});
   const current=await row();
   assert.equal(current.status,'credited');assert.equal(current.attempts,5);
   assert.equal(current.last_error,null);assert.ok(current.processed_at);
   assert.equal((await row(OTHER)).status,'pending');
   assert.equal((await row(OTHER)).attempts,0);
   assert.deepEqual(await process(),{credited:0,rejected:0,pending:0});
   assert.deepEqual(await credits(),{receipts:1,total:1});
  });

  for(const fault of ['fail_after_credit','fail_finalize']){
   await t.test(fault+' rolls back wallet and receipt while retaining the failed attempt',async()=>{
    await reset();await queue();
    await db.exec('update public.test_faults set '+fault+'=true');
    assert.deepEqual(await process(),{credited:0,rejected:0,pending:1});
    assert.equal((await row()).attempts,1);
    assert.equal((await row()).status,'pending');
    assert.deepEqual(await credits(),{receipts:0,total:0});
    await db.exec('update public.test_faults set '+fault+'=false');
    assert.deepEqual(await process(),{credited:1,rejected:0,pending:0});
    assert.equal((await row()).attempts,2);
    assert.deepEqual(await credits(),{receipts:1,total:1});
    assert.deepEqual(await process(),{credited:0,rejected:0,pending:0});
    assert.deepEqual(await credits(),{receipts:1,total:1});
   });
  }

  await t.test('only the service role can execute the settlement function',async()=>{
   await reset();
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    try{await assert.rejects(process(),/permission denied/);}
    finally{await db.exec('reset role');}
   }
   await db.exec('set role service_role');
   try{assert.deepEqual(await process(),{credited:0,rejected:0,pending:0});}
   finally{await db.exec('reset role');}
  });
 }finally{await db.close();}
});

