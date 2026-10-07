import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldAudio} from '../src/world/audio.js';

function browserAudio({blocked=false,deferred=false}={}){
 const previous=globalThis.window,contexts=[],gestures=new Map();
 class Param{
  constructor(value=0){this.value=value;this.values=[];}
  setTargetAtTime(value){this.value=value;this.values.push(value);}
  setValueAtTime(value){this.value=value;this.values.push(value);}
  exponentialRampToValueAtTime(value){this.value=value;this.values.push(value);}
 }
 class AudioNode{
  constructor(){for(const key of ['gain','frequency','pan','Q','threshold','knee','ratio','attack','release'])this[key]=new Param();this.stopped=false;this.disconnected=false;this.connections=[];}
  connect(to){this.connections.push(to);return to;}
  disconnect(){this.disconnected=true;}
  start(){this.started=true;}
  stop(time){if(time===undefined)this.stopped=true;else this.stopAt=time;}
 }
 class AudioContext{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=64;this.destination=new AudioNode();this.sources=[];this.oscillators=[];this.gains=[];this.listeners=new Set();this.allowResume=!blocked;this.resumeCount=0;contexts.push(this);}
  createGain(){const node=new AudioNode();this.gains.push(node);return node;}
  createOscillator(){const node=new AudioNode();this.oscillators.push(node);return node;}
  createBuffer(){return {getChannelData:()=>new Float32Array(128)};}
  createBufferSource(){const node=new AudioNode();this.sources.push(node);return node;}
  createBiquadFilter(){return new AudioNode();}
  createStereoPanner(){return new AudioNode();}
  createDynamicsCompressor(){this.compressor=new AudioNode();return this.compressor;}
  addEventListener(type,fn){if(type==='statechange')this.listeners.add(fn);}
  removeEventListener(type,fn){if(type==='statechange')this.listeners.delete(fn);}
  changeState(state){this.state=state;for(const fn of this.listeners)fn();}
  resume(){this.resumeCount++;if(!this.allowResume)return Promise.reject(new Error('User activation required'));if(deferred)return new Promise(resolve=>{this.finishResume=resolve;});this.changeState('running');return Promise.resolve();}
  suspend(){this.changeState('suspended');return Promise.resolve();}
  close(){this.changeState('closed');return Promise.resolve();}
 }
 globalThis.window={AudioContext,addEventListener(type,fn){if(!gestures.has(type))gestures.set(type,new Set());gestures.get(type).add(fn);},removeEventListener(type,fn){gestures.get(type)?.delete(fn);}};
 return {contexts,gestures,gesture(type='pointerdown'){return Promise.all([...(gestures.get(type)||[])].map(fn=>fn()));},restore(){globalThis.window=previous;}};
}

test('browser autoplay blocking unlocks on the next real input without recreating audio',async()=>{
 const browser=browserAudio({blocked:true}),audio=createWorldAudio();
 try{
  assert.equal(await audio.enable(true,'hub'),false);
  const ctx=browser.contexts[0];
  assert.equal(audio.status().context,'suspended');
  assert.equal(audio.status().needsGesture,true);
  assert.equal(audio.gameplay('attack'),false,'a blocked context does not accumulate attack sounds');
  assert.equal(ctx.oscillators.length,3,'only the persistent music pad exists before activation');
  ctx.allowResume=true;await browser.gesture();
  assert.equal(audio.status().context,'running');
  assert.equal(audio.status().needsGesture,false);
  assert.ok(audio.status().ambientLoops>0);
  assert.equal(browser.contexts.length,1);
  assert.ok([...browser.gestures.values()].every(listeners=>listeners.size===0));
 }finally{audio.close();browser.restore();}
});

