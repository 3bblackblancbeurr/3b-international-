import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,MeshBasicMaterial,TorusGeometry} from 'three';
import {createPremiumVisualResources,premiumVisualKey} from '../src/world/premium-visual-resources.js';

test('unchanged saves retain the same premium meshes and resources across a long session',()=>{
 const avatar=new Group(),scope=createPremiumVisualResources();let builds=0,disposed=0;
 const key=premiumVisualKey({region:'france',matrixAura:true,color:'#cdb46f'});
 const build=()=>{
  builds++;
  const geometry=scope.own(new TorusGeometry()),material=scope.own(new MeshBasicMaterial());
  for(const resource of [geometry,material])resource.addEventListener('dispose',()=>disposed++);
  const ring=scope.add(new Mesh(geometry,material));avatar.add(ring);
 };
 assert.equal(scope.sync(key,avatar,build),true);const original=avatar.children[0];
 for(let save=0;save<6000;save++)assert.equal(scope.sync(key,avatar,build),false);
 assert.equal(builds,1);assert.equal(avatar.children.length,1);assert.equal(avatar.children[0],original);assert.equal(disposed,0);
 scope.clear();assert.equal(avatar.children.length,0);assert.equal(disposed,2);
 scope.clear();assert.equal(disposed,2,'destroying twice must not redispose resources');
});

test('configuration changes free old owned resources immediately while preserving shared scene assets',()=>{
 const avatar=new Group(),sharedGeometry=new TorusGeometry(),sharedMaterial=new MeshBasicMaterial();
 const scenery=new Mesh(sharedGeometry,sharedMaterial);avatar.add(scenery);
 let ownedDisposals=0,sharedDisposals=0;const detached=[];
 for(const resource of [sharedGeometry,sharedMaterial])resource.addEventListener('dispose',()=>sharedDisposals++);
 const scope=createPremiumVisualResources({onClear:visuals=>detached.push(...visuals)});
 const build=()=>{
  const material=scope.own(new MeshBasicMaterial());material.addEventListener('dispose',()=>ownedDisposals++);
  // A broken ring has two pieces sharing one owned material.
  for(let piece=0;piece<2;piece++){
   const geometry=scope.own(new TorusGeometry());geometry.addEventListener('dispose',()=>ownedDisposals++);
   scope.own(material);
   const visual=scope.add(new Mesh(geometry,material));avatar.add(visual);
  }
 };
 scope.sync('ring',avatar,build);const old=avatar.children.slice(1);
 scope.sync('aura',avatar,build);
 assert.equal(ownedDisposals,3);assert.equal(sharedDisposals,0);assert.ok(old.every(visual=>visual.parent===null));assert.deepEqual(detached,old);
 assert.equal(avatar.children.length,3);assert.equal(avatar.children[0],scenery);
 scope.clear();assert.equal(ownedDisposals,6);assert.equal(sharedDisposals,0);assert.deepEqual(avatar.children,[scenery]);
 sharedGeometry.dispose();sharedMaterial.dispose();
});

test('a rebuilt avatar reapplies the effect even if its settings stay unchanged',()=>{
 const first=new Group(),second=new Group(),scope=createPremiumVisualResources();let builds=0,disposed=0;
 function build(anchor){
  builds++;const geometry=scope.own(new TorusGeometry()),material=scope.own(new MeshBasicMaterial());
  for(const resource of [geometry,material])resource.addEventListener('dispose',()=>disposed++);
  anchor.add(scope.add(new Mesh(geometry,material)));
 }
 scope.sync('aura',first,()=>build(first));scope.sync('aura',second,()=>build(second));
 assert.equal(builds,2);assert.equal(first.children.length,0);assert.equal(second.children.length,1);assert.equal(disposed,2);scope.clear();
});

test('cosmetics, region and refuge relocation invalidate the visual key without depending on gameplay ticks',()=>{
 const configuration={region:'france',color:null,matrixAura:true,brokenRing:true,refuge:{id:'france:camp',x:27,z:25,y:3}};
 const initial=premiumVisualKey(configuration);
 assert.equal(premiumVisualKey({...configuration,tick:1000}),initial);
 for(const change of [{region:'hub',refuge:null},{color:'#ff00ff'},{matrixAura:false},{brokenRing:false},{refuge:null},{refuge:{...configuration.refuge,x:30}},{refuge:{...configuration.refuge,z:30}},{refuge:{...configuration.refuge,y:5}}]){
  assert.notEqual(premiumVisualKey({...configuration,...change}),initial);
 }
});

test('an interrupted effect creation releases its partial resources and permits a retry',()=>{
 const avatar=new Group(),scope=createPremiumVisualResources();let disposed=0;
 assert.throws(()=>scope.sync('aura',avatar,()=>{
  const geometry=scope.own(new TorusGeometry()),material=scope.own(new MeshBasicMaterial());
  for(const resource of [geometry,material])resource.addEventListener('dispose',()=>disposed++);
  avatar.add(scope.add(new Mesh(geometry,material)));throw Error('Effect unavailable');
 }),/Effect unavailable/);
 assert.equal(disposed,2);assert.equal(avatar.children.length,0);assert.equal(scope.sync('aura',avatar,()=>{}),true);scope.clear();
});
