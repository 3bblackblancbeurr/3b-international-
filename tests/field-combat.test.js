import test from 'node:test';
import assert from 'node:assert/strict';
import {startField,stepField,attackContains,normalizeField} from '../src/world/field-combat.js';
import {applyWorldAction} from '../src/world/engine.js';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {COUNTRIES} from '../src/world/catalog.js';
const move=(p,v,d)=>({x:p.x+v.x*d,z:p.z+v.z*d});
const encounter=()=>({field:startField({x:0,z:6},{x:0,z:0}),hp:100,maxHP:100,enemy:1000,enemyMax:1000,turn:0,focus:0,stats:{attack:15,affinity:0,speed:1},traps:1,support:true,region:'france',intent:'frappe'});
const idle=(e,kind)=>stepField(e,{x:0,z:0,kind},move);
test('player attacks do not cause an immediate counter and button spam respects the simulation cooldown',()=>{
 let e=encounter();e=idle(e,'strike');assert.equal(e.hp,100);assert.equal(e.enemy,985);
 for(let n=0;n<4;n++)e=idle(e,'strike');assert.equal(e.enemy,985);assert.equal(e.hp,100);
 for(let n=0;n<20;n++)e=idle(e);assert.ok(e.hp<100,'enemy attacks without any player action');
});
test('a locked ground telegraph can really be escaped and guard is not an invulnerability toggle',()=>{
 let e=encounter();for(let n=0;n<9;n++)e=idle(e);assert.equal(e.field.phase,'windup');const aim={...e.field.aim};
 for(let n=0;n<11;n++)e=stepField(e,{x:1,z:0},move);assert.deepEqual(e.field.aim,aim);assert.equal(e.hp,100);assert.equal(attackContains(e.field,'frappe'),false);
 let guarded=encounter();for(let n=0;n<12;n++)guarded=idle(guarded);guarded=idle(guarded,'guard');for(let n=0;n<10;n++)guarded=idle(guarded);assert.ok(guarded.hp>90&&guarded.hp<100);
});
test('dodge spends endurance, moves the body and is available without concentration; trap interrupts preparation',()=>{
 let e=encounter(),p=e.field.p;e=idle(e,'dodge');assert.equal(e.focus,0);assert.ok(e.field.stamina<70);assert.ok(Math.hypot(e.field.p.x-p.x,e.field.p.z-p.z)>5);
 e=encounter();for(let n=0;n<9;n++)e=idle(e);e=idle(e,'trap');assert.equal(e.traps,0);assert.equal(e.field.phase,'recovery');assert.ok(e.field.stagger>1500);
});
test('fixed step rejects forged directions, ignores submitted damage and normalises all persisted field values',()=>{
 assert.throws(()=>stepField(encounter(),{x:Infinity,z:0},move));assert.throws(()=>stepField(encounter(),{x:4,z:0},move));
 const e=stepField(encounter(),{x:0,z:0,damage:999999,hp:999999,result:'victory'},move);assert.equal(e.enemy,1000);assert.equal(e.hp,100);assert.equal(e.result,undefined);
 assert.equal(normalizeField({version:1,p:{x:Infinity,z:NaN}}).p.x,0);
});
test('the eight countries share real-time combat, reload safely and grant expedition rewards only once',()=>{
 for(const c of COUNTRIES){
  let s=applyWorldAction(blankSave(),{type:'visit',region:c.id});s=applyWorldAction(s,{type:'patrol'});s=applyWorldAction(s,{type:'fieldStart'});assert.ok(s.adventure.encounter.field);assert.deepEqual(normalizeSave(s).adventure.encounter.field,s.adventure.encounter.field);
  assert.throws(()=>applyWorldAction(s,{type:'battle',action:'strike'}),/temps réel/);
  for(let n=0;n<600&&!s.adventure.encounter.result;n++){
   const e=s.adventure.encounter,f=e.field,d=Math.hypot(f.enemy.x-f.p.x,f.enemy.z-f.p.z),kind=f.phase==='windup'&&f.windup<=300?'guard':e.focus>=2?'power':'strike';
   s=applyWorldAction(s,{type:'field',x:d>6?(f.enemy.x-f.p.x)/d:0,z:d>6?(f.enemy.z-f.p.z)/d:0,kind});
  }
  assert.equal(s.adventure.encounter.result,'victory',c.id);const xp=s.xp;assert.throws(()=>applyWorldAction(s,{type:'field',x:0,z:0}));assert.equal(s.xp,xp);
 }
});
