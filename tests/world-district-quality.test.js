import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,PerspectiveCamera,Texture} from 'three';
import {districtHighDetailAllowed} from '../src/world/district-quality.js';
import {createRegionalDistrict} from '../src/world/regional-district.js';
import {createParisDistrict} from '../src/world/paris-district.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const textureLoader={load(){return new Texture();}};
function fakeLoader({deferred=false}={}){
 const requests=[],resources=[];let hold=deferred;
 return{requests,resources,setDeferred(value){hold=value;},loadAsync(url){
  const geometry=new BoxGeometry(),material=new MeshStandardMaterial();material.name=url.includes('-lod.')?'low':'high';
  const resource={url,geometryDisposals:0,materialDisposals:0};geometry.addEventListener('dispose',()=>resource.geometryDisposals++);material.addEventListener('dispose',()=>resource.materialDisposals++);resources.push(resource);
  const scene=new Group();scene.userData.url=url;scene.add(new Mesh(geometry,material));
  let resolve;const promise=new Promise(r=>{resolve=r;}),request={url,finish(){resolve({scene});}};requests.push(request);if(!hold)request.finish();return promise;
 }};
}
function regionalFixture(loader){
 const root=new Group(),fallback=new Group();root.add(fallback);
 const field={height:()=>0,buildings:[{x:0,z:0,width:12,depth:10,floors:1,rotation:0},{x:120,z:0,width:12,depth:10,floors:2,rotation:0}]};
 return createRegionalDistrict({region:'espagne',field,root,fallback,loader,textureLoader});
}
function parisFixture(loader,models=['Maison']){
 const root=new Group(),field={height:()=>0,paris:models.map((model,index)=>({id:'home-'+index,model,x:0,z:0,width:12,depth:10,floors:2,rotation:0}))};
 return createParisDistrict({region:'france',field,root,resident(){},flora:{plant(){}},loader,textureLoader});
}
const instanceCount=(district,kind)=>district.group.children.filter(m=>m.isInstancedMesh&&m.material.name===kind).reduce((sum,m)=>sum+m.count,0);
const camera=()=>{const value=new PerspectiveCamera();value.position.set(0,4,10);value.updateMatrixWorld();return value;};

test('detailed districts are limited to desktop auto/detail and excluded from Fluid',()=>{
 for(const mode of ['auto','detail','fluid'])assert.equal(districtHighDetailAllowed(mode,{desktopClass:false}),false);
 assert.equal(districtHighDetailAllowed('auto',{desktopClass:true}),true);
 assert.equal(districtHighDetailAllowed('detail',{desktopClass:true}),true);
 assert.equal(districtHighDetailAllowed('fluid',{desktopClass:true}),false);
 assert.equal(districtHighDetailAllowed(),false);
});

test('regional mobile loads only low models; desktop and Fluid redistribute cached instances without holes',async()=>{
 const loader=fakeLoader(),district=regionalFixture(loader);
 try{
  await district.ready;district.setQuality('detail',{desktopClass:false});district.tick(camera(),{x:0,z:0});await flush();
  assert.equal(loader.requests.length,2);assert.ok(loader.requests.every(r=>r.url.includes('-lod.glb')));
  assert.equal(instanceCount(district,'low'),2);assert.equal(instanceCount(district,'high'),0);
  assert.equal(district.diagnostics.fallback,false);
  district.setQuality('auto',{desktopClass:true});await flush();district.tick(camera(),{x:0,z:0});
  assert.equal(loader.requests.length,4);assert.equal(instanceCount(district,'high'),1);assert.equal(instanceCount(district,'low'),1);
  district.setQuality('fluid',{desktopClass:true});
  assert.equal(instanceCount(district,'high'),0);assert.equal(instanceCount(district,'low'),2,'Both buildings remain visible immediately after switching to Fluid');
  district.setQuality('detail',{desktopClass:true});await flush();district.tick(camera(),{x:0,z:0});
  assert.equal(loader.requests.length,4,'Quality changes reuse the loaded geometry');assert.equal(instanceCount(district,'high'),1);
  assert.ok(loader.resources.every(r=>r.geometryDisposals===0),'Changing quality retains source geometry');
 }finally{district.dispose();district.dispose();}
 assert.ok(loader.resources.every(r=>r.geometryDisposals===1&&r.materialDisposals===1));
});

test('regional disposal stops later model requests and releases an in-flight result once',async()=>{
 const loader=fakeLoader({deferred:true}),district=regionalFixture(loader);
 assert.equal(loader.requests.length,1);district.dispose();loader.requests[0].finish();await district.ready;await flush();
 assert.equal(loader.requests.length,1,'The second building size is never downloaded for the closed country');
 assert.ok(loader.resources.every(r=>r.geometryDisposals===1&&r.materialDisposals===1));
});

