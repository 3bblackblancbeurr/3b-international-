import {spatialAudio} from './audio-spatial.js';
import {AUDIO_STATES,audioStateProfile} from './audio-director.js';
import {actionFeedback} from './interaction-system.js';
import {hubAmbientFrame,hubFootstepSurface} from './hub/civic-soundscape.js';
const NOTES={hub:174.61,france:196,italie:220,estonie:164.81,turquie:146.83,algerie:174.61,tunisie:196,maroc:146.83,espagne:164.81};
const SCALES={
 hub:[1,1.2,1.5,2],france:[1,1.125,1.5,1.75],italie:[1,1.25,1.5,1.875],estonie:[1,1.2,1.6,2],
 turquie:[1,1.125,1.5,1.8],algerie:[1,1.2,1.4,1.8],tunisie:[1,1.25,1.5,2],maroc:[1,1.125,1.4,1.75],espagne:[1,1.25,1.6,2],
};
const ATMOSPHERES={hub:[520,.040],france:[720,.034],italie:[620,.033],estonie:[980,.028],turquie:[480,.035],algerie:[430,.030],tunisie:[600,.035],maroc:[440,.032],espagne:[680,.034]};
const UNLOCK_EVENTS=['pointerdown','touchstart','keydown'];
const clamp=v=>Math.max(0,Math.min(1,v));
const hash=s=>{let h=0;for(const c of String(s||''))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return h;};

