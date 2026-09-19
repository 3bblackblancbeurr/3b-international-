const NOTES={hub:174.61,france:196,italie:220,estonie:164.81,turquie:146.83,algerie:174.61,tunisie:196,maroc:146.83,espagne:164.81};
const SCALES={
 hub:[1,1.2,1.5,2],france:[1,1.125,1.5,1.75],italie:[1,1.25,1.5,1.875],estonie:[1,1.2,1.6,2],
 turquie:[1,1.125,1.5,1.8],algerie:[1,1.2,1.4,1.8],tunisie:[1,1.25,1.5,2],maroc:[1,1.125,1.4,1.75],espagne:[1,1.25,1.6,2],
};
const clamp=v=>Math.max(0,Math.min(1,v));
const hash=s=>{let h=0;for(const c of String(s||''))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return h;};

export function createWorldAudio(){
 let ctx,master,musicBus,ambienceBus,sfxBus,voiceBus,pad=[],enabled=false,hidden=false,noiseBuffer;
 let musicTimer,ambienceTimer,currentRegion='hub',inside=false,currentWeather='clear',currentPhase='day',stepFlip=false,lastSpeech='';
 const mix={master:.78,music:.34,ambience:.55,sfx:.78,voice:.9};

 function gainNode(value){const g=ctx.createGain();g.gain.value=value;return g;}
 function applyMix(){
  if(!ctx)return;
  master.gain.setTargetAtTime(clamp(mix.master)*.42,ctx.currentTime,.08);
  musicBus.gain.setTargetAtTime(clamp(mix.music),ctx.currentTime,.08);
  ambienceBus.gain.setTargetAtTime(clamp(mix.ambience),ctx.currentTime,.08);
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
 function speak(text,{character='narrator',lang='fr-FR'}={}){
  if(!enabled||hidden||!text||typeof speechSynthesis==='undefined')return false;
  const clean=String(text).replace(/\s+/g,' ').slice(0,420);if(clean===lastSpeech)return false;lastSpeech=clean;speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(clean),voices=speechSynthesis.getVoices().filter(v=>v.lang?.toLowerCase().startsWith(lang.slice(0,2).toLowerCase())),seed=hash(character);
  if(voices.length)u.voice=voices[seed%voices.length];u.lang=lang;u.rate=.9+(seed%9)/100;u.pitch=.82+(seed%24)/100;u.volume=clamp(mix.voice);
  speechSynthesis.speak(u);return true;
 }
 return{
  enable(value,id){enabled=value;try{if(value){init();region(id);ctx?.resume().catch(()=>{});}else{speechSynthesis?.cancel?.();ctx?.suspend().catch(()=>{});}}catch{}},
  region,
  ambience(id,interior){currentRegion=id;inside=!!interior;},
  weather(value){currentWeather=value||'clear';},
  phase(value){currentPhase=value||'day';if(!ctx)return;const factor=currentPhase==='night'?.68:currentPhase==='dawn'?.82:currentPhase==='sunset'?.88:1;musicBus.gain.setTargetAtTime(clamp(mix.music)*factor,ctx.currentTime,.5);},
  setMix(next={}){for(const key of Object.keys(mix))if(Number.isFinite(next[key]))mix[key]=clamp(next[key]);applyMix();},
  step(id){stepFlip=!stepFlip;noise(.06,inside?.06:.035,inside?520:1450);tone((inside?100:id==='estonie'?175:132)*(stepFlip?1:1.04),.055,.025,'triangle');},
  event,speak,transport,
  visibility(value){hidden=value;if(!ctx)return;if(value){speechSynthesis?.pause?.();ctx.suspend().catch(()=>{});}else if(enabled){speechSynthesis?.resume?.();ctx.resume().catch(()=>{});}},
  close(){clearInterval(musicTimer);clearInterval(ambienceTimer);speechSynthesis?.cancel?.();enabled=false;pad.forEach(p=>p.o.stop());ctx?.close();}
 };
}
