import test from 'node:test';
import assert from 'node:assert/strict';
import {cityWaterField,cityWaterGeometry,CITY_WATER_LEVEL} from '../src/city/city3b-water-geometry.js';
import {cityWaterQuality} from '../src/city/city3b-premium-water.js';
import {createCityNaturalEnvironment} from '../src/city/city3b-natural-environment.js';
import {CITY_MAP_PRESETS} from '../src/city/city3b-map-presets.js';
import {Scene,PerspectiveCamera,Group,Vector4,Matrix4} from 'three';

const river=(x1,z1,x2,z2,width=12)=>({kind:'river',x1,z1,x2,z2,width});
const lake={kind:'lake',x1:0,z1:0,x2:0,z2:0,width:24};

test('lake bathymetry returns a clear shallow edge, a deep centre and dry land outside',()=>{
 const field=cityWaterField([lake]);
 assert.equal(field.sample(0,0).shore,12);assert.ok(field.sample(0,0).depth>3);
 assert.ok(field.sample(11,0).depth<field.sample(0,0).depth);
 assert.equal(field.sample(12,0).depth,0);assert.equal(field.sample(13,0).depth,0);
 assert.equal(field.sample(0,0).flowX,0);assert.equal(field.sample(0,0).flowZ,0);
});
test('river flow follows saved diagonal direction and reverses with its endpoints',()=>{
 const a=cityWaterField([river(-20,-20,20,20)]).sample(0,0),b=cityWaterField([river(20,20,-20,-20)]).sample(0,0);
 assert.ok(Math.abs(a.flowX-Math.SQRT1_2)<1e-9);assert.ok(Math.abs(a.flowZ-Math.SQRT1_2)<1e-9);
 assert.equal(a.flowX,-b.flowX);assert.equal(a.flowZ,-b.flowZ);assert.equal(a.depth,b.depth);
});
test('joined rivers and lake intersections retain depth instead of creating interior foam rings',()=>{
 const field=cityWaterField([river(-40,0,0,0),river(0,0,0,40),lake]);
 const joint=field.sample(0,0);assert.equal(joint.shore,12);assert.ok(joint.depth>3);
 assert.ok(joint.flowX>0);assert.ok(joint.flowZ>0);
 assert.equal(cityWaterField([{...lake,width:NaN}]).features.length,0);
});
test('all four starting maps have finite bounded batched surfaces with continuous shores',()=>{
 for(const map of CITY_MAP_PRESETS){
  const before=JSON.stringify(map.terrain),surfaces=cityWaterGeometry(map.terrain,1000);
  try{
   for(const geometry of [surfaces.inland,surfaces.banks,surfaces.ocean].filter(Boolean)){
    assert.ok(geometry.attributes.position.count<150000);
    for(const attribute of Object.values(geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
    assert.ok(geometry.index.array.every(i=>i<geometry.attributes.position.count));
   }
   for(const geometry of [surfaces.inland,surfaces.ocean].filter(Boolean)){
    const p=geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-CITY_WATER_LEVEL)<1e-6);
   }
   assert.equal(JSON.stringify(map.terrain),before);
  }finally{surfaces.inland?.dispose();surfaces.banks?.dispose();surfaces.ocean.dispose();}
 }
});
test('changing maps releases old geometry and removes obsolete bridge wake contacts',()=>{
 const environment=createCityNaturalEnvironment();
 try{
  const system=environment.waterSystem;system.rebuild([river(-30,0,30,0)],95,[{kind:'bridge',x1:0,z1:-10,x2:0,z2:10,width:4}]);
  assert.ok(environment.water.uniforms.uContactCount.value>0);
  const old=system.group.children.map(mesh=>mesh.geometry);let disposed=0;
  let instancesDisposed=0;const instances=system.group.children.filter(mesh=>mesh.isInstancedMesh);
  for(const mesh of instances){assert.ok(mesh.count<=288);mesh.addEventListener('dispose',()=>instancesDisposed++);}
  for(const geometry of old)geometry.addEventListener('dispose',()=>disposed++);
  system.rebuild([],1000);assert.equal(disposed,old.length);assert.equal(system.group.children.length,1);
  assert.equal(instancesDisposed,instances.length);
  assert.equal(environment.water.uniforms.uContactCount.value,0);assert.equal(environment.water.uniforms.uReflectionReady.value,0);
 }finally{environment.dispose();}
});
test('quality fallback caps phone reflections and removes additional passes at the lowest tier',()=>{
 assert.equal(cityWaterQuality(true,0).reflectionSize,256);
 assert.equal(cityWaterQuality(false,0).reflectionSize,512);
 assert.ok(cityWaterQuality(true,1).reflectionHz<cityWaterQuality(true,0).reflectionHz);
 assert.equal(cityWaterQuality(true,2).reflectionSize,0);assert.equal(cityWaterQuality(false,2).reflectionHz,0);
 const environment=createCityNaturalEnvironment({mobile:true});try{
  environment.waterSystem.setQuality(2);assert.equal(environment.water.uniforms.uReflectionReady.value,0);
  assert.equal(environment.water.uniforms.uDetail.value,.3);
 }finally{environment.dispose();}
});

