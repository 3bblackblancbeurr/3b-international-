import test from 'node:test';
import assert from 'node:assert/strict';
import {startField,stepField,attackContains,normalizeField} from '../src/world/field-combat.js';
import {finalCirclePhase,finalCirclePhaseMastered,finalCircleLockedEnemyFloor,finalCircleMasteryCount} from '../src/world/final-circle.js';
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


test('eight guardian resonances are real one-charge field actions with distinct effects',()=>{
 const base=id=>({...encounter(),resonance:id,resonanceCharges:1});
 const use=id=>idle(base(id),'resonance');
 let e=use('france');assert.equal(e.resonanceCharges,0);assert.equal(e.field.last,'resonance');assert.equal(e.opening,true);
 e=use('algerie');assert.ok(e.resonanceShield>=.35);
 e=use('maroc');assert.ok(e.resonanceShield>=.65);assert.equal(e.resonancePenalty,true);
 e=base('tunisie');e.field.stamina=50;e=idle(e,'resonance');assert.ok(e.field.dodge>0);assert.ok(e.field.stamina>50);
 e=use('espagne');assert.equal(e.field.combo,2);assert.ok(e.field.comboUntil>e.field.time);
 e=base('italie');e.hp=55;e=idle(e,'resonance');assert.ok(e.hp>55);
 e=base('turquie');e.focus=0;e=idle(e,'resonance');assert.equal(e.focus,1);assert.equal(e.resonanceAnchor,true);
 e=use('estonie');assert.equal(e.field.phase,'recovery');assert.equal(e.opening,true);
});

test('resonance selection is server validated and copied into a real encounter',()=>{
 let save=normalizeSave({...blankSave(),seals:['france']});
 assert.throws(()=>applyWorldAction(save,{type:'resonanceSelect',region:'algerie'}),/Libère d’abord/);
 save=applyWorldAction(save,{type:'resonanceSelect',region:'france'});
 assert.equal(save.adventure.resonance,'france');
 save=applyWorldAction(save,{type:'visit',region:'france'});
 save=applyWorldAction(save,{type:'patrol'});
 assert.equal(save.adventure.encounter.resonance,'france');
 assert.equal(save.adventure.encounter.resonanceCharges,1);
 save=applyWorldAction(save,{type:'fieldStart'});
 save=applyWorldAction(save,{type:'field',x:0,z:0,kind:'resonance'});
 assert.equal(save.adventure.encounter.resonanceCharges,0);
 assert.equal(normalizeSave(save).adventure.encounter.resonance,'france');
});


test('regional guardians enforce distinct field mechanics instead of stat-only reskins',()=>{
 const boss=region=>({...encounter(),boss:true,region,enemy:1000,enemyMax:1000});
 let france=idle(boss('france'),'strike');assert.ok(france.enemy>985,'Justice reduces unverified opening damage');
 let estonie=idle(boss('estonie'),'strike');assert.ok(estonie.enemy>france.enemy,'Sagesse punishes attacks outside recovery even more strongly');
 let espagne=boss('espagne');espagne=idle(espagne,'strike');assert.ok(espagne.guardianMeter>0,'Passion builds intensity');
 let italie=boss('italie');italie=idle(italie,'strike');assert.equal(italie.enemy,1000,'Espoir rebuild shield absorbs the first hit');assert.ok(italie.guardianShield<26);
 let maroc=idle(boss('maroc'));assert.equal(maroc.guardianMeter,100,'Noblesse starts with an inheritance to protect');
});

test('final circle damage cannot cross a Guardian threshold until that phase mechanic is mastered',()=>{
 let e={...encounter(),boss:true,final:true,region:'france',enemy:321,enemyMax:360,stats:{...encounter().stats,attack:80}};
 e=idle(e);assert.equal(finalCirclePhase(e).index,1);assert.equal(finalCirclePhaseMastered(e),false);
 e.field.cooldown=0;e.field.phase='pursuit';e.field.p={x:0,z:6};e.field.enemy={x:0,z:0};
 e=idle(e,'strike');
 assert.equal(e.enemy,finalCircleLockedEnemyFloor(e,{index:1}), 'unverified damage must stop before phase 2');
 assert.equal(finalCirclePhase(e).index,1);
 e.guardianFlag=true;e.field.cooldown=0;e.field.phase='recovery';e.field.recover=500;e.field.p={x:0,z:6};e.field.enemy={x:0,z:0};
 e=idle(e,'strike');
 assert.equal(finalCirclePhaseMastered(e,{index:1}),true);
 assert.ok(e.enemy<finalCircleLockedEnemyFloor(e,{index:1}));
});

