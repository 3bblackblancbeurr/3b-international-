import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,A} from './helpers/city-playable-db.js';
import {cityCatalogue,cityFootprint,cityPlacementCheck,citySuggestedParcel,cityLevelProgress} from '../src/city/city3b-construction.js';
import {CITY_CAMPAIGN_MISSIONS} from '../src/city/city3b-campaign.js';
import {premiumEffectsFromCodes,ownedPremiumCodes} from '../src/store/premium-effects.js';

async function snapshot(f){const city=await f.city();return {city,buildings:(await f.db.query('select * from nexus_city_buildings where active')).rows,placements:(await f.db.query('select * from nexus_city_placements where city_id=$1',[city.city_id])).rows,districts:(await f.db.query('select * from nexus_city_districts where city_id=$1',[city.city_id])).rows};}
async function build(f,code){const data=await snapshot(f),definition=data.buildings.find(b=>b.code===code),p=citySuggestedParcel(data,definition);assert.equal(cityPlacementCheck(data,p,cityFootprint(definition)).valid,true,code+' has a valid parcel');await f.db.query('select nexus_city_place_v2($1,$2,$3,$4,0::smallint,$5)',[A,code,p.x,p.z,randomUUID()]);if(f.construction)await f.db.exec("update nexus_city_placements set construction_started_at=now()-interval '2 minutes',construction_ready_at=now()-interval '1 second' where construction_ready_at>now()");await f.db.query('select nexus_city_recalculate($1)',[A]);}

test('saved footprints, catalogue filters and independent XP remain coherent',()=>{
 assert.deepEqual(cityFootprint({footprint:{w:12,h:9}},90,{footprint_w:2,footprint_h:4,rotation:0}),{width:4,height:2});
 assert.equal(cityLevelProgress(3500).percent,50);
 const data={city:{city_level:2},buildings:[{code:'HOME',name:'Résidence',unlock_level:1,cost_coins:5},{code:'TOWER',name:'Tour',unlock_level:5}]};
 assert.equal(cityCatalogue(data,{query:'residence'}).length,1);assert.equal(cityCatalogue(data).length,1);
 assert.equal(cityCatalogue(data,{availableOnly:false}).length,2);
 const pass=premiumEffectsFromCodes(ownedPremiumCodes({items:[{code:'CITY_ARCHITECT_PASS',owned:true}]}));assert.equal(pass.waterfront,true);assert.equal(pass.champagneArchitecture,true);
 assert.equal(premiumEffectsFromCodes(ownedPremiumCodes({items:[{code:'CITY_ARCHITECT_PASS',owned:false}]})).waterfront,undefined);
});

test('all campaign chapters can be constructed using real map constraints and server checks',async()=>{
 const f=await fixture({landscape:true});try{
  const byMetric={housing:'HOME_ORIGIN',commerce:'SHOP_3B',green:'TREE_MATRIX',civic:'SCHOOL_3B',culture:'WORKSHOP_3B',sport:'ARENA_1618',landmark:'GOLD_GATE_3B',mobility:'BUS_STOP_3B',buildings:'HOME_ORIGIN'};
  for(const m of CITY_CAMPAIGN_MISSIONS.filter(m=>!m.optional)){
   for(const g of m.objectives){let metrics=(await f.db.query('select nexus_city_campaign_metrics($1) m',[A])).rows[0].m;
    if(g.metric==='roads'){const data=await snapshot(f),half=50+data.city.land_tier*45;const roads=Array.from({length:g.target},(_,i)=>({id:'edge-'+i,x1:-half+8,z1:-half+6+i*5,x2:-half+30,z2:-half+6+i*5,width:4}));await f.db.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify(roads)]);continue;}
    if(g.metric==='districts'){assert.ok(metrics.districts>=g.target,m.code);continue;}
    if(g.metric==='variety'){const options=(await f.db.query('select * from nexus_city_buildings where active and country is null order by cost_coins,code')).rows;for(const b of options){if(metrics.variety>=g.target)break;const data=await snapshot(f);if(b.unlock_level>data.city.city_level||data.placements.some(p=>p.building_code===b.code))continue;await build(f,b.code);metrics=(await f.db.query('select nexus_city_campaign_metrics($1) m',[A])).rows[0].m;}}
    else while(Number(metrics[g.metric]||0)<g.target){await build(f,g.metric.startsWith('building:')?g.metric.slice(9):byMetric[g.metric]);metrics=(await f.db.query('select nexus_city_campaign_metrics($1) m',[A])).rows[0].m;}
   }
   const result=(await f.db.query('select nexus_city_mission_claim($1,$2) reward',[A,m.code])).rows[0].reward;assert.equal(result.alreadyClaimed,false,m.code);
  }
  const campaign=(await f.db.query('select nexus_city_campaign_snapshot($1) c',[A])).rows[0].c;
  assert.equal(campaign.missions.filter(m=>!m.optional&&m.status==='claimed').length,24);
 }finally{await f.db.close();}
});

