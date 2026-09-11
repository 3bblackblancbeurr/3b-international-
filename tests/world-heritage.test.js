import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {HERITAGE,LANDMARK_SITE} from '../src/world/heritage.js';
import {createLandmark} from '../src/world/landmarks.js';
import {combatCue,createCombatEffects} from '../src/world/combat-effects.js';
import {advanceBattle} from '../src/world/engine.js';
import {createTerrainField} from '../src/world/terrain.js';
import {blankSave} from '../src/world/rules.js';

test('eight distinct landmark silhouettes fit the reserved site and a bounded draw/triangle budget',()=>{
 const signatures=new Set();
 for(const region of Object.keys(HERITAGE)){
  const asset=createLandmark(region),bounds=new Box3().setFromObject(asset.root),size=bounds.getSize(new Vector3());let draws=0,triangles=0;
  asset.root.traverse(m=>{if(!m.isMesh)return;draws++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite),region);});
  assert.ok(draws<=12,region+' draw budget '+draws);assert.ok(triangles<100000,region+' triangles '+triangles);assert.ok(size.x<=LANDMARK_SITE.radius*2+1&&size.z<=LANDMARK_SITE.radius*2+1,region+' footprint');assert.ok(size.y>18&&size.y<70,region+' skyline');
  signatures.add(Math.round(size.y)+':'+triangles);asset.update(0);assert.equal(asset.root.children.at(-1).visible,false);asset.update(3);assert.equal(asset.root.children.at(-1).visible,true);
  const geom=[];asset.root.traverse(m=>{if(m.isMesh)geom.push(m.geometry);});let disposed=0;new Set(geom).forEach(g=>g.addEventListener('dispose',()=>disposed++));asset.dispose();assert.equal(disposed,new Set(geom).size);
 }
 assert.equal(signatures.size,8);
});

test('distant terrain is bounded, not a vertical wall, and the civic forecourts stay flat',()=>{
 for(const region of Object.keys(HERITAGE)){
  const field=createTerrainField(region,blankSave());
  for(const a of field.anchors)assert.ok(Math.abs(field.height(a.x,a.z))<.01);
  for(const c of field.civic)assert.ok(Math.abs(field.height(c.x,c.z))<.01);
  for(let x=-210;x<=210;x+=10)for(let z=-210;z<=210;z+=10)assert.ok(field.height(x,z)<31,region+' horizon');
 }
});

const encounter=()=>({region:'france',turn:0,enemy:180,enemyMax:180,hp:100,maxHP:130,boss:true,focus:3,stats:{attack:15,affinity:2,heal:3},traps:1,support:true,intent:'percée',recoveries:2});
test('combat effects consume accepted outcomes: no fake damage, retaliation after victory, or hit on dodge',()=>{
 for(const action of ['strike','power','guard','dodge','trap','support']){
  const before=encounter(),after=advanceBattle(before,action),cue=combatCue(before,after,action,{path:'tempete'});
  assert.equal(cue.incoming,Math.max(0,before.hp-after.hp));assert.equal(cue.outgoing,Math.max(0,before.enemy-after.enemy));assert.equal(cue.intent,'percée');assert.equal(cue.counter,action!=='trap');
  if(action==='dodge')assert.equal(cue.incoming,0);if(action==='guard')assert.equal(cue.outgoing,0);
  for(const reducedMotion of [false,true]){const fx=createCombatEffects({reducedMotion});fx.start(cue,0);for(const t of [.1,.24,.5,.75])fx.update(t,new Vector3(1,0,3),new Vector3(4,0,1));assert.ok(fx.state.active);fx.update(1,new Vector3(),new Vector3());assert.equal(fx.state.active,false);fx.dispose();}
 }
 const before={...encounter(),enemy:1},after=advanceBattle(before,'strike');assert.equal(combatCue(before,after,'strike').counter,false);assert.equal(combatCue(before,before,'strike'),null);
});
