import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {COUNTRIES,CARDS} from '../src/world/catalog.js';
import {CHAPTERS,chapterState,puzzleStart,puzzleStep,puzzleSolved,nexusLevel,chapterCards} from '../src/world/chapters.js';
import {applyWorldAction,advanceBattle,pactCue,pactCues} from '../src/world/engine.js';
import {GUARDIAN_VALUES,guardianValueStep,guardianValueOptions} from '../src/world/guardian-values.js';
const solutions={france:[0,1,2,3],italie:[0,3,4,7,8],estonie:[2],turquie:[0,0,1,1,2,2],algerie:[0,0,1,3,3,3],tunisie:[0,0,1,2,2,2],maroc:[0,1,1,2,2,2],espagne:[0,1,2,2]};
const act=(s,type,extra={})=>applyWorldAction(s,{type,...extra});
function prepare(s,id){
 if(s.region!=='hub')s=act(s,'visit',{region:'hub'});s=act(s,'visit',{region:id});s=act(s,'help');
 for(const power of ['ally','ambiance','terrain'])s=act(s,'power',{power});
 for(const index of solutions[id])s=act(s,'puzzleStep',{index});s=act(s,'solve');
 for(const i of [0,1,2])s=act(s,'beacon',{id:id+':'+i});s=act(s,'restore',{choice:'garden'});
 for(const c of CARDS.filter(c=>c.country===id&&s.collection[c.id]&&['Terrain','Ambiance','Fragment / Pierre'].includes(c.category)))s=act(s,'equip',{id:c.id});
 for(const [choiceId] of GUARDIAN_VALUES[id].choices)s=act(s,'guardianValueChoice',{choiceId});
 return s;
}
function battle(s){
 for(let i=0;i<180&&!s.adventure.encounter.result;i++){
  const e=s.adventure.encounter;
  const action=e.intent==='rituel'&&e.focus>=2?'power':e.hp<e.maxHP-10||['rempart','double','vague','gel','éclipse','sable','percée'].includes(e.intent)?'guard':e.focus>=2?'power':'strike';
  s=act(s,'battle',{action});
 }
 assert.equal(s.adventure.encounter.result,'victory',JSON.stringify(s.adventure.encounter));return s;
}
test('all eight distinct puzzles can be solved through their actual controls',()=>{
 assert.equal(new Set(Object.values(CHAPTERS).map(c=>c.kind)).size,8);
 for(const c of COUNTRIES){let b=puzzleStart(c.id);assert.equal(puzzleSolved(c.id,b),false);for(const i of solutions[c.id])b=puzzleStep(c.id,b,i);assert.equal(puzzleSolved(c.id,b),true,c.id);}
});

test('guardian value trials use three contextual dilemmas per country',()=>{
 for(const country of COUNTRIES)for(let step=0;step<3;step++){
  const state={step},scene=guardianValueStep(country.id,state),options=guardianValueOptions(country.id,state);
  assert.ok(scene.prompt.length>30,country.id+' step '+step);
  assert.equal(options.length,3);
  assert.equal(options.filter(option=>option.correct).length,1);
  assert.equal(options.find(option=>option.correct).id,GUARDIAN_VALUES[country.id].choices[step][0]);
  assert.equal(new Set(options.map(option=>option.id)).size,3);
 }
});
test('a fresh player can rebuild all eight countries and win the playable finale',()=>{
 let s=blankSave();
 for(const c of COUNTRIES){
  s=prepare(s,c.id);s=act(s,'encounter',{id:c.id+':guardian'});s=battle(s);s=act(s,'leave');s=act(s,'restore');assert.equal(chapterState(s,c.id).restored,3);
  assert.deepEqual(normalizeSave(s),s);
 }
 assert.equal(nexusLevel(s),8);s=act(s,'visit',{region:'hub'});s=act(s,'final');s=battle(s);assert.equal(s.adventure.finished,true);assert.equal(s.adventure.cosmetic,'union');
 const xp=s.xp;s=act(s,'leave');assert.throws(()=>act(s,'final'));assert.equal(s.xp,xp);
});
test('quest order, rewards and cosmetics reject fabricated or repeated claims',()=>{
 let s=act(blankSave(),'visit',{region:'france'});assert.throws(()=>act(s,'solve'));assert.throws(()=>act(s,'beacon',{id:'france:0'}));assert.throws(()=>act(s,'encounter',{id:'france:guardian'}));assert.throws(()=>act(s,'battle',{action:'power'}));assert.throws(()=>act(s,'reward',{xp:9999}));assert.throws(()=>act(s,'cosmetic',{id:'union'}));
 s=act(s,'help');const xp=s.xp;s=act(s,'help');assert.equal(s.xp,xp);assert.throws(()=>act(s,'power',{power:'terrain'}));assert.throws(()=>act(s,'visit',{region:'italie'}));
 s=prepare(blankSave(),'france');const completed=s.xp;s=act(s,'solve');s=act(s,'beacon',{id:'france:0'});assert.equal(s.xp,completed);assert.throws(()=>act(s,'beacon',{id:'italie:0'}));
});
test('help and offerings create pacts with three validated choices; repeats cannot award',()=>{
 let s=act(act(blankSave(),'visit',{region:'france'}),'help');s=act(s,'encounter',{id:'france:echo:0'});const id=s.adventure.encounter.card;
 s=act(s,'approach',{kind:'help'});s=act(s,'pactStart');for(let i=0;i<3;i++)s=act(s,'pactChoice',{index:pactCues.indexOf(pactCue(s.adventure.encounter))});assert.equal(s.adventure.encounter.result,'recruited');assert.ok(s.collection[id]);assert.throws(()=>act(s,'pactChoice',{index:0}));
 s=act(s,'leave');s=act(s,'encounter',{id:'france:echo:1'});const shards=s.shards;s=act(s,'approach',{kind:'offer'});assert.equal(s.shards,shards-12);s=act(s,'pactStart');for(let i=0;i<3;i++)s=act(s,'pactChoice',{index:(pactCues.indexOf(pactCue(s.adventure.encounter))+1)%3});assert.equal(s.adventure.encounter.result,'missed');
});
test('expert guardians have stronger attacks and a single distinct challenge reward',()=>{
 let s=prepare(blankSave(),'france');s=act(s,'difficulty',{value:'expert'});s=act(s,'encounter',{id:'france:guardian'});assert.equal(s.adventure.encounter.expert,true);assert.ok(s.adventure.encounter.enemyMax>120);
 s=battle(s);assert.equal(chapterState(s,'france').challenge,true);const xp=s.xp;s=act(s,'leave');s=act(s,'encounter',{id:'france:guardian'});s=battle(s);assert.equal(s.xp-xp,35);
});
test('legacy progress survives but the final gate now requires all eight seals',()=>{
 const five=['france','italie','estonie','turquie','algerie'];
 const partial=normalizeSave({...blankSave(),xp:1500,collection:{C001:2,C022:3},seals:five,finalOpened:true,adventure:undefined});
 assert.equal(partial.xp,1500);assert.equal(partial.collection.C022,3);assert.equal(partial.finalOpened,false);assert.equal(partial.adventure.finished,false);assert.equal(nexusLevel(partial),0);
 const all=COUNTRIES.map(country=>country.id),complete=normalizeSave({...blankSave(),seals:all,finalOpened:true});
 assert.equal(complete.finalOpened,true);
});