test('an in-flight regional high model cannot replace the low buildings after switching to Fluid',async()=>{
 const loader=fakeLoader(),district=regionalFixture(loader);
 try{
  await district.ready;district.tick(camera(),{x:0,z:0});loader.setDeferred(true);district.setQuality('detail',{desktopClass:true});await flush();
  assert.equal(loader.requests.length,3);district.setQuality('fluid',{desktopClass:true});loader.requests[2].finish();await flush();district.tick(camera(),{x:0,z:0});
  assert.equal(loader.requests.length,3,'The next detailed size is not fetched after switching to Fluid');
  assert.equal(instanceCount(district,'high'),0);assert.equal(instanceCount(district,'low'),2);
  loader.setDeferred(false);district.setQuality('detail',{desktopClass:true});await flush();district.tick(camera(),{x:0,z:0});
  assert.equal(loader.requests.length,4);assert.equal(instanceCount(district,'high'),1);assert.equal(instanceCount(district,'low'),1);
 }finally{district.dispose();}
 assert.ok(loader.resources.every(r=>r.geometryDisposals===1&&r.materialDisposals===1));
});

test('Paris mobile keeps low buildings and the Eiffel model; loaded high detail becomes invisible in Fluid',async()=>{
 const loader=fakeLoader(),district=parisFixture(loader),view=camera();
 try{
  await district.ready;district.setQuality('auto',{desktopClass:false});district.tick(view,{x:0,z:0});await flush();
  assert.ok(loader.requests.every(r=>r.url.includes('-lod.glb')),'Walking on mobile does not request detailed models');
  assert.ok(loader.requests.some(r=>r.url.endsWith('/Eiffel-lod.glb')));
  district.setQuality('fluid',{desktopClass:true});district.tick(view,{x:0,z:0});await flush();assert.ok(loader.requests.every(r=>r.url.includes('-lod.glb')));
  district.setQuality('detail',{desktopClass:true});district.tick(view,{x:0,z:0});await flush();district.tick(view,{x:0,z:0});
  const home=district.group.children.find(m=>m.isLOD&&m.position.x===0&&m.position.z===0);
  assert.equal(home.levels.length,2);assert.equal(home.levels[0].object.visible,true);
  const count=loader.requests.length;district.setQuality('fluid',{desktopClass:true});
  assert.equal(home.levels[0].object.visible,false);assert.equal(home.levels[1].object.visible,true);
  district.setQuality('detail',{desktopClass:true});district.tick(view,{x:0,z:0});await flush();assert.equal(loader.requests.length,count);
 }finally{district.dispose();district.dispose();}
 assert.ok(loader.resources.every(r=>r.geometryDisposals===1&&r.materialDisposals===1));
});

test('Paris stops the pending download queue when the country is closed',async()=>{
 const loader=fakeLoader({deferred:true}),district=parisFixture(loader);
 assert.equal(loader.requests.length,2);district.dispose();loader.requests.forEach(r=>r.finish());await district.ready;await flush();
 assert.equal(loader.requests.length,2,'Queued old buildings do not continue decoding after the country closes');
 assert.ok(loader.resources.every(r=>r.geometryDisposals===1&&r.materialDisposals===1));
});

test('Paris cancels queued high models when Fluid is selected and can request them after desktop detail returns',async()=>{
 const loader=fakeLoader(),district=parisFixture(loader,['MaisonA','MaisonB','MaisonC']),view=camera();
 try{
  await district.ready;loader.setDeferred(true);district.setQuality('detail',{desktopClass:true});district.tick(view,{x:0,z:0});
  const active=loader.requests.filter(r=>!r.url.includes('-lod.glb'));assert.equal(active.length,2);
  district.setQuality('fluid',{desktopClass:true});active.forEach(r=>r.finish());await flush();
  assert.equal(loader.requests.filter(r=>!r.url.includes('-lod.glb')).length,2,'Cancelled high requests do not drain in the background');
  loader.setDeferred(false);district.setQuality('detail',{desktopClass:true});district.tick(view,{x:0,z:0});await flush();
  assert.ok(loader.requests.some(r=>r.url.endsWith('/MaisonC.glb')),'A cancelled model can be requested when detail is enabled again');
 }finally{district.dispose();}
 assert.ok(loader.resources.every(r=>r.geometryDisposals===1&&r.materialDisposals===1));
});
