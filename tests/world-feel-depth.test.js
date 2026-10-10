import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createFieldCombatBuffer,canBufferCombat} from '../src/world/combat-buffer.js';
import {startField,stepField} from '../src/world/field-combat.js';
import {weaponAnimations} from '../src/world/weapon-animation.js';
import {createHumanPresence} from '../src/world/human-presence.js';
import {createSceneReadCache} from '../src/world/scene-read-cache.js';
import {journeyPresence,campaignPerson} from '../src/world/journey-presence.js';
import {createStoryRelic} from '../src/world/story-relic.js';
import {lowPlant} from '../src/world/realm-streaming.js';
import {FLORA_TYPES,FLORA_PALETTES,windShader} from '../src/world/flora.js';
import {blankSave} from '../src/world/rules.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

const battle=()=>({region:'france',turn:0,enemy:900,enemyMax:900,hp:100,maxHP:100,focus:3,stats:{attack:15,affinity:2,speed:1},intent:'frappe',field:startField({x:0,z:6},{x:0,z:0})});
const move=(p,d,s)=>({x:p.x+d.x*s,z:p.z+d.z*s});
test('a slightly early press connects three real canonical strikes, once each, without accelerating combat time',()=>{
 let e=battle(),clock=0;const q=createFieldCombatBuffer(),combos=[];
 assert.equal(q.push('strike',e,clock),true);
 for(let tick=1;tick<=13;tick++){
  clock+=100;const kind=q.take(e,clock);e=stepField(e,{x:0,z:0,...(kind?{kind}:{})},move);
  if(e.field.last==='strike')combos.push(e.field.combo);
  if(tick===4||tick===10){assert.equal(e.field.cooldown,220);assert.equal(q.push('strike',e,clock),true);}
 }
 assert.deepEqual(combos,[1,2,3]);assert.equal(e.field.time,1300);assert.equal(q.take(e,clock),null);
});
test('defensive intent survives attack spam; old input is cleared on pause, defeat and expiry',()=>{
 const q=createFieldCombatBuffer(),e=battle();e.field.cooldown=220;
 assert.equal(q.push('guard',e,0),true);assert.equal(q.push('strike',e,10),false);assert.equal(q.take(e,100),null);
 e.field.cooldown=100;assert.equal(q.take(e,200),'guard');assert.equal(q.take(e,201),null);
 q.push('strike',e,300);assert.equal(q.take(e,1000),null);
 q.push('strike',e,1001);q.clear();assert.equal(q.take(e,1002),null);
 q.push('strike',e,1100);e.result='defeat';assert.equal(q.take(e,1101),null);delete e.result;
 e.field.cooldown=800;assert.equal(canBufferCombat(e,'strike'),false);assert.equal(q.push('strike',e,1200),false);assert.equal(q.push('unknown',e,1200),false);
});
test('the shipped traveller has three different upper-body strokes and each weapon changes the real pose',async()=>{
 const asset=await loadShippedCrowdFixture(0),idle=asset.animations.find(c=>c.name==='Idle'),signatures=new Set();
 for(const weapon of ['paris','scissors','axe','claws','thread','bow','wings']){
  const clips=weaponAnimations(idle,weapon),strokes=clips.filter(c=>['Attack','Attack2','Attack3'].includes(c.name));assert.equal(strokes.length,3);
  const body=strokes.map(c=>c.tracks.find(t=>t.name==='spine_02.quaternion').values);
  assert.notDeepEqual(body[0],body[1],weapon+' returning stroke');assert.notDeepEqual(body[0],body[2],weapon+' finisher');
  signatures.add(Array.from(body[0]).map(v=>v.toFixed(4)).join(','));
  for(const clip of strokes){assert.ok(clip.tracks.every(t=>! /^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(t.name)));for(const track of clip.tracks)assert.ok(track.values.every(Number.isFinite));}
 }
 assert.equal(signatures.size,7,'weapon-specific additions are actually applied');
});
test('human attention is bounded and never accumulates or overrides combat, reduced motion or the original rig pose',async()=>{
 const asset=await loadShippedCrowdFixture(0),model=clone(asset.scene),head=model.getObjectByName('Head');assert.ok(head);
 const original=head.quaternion.clone(),base=original.clone().normalize(),angle=()=>base.angleTo(head.quaternion.clone().normalize()),presence=createHumanPresence(model);
 for(let frame=0;frame<240;frame++){presence.beforeMixer();assert.deepEqual(head.quaternion.toArray(),original.toArray());presence.update(1/60,frame/60,{viewer:{x:2,y:1.7,z:4}});assert.ok(head.quaternion.toArray().every(Number.isFinite));assert.ok(angle()<.4);}
 assert.ok(angle()>.1);presence.beforeMixer();presence.update(.1,5,{viewer:{x:2,y:1.7,z:4},active:true});assert.ok(angle()<1e-6);presence.dispose();
 const reduced=createHumanPresence(model,{reducedMotion:true});reduced.update(.1,4,{viewer:{x:2,y:1.7,z:4}});assert.ok(angle()<1e-6);reduced.dispose();
});
test('walking reuses mission and map data, while new saves and tower floors invalidate it',()=>{
 const cache=createSceneReadCache(),save=blankSave();save.region='france';const mission=cache.campaign(save);
 const items=[{id:'npc',x:1}],landscape={lifeItems:[{id:'seat'}],liftItems:[],towerLifeItems:[{id:'exhibit'}]},map=cache.map(items,'hub',landscape);
 for(let i=0;i<600;i++){assert.equal(cache.campaign(save),mission);assert.equal(cache.map(items,'hub',landscape),map);}
 assert.notEqual(cache.campaign({...save}),mission);landscape.towerFloor={index:1};const floor=cache.map(items,'hub',landscape);assert.notEqual(floor,map);assert.ok(!floor.some(i=>i.id==='seat'));assert.equal(cache.map(items,'france',landscape),items);
});
test('story presence follows the current evidence and never invents a completed consequence',()=>{
 const current={region:'france',name:'Léa · la page absente',dialogue:'Un nom manque.',effects:[]};
 assert.match(journeyPresence(current,80).text,/écouter/);assert.equal(journeyPresence(current,5).text,current.dialogue);
 assert.match(journeyPresence({...current,effects:['archives_ouvertes']},80).text,/date et la couture/);
 assert.match(journeyPresence({...current,effects:['noms_retablis']},80).text,/retrouve sa page/);
 assert.match(journeyPresence({...current,phaseId:'homecoming',effects:['noms_retablis']},80).text,/Ramenons-le à la Cité/);
 assert.match(journeyPresence({...current,phaseId:'post',effects:['noms_retablis']},80).text,/correction/);
 assert.equal(journeyPresence({...current,finished:true}),null);assert.equal(campaignPerson({id:'france:rumor:relieuse',region:'france'}).body,'femme');
});
test('the French clue is a physical book on its plinth, with bounded meshes and proper disposal',()=>{
 const relic=createStoryRelic({region:'france',type:'campaignObjective',campaign:{phaseId:'evidence'}});assert.ok(relic);assert.equal(relic.root.children.length,3);
 const box=new T.Box3().setFromObject(relic.root);assert.ok(Math.abs(box.min.y-.5)<1e-6);assert.ok(box.max.x-box.min.x<1.6);
 let disposed=0;for(const mesh of relic.root.children){assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));mesh.geometry.addEventListener('dispose',()=>disposed++);}
 relic.dispose();assert.equal(disposed,3);assert.equal(createStoryRelic({region:'france',type:'realmTravel'}),null);
});
test('distant trees retain distinct proportions within a small triangle budget; province leaves share a wind clock',()=>{
 for(const type of FLORA_TYPES){const geometry=lowPlant(type,FLORA_PALETTES.france);geometry.computeBoundingBox();assert.ok(geometry.attributes.position.array.every(Number.isFinite));assert.ok(geometry.attributes.position.count/3<600);if(type==='Cypress')assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z<2.5);geometry.dispose();}
 const material=new T.MeshStandardMaterial(),time={value:0};windShader(material,time);const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};material.onBeforeCompile(shader);assert.equal(shader.uniforms.floraTime,time);time.value=12;assert.equal(shader.uniforms.floraTime.value,12);assert.match(shader.vertexShader,/flutter/);material.dispose();
});
