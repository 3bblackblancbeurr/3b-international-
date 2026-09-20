import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('premium Heritage platform is wired into the canonical landscape without a second navigation deck',()=>{
 const landscape=read('src/world/landscape.js'),terrain=read('src/world/terrain.js'),platform=read('src/world/heritage-platform.js');
 assert.match(landscape,/addHeritagePlatform/);
 assert.match(landscape,/premiumPlatform\.tick\(time\)/);
 assert.match(terrain,/region==='hub'\?38:13/);
 assert.match(platform,/Three shallow octagonal tiers/);
 assert.match(platform,/player remains on the canonical terrain\/collision plane/);
 assert.match(platform,/3B-Heritage-Platform/);
});

test('hub roads and buildings use the premium visual builders',()=>{
 const scene=read('src/world/scene.js'),visuals=read('src/world/premium-hub-visuals.js');
 assert.match(scene,/buildPremiumHubRoad\(item/);
 assert.match(scene,/decorateHubBuilding\(item/);
 assert.match(visuals,/trottoir|paving|curbMat/);
 assert.match(visuals,/tower_circle/);
 assert.match(visuals,/memory_archives/);
 assert.doesNotMatch(scene,/const car=mesh\('box',material\('#192f3b'/);
});

test('hub missions, secrets and transports no longer depend on prototype sphere-ring markers',()=>{
 const scene=read('src/world/scene.js');
 assert.match(scene,/createPremiumHubMarker\(item/);
 assert.match(scene,/createPremiumTransportVisual\(item/);
 assert.match(scene,/createPremiumTransitVehicle\(spec/);
 assert.doesNotMatch(scene,/const ob=mesh\('sphere',mat,item\.x,y\+1\.35/);
 assert.doesNotMatch(scene,/const pylon=mesh\('cylinder',mat,item\.x,y\+\.9/);
});

test('premium visual helpers remain rendering-only and do not mutate world progression',()=>{
 const visuals=read('src/world/premium-hub-visuals.js'),platform=read('src/world/heritage-platform.js');
 for(const source of [visuals,platform]){
  assert.doesNotMatch(source,/recordWorldAction|saveWorld|supabase|reward|xp\s*[+\-]=|shards\s*[+\-]=/i);
 }
});


test('premium desktop rendering increases shadow detail without forcing mobile cost',()=>{
 const scene=read('src/world/scene.js');
 assert.match(scene,/highEndAuto=mode==='auto'/);
 assert.match(scene,/memory>=8/);
 assert.match(scene,/\?2048:1024/);
 assert.match(scene,/renderer\.shadowMap\.enabled=mode!==\'fluid\'/);
});

test('premium exploration HUD keeps information but reduces its visual footprint',()=>{
 const css=read('src/world/exploration.css');
 assert.match(css,/Premium graphics pass/);
 assert.match(css,/\.world-shell \.world-minimap:hover/);
 assert.match(css,/width:118px/);
 assert.match(css,/\.world-shell \.play-interaction/);
});


test('the eight hub portals receive a monumental outer frame without changing country portal logic',()=>{
 const scene=read('src/world/scene.js'),portals=read('src/world/portals.js');
 assert.match(scene,/if\(region==='hub'\)/);
 assert.match(scene,/TorusGeometry\(1,\.045,8,96\)/);
 assert.match(scene,/obstacles\.push\(\{x:px,z:item\.z,r:\.72\}\)/);
 assert.match(portals,/Eight crafted thresholds/);
});