test('water, locked districts and roads cannot be bypassed; rejected roads preserve the previous plan',async()=>{
 const f=await fixture({landscape:true});try{
  await f.query('select nexus_city_plan_terrain($1,$2::jsonb,$3::jsonb)',[A,JSON.stringify([{id:'lake',kind:'lake',x1:300,z1:200,x2:300,z2:200,width:24}]),'[]']);
  for(const [x,z] of [[300,200],[501,0],[45,0]])await assert.rejects(f.db.query('select nexus_city_place_v2($1,$2,$3,$4,0::smallint,$5)',[A,'HOME_ORIGIN',x,z,randomUUID()]));
  await build(f,'HOME_ORIGIN');const d=await snapshot(f),p=d.placements[0];
  await assert.rejects(f.db.query('select nexus_city_plan_roads($1,$2::jsonb)',[A,JSON.stringify([{x1:p.x-10,z1:p.z,x2:p.x+10,z2:p.z,width:4}])]),/traverse/);
  assert.deepEqual((await snapshot(f)).city.city.roads||[],[]);
  await f.db.exec(`set role authenticated`);await assert.rejects(f.db.query('select nexus_city_budget_claim($1)',[A]),/permission denied/);
 }finally{await f.db.close();}
});

test('daily income is bounded, idempotent, suspension aware and rolls back on wallet failure',async()=>{
 const f=await fixture({landscape:true});try{
  await assert.rejects(f.db.query('select nexus_city_budget_claim($1)',[A]),/habitants/);
  await build(f,'HOME_ORIGIN');await f.db.query('select nexus_city_life_snapshot($1)',[A]);await f.db.exec("update nexus_city_life set last_tick=now()-interval '6 minutes'");
  await f.db.exec("set test.wallet_fail='yes'");await assert.rejects(f.db.query('select nexus_city_budget_claim($1)',[A]),/wallet unavailable/);await f.db.exec("set test.wallet_fail='no'");
  assert.equal((await f.db.query("select count(*)::int n from threeb_wallet_ledger where event_key='city_income'")).rows[0].n,0);
  const before=Number((await f.db.query('select coins from economy_accounts where user_id=$1',[A])).rows[0].coins);
  const reward=(await f.db.query('select nexus_city_budget_claim($1) r',[A])).rows[0].r;assert.ok(reward.coins>0&&reward.coins<=300);
  const retry=await Promise.all([f.db.query('select nexus_city_budget_claim($1) r',[A]),f.db.query('select nexus_city_budget_claim($1) r',[A])]);assert.ok(retry.every(x=>x.rows[0].r.alreadyClaimed));
  assert.equal(Number((await f.db.query('select coins from economy_accounts where user_id=$1',[A])).rows[0].coins),before+reward.coins);
  await f.db.query("update member_profiles set passport_state='suspended' where user_id=$1",[A]);await assert.rejects(f.db.query('select nexus_city_budget_claim($1)',[A]),/actif/);
 }finally{await f.db.close();}
});
