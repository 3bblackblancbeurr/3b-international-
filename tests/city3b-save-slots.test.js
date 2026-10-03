import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import {fixture,A,B} from './helpers/city-playable-db.js';
const sql=f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
async function setup(){const f=await fixture({landscape:true});for(const file of ['20261003045247_matrix_civic_services.sql','20261003045254_city_infrastructure_networks.sql','20261003045300_city_neighbor_material_exchange.sql','20261003121332_city_fixed_roads_and_player_signals.sql','20261003153128_city3b_starting_maps.sql','20261003162024_city3b_three_save_slots.sql','20261003185926_city3b_mayor_campaign_v2.sql'])await f.db.exec(sql(file));return f;}
const call=async(f,slot,id,op,args={},uid=A)=>(await f.db.query('select nexus_city_slot_call($1,$2,$3,$4,$5::jsonb) v',[uid,slot,id,op,JSON.stringify(args)])).rows[0].v;
const city=async(f,slot,uid=A)=>(await f.db.query('select * from nexus_cities where user_id=$1 and slot_no=$2',[uid,slot])).rows[0];
test('three server slots isolate maps, edits and progress, survive reload and share only the existing account wallet',async()=>{
 const f=await setup();try{
 const original=await city(f,1),coins=await f.coins();
 for(let n=1;n<=100;n++){
  const {cityLevelFloor}=await import('../src/city/city3b-progression.js');
  const floor=cityLevelFloor(n);
  assert.equal((await f.db.query('select city3b_level_floor($1) floor,city3b_level_for_xp($2) level',[n,floor])).rows[0].level,n);
  assert.equal(Number((await f.db.query('select city3b_level_floor($1) floor',[n])).rows[0].floor),floor);
 }

 const second=await call(f,2,null,'nexus_city_create_map',{p_name:'Collines',p_country:'France',p_map:'hills'});
 const third=await call(f,3,null,'nexus_city_create_map',{p_name:'Neige',p_country:'France',p_map:'snow'});
 assert.notEqual(second,third);assert.notEqual(second,original.city_id);assert.equal(await f.coins(),coins,'no second starter grant');
 assert.equal((await city(f,2)).city.map_preset,'hills');assert.equal((await city(f,3)).city.map_preset,'snow');
 assert.equal(await call(f,2,null,'nexus_city_create_map',{p_name:'Retry',p_country:'France',p_map:'plains'}),second);assert.equal((await city(f,2)).city.map_preset,'hills');
 await assert.rejects(call(f,4,null,'nexus_city_create_map',{p_name:'Fourth',p_country:'France',p_map:'plains'}),/emplacement/);
 const placement=await call(f,2,second,'nexus_city_place_v2',{p_building:'HOME_ORIGIN',p_x:0,p_z:0,p_rotation:0,p_request:randomUUID(),p_user:B});
 assert.equal((await f.db.query('select city_id from nexus_city_placements where id=$1',[placement])).rows[0].city_id,second);
 assert.equal((await f.db.query('select count(*) n from nexus_city_placements where city_id=$1',[third])).rows[0].n,0);
 await assert.rejects(call(f,3,third,'nexus_city_move_v2',{p_placement:placement,p_x:20,p_z:20,p_rotation:0,p_request:randomUUID()}),/introuvable|placement|bâtiment/i);
 const secondCity=await city(f,2),terrain=secondCity.city.terrain,remaining=terrain.filter(x=>x.id!==terrain.find(x=>x.kind==='tree').id);
 await call(f,2,second,'nexus_city_plan_terrain',{p_features:remaining,p_expected:terrain});
 assert.deepEqual((await city(f,2)).city.terrain,remaining);assert.equal((await city(f,3)).city.terrain.length,89);
 const progress=await call(f,2,second,'nexus_city_campaign_snapshot');assert.ok(progress.available);assert.equal(progress.missions.length,72);assert.equal((await city(f,2)).city.progression_curve,'municipal-v2');
 const current=(await f.db.query('select city_id from nexus_city_current where user_id=$1',[A])).rows[0];assert.equal(current.city_id,original.city_id,'slot context restored after each RPC');
 await assert.rejects(call(f,2,third,'nexus_city_plan_terrain',{p_features:[],p_expected:remaining}),/partie a changé/);
 await assert.rejects(call(f,2,null,'nexus_city_plan_terrain',{p_features:[],p_expected:remaining}),/Recharge/);
 await assert.rejects(call(f,2,second,'threeb_wallet_apply_server',{p_coins:999999}),/Action/);
 await assert.rejects(call(f,2,second,'nexus_city_plan_terrain',{p_features:[],p_expected:remaining},B),/partie a changé/);
 const walletBeforeReset=await f.coins();
 await f.db.exec('delete from nexus_city_material_offers;delete from nexus_city_material_claims;delete from nexus_city_material_stock;delete from nexus_cities;');
 assert.equal((await f.db.query('select count(*) n from nexus_city_placements')).rows[0].n,0);
 assert.equal((await f.db.query('select count(*) n from nexus_city_mission_progress')).rows[0].n,0);
 assert.equal(await f.coins(),walletBeforeReset,'global city reset preserves account currency');
 const replacement=await call(f,2,null,'nexus_city_create_map',{p_name:'Recommencer',p_country:'France',p_map:'hills'});
 assert.notEqual(replacement,second);assert.equal((await city(f,2)).city_level,1);
 await assert.rejects(call(f,2,second,'nexus_city_plan_terrain',{p_features:[],p_expected:remaining}),/partie a changé/);
 assert.equal(await f.coins(),walletBeforeReset,'restarting after reset does not duplicate the starter grant');
 await f.db.exec('set role authenticated');await assert.rejects(call(f,2,second,'nexus_city_campaign_snapshot'),/permission denied/);
 }finally{await f.db.close();}
});

