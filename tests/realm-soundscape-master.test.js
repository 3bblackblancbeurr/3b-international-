import test from 'node:test';
import assert from 'node:assert/strict';
import {REALM_ACOUSTIC_BEDS,REALM_SITE_ACOUSTICS,realmAcousticSources,realmAmbientFrame,realmFootstepSurface} from '../src/world/realm-soundscape.js';
import {realmSites} from '../src/world/realm-layout.js';
import {createWorldAudio} from '../src/world/audio.js';
import {realmScoreStep} from '../src/world/realm-score.js';
import {scoreAtmosphereMix} from '../src/world/audio-director.js';
import {worldRealmArt} from '../src/design-system/tokens.js';
import {addPremiumMicroDetails} from '../src/world/premium-microdetails.js';
import * as THREE from 'three';

const regions=['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'];

test('each of the eight realms has its own original, spatially grounded acoustic vocabulary',()=>{
 assert.equal(Object.keys(REALM_ACOUSTIC_BEDS).length,8);
 assert.equal(new Set(Object.values(REALM_ACOUSTIC_BEDS).map(v=>v.name)).size,8);
 for(const region of regions){
  const sources=realmAcousticSources(region),sites=realmSites(region);
  assert.equal(sources.length,sites.length,region);
  assert.strictEqual(realmAcousticSources(region),sources,'cached layout is reusable at runtime');
  for(const sound of sources){
   const place=sites.find(site=>'realm-sound:'+site.id===sound.id);
   assert.ok(place,region+' audio is located at an authored, real settlement');
   assert.equal(sound.x,place.x);assert.equal(sound.z,place.z);
   assert.ok(Object.hasOwn(REALM_SITE_ACOUSTICS,place.kind),'acoustic family is intentional: '+place.kind);
   assert.ok(sound.radius>=80&&sound.radius<=160);
  }
  const province=sites.find(s=>s.major&&s.kind!=='guardianCourt');
  const near=realmAmbientFrame(region,province,{phase:'day',limit:9});
  assert.ok(near.sources.some(s=>s.site===province.id),region+' province responds to the player');
  assert.ok(near.sources.length<=3,'region keeps 1 global plus max 3 local loops');
  assert.ok(near.sources.every(s=>s.gain>.00045&&s.gain<=.065));
  assert.ok(near.caption?.length>4);
  assert.equal(realmAmbientFrame(region,{x:900000,z:-900000}).sources.length,0);
  assert.equal(realmAmbientFrame(region,province,{limit:0}).sources.length,0);
 }
 assert.deepEqual(realmAcousticSources('unknown'),[]);
 assert.deepEqual(realmAmbientFrame('unknown',{x:0,z:0}),{sources:[],caption:null});
});

test('indoor, night and weather transitions remain gentle; distinct coast and forest respond',()=>{
 const coast=realmSites('maroc').find(site=>site.kind==='coastal'),forest=realmSites('estonie').find(site=>site.kind==='forest');
 assert.ok(coast&&forest);
 const dry=realmAmbientFrame('maroc',coast).sources.find(s=>s.site===coast.id);
 const rain=realmAmbientFrame('maroc',coast,{weather:'rain'}).sources.find(s=>s.site===coast.id);
 const inside=realmAmbientFrame('maroc',coast,{interior:{id:'house'}}).sources.find(s=>s.site===coast.id);
 assert.ok(rain.gain>dry.gain,'rain increases coastal surf');
 assert.ok(inside.gain<dry.gain*.2,'exterior waves attenuate in buildings');
 const birds=realmAmbientFrame('estonie',forest).sources.find(s=>s.site===forest.id);
 const night=realmAmbientFrame('estonie',forest,{phase:'night'}).sources.find(s=>s.site===forest.id);
 const storm=realmAmbientFrame('estonie',forest,{weather:'storm'}).sources.find(s=>s.site===forest.id);
 assert.ok(birds.gain>0);
 assert.ok((night?.gain||0)<birds.gain*.25);
 assert.ok((storm?.gain||0)<birds.gain*.2);
 const oriented=realmAmbientFrame('france',{...realmSites('france')[1],heading:90});
 assert.ok(oriented.sources.every(s=>Math.abs(s.pan)<=1));
});

test('footsteps change by the physical terrain without new gameplay rules',()=>{
 const alpine=realmSites('france').find(s=>s.kind==='alpine'),shore=realmSites('maroc').find(s=>s.kind==='coastal'),city=realmSites('france').find(s=>s.kind==='arcade');
 assert.equal(realmFootstepSurface('france',alpine).id,'realm-gravel');
 assert.equal(realmFootstepSurface('maroc',shore).id,'realm-soft-earth');
 assert.equal(realmFootstepSurface('france',city).id,'realm-courtyard-stone');
 assert.equal(realmFootstepSurface('france',{x:99999,z:99999}).id,'realm-trail');
 assert.equal(realmFootstepSurface('france',alpine,{interior:true}).id,'room-stone');
});

