import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave,teamStats} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {normalizeAvatar} from '../src/world/avatar-rules.js';
import {LOOKS} from '../src/world/wardrobe.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {createTerrainField,roadDistance} from '../src/world/terrain.js';
import {compassHeading} from '../src/world/settlements.js';
import {cameraRelative} from '../src/world/orbit.js';
import {MeshStandardMaterial,Texture} from 'three';
import {prepareTintMaterial} from '../src/world/avatar-material.js';

test('city and countryside discoveries award once per country and survive normalized saves',()=>{
 let s=blankSave();assert.throws(()=>applyWorldAction(s,{type:'survey',id:'city'}));
 for(const c of COUNTRIES){
  s=applyWorldAction(s,{type:'visit',region:c.id});
  for(const id of ['city','rural']){const xp=s.xp,shards=s.shards;s=applyWorldAction(s,{type:'survey',id});assert.equal(s.xp,xp+25);assert.equal(s.shards,shards+6);assert.deepEqual(applyWorldAction(s,{type:'survey',id}),s);}
  assert.throws(()=>applyWorldAction(s,{type:'survey',id:'unknown'}));
  s=applyWorldAction(s,{type:'visit',region:'hub'});
 }
 assert.equal(s.adventure.discoveries.length,16);assert.deepEqual(normalizeSave(s),s);
 const polluted={...s,adventure:{...s.adventure,discoveries:[...s.adventure.discoveries,'france:city','fake:rural']}};
 assert.equal(normalizeSave(polluted).adventure.discoveries.length,16);
 const fight=applyWorldAction(applyWorldAction(blankSave(),{type:'visit',region:'france'}),{type:'encounter',id:'france:echo:0'});
 assert.throws(()=>applyWorldAction(fight,{type:'survey',id:'city'}));
});

test('all wardrobe recipes round-trip for either silhouette, invalid colors and gear are rejected',()=>{
 for(const body of ['homme','femme'])for(const look of LOOKS){const {id,name,...recipe}=look;const avatar=normalizeAvatar({...recipe,name:'Aïcha',body,created:true});const s=applyWorldAction(blankSave(),{type:'avatar',avatar});assert.deepEqual(normalizeSave(s).adventure.avatar,avatar);assert.equal(avatar.name,'Aïcha');assert.equal(avatar.body,body);assert.equal(avatar.headwear,recipe.headwear);assert.equal(avatar.fabricColor,recipe.fabricColor);}
 const bad=normalizeAvatar({fabricColor:'url(x)',accentColor:'#fff',headwear:'giant',bag:'true',travelGear:'invincible'});assert.equal(bad.fabricColor,null);assert.equal(bad.headwear,'none');assert.equal(bad.bag,false);assert.equal(bad.travelGear,'libre');
 const base=blankSave(),stats=teamStats(base),gear=id=>teamStats({...base,adventure:{...base.adventure,avatar:{...base.adventure.avatar,travelGear:id}}});assert.equal(gear('leger').health,stats.health-5);assert.ok(gear('leger').speed>stats.speed);assert.equal(gear('renforce').health,stats.health+8);assert.ok(gear('renforce').speed<stats.speed);
});

test('compass heading agrees with forward movement at every camera orientation',()=>{
 for(const yaw of [0,.4,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*8+.7]){const forward=cameraRelative(0,-1,yaw),bearing=(Math.atan2(forward.x,-forward.z)*180/Math.PI+360)%360;assert.ok(Math.abs(compassHeading(yaw)-bearing)<1e-9);}
});

test('avatar fabric preserves shading while removing baked colors and metallic cloth',()=>{
 const m=new MeshStandardMaterial({map:new Texture(),metalness:1,metalnessMap:new Texture()});prepareTintMaterial(m);assert.equal(m.metalness,0);assert.equal(m.metalnessMap,null);const shader={fragmentShader:'#include <map_fragment>'};m.onBeforeCompile(shader);assert.ok(shader.fragmentShader.includes('shade3b'));assert.ok(shader.fragmentShader.includes('sampledDiffuseColor.a'));
 const pattern=new MeshStandardMaterial({map:new Texture()});const old=pattern.onBeforeCompile;prepareTintMaterial(pattern,{pattern:true});assert.equal(pattern.onBeforeCompile,old,'preserves the chosen accent color in patterns');m.map.dispose();pattern.map.dispose();m.dispose();pattern.dispose();
});

test('country streets stay flat, dry and clear of buildings, including bends and crossroads',()=>{
 for(const c of COUNTRIES){const f=createTerrainField(c.id,blankSave());assert.ok(roadDistance(f.lake.x,f.lake.z,f.roads)>f.lake.r+7,c.id+' dry roads');
  for(const road of f.roads)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);for(let k=0;k<=10;k++)for(const side of [-1,0,1]){const x=a.x+dx*k/10-dz/l*road.width/2*side,z=a.z+dz*k/10+dx/l*road.width/2*side;assert.ok(Math.abs(f.height(x,z))<.001,c.id+' street surface');}}
  assert.ok(f.buildings.every(b=>roadDistance(b.x,b.z,f.roads)>4.7));
 }
});
