import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fixture,A,B} from './helpers/city-playable-db.js';
import {cityConstructionState,cityConstructionDuration,citySceneSignature} from '../src/city/city3b-building-progress.js';
import {cityMapBlueprint,cityMapRoads,cityMapPlacementPolicy} from '../src/city/city3b-map.js';
const ready=async f=>f.db.exec("update nexus_city_placements set construction_started_at=now()-interval '2 minutes',construction_ready_at=now()-interval '1 second' where construction_ready_at is not null");
const build=async(f,code='CITY_HALL_3B',x=240,z=240,request=randomUUID())=>(await f.query('select nexus_city_place_v2($1,$2,$3,$4,0::smallint,$5) id',[A,code,x,z,request])).id;
const claim=async(f,id,user=A)=>(await f.query('select nexus_city_construction_claim($1,$2) r',[user,id])).r;

test('construction presentation follows the saved server timestamps, including return after completion',()=>{
 const start=Date.parse('2026-10-03T00:00:00Z'),p={construction_started_at:new Date(start).toISOString(),construction_ready_at:new Date(start+40000).toISOString(),placement_state:'placed'};
 assert.equal(cityConstructionState(p,start-10000).progress,0);
 assert.equal(cityConstructionState(p,start+1000).stage,'foundation');
 assert.equal(cityConstructionState(p,start+16000).stage,'structure');
 assert.equal(cityConstructionState(p,start+33000).stage,'finishing');
 assert.equal(cityConstructionState(p,start+50000).ready,true);
 assert.equal(cityConstructionState({...p,construction_claimed_at:'claimed'},start+50000).ready,false);
 assert.equal(cityConstructionState({...p,placement_state:'stored'},start+50000).ready,false);
 assert.equal(cityConstructionState({}).label,'En service');
 assert.equal(cityConstructionDuration({cost_coins:0}),18);assert.equal(cityConstructionDuration({cost_coins:999999}),60);
 assert.equal(citySceneSignature({city:{updated_at:'1'},serverTime:'1'}),citySceneSignature({city:{updated_at:'2'},serverTime:'2'}));
});

test('large terrain adds real distant parcels, preserves civic roads and does not shift when the city levels up',async()=>{
 const f=await fixture({construction:true});try{
  const city=await f.city(),snapshot={city,districts:[]},map=cityMapBlueprint(snapshot);
  assert.equal(map.half,500);assert.equal(map.coreHalf,95);
  assert.ok((map.half/95)**2>27);
  assert.deepEqual(cityMapRoads(map),cityMapRoads(cityMapBlueprint({city:{...city,land_tier:8}})));
  assert.equal(cityMapPlacementPolicy(snapshot,{x:350,z:350},{width:4,height:4}).valid,true);
  const id=await build(f,'CITY_HALL_3B',350,350);assert.ok(id);
  await assert.rejects(build(f,'CITY_HALL_3B',501,0),/terrain/);
  await assert.rejects(build(f,'CITY_HALL_3B',300,455),/eau/);
  await f.db.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify([{id:'distant',x1:250,z1:260,x2:330,z2:260,width:4}])]);
  await f.db.query('select nexus_city_move_v2($1,$2,320,320,90::smallint,$3)',[A,id,randomUUID()]);
  assert.equal((await f.query('select x from nexus_city_placements where id=$1',[id])).x,320);
 }finally{await f.db.close();}
});

test('a construction has no service capacity or mission credit before completion; its bonus cannot be forged or repeated',async()=>{
 const f=await fixture({construction:true});try{
  const request=randomUUID(),id=await build(f,'CITY_HALL_3B',240,240,request),paid=await f.coins();
  assert.equal(await build(f,'CITY_HALL_3B',240,240,request),id);assert.equal(await f.coins(),paid);
  assert.equal((await f.metrics()).buildings,0);
  assert.equal((await f.query("select nexus_city_life_metrics($1,0,'balanced') m",[A])).m.jobs,0);
  await assert.rejects(claim(f,id),/encore en cours/);
  await assert.rejects(claim(f,id,B),/introuvable/);
  await assert.rejects(f.claim('foundation_hall'),/Objectif|objectif/);
  await ready(f);
  assert.equal((await f.metrics()).buildings,1);
  assert.equal((await f.query("select nexus_city_life_metrics($1,0,'balanced') m",[A])).m.jobs,6);
  const before=await f.coins(),r=await claim(f,id);assert.equal(r.alreadyClaimed,false);assert.equal(r.cityXp,25);assert.ok(r.coins>=0&&r.coins<=15);assert.equal(await f.coins(),before+r.coins);
  assert.equal((await claim(f,id)).alreadyClaimed,true);assert.equal(await f.coins(),before+r.coins);
  await f.db.query('select nexus_city_store_v2($1,$2,$3)',[A,id,randomUUID()]);
  await f.db.query('select nexus_city_move_v2($1,$2,260,260,0::smallint,$3)',[A,id,randomUUID()]);
  assert.equal((await claim(f,id)).alreadyClaimed,true);assert.equal(await f.coins(),before+r.coins);
  assert.equal((await f.query("select count(*)::int n from threeb_wallet_ledger where event_key='city_construction'")).n,1);
  assert.equal((await f.city()).city_xp,275);
 }finally{await f.db.close();}
});

test('construction rewards roll back on wallet failure and require an active Passport and a server role',async()=>{
 const f=await fixture({construction:true});try{
  await f.db.query('update nexus_cities set city_level=2 where user_id=$1',[A]);const id=await build(f,'PARK_UNITY');await ready(f);const before=await f.coins();
  await f.db.exec("set test.wallet_fail='yes'");await assert.rejects(claim(f,id),/wallet unavailable/);await f.db.exec("set test.wallet_fail='no'");
  assert.equal(await f.coins(),before);assert.equal((await f.query('select construction_claimed_at from nexus_city_placements where id=$1',[id])).construction_claimed_at,null);
  assert.equal((await f.query("select count(*)::int n from threeb_wallet_ledger where event_key='city_construction'")).n,0);
  await f.db.query("update member_profiles set passport_state='suspended' where user_id=$1",[A]);await assert.rejects(claim(f,id),/actif/);
  await f.db.exec('set role authenticated');await assert.rejects(claim(f,id),/permission denied/);
 }finally{await f.db.close();}
});

test('expansion preserves an existing city, purchased footprints and already completed buildings',async()=>{
 const f=await fixture();try{
  const id=(await f.place('HOME_ORIGIN')).id;
  const previous=await f.query('select * from nexus_city_placements where id=$1',[id]);
  await f.db.query('update nexus_cities set land_tier=3 where user_id=$1',[A]);
  await f.db.exec(readFileSync(new URL('../supabase/migrations/20261003012525_city3b_construction_sites.sql',import.meta.url),'utf8'));
  const after=await f.query('select * from nexus_city_placements where id=$1',[id]);
  for(const field of ['x','z','footprint_w','footprint_h','rotation','request_id'])assert.equal(after[field],previous[field]);
  assert.equal(after.construction_ready_at,null);assert.equal(cityConstructionState(after).stage,'complete');
  assert.equal((await f.city()).city.core_half,185);assert.equal((await f.city()).city.map_extent,500);
  await assert.rejects(claim(f,id),/Aucun bonus/);
 }finally{await f.db.close();}
});