test('audio director keeps 4 loops at most and releases all regional beds on mute',async()=>{
 const prior=globalThis.window,contexts=[];
 class Param{constructor(value=0){this.value=value;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
 class Node{constructor(){for(const key of ['gain','frequency','Q','pan','threshold','knee','ratio','attack','release'])this[key]=new Param();this.stopped=false;this.disconnected=false;}connect(to){return to;}disconnect(){this.disconnected=true;}start(){}stop(){this.stopped=true;}}
 class Context{constructor(){this.currentTime=0;this.sampleRate=32;this.destination=new Node();this.sources=[];contexts.push(this);}createGain(){return new Node();}createBuffer(){return {getChannelData:()=>new Float32Array(64)};}createBufferSource(){const n=new Node();this.sources.push(n);return n;}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}createStereoPanner(){return new Node();}createDynamicsCompressor(){return new Node();}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}close(){return Promise.resolve();}}
 globalThis.window={AudioContext:Context};
 const audio=createWorldAudio();
 try{
  assert.equal(contexts.length,0,'autoplay remains opt-in');
  await audio.enable(true,'france');
  const ctx=contexts[0];
  for(const region of regions){
   const local=realmSites(region).find(s=>s.major&&s.kind!=='guardianCourt');
   audio.ambience(region,null);audio.listener(local,90);
   assert.ok(audio.status().ambientLoops>=2,'player hears a regional local source near the province');
   assert.ok(audio.status().ambientLoops<=4);
   assert.ok(ctx.sources.filter(s=>!s.stopped).length<=4,'switching countries cannot leak AudioNodes');
  }
  await audio.enable(false);
  assert.equal(audio.status().ambientLoops,0);
  assert.ok(ctx.sources.every(s=>s.stopped&&s.disconnected));
  await audio.enable(true,'maroc');audio.visibility(true);
  assert.equal(audio.status().ambientLoops,0);
 }finally{audio.close();globalThis.window=prior;}
});

test('score remains original, with light answer phrases and context-aware orchestration',()=>{
 for(const region of regions){
  const frame=realmScoreStep(region,'exploration',4);
  assert.ok(frame.notes.some(note=>note.role==='response'),region+' has a restrained musical answer');
  assert.ok(frame.notes.length<=6);
 }
 const day=scoreAtmosphereMix({region:'france',phase:'day'}),night=scoreAtmosphereMix({region:'france',phase:'night'}),storm=scoreAtmosphereMix({region:'france',weather:'storm'}),inside=scoreAtmosphereMix({region:'france',inside:true});
 assert.ok(night.melody<day.melody);
 assert.ok(storm.harmony<day.harmony);
 assert.ok(inside.response<day.response);
 assert.equal(scoreAtmosphereMix({state:'guardian',phase:'night'}).percussion,1,'guardian cues remain intelligible at night');
 assert.ok(scoreAtmosphereMix({region:'estonie',phase:'night'}).response<night.response);
});

test('the same eight realm visual accents add only two batched detail draws and respect low graphics budgets',()=>{
 for(const region of regions){
  const buildings=Array.from({length:60},(_,i)=>({x:(i%10)*18,z:Math.floor(i/10)*18,rotation:(i%4)*Math.PI/2,width:8,depth:9,height:9}));
  const root=new THREE.Group(),owned=[],field={roads:[],buildings,height:()=>0,lake:{x:0,z:0,r:8}};
  const details=addPremiumMicroDetails({region,field,root,owned});
  const cloth=root.getObjectByName('micro-realm-fabric'),lanterns=root.getObjectByName('micro-realm-lanterns');
  assert.ok(cloth?.isInstancedMesh&&lanterns?.isInstancedMesh,region+' batched cloth and lantern props');
  assert.ok(cloth.count>0&&cloth.count<=72,region+' has a strict instance cap');
  assert.equal(cloth.count,lanterns.count);
  assert.equal(cloth.material.color.getHexString(),new THREE.Color(worldRealmArt[region].cloth).getHexString(),'cloth follows canonical regional palette');
  const peak=lanterns.count;details.setDaylight(1);const daylight=lanterns.material.emissiveIntensity;details.setDaylight(0);const night=lanterns.material.emissiveIntensity;
  assert.ok(night>daylight,'lanterns subtly react to real time of day');
  details.setQuality('fluid');assert.ok(lanterns.count<peak&&cloth.count<peak,'low-end mobile lowers visible instances');
  details.setQuality('detail');assert.equal(lanterns.count,peak);
  assert.ok(root.children.filter(mesh=>mesh.isInstancedMesh).length<=5,'small number of scene draw calls');
  for(const disposable of owned)disposable.dispose?.();root.clear();
 }
});
