import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fixture,A,B} from './helpers/city-playable-db.js';
test('new mayor dossiers preserve legacy progress and require saved municipal conditions over time',async()=>{
 const f=await fixture({landscape:true});
 try{
  for(const file of ['20261003045247_matrix_civic_services.sql','20261003045254_city_infrastructure_networks.sql','20261003045300_city_neighbor_material_exchange.sql','20261003121332_city_fixed_roads_and_player_signals.sql','20261003153128_city3b_starting_maps.sql','20261003162024_city3b_three_save_slots.sql','20261003185926_city3b_mayor_campaign_v2.sql','20261003194615_city3b_mayor_scenarios.sql'])await f.db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  const catalog=(await f.db.query('select nexus_city_life_event_catalog() v')).rows[0].v;
  assert.equal(catalog.length,23);assert.equal(new Set(catalog.map(e=>e.code)).size,23);
  const dossiers=catalog.slice(11);assert.deepEqual(dossiers.map(e=>e.level),[15,20,25,30,40,45,55,60,70,80,90,100]);
  for(const e of dossiers){assert.ok(e.requirements.some(r=>r.metric==='population'));assert.ok(e.requirements.some(r=>r.metric==='city_level'));assert.equal(e.choices.length,2);assert.ok(e.cycles>=4);}
  // Imported history is fixture data; gameplay conditions remain real and unmet.
  const city=(await f.city()).city_id;
  for(const e of catalog.slice(0,11))await f.db.query("insert into nexus_city_life_events(city_id,code,state,started_day,claimed_at) values($1,$2,'claimed',0,now())",[city,e.code]);
  const snapshot=async()=>(await f.db.query('select nexus_city_life_snapshot($1) v',[A])).rows[0].v;
  const act=async(command,value)=>(await f.db.query('select nexus_city_life_action($1,$2,$3,$4) v',[A,command,value,randomUUID()])).rows[0].v;
  let life=await snapshot();assert.equal(life.events.filter(e=>e.status==='claimed').length,11);
  assert.equal(life.events[11].status,'available');assert.equal(life.events[12].status,'locked');
  const requirement=life.events[11].requirements.find(r=>r.metric==='city_level');assert.equal(requirement.current,(await f.city()).city_level);
  await assert.rejects(act('event_start','heat_plan'),/précédent/);
  await assert.rejects(act('event_start','school_commute'),/Niveau municipal/);
  await f.db.query("update nexus_city_life_events set granted_city_xp=30000 where city_id=$1 and code='welcome'",[city]);await f.snapshot();
  const coins=await f.coins();await act('policy_set','industry');await act('event_start','school_commute');
  await f.db.query("update nexus_city_life set last_tick=now()-interval '300 seconds' where city_id=$1",[city]);
  life=await snapshot();assert.equal(life.activeEvent.heldCycles,0);assert.equal(life.activeEvent.status,'active');assert.equal(life.policy,'industry');
  await assert.rejects(act('event_claim','school_commute'),/maintenus/);assert.equal(await f.coins(),coins);
  assert.equal((await f.db.query('select nexus_city_life_snapshot($1) v',[B])).rows[0].v.events[0].status,'available');
  await f.db.exec('set role authenticated');await assert.rejects(f.db.query('select nexus_city_life_event_catalog()'),/permission denied/);
 }finally{await f.db.close();}
});