test('tab visibility and browser interruptions recover while mute stays respected',async()=>{
 const browser=browserAudio(),audio=createWorldAudio();
 try{
  await audio.enable(true,'france');const ctx=browser.contexts[0];
  assert.equal(audio.status().ambientLoops,1,'countries have their own continuous ambience');
  await audio.visibility(true);
  assert.equal(ctx.state,'suspended');assert.equal(audio.status().ambientLoops,0);
  await audio.visibility(false);
  assert.equal(ctx.state,'running');assert.equal(audio.status().ambientLoops,1);
  ctx.changeState('interrupted');assert.equal(audio.status().needsGesture,true);
  await browser.gesture('touchstart');assert.equal(ctx.state,'running');
  await audio.enable(false);const resumes=ctx.resumeCount;
  await audio.visibility(true);await audio.visibility(false);await browser.gesture('keydown');
  assert.equal(ctx.resumeCount,resumes,'visibility or gestures cannot override the player’s mute choice');
  assert.equal(audio.status().ambientLoops,0);
  assert.equal(ctx.state,'suspended');
 }finally{audio.close();browser.restore();}
});

test('the world stays audible outside landmark radii with a bounded ambient graph',async()=>{
 const browser=browserAudio(),audio=createWorldAudio();
 try{
  await audio.enable(true,'hub');const ctx=browser.contexts[0];
  audio.listener({x:10000,z:10000},0);
  assert.equal(audio.status().ambientLoops,1);
  assert.equal(audio.environment().sources[0].kind,'atmosphere');
  const day=audio.environment().sources[0].gain;
  audio.phase('night');assert.ok(audio.environment().sources[0].gain<day);
  audio.weather('storm');assert.ok(audio.environment().sources[0].gain>day);
  audio.ambience('hub',{id:'memory_archives'});assert.ok(audio.environment().sources[0].gain<day);
  for(const region of ['france','italie','estonie','turquie','algerie','tunisie','maroc','espagne','hub']){
   audio.ambience(region,null);
   assert.ok(audio.status().ambientLoops>0&&audio.status().ambientLoops<=4);
   assert.ok(ctx.sources.filter(node=>!node.stopped).length<=4,'travel releases previous-region loops');
  }
  assert.ok(ctx.gains[0].gain.value>.5,'default master avoids the old overly quiet gain reduction');
  assert.equal(ctx.compressor.ratio.value,4,'sharp action peaks are controlled');
 }finally{audio.close();browser.restore();}
});

test('movement and combat have distinct feedback and mute cancels delayed action tails',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const browser=browserAudio(),audio=createWorldAudio();
 try{
  await audio.enable(true,'hub');const ctx=browser.contexts[0],pitches=[];
  for(const action of ['jump','land','attack','guard','dodge','power']){
   const before=ctx.oscillators.length;
   assert.equal(audio.gameplay(action),true);
   assert.ok(ctx.oscillators.length>before);
   pitches.push(ctx.oscillators[before].frequency.values[0]);
  }
  assert.equal(new Set(pitches).size,pitches.length,'actions remain recognisable by their own pitch');
  assert.equal(audio.gameplay('unknown'),false);
  await audio.enable(false);
  assert.ok(ctx.oscillators.slice(3).every(node=>node.stopped&&node.disconnected));
  const before=ctx.oscillators.length;
  await audio.enable(true,'hub');t.mock.timers.tick(200);
  assert.equal(ctx.oscillators.length,before,'a previous power tail cannot play after re-enabling sound');
 }finally{audio.close();browser.restore();}
});

test('disposing while resume is pending cannot resurrect loops or gesture listeners',async()=>{
 const browser=browserAudio({deferred:true}),audio=createWorldAudio();
 try{
  const pending=audio.enable(true,'hub'),ctx=browser.contexts[0];
  audio.close();ctx.finishResume();
  assert.equal(await pending,false);
  assert.equal(await audio.unlock(),false);
  assert.equal(audio.status().closed,true);
  assert.equal(audio.status().ambientLoops,0);
  assert.equal(ctx.listeners.size,0);
  assert.ok(ctx.sources.every(node=>node.stopped&&node.disconnected));
  assert.ok([...browser.gestures.values()].every(listeners=>listeners.size===0));
  assert.equal(browser.contexts.length,1);
 }finally{audio.close();browser.restore();}
});
