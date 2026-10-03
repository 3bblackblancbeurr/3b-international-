import test from 'node:test';
import assert from 'node:assert/strict';
import {hubNpcActivity,hubNpcActivityLine} from '../src/world/hub/npc-activity.js';
import {hubDialogueScene} from '../src/world/hub/dialogue-v3.js';
import {citySimulationSnapshot,cityTrafficRoutes} from '../src/city/city3b-simulation.js';

const npc={npcId:'test',name:'Nora',role:'marchande de cartes rares',district:'commerce',missionIds:['m1']};

test('Hub NPC activity changes with hour, weather and mission state',()=>{
  assert.equal(hubNpcActivity(npc,{hour:10,weather:'clear'}).id,'work');
  assert.equal(hubNpcActivity(npc,{hour:20,weather:'clear'}).id,'evening');
  assert.equal(hubNpcActivity({...npc,district:'heritage_square'},{hour:2,weather:'clear'}).id,'rest');
  assert.equal(hubNpcActivity({...npc,district:'archives'},{hour:10,weather:'storm'}).id,'weather-shelter');
  assert.equal(hubNpcActivity(npc,{hour:2,missionState:{m1:{status:'active'}}}).id,'mission');
});

test('Hub dialogue exposes the current NPC activity without changing mission authority',()=>{
  const normal=hubDialogueScene(npc,{hour:10,weather:'clear',missionState:{},talks:0});
  assert.equal(normal.activity.id,'work');
  assert.match(normal.text,/Nora/);
  const active=hubDialogueScene(npc,{hour:10,weather:'clear',missionState:{m1:{status:'active'}},talks:1});
  assert.equal(active.id,'mission-active');
  assert.match(active.text,/mission m1/);
  assert.equal(typeof hubNpcActivityLine(npc,{hour:10}),'string');
});

test('City simulation presents authoritative census and does not invent residents from placements',()=>{
  const snapshot={
    city:{city_level:4,land_tier:2},
    districts:[{country:'France',unlocked:true,level:2},{country:'Algérie',unlocked:true,level:1}],
    buildings:[
      {code:'HOME',name:'Résidence centrale'},
      {code:'SHOP',name:'Boutique 3B'},
      {code:'PARK',name:'Parc 3B'},
      {code:'STATION',name:'Gare Matrix'},
      {code:'CIVIC',name:'École 3B'},
    ],
    placements:[
      {building_code:'HOME',placement_state:'placed'},
      {building_code:'HOME',placement_state:'placed'},
      {building_code:'SHOP',placement_state:'placed'},
      {building_code:'PARK',placement_state:'placed'},
      {building_code:'STATION',placement_state:'placed'},
      {building_code:'CIVIC',placement_state:'placed'},
    ],
  };
  assert.equal(citySimulationSnapshot(snapshot).available,false);
  assert.equal(citySimulationSnapshot(snapshot).residents,0);
  snapshot.life={available:true,population:36,housingCapacity:40,jobs:18,workingPopulation:21,employed:18,happiness:74,mobility:65,needs:[{code:'water',score:90},{code:'energy',score:75},{code:'food',score:70},{code:'health',score:60},{code:'education',score:70}]};
  const sim=citySimulationSnapshot(snapshot);
  assert.equal(sim.residents,36);
  assert.ok(sim.residents>0);
  assert.ok(sim.jobs>0);
  assert.ok(sim.satisfaction>=0&&sim.satisfaction<=100);
  assert.ok(sim.congestion>=0&&sim.congestion<=100);
  assert.ok(sim.residentialDemand>=0&&sim.residentialDemand<=100);
  assert.ok(sim.serviceDemand>=0&&sim.serviceDemand<=100);
  assert.ok(cityTrafficRoutes(snapshot,sim).length>0);
});