export function createWorldAudio(){
 let ctx,master,musicBus,ambienceBus,sfxBus,voiceBus,pad=[],enabled=false,hidden=false,noiseBuffer;
 let musicTimer,ambienceTimer,currentRegion='hub',inside=false,currentWeather='clear',currentPhase='day',audioState='exploration',stepFlip=false,lastSpeech='',voiceDucking=false,speaking=false,speechQueue=[];
 let listenerPose={x:0,z:0,heading:0},interiorInfo=null,closed=false,unlockTarget=null;
 const ambientLoops=new Map();
 const delayedSounds=new Set(),transientSounds=new Set();
 const mix={master:.78,music:.34,ambience:.55,sfx:.78,voice:.9};

 function gainNode(value){const g=ctx.createGain();g.gain.value=value;return g;}
 function applyMix(){
  if(!ctx||closed)return;
  const profile=audioStateProfile(audioState),phase=currentPhase==='night'?.68:currentPhase==='dawn'?.82:currentPhase==='sunset'?.88:1,duck=voiceDucking?.38:1;
  master.gain.setTargetAtTime(enabled&&!hidden?clamp(mix.master)*.72:0,ctx.currentTime,.08);
  musicBus.gain.setTargetAtTime(clamp(mix.music)*phase*profile.music*duck,ctx.currentTime,.12);
  ambienceBus.gain.setTargetAtTime(clamp(mix.ambience)*profile.ambience*(voiceDucking?.58:1),ctx.currentTime,.12);
  sfxBus.gain.setTargetAtTime(clamp(mix.sfx),ctx.currentTime,.08);
  voiceBus.gain.setTargetAtTime(clamp(mix.voice),ctx.currentTime,.08);
 }
 function clearUnlockListeners(){
  if(!unlockTarget)return;
  for(const type of UNLOCK_EVENTS)unlockTarget.removeEventListener?.(type,unlock,true);
  unlockTarget=null;
 }
 function awaitGesture(){
  if(unlockTarget||closed||hidden||!enabled)return;
  const target=globalThis.window;if(!target?.addEventListener)return;unlockTarget=target;
  for(const type of UNLOCK_EVENTS)target.addEventListener(type,unlock,{capture:true,passive:true});
 }
 function contextChanged(){
  if(closed||!enabled||hidden)return;
  if(ctx?.state==='running'){clearUnlockListeners();updateHubAmbience();playSpeechQueue();}
  else awaitGesture();
 }
 function unlock(){
  if(closed||hidden||!enabled)return Promise.resolve(false);
  try{
   init();if(!ctx)return Promise.resolve(false);
   if(ctx.state==='running'){contextChanged();return Promise.resolve(true);}
   // Call resume synchronously inside the input event: delaying it loses mobile browser activation.
   awaitGesture();const current=ctx;
   return Promise.resolve(current.resume()).then(()=>{
    if(closed||hidden||!enabled)return false;
    const running=!current.state||current.state==='running';
    if(running){clearUnlockListeners();updateHubAmbience();playSpeechQueue();}else awaitGesture();
    return running;
   },()=>{awaitGesture();return false;});
  }catch{awaitGesture();return Promise.resolve(false);}
 }
 function playable(){return !!ctx&&enabled&&!hidden&&!closed&&(!ctx.state||ctx.state==='running');}
 function later(callback,delay){if(!playable())return;const timer=setTimeout(()=>{delayedSounds.delete(timer);if(playable())callback();},delay);delayedSounds.add(timer);}
 function clearTransientSounds(){
  for(const timer of delayedSounds)clearTimeout(timer);delayedSounds.clear();
  for(const sound of [...transientSounds])sound();
 }
 function trackSound(source,nodes){
  const dispose=()=>{transientSounds.delete(dispose);try{source.stop();}catch{}for(const node of nodes)node.disconnect();};
  transientSounds.add(dispose);source.onended=()=>{transientSounds.delete(dispose);for(const node of nodes)node.disconnect();};
 }
 function init(){
  if(ctx||closed)return;
  const Audio=globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext;if(!Audio)return;
  ctx=new Audio();master=gainNode(.32);musicBus=gainNode(.34);ambienceBus=gainNode(.55);sfxBus=gainNode(.78);voiceBus=gainNode(.9);
  musicBus.connect(master);ambienceBus.connect(master);sfxBus.connect(master);voiceBus.connect(master);
  const compressor=ctx.createDynamicsCompressor?.();
  if(compressor){compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.006;compressor.release.value=.15;master.connect(compressor).connect(ctx.destination);}else master.connect(ctx.destination);
  ctx.addEventListener?.('statechange',contextChanged);applyMix();
  for(const ratio of [1,.5,1.5]){
   const o=ctx.createOscillator(),g=gainNode(.025);o.type=ratio===.5?'triangle':'sine';o.frequency.value=NOTES.hub*ratio;o.connect(g).connect(musicBus);o.start();pad.push({o,g,ratio});
  }
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  updateHubAmbience();
  startSchedulers();
 }
 function startSchedulers(){
  if(!musicTimer)musicTimer=setInterval(()=>{if(!playable())return;const scale=SCALES[currentRegion]||SCALES.hub,index=Math.floor(Date.now()/2200)%scale.length;baseTone((NOTES[currentRegion]||174.61)*scale[index],.36,.036,'sine',musicBus);},2200);
  if(!ambienceTimer)ambienceTimer=setInterval(()=>{if(!playable()||inside)return;
   if(currentWeather==='rain'||currentWeather==='heavy_rain'||currentWeather==='storm')noise(.9,currentWeather==='storm'?.09:currentWeather==='heavy_rain'?.06:.035,1200,ambienceBus);
   else if(currentWeather==='snow')noise(.65,.018,2400,ambienceBus);
   else if(currentRegion==='france'){baseTone(1500+Math.random()*700,.16,.012,'sine',ambienceBus);later(()=>baseTone(2100,.1,.009,'sine',ambienceBus),150);}
   else if(['algerie','maroc','tunisie'].includes(currentRegion)&&Math.random()>.45)noise(.5,.018,650,ambienceBus);
  },4200);
 }
 function region(id){currentRegion=id||'hub';updateHubAmbience();if(!ctx||closed)return;const base=NOTES[currentRegion]||174.61;for(const {o,ratio} of pad)o.frequency.setTargetAtTime(base*ratio,ctx.currentTime,.8);}
 function baseTone(frequency,duration,gain,type='sine',bus=sfxBus){
  if(!playable())return;
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type=type;o.frequency.setValueAtTime(Math.max(20,frequency),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.72),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),t+Math.min(.012,duration*.15));g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(bus);o.start(t);o.stop(t+duration+.03);trackSound(o,[o,g]);
 }
 function tone(f,d,g,t='sine'){baseTone(f,d,g,t,sfxBus);}
 function spatialTone(frequency,duration,gain,type='sine',pan=0){
  if(!playable())return false;
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime,p=ctx.createStereoPanner?.();
  o.type=type;o.frequency.setValueAtTime(Math.max(20,frequency),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.76),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);
  if(p){p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p).connect(sfxBus);}else g.connect(sfxBus);
  o.start(t);o.stop(t+duration+.03);trackSound(o,[o,g,...(p?[p]:[])]);return true;
 }
 function noise(duration,gain,frequency,bus=sfxBus){
  if(!playable()||!noiseBuffer)return;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),volume=ctx.createGain();source.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;volume.gain.setValueAtTime(.0001,ctx.currentTime);volume.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),ctx.currentTime+.008);volume.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);source.connect(filter).connect(volume).connect(bus);source.start();source.stop(ctx.currentTime+duration);trackSound(source,[source,filter,volume]);
 }
 function transport(kind){
  const cfg={train:[110,.32,.12],boat:[82,.5,.1],telepheric:[220,.45,.08],zipline:[520,.24,.09]}[kind]||[180,.25,.08];
  tone(cfg[0],cfg[1],cfg[2],'triangle');later(()=>tone(cfg[0]*1.5,cfg[1]*.8,cfg[2]*.65,'sine'),100);
 }
 function gameplay(action){
  if(!playable())return false;
  if(action==='jump'){noise(.12,.045,1750);tone(210,.13,.065,'triangle');}
  else if(action==='land'){noise(.12,.085,480);tone(88,.10,.070,'triangle');}
  else if(action==='attack'){noise(.17,.12,1250);tone(140,.13,.085,'triangle');}
  else if(action==='guard'){noise(.10,.07,2200);tone(320,.17,.08,'sine');}
  else if(action==='dodge'){noise(.21,.09,1800);tone(160,.11,.055,'triangle');}
  else if(action==='power'){noise(.34,.11,850);tone(196,.38,.095,'triangle');later(()=>tone(392,.32,.070,'sine'),80);}
  else return false;
  return true;
 }
 function event(type,action){
  if(!playable())return;
  if(type==='battle'){if(!gameplay(action==='strike'?'attack':action==='resonance'?'power':action)){noise(.13,.16,650);tone(95,.14,.11,'triangle');}}
  else if(['jump','land','attack','guard','dodge','power'].includes(type))gameplay(type);
  else if(type==='gather'){noise(.12,.07,1200);tone(380,.14,.07,'triangle');}
  else if(type==='build'||type==='restore'){tone(330,.6,.1);later(()=>tone(495,.6,.08),140);later(()=>tone(660,.7,.06),280);}
  else if(type==='hubTransportRide')transport(action);
  else if(type==='hubSecretUnlock'||type==='hubSecretStep'){tone(260,.24,.08,'triangle');later(()=>tone(520,.4,.08),120);}
  else if(type==='guardianValueChoice'){tone(392,.25,.08,'sine');}
  else if(type==='reward'||type==='hubMissionClaim'){tone(440,.28,.08);later(()=>tone(660,.45,.07),120);}
  else tone(type==='power'?440:660,.3,.07);
 }
 function interaction(actionId){
  const feedback=actionFeedback(actionId);if(!feedback||!playable())return false;
  const cfg={
   talk:[410,.10,.035,'sine'],talk_soft:[360,.10,.028,'sine'],evidence:[690,.18,.055,'triangle'],inspect:[520,.12,.032,'sine'],pages:[520,.13,.014,'sine'],
   scan:[760,.22,.045,'sine'],memory:[280,.34,.065,'triangle'],collect:[620,.16,.052,'triangle'],use:[460,.12,.042,'triangle'],
   door:[190,.16,.05,'triangle'],repair:[145,.22,.055,'triangle'],assemble:[240,.2,.05,'triangle'],help:[330,.18,.045,'sine'],
   carry:[120,.16,.04,'triangle'],revive:[392,.34,.07,'sine'],climb:[155,.1,.032,'triangle'],vault:[250,.09,.04,'triangle'],
   zipline:[540,.18,.05,'triangle'],water:[210,.18,.045,'sine'],dive:[150,.28,.055,'sine'],board:[180,.14,.04,'triangle'],
   engine:[95,.28,.06,'triangle'],transport:[150,.22,.045,'triangle'],cloth:[230,.08,.025,'sine'],rest:[261,.24,.035,'sine'],
   focus:[520,.14,.03,'sine'],calm:[349,.28,.05,'sine'],combat_ready:[98,.22,.075,'triangle'],guard:[220,.12,.06,'sine'],
   companion:[440,.16,.04,'sine'],portal:[300,.32,.065,'triangle']
  }[feedback.audio]||[380,.14,.035,'sine'];
  if(['pages','cloth','repair','assemble','carry','climb','vault','water','dive','engine'].includes(feedback.audio))noise(cfg[1],cfg[2]*.55,feedback.audio==='water'||feedback.audio==='dive'?900:feedback.audio==='pages'?2200:520,sfxBus);
  tone(cfg[0],cfg[1],cfg[2],cfg[3]);return true;
 }
 function playSpeechQueue(){
  if(speaking||!speechQueue.length||!playable())return;
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
 function stopAmbientLoop(id){
  const loop=ambientLoops.get(id);if(!loop)return;
  ambientLoops.delete(id);try{loop.source.stop();}catch{}
  loop.source.disconnect();loop.filter.disconnect();loop.volume.disconnect();loop.pan?.disconnect();
 }
 function clearAmbientLoops(){for(const id of [...ambientLoops.keys()])stopAmbientLoop(id);}
 function environment(){
  const civic=currentRegion==='hub'?hubAmbientFrame(listenerPose,{interior:interiorInfo,phase:currentPhase,weather:currentWeather,limit:3}):{sources:[],caption:null};
  const [frequency,volume]=ATMOSPHERES[currentRegion]||ATMOSPHERES.hub,rain=['rain','heavy_rain','storm'].includes(currentWeather),night=currentPhase==='night';
  const atmosphere={id:'atmosphere:'+currentRegion,kind:'atmosphere',name:inside?'Ambiance intérieure':rain?'Pluie et vent':currentRegion==='hub'?'Brise de la cité':'Ambiance du pays',frequency:inside?360:rain?1400:frequency,gain:inside?.012:rain?(currentWeather==='storm'?.075:currentWeather==='heavy_rain'?.060:.045):volume*(night?.72:1),pan:0};
  // A soft continuous bed keeps quiet streets alive, even beyond the local source radii.
  // Reserve one of the four loops for it so the audio graph stays bounded on phones.
  return {sources:[atmosphere,...civic.sources],caption:civic.caption||atmosphere.name};
 }
 function updateHubAmbience(){
  if(!ctx||!noiseBuffer||!enabled||hidden||closed){clearAmbientLoops();return;}
  const frame=environment(),active=new Set(frame.sources.map(source=>source.id));
  for(const id of ambientLoops.keys())if(!active.has(id))stopAmbientLoop(id);
  for(const sound of frame.sources){
   let loop=ambientLoops.get(sound.id);
   if(!loop){
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),volume=gainNode(0),pan=ctx.createStereoPanner?.();
    source.buffer=noiseBuffer;source.loop=true;filter.type=['water','atmosphere'].includes(sound.kind)?'lowpass':'bandpass';filter.frequency.value=sound.frequency;filter.Q.value=sound.kind==='water'?.5:sound.kind==='atmosphere'?.35:1.4;
    source.connect(filter).connect(volume);if(pan)volume.connect(pan).connect(ambienceBus);else volume.connect(ambienceBus);
    // Offset each shared noise loop so neighboring sources never phase-lock.
    source.start(0,(hash(sound.id)%1700)/1000);loop={source,filter,volume,pan};ambientLoops.set(sound.id,loop);
   }
   const swell=.9+.1*Math.sin(ctx.currentTime*.45+(hash(sound.id)%100)/10);
   loop.filter.frequency.setTargetAtTime(sound.frequency,ctx.currentTime,.4);
   loop.volume.gain.setTargetAtTime(sound.gain*swell,ctx.currentTime,.22);
   if(loop.pan)loop.pan.pan.setTargetAtTime(sound.pan,ctx.currentTime,.14);
  }
 }
 function setListener(position={},heading=0){listenerPose={x:Number(position.x)||0,z:Number(position.z)||0,heading:Number(heading)||0};updateHubAmbience();}
 function spatialEvent(kind,source={}){
  const spatial=spatialAudio(listenerPose,source,kind==='hubTransport'?70:46);if(spatial.gain<.002)return false;
  const cfg={hubNpc:[420,.16,.055,'sine'],hubMission:[520,.2,.07,'triangle'],hubSecret:[690,.28,.08,'sine'],hubSecretStep:[610,.18,.065,'triangle'],hubGuardian:[260,.34,.085,'triangle'],valueTrial:[330,.3,.08,'sine'],hubTransport:[150,.26,.07,'triangle']}[kind]||[380,.16,.045,'sine'];
  return spatialTone(cfg[0],cfg[1],cfg[2]*spatial.gain,cfg[3],spatial.pan);
 }
 return{
  enable(value,id){
   if(closed)return Promise.resolve(false);enabled=!!value;
   if(enabled){try{init();region(id||currentRegion);applyMix();if(hidden)ctx?.suspend().catch(()=>{});}catch{}return unlock();}
   clearUnlockListeners();clearAmbientLoops();clearTransientSounds();speechQueue=[];speaking=false;voiceDucking=false;lastSpeech='';globalThis.speechSynthesis?.cancel?.();applyMix();ctx?.suspend().catch(()=>{});return Promise.resolve(false);
  },
  unlock,
  status(){return {enabled,hidden,context:ctx?.state||(ctx?'running':'uninitialized'),needsGesture:!!unlockTarget,ambientLoops:ambientLoops.size,closed};},
  region,
  ambience(id,interior){currentRegion=id;inside=!!interior;interiorInfo=interior||null;updateHubAmbience();},
  weather(value){currentWeather=value||'clear';updateHubAmbience();},
  phase(value){currentPhase=value||'day';applyMix();updateHubAmbience();},
  state(value){audioState=Object.hasOwn(AUDIO_STATES,value)?value:'exploration';applyMix();},
  listener:setListener,
  environment,
  spatialEvent,
  setMix(next={}){for(const key of Object.keys(mix))if(Number.isFinite(next[key]))mix[key]=clamp(next[key]);applyMix();},
  step(id,position=listenerPose){stepFlip=!stepFlip;const surface=id==='hub'?hubFootstepSurface(position,interiorInfo):{duration:.06,volume:inside?.06:.035,frequency:inside?520:1450,pitch:inside?100:id==='estonie'?175:132};noise(surface.duration,surface.volume,surface.frequency);tone(surface.pitch*(stepFlip?1:1.04),.055,.025,'triangle');},
  event,gameplay,interaction,speak,transport,
 cinematic(kind='micro'){
  if(!playable())return;
  const major=['world-opening','country-first-entry','guardian-homecoming','guardian-intro','final-combat-intro','story-finale'].includes(kind),guardian=['guardian-value-complete','guardian-homecoming','guardian-intro','final-combat-intro','important-combat-result'].includes(kind);
  noise(major?.7:.32,major?.11:.065,major?420:760);tone(major?58:92,major?1.05:.55,major?.12:.075,'sine');
  later(()=>tone(guardian?196:major?261.63:392,major?.9:.48,major?.075:.05,'triangle'),major?180:90);
  if(major)later(()=>tone(guardian?293.66:392,.95,.055,'sine'),430);
  if(kind==='story-power')later(()=>{noise(.24,.055,1800);tone(523.25,.5,.055,'triangle');},120);
  if(kind==='story-restoration')later(()=>{tone(329.63,.7,.055);tone(493.88,.9,.035);},260);
 },

  visibility(value){
   if(closed)return Promise.resolve(false);hidden=!!value;applyMix();updateHubAmbience();
   if(hidden){clearUnlockListeners();clearTransientSounds();globalThis.speechSynthesis?.pause?.();ctx?.suspend().catch(()=>{});return Promise.resolve(false);}
   if(enabled){globalThis.speechSynthesis?.resume?.();return unlock();}return Promise.resolve(false);
  },
  close(){if(closed)return;closed=true;enabled=false;clearUnlockListeners();clearAmbientLoops();clearTransientSounds();clearInterval(musicTimer);clearInterval(ambienceTimer);speechQueue=[];speaking=false;voiceDucking=false;globalThis.speechSynthesis?.cancel?.();pad.forEach(p=>{try{p.o.stop();}catch{}p.o.disconnect();p.g.disconnect();});pad=[];ctx?.removeEventListener?.('statechange',contextChanged);ctx?.close().catch(()=>{});}
 };
}
