import test from 'node:test';
import assert from 'node:assert/strict';
import {citySimulationSnapshot,cityTrafficRoutes} from '../src/city/city3b-simulation.js';

function snapshot(){
  return {
    life:{available:true,population:90,housingCapacity:108,jobs:80,employed:54,workingPopulation:54,mobility:70,happiness:75,needs:[{code:'water',score:100},{code:'energy',score:100},{code:'health',score:60},{code:'food',score:100},{code:'education',score:80},{code:'green',score:75}]},
    city:{city_level:6,land_tier:3,city:{roads:[
      {id:'r1',x1:-30,z1:10,x2:30,z2:10,width:4},
      {id:'r2',x1:0,z1:-30,x2:0,z2:30,width:4},
    ]}},
    districts:[
      {country:'France',unlocked:true,level:2},
      {country:'Algérie',unlocked:true,level:2},
      {country:'Maroc',unlocked:true,level:1},
    ],
    buildings:[
      {code:'H1',name:'Maison 3B'},
      {code:'H2',name:'Résidence 3B'},
      {code:'S1',name:'Boutique 3B'},
      {code:'C1',name:'Clinique 3B'},
      {code:'G1',name:'Parc des Héritages'},
      {code:'M1',name:'Gare Matrix'},
    ],
    placements:[
      {building_code:'H1',placement_state:'placed'},
      {building_code:'H2',placement_state:'placed'},
      {building_code:'S1',placement_state:'placed'},
      {building_code:'C1',placement_state:'placed'},
      {building_code:'G1',placement_state:'placed'},
      {building_code:'M1',placement_state:'placed'},
    ],
  };
}

test('living-city simulation derives residents jobs services traffic and satisfaction from city state',()=>{
  const value=citySimulationSnapshot(snapshot());
  assert.ok(value.residents>0);
  assert.ok(value.housingCapacity>=value.residents);
  assert.ok(value.jobs>0);
  assert.ok(value.services>=0&&value.services<=100);
  assert.ok(value.congestion>=0&&value.congestion<=100);
  assert.ok(value.satisfaction>=0&&value.satisfaction<=100);
  assert.ok(value.residentialDemand>=0&&value.residentialDemand<=100);
  assert.equal(Number.isInteger(value.residentialDemand),true);
  assert.ok(value.commercialDemand>=0&&value.commercialDemand<=100);
  assert.ok(value.serviceDemand>=0&&value.serviceDemand<=100);
});

test('traffic routes are bounded by real road capacity and disappear for an empty city',()=>{
  const busy=cityTrafficRoutes(snapshot());
  assert.ok(busy.length>0&&busy.length<=24);
  for(const route of busy){
    assert.ok(Number.isFinite(route.x1)&&Number.isFinite(route.z1));
    assert.ok(Number.isFinite(route.x2)&&Number.isFinite(route.z2));
    assert.ok(route.duration>0);
  }
  const empty={city:{city_level:1,land_tier:1,city:{roads:[]}},districts:[],buildings:[],placements:[]};
  assert.equal(cityTrafficRoutes(empty).length,0);
});
