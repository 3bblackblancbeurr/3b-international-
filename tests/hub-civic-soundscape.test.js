import test from 'node:test';
import assert from 'node:assert/strict';
import {HUB_AMBIENT_SOURCES,hubAmbientFrame,hubFootstepSurface} from '../src/world/hub/civic-soundscape.js';
import {CITE_ISLANDS,citeIslandRadius} from '../src/world/hub/platform-topology.js';
import {HUB_SCALE,platformBuilding} from '../src/world/hub/platform-layout.js';
import {createWorldAudio} from '../src/world/audio.js';

test('water sounds occupy the lips of actual authored cascades and stop far away',()=>{
 const cascades=HUB_AMBIENT_SOURCES.filter(source=>source.id.startsWith('cascade:'));
 assert.equal(cascades.length,20);
 for(const source of cascades){
  const island=CITE_ISLANDS.find(i=>'cascade:'+i.id===source.id),angle=Math.atan2(island.z,island.x),r=citeIslandRadius(island,angle)+.15;
  assert.ok(Math.abs(source.x-(island.x+Math.cos(angle)*r)*HUB_SCALE)<.0001);
  assert.ok(Math.abs(source.z-(island.z+Math.sin(angle)*r)*HUB_SCALE)<.0001);
 }
 const near=hubAmbientFrame({...cascades[0],heading:0});
 assert.ok(near.sources.some(source=>source.id===cascades[0].id));
 assert.equal(near.caption,'Cascade');
 assert.equal(hubAmbientFrame({x:10000,z:10000}).sources.length,0);
});

test('ambient sources are bounded, stereo-signed, attenuated indoors and quieter at night',()=>{
 const sound=HUB_AMBIENT_SOURCES.find(s=>s.id==='district:commerce'),listener={x:sound.x+10,z:sound.z,heading:0};
 const outdoors=hubAmbientFrame(listener,{limit:100}),indoors=hubAmbientFrame(listener,{interior:{id:'house_3b'}}),night=hubAmbientFrame(listener,{phase:'night'});
 assert.ok(outdoors.sources.length<=4);
 const day=outdoors.sources.find(s=>s.id===sound.id);
 assert.ok(day.pan<0);
 assert.ok(indoors.sources.find(s=>s.id===sound.id).gain<day.gain);
 assert.ok(night.sources.find(s=>s.id===sound.id).gain<day.gain);
});

test('footstep resonances use real physical rooms and exposed paved bridge segments',()=>{
 const room=platformBuilding({id:'memory_archives'});
 assert.equal(hubFootstepSurface({x:room.buildingX+room.width*.36,z:room.buildingZ}).id,'interior-stone');
 assert.equal(hubFootstepSurface({x:room.buildingX,z:room.buildingZ},'memory_archives').id,'woven-runner');
 assert.ok(hubFootstepSurface({x:room.buildingX,z:room.buildingZ}).volume<hubFootstepSurface({x:room.buildingX+room.width*.36,z:room.buildingZ}).volume);
 assert.equal(hubFootstepSurface({x:0,z:0}).id,'paving');
 assert.equal(hubFootstepSurface({x:0,z:-50*HUB_SCALE}).id,'bridge-stone');
});

test('opt-in audio creates at most four ambient loops and releases them on hide disable and close',()=>{
 const original=globalThis.window,contexts=[];
 class Param{constructor(value=0){this.value=value;}setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
 class Node{constructor(){this.gain=new Param();this.pan=new Param();this.frequency=new Param();this.Q=new Param();this.stopped=false;this.disconnected=false;}connect(to){return to;}disconnect(){this.disconnected=true;}start(){}stop(){this.stopped=true;}}
 class Context{constructor(){this.currentTime=0;this.sampleRate=32;this.destination=new Node();this.sources=[];this.oscillators=[];this.panners=[];contexts.push(this);}createGain(){return new Node();}createOscillator(){const node=new Node();this.oscillators.push(node);return node;}createBuffer(){return {getChannelData:()=>new Float32Array(64)};}createBufferSource(){const node=new Node();this.sources.push(node);return node;}createBiquadFilter(){return new Node();}createStereoPanner(){const node=new Node();this.panners.push(node);return node;}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}}
 globalThis.window={AudioContext:Context};
 const audio=createWorldAudio(),source=HUB_AMBIENT_SOURCES.find(s=>s.id==='cascade:commerce');
 try{
  audio.ambience('hub',null);audio.listener({x:source.x+3,z:source.z},0);audio.weather('rain');
  assert.equal(contexts.length,0,'no context exists before the user enables sound');
  audio.enable(true,'hub');const ctx=contexts[0];
  assert.ok(ctx.sources.filter(s=>!s.stopped).length>0);
  assert.ok(ctx.sources.filter(s=>!s.stopped).length<=4);
  assert.ok(ctx.panners.some(p=>p.pan.value<0),'left sources retain a negative pan');
  for(let x=-200;x<=200;x+=20){audio.listener({x,z:0},0);assert.ok(ctx.sources.filter(s=>!s.stopped).length<=4);}
  audio.visibility(true);assert.ok(ctx.sources.every(s=>s.stopped&&s.disconnected));
  audio.visibility(false);audio.listener(source,0);assert.ok(ctx.sources.some(s=>!s.stopped));
  audio.enable(false);assert.ok(ctx.sources.every(s=>s.stopped&&s.disconnected));
  audio.enable(true,'hub');audio.close();audio.close();assert.ok(ctx.closed);assert.ok(ctx.sources.every(s=>s.stopped&&s.disconnected));assert.ok(ctx.oscillators.every(s=>s.stopped&&s.disconnected));
  audio.enable(true,'hub');assert.equal(contexts.length,1,'a disposed scene cannot recreate sound');
 }finally{audio.close();globalThis.window=original;}
});

test('gardens, arrival and marina have distinct positional life beds and weather-sensitive city activity',()=>{
 for(const id of ['life:welcome','life:gardens','life:marina'])assert.ok(HUB_AMBIENT_SOURCES.some(s=>s.id===id),id);
 const garden=HUB_AMBIENT_SOURCES.find(s=>s.id==='life:gardens');
 const daytime=hubAmbientFrame(garden,{phase:'day',weather:'clear'}).sources.find(s=>s.id===garden.id);
 const night=hubAmbientFrame(garden,{phase:'night',weather:'clear'}).sources.find(s=>s.id===garden.id);
 const storm=hubAmbientFrame(garden,{phase:'day',weather:'storm'}).sources.find(s=>s.id===garden.id);
 assert.ok(daytime?.gain>0,'garden wildlife is audible next to the gardens during daylight');
 assert.ok((night?.gain||0)<daytime.gain*.2,'wildlife quiets after dark');
 assert.ok((storm?.gain||0)<daytime.gain*.2,'wildlife takes cover in storms');
 const visitor=HUB_AMBIENT_SOURCES.find(s=>s.id==='life:welcome');
 const square=hubAmbientFrame(visitor,{phase:'day'});
 assert.ok(square.sources.some(s=>s.id==='life:welcome'),'people are audible in the central arrival district');
 assert.ok(square.sources.length<=4,'the phone audio engine retains its four-loop maximum');
});
