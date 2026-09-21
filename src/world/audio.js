import {spatialAudio} from './audio-spatial.js';
import {AUDIO_STATES,audioStateProfile} from './audio-director.js';
import {actionFeedback} from './interaction-system.js';
const NOTES={hub:174.61,france:196,italie:220,estonie:164.81,turquie:146.83,algerie:174.61,tunisie:196,maroc:146.83,espagne:164.81};
const SCALES={
 hub:[1,1.2,1.5,2],france:[1,1.125,1.5,1.75],italie:[1,1.25,1.5,1.875],estonie:[1,1.2,1.6,2],
 turquie:[1,1.125,1.5,1.8],algerie:[1,1.2,1.4,1.8],tunisie:[1,1.25,1.5,2],maroc:[1,1.125,1.4,1.75],espagne:[1,1.25,1.6,2],
};
const clamp=v=>Math.max(0,Math.min(1,v));
const hash=s=>{let h=0;for(const c of String(s||''))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return h;};

export function createWorldAudio(){
 let ctx,master,musicBus,ambienceBus,sfxBus,voiceBus,pad=[],enabled=false,hidden=false,noiseBuffer;
 let musicTimer,ambienceTimer,currentRegion='hub',inside=false,currentWeather='clear',currentPhase='day',audioState='exploration',stepFlip=false,lastSpeech='',voiceDucking=false,speaking=false,speechQueue=[];
 let listenerPose={x:0,z:0,heading:0};
 const mix={master:.78,music:.34,ambience:.55,sfx:.78,voice:.9};

 function gainNode(value){const g=ctx.createGain();g.gain.value=value;return g;}
 function applyMix(){
  if(!ctx)return;
  const profile=audioStateProfile(audioState),phase=currentPhase==='night'?.68:currentPhase==='dawn'?.82:currentPhase==='sunset'?.88:1,duck=voiceDucking?.38:1;
  master.gain.setTargetAtTime(clamp(mix.master)*.42,ctx.currentTime,.08);
  musicBus.gain.setTargetAtTime(clamp(mix.music)*phase*profile.music*duck,ctx.currentTime,.12);
  ambienceBus.gain.setTargetAtTime(clamp(mix.ambience)*profile.ambience*(voiceDucking?.58:1),ctx.currentTime,.12);
  sfxBus.gain.setTargetAtTime(clamp(mix.sfx),ctx.currentTime,.08);
  voiceBus.gain.setTargetAtTime(clamp(mix.voice),ctx.currentTime,.08);
 }
 function init(){
  if(ctx)return;
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  ctx=new Audio();master=gainNode(.32);musicBus=gainNode(.34);ambienceBus=gainNode(.55);sfxBus=gainNode(.78);voiceBus=gainNode(.9);
  musicBus.connect(master);ambienceBus.connect(master);sfxBus.connect(master);voiceBus.connect(master);master.connect(ctx.destination);applyMix();
  for(const ratio of [1,.5,1.5]){
   const o=ctx.createOscillator(),g=gainNode(.018);o.type=ratio===.5?'triangle':'sine';o.frequency.value=NOTES.hub*ratio;o.connect(g).connect(musicBus);o.start();pad.push({o,g,ratio});
  }
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  startSchedulers();
 }
 function startSchedulers(){
  if(!musicTimer)musicTimer=setInterval(()=>{if(!enabled||hidden||!ctx)return;const scale=SCALES[currentRegion]||SCALES.hub,index=Math.floor(Date.now()/2200)%scale.length;baseTone((NOTES[currentRegion]||174.61)*scale[index],.36,.022,'sine',musicBus);},2200);
  if(!ambienceTimer)ambienceTimer=setInterval(()=>{if(!enabled||hidden||!ctx||inside)return;
   if(currentWeather==='rain'||currentWeather==='heavy_rain'||currentWeather==='storm')noise(.9,currentWeather==='storm'?.09:currentWeather==='heavy_rain'?.06:.035,1200,ambienceBus);
   else if(currentWeather==='snow')noise(.65,.018,2400,ambienceBus);
   else if(currentRegion==='france'){baseTone(1500+Math.random()*700,.16,.012,'sine',ambienceBus);setTimeout(()=>baseTone(2100,.1,.009,'sine',ambienceBus),150);}
   else if(['algerie','maroc','tunisie'].includes(currentRegion)&&Math.random()>.45)noise(.5,.018,650,ambienceBus);
  },4200);
 }
 function region(id){currentRegion=id;if(!ctx)return;const base=NOTES[id]||174.61;for(const {o,ratio} of pad)o.frequency.setTargetAtTime(base*ratio,ctx.currentTime,.8);}
 function baseTone(frequency,duration,gain,type='sine',bus=sfxBus){
  if(!ctx||!enabled||hidden)return;ctx.resume().catch(()=>{});
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type=type;o.frequency.setValueAtTime(Math.max(20,frequency),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.72),t+duration);
  g.gain.setValueAtTime(Math.max(.0001,gain),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(bus);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 function tone(f,d,g,t='sine'){baseTone(f,d,g,t,sfxBus);}
 function spatialTone(frequency,duration,gain,type='sine',pan=0){
  if(!ctx||!enabled||hidden)return false;ctx.resume().catch(()=>{});
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime,p=ctx.createStereoPanner?.();
  o.type=type;o.frequency.setValueAtTime(Math.max(20,frequency),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.76),t+duration);
  g.gain.setValueAtTime(Math.max(.0001,gain),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);
  if(p){p.pan.value=clamp(pan);g.connect(p).connect(sfxBus);}else g.connect(sfxBus);
  o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();p?.disconnect();};return true;
 }
 function noise(duration,gain,frequency,bus=sfxBus){
  if(!ctx||!enabled||hidden||!noiseBuffer)return;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),volume=ctx.createGain();source.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;volume.gain.setValueAtTime(gain,ctx.currentTime);volume.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);source.connect(filter).connect(volume).connect(bus);source.start();source.stop(ctx.currentTime+duration);source.onended=()=>{source.disconnect();filter.disconnect();volume.disconnect();};
 }
 function transport(kind){
  const cfg={train:[110,.32,.12],boat:[82,.5,.1],telepheric:[220,.45,.08],zipline:[520,.24,.09]}[kind]||[180,.25,.08];
  tone(cfg[0],cfg[1],cfg[2],'triangle');setTimeout(()=>tone(cfg[0]*1.5,cfg[1]*.8,cfg[2]*.65,'sine'),100);
 }
 function event(type,action){
  if(type==='battle'){const defence=['guard','dodge'].includes(action);noise(defence?.23:.13,defence?.1:.19,action==='dodge'?2300:action==='power'?1000:650);tone(action==='power'?330:defence?210:95,action==='power'?.42:.14,.13,defence?'sine':'triangle');}
  else if(type==='gather'){noise(.12,.07,1200);tone(380,.14,.07,'triangle');}
  else if(type==='build'||type==='restore'){tone(330,.6,.1);setTimeout(()=>tone(495,.6,.08),140);setTimeout(()=>tone(660,.7,.06),280);}
  else if(type==='hubTransportRide')transport(action);
  else if(type==='hubSecretUnlock'||type==='hubSecretStep'){tone(260,.24,.08,'triangle');setTimeout(()=>tone(520,.4,.08),120);}
  else if(type==='guardianValueChoice'){tone(392,.25,.08,'sine');}
  else if(type==='reward'||type==='hubMissionClaim'){tone(440,.28,.08);setTimeout(()=>tone(660,.45,.07),120);}
  else tone(type==='power'?440:660,.3,.07);
 }
 function interaction(actionId){
  const feedback=actionFeedback(actionId);if(!feedback)return false;
  const cfg={
   talk:[410,.10,.035,'sine'],talk_soft:[360,.10,.028,'sine'],evidence:[690,.18,.055,'triangle'],inspect:[520,.12,.032,'sine'],
   scan:[760,.22,.045,'sine'],memory:[280,.34,.065,'triangle'],collect:[620,.16,.052,'triangle'],use:[460,.12,.042,'triangle'],
   door:[190,.16,.05,'triangle'],repair:[145,.22,.055,'triangle'],assemble:[240,.2,.05,'triangle'],help:[330,.18,.045,'sine'],
   carry:[120,.16,.04,'triangle'],revive:[392,.34,.07,'sine'],climb:[155,.1,.032,'triangle'],vault:[250,.09,.04,'triangle'],
   zipline:[540,.18,.05,'triangle'],water:[210,.18,.045,'sine'],dive:[150,.28,.055,'sine'],board:[180,.14,.04,'triangle'],
   engine:[95,.28,.06,'triangle'],transport:[150,.22,.045,'triangle'],cloth:[230,.08,.025,'sine'],rest:[261,.24,.035,'sine'],
   focus:[520,.14,.03,'sine'],calm:[349,.28,.05,'sine'],combat_ready:[98,.22,.075,'triangle'],guard:[220,.12,.06,'sine'],
   companion:[440,.16,.04,'sine'],portal:[300,.32,.065,'triangle']
  }[feedback.audio]||[380,.14,.035,'sine'];
  if(['repair','assemble','carry','climb','vault','water','dive','engine'].includes(feedback.audio))noise(cfg[1],cfg[2]*.55,feedback.audio==='water'||feedback.audio==='dive'?900:520,sfxBus);
  tone(cfg[0],cfg[1],cfg[2],cfg[3]);return true;
 }
 function playSpeechQueue(){
  if(speaking||!speechQueue.length||!enabled||hidden)return;
  const entry=speechQueue.shift(),u=new globalThis.SpeechSynthesisUtterance(entry.text),voices=globalThis.speechSynthesis.getVoices().filter(v=>v.lang?.toLowerCase().startsWith(entry.lang.slice(0,2).toLowerCase())),seed=hash(entry.character);
  if(voices.length)u.voice=voices[seed%voices.length];u.lang=entry.lang;u.rate=.9+(seed%9)/100;u.pitch=.82+(seed%24)/100;u.volume=clamp(mix.voice);
  speaking=true;voiceDucking=true;applyMix();
  const done=()=>{speaking=false;voiceDucking=false;applyMix();playSpeechQueue();};u.onend=done;u.onerror=done;
  globalThis.speechSynthesis.speak(u);
 }
 function speak(text,{character='narrator',lang='fr-FR'}={}){
  if(!enabled||hidden||!text||typeof globalThis.speechSynthesis==='undefined'||typeof globalThis.SpeechSynthesisUtterance==='undefined')return false;
  const clean=String(text).replace(/\s+/g,' ').slice(0,420);if(clean===lastSpeech)return false;lastSpeech=clean;
  speechQueue.push({text:clean,character,lang});if(speechQueue.length>5)speechQueue=speechQueue.slice(-5);playSpeechQueue();return true;
 }
 function setListener(position={},heading=0){listenerPose={x:Number(position.x)||0,z:Number(position.z)||0,heading:Number(heading)||0};}
 function spatialEvent(kind,source={}){
  const spatial=spatialAudio(listenerPose,source,kind==='hubTransport'?70:46);if(spatial.gain<.002)return false;
  const cfg={hubNpc:[420,.16,.055,'sine'],hubMission:[520,.2,.07,'triangle'],hubSecret:[690,.28,.08,'sine'],hubSecretStep:[610,.18,.065,'triangle'],hubGuardian:[260,.34,.085,'triangle'],valueTrial:[330,.3,.08,'sine'],hubTransport:[150,.26,.07,'triangle']}[kind]||[380,.16,.045,'sine'];
  return spatialTone(cfg[0],cfg[1],cfg[2]*spatial.gain,cfg[3],spatial.pan);
 }
 return{
  enable(value,id){enabled=value;try{if(value){init();region(id);ctx?.resume().catch(()=>{});playSpeechQueue();}else{speechQueue=[];speaking=false;voiceDucking=false;globalThis.speechSynthesis?.cancel?.();applyMix();ctx?.suspend().catch(()=>{});}}catch{}},
  region,
  ambience(id,interior){currentRegion=id;inside=!!interior;},
  weather(value){currentWeather=value||'clear';},
  phase(value){currentPhase=value||'day';applyMix();},
  state(value){audioState=Object.hasOwn(AUDIO_STATES,value)?value:'exploration';applyMix();},
  listener:setListener,
  spatialEvent,
  setMix(next={}){for(const key of Object.keys(mix))if(Number.isFinite(next[key]))mix[key]=clamp(next[key]);applyMix();},
  step(id){stepFlip=!stepFlip;noise(.06,inside?.06:.035,inside?520:1450);tone((inside?100:id==='estonie'?175:132)*(stepFlip?1:1.04),.055,.025,'triangle');},
  event,interaction,speak,transport,
 cinematic(kind='micro'){
  if(!ctx||!enabled||hidden)return;
  const major=['world-opening','country-first-entry','guardian-intro','final-combat-intro','story-finale'].includes(kind),guardian=['guardian-intro','final-combat-intro','important-combat-result'].includes(kind);
  noise(major?.7:.32,major?.11:.065,major?420:760);tone(major?58:92,major?1.05:.55,major?.12:.075,'sine');
  setTimeout(()=>tone(guardian?196:major?261.63:392,major?.9:.48,major?.075:.05,'triangle'),major?180:90);
  if(major)setTimeout(()=>tone(guardian?293.66:392,.95,.055,'sine'),430);
  if(kind==='story-power')setTimeout(()=>{noise(.24,.055,1800);tone(523.25,.5,.055,'triangle');},120);
  if(kind==='story-restoration')setTimeout(()=>{tone(329.63,.7,.055);tone(493.88,.9,.035);},260);
 },

  visibility(value){hidden=value;if(!ctx)return;if(value){globalThis.speechSynthesis?.pause?.();ctx.suspend().catch(()=>{});}else if(enabled){globalThis.speechSynthesis?.resume?.();ctx.resume().catch(()=>{});}},
  close(){clearInterval(musicTimer);clearInterval(ambienceTimer);speechQueue=[];speaking=false;voiceDucking=false;globalThis.speechSynthesis?.cancel?.();enabled=false;pad.forEach(p=>p.o.stop());ctx?.close();}
 };
}
