import test from 'node:test';
import assert from 'node:assert/strict';
import {REALM_SCORE_THEMES,realmScoreTheme,realmScoreStep,realmScoreTempo,weaponMetalTimbre} from '../src/world/realm-score.js';
import {createWorldAudio} from '../src/world/audio.js';

function scoreBrowser(){
 const previous=globalThis.window,contexts=[];
 class Param{constructor(){this.value=0;this.events=[];}setValueAtTime(value,time){this.value=value;this.events.push([value,time]);}exponentialRampToValueAtTime(value,time){this.value=value;this.events.push([value,time]);}setTargetAtTime(value,time){this.value=value;this.events.push([value,time]);}cancelScheduledValues(time){this.cancelled=time;}}
 class Node{constructor(){for(const key of ['gain','frequency','pan','Q','threshold','knee','ratio','attack','release'])this[key]=new Param();this.stopped=false;this.disconnected=false;}connect(node){return node;}disconnect(){this.disconnected=true;}start(time=0){this.startAt=time;}stop(time){if(time===undefined)this.stopped=true;else this.stopAt=time;}setPeriodicWave(wave){this.wave=wave;}}
 class Context{
  constructor(){this.currentTime=0;this.state='suspended';this.sampleRate=64;this.destination=new Node();this.oscillators=[];this.waves=[];contexts.push(this);}
  createGain(){return new Node();}createOscillator(){const source=new Node();this.oscillators.push(source);return source;}createBuffer(){return {getChannelData:()=>new Float32Array(128)};}createBufferSource(){return new Node();}createBiquadFilter(){return new Node();}createStereoPanner(){return new Node();}createDynamicsCompressor(){return new Node();}
  createPeriodicWave(real,imag){const wave={real:[...real],imag:[...imag]};this.waves.push(wave);return wave;}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
 }
 globalThis.window={AudioContext:Context};return {contexts,restore(){globalThis.window=previous;}};
}

test('the eight realms and Hub have original distinct melodies, safe pitches and bounded layered voices',()=>{
 const themes=Object.values(REALM_SCORE_THEMES);assert.equal(themes.length,9);assert.equal(new Set(themes.map(t=>JSON.stringify(t.motif))).size,9);
 for(const theme of themes){
  assert.equal(theme.origin,'original-3b-web-score');assert.equal(theme.motif.length,16);assert.equal(theme.chords.length,4);
  for(const state of ['exploration','mission','guardian','combat','cinematic','homecoming','secret','interior'])for(let step=0;step<32;step++){
   const frame=realmScoreStep(theme.region,state,step);assert.ok(frame.notes.length<=6);assert.ok(frame.seconds>.24&&frame.seconds<.6);
   for(const note of frame.notes){assert.ok(note.frequency>=40&&note.frequency<4000);assert.ok(note.gain>0&&note.gain<=.08);assert.ok(note.duration>0&&note.duration<=6);}
  }
  assert.ok(realmScoreTempo(theme.region,'guardian')>realmScoreTempo(theme.region));
 }
 assert.equal(realmScoreTheme('unknown'),REALM_SCORE_THEMES.hub);
 const explore=realmScoreStep('france','exploration',0),combat=realmScoreStep('france','guardian',0),cinema=realmScoreStep('france','cinematic',0);
 assert.equal(explore.percussion,null);assert.ok(combat.percussion);assert.ok(combat.notes.some(n=>n.role==='threat'));assert.ok(cinema.notes.some(n=>n.role==='counterline'));
});

test('musical Web Audio scheduler stays bounded, changes realm/state and cancels all scheduled tails on mute or dispose',async t=>{
 t.mock.timers.enable({apis:['setInterval','setTimeout']});const browser=scoreBrowser(),audio=createWorldAudio();
 try{
  await audio.enable(true,'france');const ctx=browser.contexts[0];let maxVoices=0;
  function tick(){ctx.currentTime+=.125;t.mock.timers.tick(125);for(const source of ctx.oscillators)if(source.stopAt<=ctx.currentTime&&!source.ended){source.ended=true;source.onended?.();}maxVoices=Math.max(maxVoices,audio.status().score.voices);}
  for(let i=0;i<160;i++)tick();assert.ok(audio.status().score.step>32,'more than one authored phrase plays');assert.ok(maxVoices>3&&maxVoices<=32);assert.ok(ctx.waves.length<=5,'harmonic waves are shared per context');
  const before=ctx.oscillators.length;audio.region('estonie');audio.state('guardian');tick();assert.equal(audio.status().score.region,'estonie');assert.equal(audio.status().score.state,'guardian');assert.ok(ctx.oscillators.length>before);assert.ok(ctx.waves.some(w=>w.imag.length>5));
  audio.setMix({music:0});assert.equal(audio.status().score.voices,0);const muted=ctx.oscillators.length;for(let i=0;i<12;i++)tick();assert.equal(ctx.oscillators.length,muted,'music mute does not generate silent oscillators');
  audio.setMix({music:.34});tick();assert.ok(audio.status().score.voices>0);await audio.visibility(true);assert.equal(audio.status().score.voices,0);const hidden=ctx.oscillators.length;for(let i=0;i<12;i++)tick();assert.equal(ctx.oscillators.length,hidden);await audio.visibility(false);tick();assert.ok(audio.status().score.voices>0);
  audio.close();assert.equal(audio.status().score.voices,0);assert.ok(ctx.oscillators.every(source=>(source.stopped||source.ended)&&source.disconnected));const closed=ctx.oscillators.length;for(let i=0;i<12;i++)tick();assert.equal(ctx.oscillators.length,closed);
 }finally{audio.close();browser.restore();}
});

test('confirmed weapon contacts use distinct stable metal partials and follow player equipment',async()=>{
 const browser=scoreBrowser(),audio=createWorldAudio();
 try{
  await audio.enable(true,'france');const ctx=browser.contexts[0];const pitches=[];
  for(const weapon of ['paris','dagues','lance','kilij']){audio.weapon(weapon);const before=ctx.oscillators.length;audio.weaponImpact();const sound=ctx.oscillators[before];pitches.push(sound.frequency.events[0][0]);assert.equal(sound.frequency.events[0][0],sound.frequency.events[1][0],'ringing metal does not slide in pitch');}
  assert.equal(new Set(pitches).size,4);assert.equal(weaponMetalTimbre('baltiques').fundamental,weaponMetalTimbre('dagues').fundamental);assert.equal(weaponMetalTimbre('lance',true).fundamental,760);
  await audio.enable(false);const count=ctx.oscillators.length;assert.equal(audio.weaponImpact({guard:true}),false);assert.equal(ctx.oscillators.length,count,'muted contacts never enqueue sound');
 }finally{audio.close();browser.restore();}
});
