import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {frontierState} from '../src/world/frontier.js';
import {parisActivity} from '../src/world/paris-journey.js';
import {parisSites,parisWalls,parisInteriorAt} from '../src/world/paris-layout.js';
import {toLandscape,createTerrainField} from '../src/world/terrain.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findPath} from '../src/world/navigation.js';
import {advanceMotion} from '../src/world/motion.js';

const visit=()=>applyWorldAction(blankSave(),{type:'visit',region:'france'});
test('Paris streets and pedestrian routes leave authored buildings clear along their entire width',()=>{
 const f=createTerrainField('france',visit());
 for(const road of f.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.5);
  for(let j=0;j<=steps;j++){const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};for(const site of f.paris)assert.ok(obstacleDistance(p,site)>=road.width/2,`${site.id}: road overlaps building`);}
 }
});
test('idle enemy attack costs health without creating concentration, XP or resources',()=>{
 const initial=applyWorldAction(visit(),{type:'patrol'}),before=initial.adventure.encounter,after=applyWorldAction(initial,{type:'battle',action:'wait'});
 assert.ok(after.adventure.encounter.hp<before.hp);assert.equal(after.adventure.encounter.focus,before.focus);assert.equal(after.adventure.encounter.enemy,before.enemy);assert.equal(after.xp,initial.xp);assert.equal(after.shards,initial.shards);assert.equal(after.adventure.encounter.turn,1);
 assert.equal(normalizeSave(after).adventure.encounter.hp,after.adventure.encounter.hp);
});
test('cafe spends earned currency exactly once per purchase and rejects insufficient funds, full stock and battle',()=>{
 const s=visit();s.shards=6;const bought=applyWorldAction(s,{type:'provisions'});assert.equal(bought.shards,0);assert.equal(frontierState(bought).food,5);assert.equal(bought.xp,s.xp);assert.throws(()=>applyWorldAction(bought,{type:'provisions'}));
 const full=visit();full.shards=100;full.adventure.frontier.france={...frontierState(full),food:99};assert.throws(()=>applyWorldAction(full,{type:'provisions'}));
 const battle=applyWorldAction(s,{type:'patrol'});assert.throws(()=>applyWorldAction(battle,{type:'provisions'}));assert.throws(()=>applyWorldAction(blankSave(),{type:'provisions'}));
});
test('endless district loop reaches a first refuge without currency farming or terminal state',()=>{
 let s=applyWorldAction(visit(),{type:'help'});assert.equal(parisActivity(s).target,'france:resource:wood');
 for(let round=0;round<2;round++){
  for(const resource of ['wood','stone'])s=applyWorldAction(s,{type:'gather',resource});
  if(round===0){s=applyWorldAction(s,{type:'patrol'});for(let i=0;i<50&&!s.adventure.encounter.result;i++){const e=s.adventure.encounter;s=applyWorldAction(s,{type:'battle',action:e.focus>=2?'power':e.hp<40?'guard':'strike'});}assert.equal(s.adventure.encounter.result,'victory');s=applyWorldAction(s,{type:'leave'});}
 }
 assert.equal(parisActivity(s).target,'france:camp');s=applyWorldAction(s,{type:'build',building:'camp'});assert.equal(frontierState(s).camp,1);assert.equal(s.adventure.finished,false);assert.equal(parisActivity(s).target,'france:patrol');
});
test('both authored rooms have a walkable door, a bounded interior and solid side walls',()=>{
 const sites=parisSites('france',(x,z)=>toLandscape('france',x,z));
 for(const site of sites.filter(s=>s.interior)){
  const walls=parisWalls(site),front={x:site.x+Math.sin(site.rotation)*(site.depth/2+5),z:site.z+Math.cos(site.rotation)*(site.depth/2+5)},path=findPath(front,site,walls,260);assert.ok(path.length);
  let state={position:front,target:path.shift(),route:path};for(let n=0;n<600&&state.target;n++)state=advanceMotion(state,{x:0,z:0},1/30,10,walls,260);
  assert.equal(parisInteriorAt(state.position,sites)?.id,site.id);assert.ok(Math.hypot(state.position.x-site.x,state.position.z-site.z)<1);
  assert.equal(parisInteriorAt(front,sites),null);
 }
});
