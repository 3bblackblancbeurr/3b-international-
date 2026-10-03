import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownedPremiumCodes,premiumEffectsFromCodes} from '../src/store/premium-effects.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('premium ownership maps only to cosmetic visual flags',()=>{
  const codes=ownedPremiumCodes({items:[
    {code:'WORLD_MATRIX_AURA',owned:true},
    {code:'WORLD_KAIS_ORIGIN_JACKET',owned:true},
    {code:'CITY_MATRIX_ROAD_THEME',owned:false},
  ]});
  const effects=premiumEffectsFromCodes(codes);
  assert.equal(effects.matrixAura,true);
  assert.equal(effects.jacket,true);
  assert.equal(effects.matrixRoads,undefined);
  assert.equal('power' in effects,false);
  assert.equal('damage' in effects,false);
  assert.equal('xp' in effects,false);
});

test('City premium items affect rendering while keeping the server-authoritative builder',()=>{
  const builder=read('src/city/City3BBuilder.jsx');
  const portal=read('src/components/City3BPortal.jsx');
  const scene=read('src/city/city3b-scene.js');
  for(const effect of ['matrixRoads','champagneArchitecture','waterfront','nightLuxe','brokenCircleMonument']) assert.ok(scene.includes('premium.'+effect));
  assert.match(scene,/cityTrafficRoutes/);
  assert.match(portal,/readStore=loadDigitalStore/);
  assert.match(portal,/readStore\('city'\)/);
  assert.match(portal,/ownedPremiumCodes/);
  assert.match(builder,/call\('place'/);
  assert.match(builder,/call\(tool==='road'\?'plan_roads':'plan_terrain'/);
  assert.match(builder,/expectedRoads:roads/);
});

test('World premium items are loaded into the 3D runtime and never modify combat stats',()=>{
  const page=read('src/world/WorldPage.jsx');
  const scene=read('src/world/scene.js');
  assert.match(page,/loadDigitalStore\('world'\)/);
  assert.match(page,/setPremiumCodes/);
  assert.match(scene,/premiumEffectsFromCodes/);
  assert.match(scene,/premiumAura/);
  assert.match(scene,/premiumBrokenRing/);
  assert.match(scene,/refugeChampagne/);
  assert.match(scene,/premiumArrival/);
  assert.doesNotMatch(scene,/premium[^\n]{0,80}(damage|attackPower|speedBonus|xpBonus)/i);
});

test('Digital Store pushes ownership changes into active games without restart',()=>{
  const panel=read('src/store/DigitalStorePanel.jsx');
  const world=read('src/world/WorldPage.jsx');
  const city=read('src/components/City3BPortal.jsx');
  assert.match(panel,/onStoreChange/);
  assert.match(world,/onStoreChange=\{store=>setPremiumCodes/);
  assert.match(city,/onStoreChange=\{store=>setPremiumCodes/);
});
