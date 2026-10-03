import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fixture,A} from './helpers/city-playable-db.js';
import {CITY_MAP_PRESETS} from '../src/city/city3b-map-presets.js';
import {cityMapBlueprint,cityMapPlacementPolicy} from '../src/city/city3b-map.js';
import {cityEraseTargets,cityErasePlan} from '../src/city/city3b-erase.js';
import {landscapeCheck} from '../src/city/city3b-landscape.js';
const sql=file=>readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
const migration='20261003153000_city3b_starting_maps.sql';

test('four authored maps have a clear start, bounded removable trees and a connected meandering river',()=>{
 assert.equal(CITY_MAP_PRESETS.length,4);
 for(const map of CITY_MAP_PRESETS){
  const data={city:{city:{map_extent:1000,terrain:map.terrain}}};
  assert.equal(cityMapBlueprint(data).half,1000);
  assert.ok(map.terrain.length<200,'room remains for player landscaping');
  assert.ok(map.terrain.filter(f=>f.kind==='tree').length>=60);
  assert.ok(cityMapPlacementPolicy(data,{x:0,z:0},{width:12,height:12}).valid);
  for(const feature of map.terrain){
   assert.ok(landscapeCheck({city:{city:{map_extent:1000,terrain:map.terrain.filter(f=>f!==feature)}}},[feature]).valid,feature.id);
  }
  const tree=map.terrain.find(f=>f.kind==='tree');const target=cityEraseTargets(data,{x:tree.x1,z:tree.z1})[0];
  const plan=cityErasePlan(data,target);assert.equal(plan.action,'plan_terrain');assert.equal(plan.to.length,map.terrain.length-1);
 }
 const river=CITY_MAP_PRESETS.find(m=>m.id==='river').terrain.filter(f=>f.kind==='river');
 assert.equal(river[0].z1-river[0].width/2,-1000);assert.equal(river.at(-1).z2+river.at(-1).width/2,1000);
 for(let i=1;i<river.length;i++){assert.equal(river[i-1].x2,river[i].x1);assert.equal(river[i-1].z2,river[i].z1);}
 assert.ok(new Set(river.map(f=>f.x1)).size>20);
});

test('server expands existing cities safely and persists map selection, terrain removal and retry without resetting a city',async()=>{
 const f=await fixture({landscape:true});try{
  await f.db.exec(sql('20261003045247_matrix_civic_services.sql'));
  await f.db.exec(sql('20261003045254_city_infrastructure_networks.sql'));
  await f.db.exec(sql('20261003121332_city_fixed_roads_and_player_signals.sql'));
  await f.place('HOME_ORIGIN');const before=await f.city();const coins=await f.coins();
  await f.db.exec(sql(migration));const after=await f.city();
  assert.equal(after.city.map_extent,1000);assert.equal(after.city_id,before.city_id);assert.equal(await f.coins(),coins);
  assert.equal((await f.db.query('select count(*) n from nexus_city_placements where city_id=$1',[before.city_id])).rows[0].n,1);
  await f.db.query("select nexus_city_place_v2($1,'HOME_ORIGIN',800,800,0::smallint,$2)",[A,randomUUID()]);
  await assert.rejects(f.db.query("select nexus_city_place_v2($1,'HOME_ORIGIN',1001,800,0::smallint,$2)",[A,randomUUID()]),/terrain|limite|Hors/i);
  const roads=[{id:'outer-x',x1:650,z1:700,x2:750,z2:700,width:4,roadType:'simple'},{id:'outer-z',x1:700,z1:650,x2:700,z2:750,width:4,roadType:'simple'}];
  await f.db.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify(roads)]);
  assert.equal((await f.city()).city.roads.length,2);
  await f.db.query('update nexus_cities set city_level=5 where user_id=$1',[A]);
  const network=[{id:'outer-water',kind:'water',x1:-800,z1:-700,x2:-700,z2:-700,width:2}];
  await f.db.query("select nexus_city_plan_networks($1,$2::jsonb,'[]'::jsonb)",[A,JSON.stringify(network)]);
  assert.equal((await f.city()).city.networks[0].x1,-800);
  await f.db.query('update nexus_cities set city_level=5 where user_id=$1',[A]);
  await f.db.query("select nexus_city_plan_signals($1,$2::jsonb,'[]'::jsonb)",[A,JSON.stringify([{id:'outer-light',x:700,z:700,mode:'balanced',green:12}])]);
  assert.equal((await f.city()).city.signals[0].x,700);
  for(const map of CITY_MAP_PRESETS){
   const uid=randomUUID();await f.db.query('insert into auth.users values($1)',[uid]);await f.db.query("insert into member_profiles values($1,'France','active')",[uid]);
   await f.db.query("select nexus_city_create_map($1,'Nouvelle ville','France',$2)",[uid,map.id]);
   const saved=await f.city(uid);assert.equal(saved.city.map_preset,map.id);assert.deepEqual(saved.city.terrain,map.terrain);assert.equal(saved.city.climate,map.climate);
   const tree=map.terrain.find(t=>t.kind==='tree'),remaining=map.terrain.filter(t=>t!==tree);
   await f.db.query('select nexus_city_plan_terrain($1,$2::jsonb,$3::jsonb)',[uid,JSON.stringify(remaining),JSON.stringify(map.terrain)]);
   await f.db.query("select nexus_city_create_map($1,'Retry','France','plains')",[uid]);
   assert.deepEqual((await f.city(uid)).city.terrain,remaining,'tree removal survives retry and reload');assert.equal((await f.city(uid)).city.map_preset,map.id);
   await assert.rejects(f.db.query('select nexus_city_plan_terrain($1,$2::jsonb,$3::jsonb)',[uid,JSON.stringify(remaining),JSON.stringify(map.terrain)]),/paysage a changé/);
  }
  await assert.rejects(f.db.query("select nexus_city_create_map($1,'Invalid','France','unknown')",[A]),/Carte de départ/);
  await f.db.exec('set role authenticated');await assert.rejects(f.db.query("select nexus_city_create_map($1,'No access','France','snow')",[A]),/permission denied/);
 }finally{await f.db.close();}
});