test('validated final phase transitions restore a bounded part of the player resources',()=>{
 let e={...encounter(),boss:true,final:true,region:'france',enemy:315,enemyMax:360,hp:50,maxHP:100,finalCirclePhase:1,finalCircleMastery:1};
 e.field.stamina=40;e=idle(e);
 assert.equal(e.finalCirclePhase,2);
 assert.ok(e.hp>=64&&e.hp<=e.maxHP,'phase recovery must be useful but bounded');
 assert.ok(e.focus>=1,'the Guardian link restores one focus on a validated transition');
 assert.ok(e.field.stamina>=58,'the Guardian link restores some endurance');
 assert.equal(finalCirclePhaseMastered(e,{index:1}),true);
});

test('each of the eight final Guardian mechanics can mark its own mastery bit',()=>{
 const make=index=>{
  const enemyMax=800,enemy=Math.max(1,800-(index-1)*100);
  let e={...encounter(),boss:true,final:true,region:'france',enemy,enemyMax,stats:{...encounter().stats,attack:40}};
  e=idle(e);return e;
 };
 let e=make(1);e.guardianFlag=true;e.field.phase='recovery';e.field.recover=500;e.field.cooldown=0;e=idle(e,'strike');assert.equal(finalCirclePhaseMastered(e,{index:1}),true);
 e=make(2);e.field.phase='windup';e.field.windup=0;e.field.guard=500;e.field.p={...e.field.home};e=idle(e);assert.equal(finalCirclePhaseMastered(e,{index:2}),true);
 e=make(3);e.field.phase='windup';e.field.windup=0;e.field.guard=500;e.field.p={...e.field.home};e=idle(e);assert.equal(finalCirclePhaseMastered(e,{index:3}),true);
 e=make(4);e.field.phase='windup';e.field.windup=0;e.field.dodge=500;e.field.enemy={x:0,z:0};e.field.p={x:0,z:4};e.field.aim={x:0,z:10};e=idle(e);assert.equal(finalCirclePhaseMastered(e,{index:4}),true);
 e=make(5);e.guardianFlag=true;e.guardianMeter=30;e.field.cooldown=0;e=idle(e,'guard');assert.equal(finalCirclePhaseMastered(e,{index:5}),true);
 e=make(6);e.guardianShield=10;e.field.cooldown=0;e.field.p={x:0,z:6};e.field.enemy={x:0,z:0};e=idle(e,'strike');assert.equal(finalCirclePhaseMastered(e,{index:6}),true);
 e=make(7);e.guardianFlag=true;e.field.phase='windup';e.field.windup=0;e.field.guard=500;e=idle(e);assert.equal(finalCirclePhaseMastered(e,{index:7}),true);
 e=make(8);e.field.phase='recovery';e.field.recover=500;e.field.cooldown=0;e.field.p={x:0,z:6};e.field.enemy={x:0,z:0};e=idle(e,'strike');assert.equal(finalCirclePhaseMastered(e,{index:8}),true);
 assert.equal(finalCircleMasteryCount(e),1,'isolated phase fixture should only set its own bit');
});

test('final field combat rotates through all eight guardian mechanics by enemy health',()=>{
 let e={...encounter(),boss:true,final:true,region:'france',enemy:800,enemyMax:800};
 const expected=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
 for(let index=0;index<8;index++){
  e.enemy=Math.max(1,800-index*100);
  e=idle(e);
  assert.equal(e.finalCirclePhase,index+1,'phase '+(index+1));
  if(expected[index]==='maroc')assert.equal(e.guardianMeter,100);
  if(expected[index]==='italie')assert.equal(e.guardianShield,26);
 }
});
