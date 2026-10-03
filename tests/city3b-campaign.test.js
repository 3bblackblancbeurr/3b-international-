import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_CAMPAIGN_CHAPTERS,CITY_CAMPAIGN_MISSIONS,campaignSummary,missionProgress} from '../src/city/city3b-campaign.js';
import {cityBuildingKind} from '../src/city/city3b-map.js';
import {citySimulationSnapshot} from '../src/city/city3b-simulation.js';

test('city campaign has eighteen complete chapters, solo main path and optional social demands',()=>{
 assert.equal(CITY_CAMPAIGN_CHAPTERS.length,18);
 assert.equal(new Set(CITY_CAMPAIGN_MISSIONS.map(m=>m.code)).size,72);
 for(let chapter=1;chapter<=18;chapter++){
  assert.equal(CITY_CAMPAIGN_MISSIONS.filter(m=>m.chapter===chapter&&!m.optional).length,3);
  assert.equal(CITY_CAMPAIGN_MISSIONS.filter(m=>m.chapter===chapter&&m.optional).length,1);
 }
 for(const m of CITY_CAMPAIGN_MISSIONS.filter(m=>!m.optional)){
  assert.ok(m.objectives.every(g=>!['visitors','displays','public'].includes(g.metric)));
  assert.ok(m.coins>0&&m.cityXp>0);
  assert.ok(['build','districts'].includes(m.action.tab));
 }
});
test('campaign progress follows authoritative status and resumes ready missions first',()=>{
 assert.equal(campaignSummary(null).available,false);
 const missions=[{code:'a',optional:false,status:'available',chapter:1},{code:'b',optional:false,status:'ready',chapter:1},{code:'c',optional:true,status:'claimed'}];
 assert.equal(campaignSummary({available:true,missions}).active.code,'b');
 assert.equal(campaignSummary({available:true,missions}).optionalClaimed,1);
 assert.equal(missionProgress({objectives:[{current:2,target:4},{current:1,target:1}]}),75);
 assert.equal(missionProgress({status:'claimed',objectives:[{current:0,target:4}]}),100);
 assert.equal(missionProgress({objectives:[{current:-5,target:2}]}),0);
});
test('service metadata prevents water and energy stations being counted as transport',()=>{
 const buildings=[{code:'WATER_3B',name:'Station d’eau',category:'community',metadata:{city_role:'civic'}},{code:'SOLAR_3B',name:'Station solaire',metadata:{city_role:'civic'}},{code:'BUS_STOP_3B',name:'Arrêt de bus',metadata:{city_role:'mobility'}}];
 assert.equal(cityBuildingKind(buildings[0]),'civic');assert.equal(cityBuildingKind(buildings[1]),'civic');assert.equal(cityBuildingKind(buildings[2]),'mobility');
 const result=citySimulationSnapshot({buildings,placements:buildings.map((b,i)=>({id:String(i),building_code:b.code,x:i*5,z:0,placement_state:'placed'}))});
 assert.equal(result.counts.civic,2);assert.equal(result.counts.mobility,1);
});

