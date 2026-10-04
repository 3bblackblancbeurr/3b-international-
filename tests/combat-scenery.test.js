import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCombatLineOfSight} from '../src/world/combat-sight.js';
import {startField,stepField} from '../src/world/field-combat.js';
import {resolveCameraObstruction} from '../src/world/camera-obstruction.js';

const wall={x:0,z:3,width:5,depth:.7};
const encounter=()=>({field:startField({x:0,z:6},{x:0,z:0}),hp:100,maxHP:100,enemy:500,enemyMax:500,turn:0,focus:3,stats:{attack:15,affinity:0,speed:1},traps:1,support:true,region:'france',intent:'frappe'});
const mover=(p,v,d)=>({x:p.x+v.x*d,z:p.z+v.z*d});mover.lineOfSight=(a,b)=>hasCombatLineOfSight(a,b,[wall]);

test('combat sight blocks thin rotated walls and pillars while water and disabled scenery remain transparent',()=>{
 const a={x:0,z:0},b={x:0,z:6};assert.equal(hasCombatLineOfSight(a,b,[wall]),false);
 assert.equal(hasCombatLineOfSight(a,b,[{...wall,depth:.015,rotation:.54}]),false);
 assert.equal(hasCombatLineOfSight(a,b,[{x:0,z:3,r:.1}]),false);
 assert.equal(hasCombatLineOfSight(a,b,[{...wall,enabled:false}]),true);
 assert.equal(hasCombatLineOfSight(a,b,[{...wall,blocksAttacks:false}]),true);
 assert.equal(hasCombatLineOfSight(a,b,[{...wall,x:12}]),true);
 assert.equal(hasCombatLineOfSight(a,{x:Infinity,z:0},[]),false);
});

test('player strike, power and trap cannot damage or interrupt through a wall',()=>{
 for(const kind of ['strike','power','trap']){
  const e=stepField(encounter(),{x:0,z:0,kind},mover);assert.equal(e.enemy,500);assert.equal(e.field.stagger,0);
  if(kind==='trap')assert.equal(e.traps,1);else assert.match(e.log,/obstacle/);
 }
 const open=(p,v,d)=>mover(p,v,d);open.lineOfSight=(a,b)=>hasCombatLineOfSight(a,b,[]);
 const hit=stepField(encounter(),{x:0,z:0,kind:'strike'},open);assert.equal(hit.enemy,485);
});

test('an enemy cannot prepare or finish an impact through intervening scenery',()=>{
 let e=encounter();e.field.recover=0;
 e=stepField(e,{x:0,z:0},mover);assert.equal(e.field.phase,'pursuit');assert.equal(e.hp,100);
 e=encounter();e.field.phase='windup';e.field.windup=100;e.field.aim={...e.field.p};
 e=stepField(e,{x:0,z:0},mover);assert.equal(e.hp,100);assert.equal(e.field.phase,'recovery');assert.equal(e.field.last,'miss');
});

test('camera clears roof edges and handles targets in the safety margin without passing through a wall',()=>{
 const solid={x:0,z:3,width:5,depth:.7,bottom:0,top:4},target={x:0,y:4.1,z:0},eye={x:0,y:4.1,z:8};
 assert.ok(resolveCameraObstruction(target,eye,[solid]).z<2);
 const near={x:0,y:2,z:2};assert.ok(resolveCameraObstruction(near,{x:0,y:2,z:8},[solid]).z<=near.z+.01);
 assert.deepEqual(resolveCameraObstruction(near,{x:0,y:2,z:0},[solid]),{x:0,y:2,z:0});
 assert.deepEqual(resolveCameraObstruction(target,eye,[{...solid,enabled:false}]),eye);
});
