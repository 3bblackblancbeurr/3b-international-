import test from 'node:test';
import assert from 'node:assert/strict';
import {Raycaster,Vector3} from 'three';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {CITE_GATE_SITES,CITE_CONNECTORS,citeTerrainHeight,citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {createHubCartography,hubMapElevation} from '../src/world/hub/cartography-model.js';
import {blankSave} from '../src/world/rules.js';

test('raised country gateways and switchback slopes agree across real deck raycasts, avatar height and atlas',()=>{
 const hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 const map=createHubCartography();
 function check(x,z,label){
  const wx=x*HUB_SCALE,wz=z*HUB_SCALE;
  const hit=new Raycaster(new Vector3(wx,100,wz),new Vector3(0,-1,0)).intersectObject(hub.ground)[0];
  assert.ok(hit,label+' has real visible ground');
  assert.ok(Math.abs(hit.point.y-hub.height(wx,wz))<.001,label+' avatar follows the rendered deck');
  assert.ok(Math.abs(hit.point.y-hubMapElevation({x:wx,z:wz}))<.001,label+' atlas gives the same height');
  assert.ok(citeSurfaceDistance(x,z)<0,label+' belongs to the collision footprint');
 }
 try{
  for(const site of CITE_GATE_SITES){
   check(site.x,site.z,site.name);
   assert.equal(hub.height(site.x*HUB_SCALE,site.z*HUB_SCALE),(site.baseY||0)*1.5);
   assert.equal(map.islands.find(island=>island.id==='gate-'+site.sector).elevation,(site.baseY||0)*1.5);
  }
  for(const span of CITE_CONNECTORS.filter(span=>span.startHeight||span.endHeight)){
   for(const fraction of [.025,.2,.5,.8,.975]){
    const along=(fraction-.5)*span.length,x=span.x+Math.cos(span.angle)*along,z=span.z+Math.sin(span.angle)*along;
    check(x,z,span.id+' '+fraction);assert.ok(Number.isFinite(citeTerrainHeight(x,z)));
   }
  }
  assert.equal(hub.liftFloors.length,6,'expanded landscape keeps all six published Tower floors');
 }finally{hub.dispose();}
});
