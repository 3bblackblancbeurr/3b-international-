import test from 'node:test';import assert from 'node:assert/strict';
import {CITE_ISLANDS,citeIslandRadius} from '../src/world/hub/platform-topology.js';
import {cliffRadiusAtLevel} from '../src/world/hub/island-cliffs.js';
import {citeCoastalDistance,citeCoastalFoam} from '../src/world/hub/coastal-foam.js';
import {createPremiumWater} from '../src/world/premium-water.js';

test('sea foam follows the submerged cliff contour rather than the wider deck rim',()=>{
 const island=CITE_ISLANDS.find(i=>i.id==='gate-2'),a=0,level=1-18/28,scaled=level*6,lo=Math.floor(scaled),mix=scaled-lo;
 const radius=cliffRadiusAtLevel(island,a,lo/6)*(1-mix)+cliffRadiusAtLevel(island,a,(lo+1)/6)*mix;
 const x=island.x+radius,z=island.z;
 assert.ok(Math.abs(citeCoastalDistance(x,z))<.001);
 assert.ok(citeCoastalFoam(x+1,z)>0);
 assert.equal(citeCoastalFoam(island.x+citeIslandRadius(island,a)+7,z),0);
 assert.equal(citeCoastalFoam(900,900),0);
 const impactX=island.x+citeIslandRadius(island,a)+1.65;assert.ok(citeCoastalFoam(impactX,z)>.4);
});
test('baked sea contact mask stays bounded and retains the existing lake contact API',()=>{
 const owned=[],water=createPremiumWater({lake:{x:0,z:0,r:245},ocean:true,owned});
 water.setFoamMask(citeCoastalFoam);const texture=water.material.uniforms.contactFoam.value;
 assert.equal(texture.image.width,256);assert.ok(texture.image.data.some(n=>n>0));
 assert.equal(texture.image.data[0],0);
 const lake=createPremiumWater({lake:{x:0,z:0,r:16},owned});lake.setFoamContacts([{x:0,z:0,r:3}]);
 assert.equal(lake.material.uniforms.contactFoam.value.image.width,128);
 water.disposeReflection();lake.disposeReflection();owned.forEach(a=>a.dispose());
});