function captureFixture(){
 const environment=createCityNaturalEnvironment({mobile:true}),scene=new Scene(),camera=new PerspectiveCamera(40,1,.1,1000),overlay=new Group(),target={name:'previous-target'};
 scene.add(environment.sky,environment.waterSystem.group,overlay);environment.waterSystem.rebuild([lake],95);
 camera.position.set(10,12,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 let current=target;const viewport=new Vector4(3,4,512,512),scissor=new Vector4(1,2,100,200);
 const renderer={xr:{enabled:true},shadowMap:{autoUpdate:true},extensions:{has:()=>true},state:{buffers:{depth:{setMask(){}}}},autoClear:true,
  getRenderTarget:()=>current,setRenderTarget:t=>{current=t;},getViewport:v=>v.copy(viewport),setViewport:v=>viewport.copy(v),getScissor:v=>v.copy(scissor),setScissor:v=>scissor.copy(v),getScissorTest:()=>true,setScissorTest(){},render(){}};
 return {environment,scene,camera,overlay,renderer,target,viewport,scissor};
}
test('reflections restore hidden overlays, render target, XR and shadow settings even when rendering fails',()=>{
 const f=captureFixture();try{
  let calls=0;f.renderer.render=()=>{calls++;assert.equal(f.overlay.visible,false);throw new Error('lost offscreen framebuffer');};
  assert.equal(f.environment.waterSystem.capture(f.renderer,f.scene,f.camera,1,{exclude:[f.overlay]}),false);
  assert.equal(f.renderer.getRenderTarget(),f.target);assert.equal(f.overlay.visible,true);assert.equal(f.environment.waterSystem.group.visible,true);
  assert.equal(f.renderer.xr.enabled,true);assert.equal(f.renderer.shadowMap.autoUpdate,true);assert.deepEqual(f.viewport.toArray(),[3,4,512,512]);assert.deepEqual(f.scissor.toArray(),[1,2,100,200]);
  assert.equal(f.environment.water.uniforms.uReflectionReady.value,0);
  assert.equal(f.environment.waterSystem.capture(f.renderer,f.scene,f.camera,2),false,'failed reflection stays in atmosphere-only mode');
  f.environment.waterSystem.setQuality(2);f.environment.waterSystem.setQuality(0);
  assert.equal(f.environment.water.uniforms.uDetail.value,1,'close-up water detail can recover independently of a failed GPU pass');
  assert.equal(f.environment.waterSystem.capture(f.renderer,f.scene,f.camera,3),false,'distance LOD must not revive a failed reflection pass');
  assert.equal(calls,1);
 }finally{f.environment.dispose();}
});

test('distance quality changes release reflection targets and restore near detail and reflection size',()=>{
 const f=captureFixture();try{
  const system=f.environment.waterSystem,uniforms=f.environment.water.uniforms,targets=[];let disposed=0;
  f.renderer.render=()=>{const target=f.renderer.getRenderTarget();targets.push(target);target.addEventListener('dispose',()=>disposed++);};
  assert.equal(system.capture(f.renderer,f.scene,f.camera,1),true);assert.equal(targets.at(-1).width,256);
  system.setQuality(1);assert.equal(disposed,1);assert.equal(uniforms.uDetail.value,.65);
  assert.equal(system.capture(f.renderer,f.scene,f.camera,2),true);assert.equal(targets.at(-1).width,128);
  system.setQuality(2);assert.equal(disposed,2);assert.equal(uniforms.uDetail.value,.3);
  assert.equal(system.capture(f.renderer,f.scene,f.camera,3),false);
  system.setQuality(0);assert.equal(uniforms.uDetail.value,1);
  assert.equal(system.capture(f.renderer,f.scene,f.camera,4),true);assert.equal(targets.at(-1).width,256);
  assert.notEqual(targets.at(-1),targets[0]);
 }finally{f.environment.dispose();}
});
test('world-space reflection projection is correct, cadence is capped and reduced motion captures only view changes',()=>{
 const f=captureFixture();try{
  let calls=0,mirror=null;f.renderer.render=(_,camera)=>{calls++;mirror=camera;};
  const system=f.environment.waterSystem;
  assert.equal(system.capture(f.renderer,f.scene,f.camera,1,{exclude:[f.overlay],reduced:true}),true);
  assert.equal(calls,1);assert.equal(f.environment.water.uniforms.uReflectionReady.value,1);
  const world=new Vector4(2,CITY_WATER_LEVEL,3,1),actual=world.clone().applyMatrix4(f.environment.water.uniforms.uReflectionMatrix.value);
  const bias=new Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),expected=world.clone().applyMatrix4(mirror.matrixWorldInverse).applyMatrix4(mirror.projectionMatrix).applyMatrix4(bias);
  assert.ok(Math.abs(actual.x/actual.w-expected.x/expected.w)<1e-9);assert.ok(Math.abs(actual.y/actual.w-expected.y/expected.w)<1e-9);
  assert.equal(system.capture(f.renderer,f.scene,f.camera,5,{reduced:true}),false);
  f.camera.position.x+=2;f.camera.lookAt(0,0,0);
  assert.equal(system.capture(f.renderer,f.scene,f.camera,6,{reduced:true}),true);
  assert.equal(system.capture(f.renderer,f.scene,f.camera,6.01),false);
  system.setQuality(2);assert.equal(f.environment.water.uniforms.uReflectionReady.value,0);assert.equal(system.capture(f.renderer,f.scene,f.camera,7),false);
 }finally{f.environment.dispose();}
});
