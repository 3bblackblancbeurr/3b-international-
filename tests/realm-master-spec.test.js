import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES} from '../src/world/catalog.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {CANON_WORLDS} from '../src/world/story-canon.js';
import {GUARDIAN_RESONANCES} from '../src/world/guardian-resonances.js';
import {REGIONS} from '../src/world/settlements.js';
import {HERITAGE} from '../src/world/heritage.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {REALM_MASTER_SPEC,GUARDIAN_MASTER_SPEC,REALM_IDS,targetRealmRadius,guardianMasterFor} from '../src/world/realm-master-spec.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';

test('eight master profiles match existing story, country, identity, cards and resonance canon exactly',()=>{
 assert.equal(REALM_IDS.length,8);
 const ids=COUNTRIES.map(country=>country.id);
 assert.deepEqual([...REALM_IDS].sort(),[...ids].sort());
 assert.deepEqual(Object.keys(GUARDIAN_MASTER_SPEC).sort(),[...ids].sort());
 assert.equal(new Set(ids).size,8);
 assert.equal(Object.values(GUARDIAN_MASTER_SPEC).length,8);
 for(const id of ids){
  const guardian=guardianMasterFor(id),realm=REALM_MASTER_SPEC[id];
  assert.equal(guardian.name,CANON_WORLDS[id].guardian,id);
  assert.equal(guardian.name,GUARDIAN_VALUES[id].name,id);
  assert.equal(guardian.card,GUARDIAN_VALUES[id].card,id);
  assert.equal(guardian.value,CANON_WORLDS[id].value,id);
  assert.equal(guardian.resonance,GUARDIAN_RESONANCES[id].name,id);
  assert.equal(realm.landmarks[0],HERITAGE[id].name,id+' main real-life monument');
  assert.ok(REGIONS[id].city&&REGIONS[id].rural,id+' existing population districts');
  assert.equal(realm.environments.length,3,id+' authored regional biomes');
  assert.ok(realm.livingSystems.length>=4,id+' country life design');
  assert.equal(guardian.bossPhases.length,3,id+' distinct phases');
  assert.ok(guardian.weapon.length>=5&&guardian.visual&&guardian.totem);
  assert.ok(guardian.illustrativeHp>=8000&&guardian.illustrativeHp<=11000);
  assert.equal([50,100,150,200].includes(realm.areaTargetMultiplier),true);
 }
 assert.equal(guardianMasterFor('hub'),null);
});

test('50x–200x dimensions are explicit TARGET land-area ratios, never silently applied to incomplete runtime terrain',()=>{
 const hubRadius=HUB_PLATFORM.walkRadius;
 for(const id of REALM_IDS){
  const target=targetRealmRadius(hubRadius,id);
  const actualAreaRatio=(target/hubRadius)**2;
  assert.ok(Math.abs(actualAreaRatio-REALM_MASTER_SPEC[id].areaTargetMultiplier)<1e-8);
  assert.ok(target>hubRadius*7,id+' target radius');
 }
 assert.equal(targetRealmRadius(0,'france'),null);
 assert.equal(targetRealmRadius(hubRadius,'invalid'),null);
});

test('guardian visual identity is announced only during reveal, not spoiled at country entry',()=>{
 for(const country of COUNTRIES){
  const id=country.id,guardian=guardianMasterFor(id);
  const first=storyCinematicPresentation({kind:'country-first-entry',key:'country:'+id,region:id,context:{region:id}});
  const intro=storyCinematicPresentation({kind:'guardian-intro',key:'intro:'+id+':'+guardian.card+':adventure',region:id,context:{region:id,card:guardian.card}});
  assert.equal(first.card,null);
  assert.equal(first.guardianTeaser,undefined);
  assert.equal(intro.guardianTeaser.weapon,guardian.weapon);
  assert.equal(intro.guardianTeaser.resonance,guardian.resonance);
  assert.equal(intro.guardianTeaser.totem,guardian.totem);
 }
});
