import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRY_PORTALS,FIRST_SLICE_DISTRICTS,HUB_DISTRICTS,POPULATION_PROFILES,TRANSPORT_NETWORK,validateLivingWorldCatalog} from '../src/world/living-world/catalog.js';
import {AMBIENT_NPC_PROFILES,FIRST_SLICE_EVENTS,FIRST_SLICE_MISSIONS,FUNCTIONAL_NPCS,NARRATIVE_NPCS,SECRET_NPCS,validateFirstSliceContent} from '../src/world/living-world/first-slice.js';

const districtIds=new Set(HUB_DISTRICTS.map(district=>district.id));

test('living-world catalog preserves the eight canonical countries, guardians and values',()=>{
 assert.deepEqual(COUNTRY_PORTALS.map(({code,guardian,value})=>[code,guardian,value]),[
  ['france','Céliane','Justice'],['algerie','Yliane','Loyauté'],['maroc','Naël','Noblesse'],['tunisie','Soraya','Courage'],['espagne','Diego','Passion'],['italie','Alessio','Espoir'],['turquie','Émir','Foi'],['estonie','Eira','Sagesse'],
 ]);
 assert.equal(new Set(COUNTRY_PORTALS.map(portal=>portal.mapAnchor)).size,8);
});

test('every major district is useful, walkable and linked to a structured transport',()=>{
 assert.ok(HUB_DISTRICTS.length>=9);
 for(const district of HUB_DISTRICTS){assert.ok(district.functions.length>=2,district.id);assert.ok(district.transportModes.includes('walk'),district.id);assert.ok(district.transportModes.length>=2,district.id);assert.ok(district.minimumContent.activities>=1,district.id);assert.ok(district.minimumContent.missions>=1,district.id);assert.ok(district.minimumContent.secrets>=1,district.id);assert.ok(district.minimumContent.services>=1,district.id);}
 assert.deepEqual(validateLivingWorldCatalog(),[]);
});

test('transport network forms a logical multimodal open-world loop',()=>{
 assert.equal(TRANSPORT_NETWORK.train.loop,true);
 assert.ok(TRANSPORT_NETWORK.train.stops.length>=8);
 assert.ok(TRANSPORT_NETWORK.boats.stops.includes('docks'));
 assert.ok(TRANSPORT_NETWORK.cableCars.length>=3);
 assert.ok(TRANSPORT_NETWORK.ziplines.length>=3);
 assert.ok(TRANSPORT_NETWORK.vehicleCorridors.length>=2);
 for(const district of FIRST_SLICE_DISTRICTS)assert.ok(districtIds.has(district));
});

test('first playable slice contains the required population, missions, secrets and events',()=>{
 assert.equal(AMBIENT_NPC_PROFILES.length,20);
 assert.equal(FUNCTIONAL_NPCS.length,8);
 assert.equal(NARRATIVE_NPCS.length,6);
 assert.equal(SECRET_NPCS.length,2);
 assert.equal(FIRST_SLICE_MISSIONS.length,12);
 assert.equal(FIRST_SLICE_EVENTS.length,6);
 assert.equal(FIRST_SLICE_MISSIONS.filter(mission=>mission.category==='secret').length,2);
 assert.ok(FIRST_SLICE_MISSIONS.filter(mission=>mission.category==='secret').every(mission=>mission.initialMarker===false));
 assert.deepEqual(validateFirstSliceContent(districtIds),[]);
});

test('population profiles keep explicit mobile budgets',()=>{
 assert.deepEqual(Object.keys(POPULATION_PROFILES),['performance','balanced','cinema']);
 assert.ok(POPULATION_PROFILES.performance.activeNear[1]<POPULATION_PROFILES.cinema.activeNear[1]);
 assert.ok(POPULATION_PROFILES.performance.simplifiedFar[1]<POPULATION_PROFILES.cinema.simplifiedFar[1]);
});
