import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {civicWindowGlow} from '../src/world/hub/civic-window-light.js';

test('tower and residence windows glow at night without blasting daytime facades',()=>{
 const night=civicWindowGlow(.08),dusk=civicWindowGlow(.55),day=civicWindowGlow(1);
 assert.ok(night>.34&&night<.41);
 assert.ok(dusk>.12&&dusk<night);
 assert.equal(day,.018);
 assert.equal(civicWindowGlow(NaN),day,'bad clocks fail safe to daylight');
 assert.equal(civicWindowGlow(-12),civicWindowGlow(0));
 assert.equal(civicWindowGlow(12),day);
});

test('civic inhabited glass stays independent from progression/network lighting',()=>{
 const scene=readFileSync(new URL('../src/world/hub/platform-scene.js',import.meta.url),'utf8');
 const arch=readFileSync(new URL('../src/world/hub/platform-architecture.js',import.meta.url),'utf8');
 const tower=readFileSync(new URL('../src/world/hub/civic-tower.js',import.meta.url),'utf8');
 assert.match(scene,/windowGlass:inhabitedGlass/);
 assert.match(scene,/inhabitedGlass.emissiveIntensity=civicWindowGlow\(value\)/);
 assert.match(scene,/glass.emissive.set\(state.networkRestored/,'story-linked facade glass retains its progression gate');
 assert.match(arch,/mesh\(geo\(front\),windowGlass/);
 assert.match(arch,/mesh\(geo\(glazing\),windowGlass/);
 assert.match(tower,/add\(box,windowGlass,x\+side/);
 assert.match(tower,/add\(box,windowGlass,x,floor/);
 for(const content of [scene,arch,tower])assert.doesNotMatch(content,/new THREE\.PointLight\(/,'no additional direct point lights in civic facades');
});
