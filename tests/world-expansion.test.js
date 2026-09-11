import test from 'node:test';import assert from 'node:assert/strict';
import {Box3,Vector3,PerspectiveCamera,Matrix4,BoxGeometry} from 'three';
import {createTerrainField,toLandscape,WORLD_RADIUS} from '../src/world/terrain.js';
import {HERITAGE,LANDMARK_SITE} from '../src/world/heritage.js';
import {createLandmark} from '../src/world/landmarks.js';
import {blankSave} from '../src/world/rules.js';
import {DEFAULT_ORBIT,orbitView,restoreOrbit} from '../src/world/orbit.js';
import {bakeGeometry,architecturalUV} from '../src/world/landscape.js';

test('expanded countries have built neighbourhoods beyond the old boundary and navigable destination markers',()=>{
 assert.ok(WORLD_RADIUS>=250);
 for(const region of Object.keys(HERITAGE)){
  const field=createTerrainField(region,blankSave());assert.ok(field.buildings.length>=100,region);
  assert.ok(field.buildings.filter(b=>Math.hypot(b.x,b.z)>132).length>=65,region);
  const outer=field.anchors.filter(i=>i.type==='vista');assert.equal(outer.length,3);assert.ok(outer.every(i=>Math.hypot(i.x,i.z)<WORLD_RADIUS-8));
  assert.ok(field.roads.some(r=>r.points.some(p=>Math.hypot(p.x,p.z)>170)));
 }
});
test('default arrival frames the complete height of all eight monuments with visible sky',()=>{
 for(const region of Object.keys(HERITAGE)){
  const pos={x:0,z:5},p=toLandscape(region,LANDMARK_SITE.x,LANDMARK_SITE.z),orbit={...DEFAULT_ORBIT,yaw:Math.atan2(pos.x-p.x,pos.z-p.z)};
  const view=orbitView(orbit,pos,0),camera=new PerspectiveCamera(60,1440/900,.3,1200);camera.position.copy(view.position);camera.lookAt(view.target.x,view.target.y,view.target.z);camera.updateMatrixWorld();
  const terrain=createTerrainField(region,blankSave());for(let i=0;i<=10;i++){const t=i/10;assert.ok(Math.abs(terrain.height(pos.x+(p.x-pos.x)*t,pos.z+(p.z-pos.z)*t))<.01,region+' level monument view');}
  const landmark=createLandmark(region),bounds=new Box3().setFromObject(landmark.root);
  for(const y of [0,bounds.max.y]){const projected=new Vector3(p.x,y,p.z).project(camera);assert.ok(projected.y>-.8&&projected.y<.88,region+' complete height '+projected.y);}
  landmark.dispose();
 }
 assert.equal(restoreOrbit({version:2,pitch:.24,distance:36}).pitch,DEFAULT_ORBIT.pitch);
 assert.equal(restoreOrbit({version:2,pitch:.64,distance:36}).pitch,.64);
 assert.equal(restoreOrbit({version:2,pitch:.24,distance:36}).distance,36);
});
test('masonry uses physical dimensions instead of stretching a single texture over a facade',()=>{
 const source=new BoxGeometry(1,1,1),g=architecturalUV(bakeGeometry(source,new Matrix4().makeScale(20,30,12)),5),uv=g.attributes.uv;
 const u=Array.from({length:uv.count},(_,i)=>uv.getX(i)),v=Array.from({length:uv.count},(_,i)=>uv.getY(i));assert.ok(Math.max(...u)-Math.min(...u)>=4);assert.ok(Math.max(...v)-Math.min(...v)>=6);g.dispose();source.dispose();
});

