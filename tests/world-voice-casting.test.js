import test from 'node:test';
import assert from 'node:assert/strict';
import {rankWorldVoice,pickWorldVoice,worldVoiceProsody} from '../src/world/voice-casting.js';
import {createWorldAudio} from '../src/world/audio.js';

const voices=[
 {name:'eSpeak Français Compact',lang:'fr-FR',localService:true},
 {name:'Google Français Natural',lang:'fr-FR',localService:true},
 {name:'Microsoft Français Neural',lang:'fr-FR',localService:false},
 {name:'English Neural',lang:'en-US',localService:true},
];

test('the French voice cast prefers installed natural voices without swapping language',()=>{
 const narrator=pickWorldVoice(voices,{character:'narrator',lang:'fr-FR'});
 assert.equal(narrator.name,'Google Français Natural');
 assert.ok(rankWorldVoice(narrator,'fr-FR')>rankWorldVoice(voices[0],'fr-FR'));
 assert.equal(rankWorldVoice(voices[3],'fr-FR'),-Infinity);
 assert.equal(pickWorldVoice(voices,{character:'guide',lang:'fr-FR'}),pickWorldVoice([...voices].reverse(),{character:'guide',lang:'fr-FR'}));
 assert.equal(pickWorldVoice([],{}),null);
 assert.equal(pickWorldVoice(voices,{lang:'ja-JP'}),null);
});

test('French narrator and residents have restrained, stable speech prosody',()=>{
 const narrator=worldVoiceProsody('narrator'),a=worldVoiceProsody('ines_varga');
 assert.equal(narrator.rate,.93);assert.equal(narrator.pitch,.91);
 assert.deepEqual(a,worldVoiceProsody('ines_varga'));
 for(const id of ['ines_varga','noah_leroux','celiane','eira']){
  const {rate,pitch}=worldVoiceProsody(id);
  assert.ok(rate>=.94&&rate<=1.01);
  assert.ok(pitch>=.94&&pitch<=1.04);
 }
});

test('speech narration respects consent, distinct NPC voices, duplicate suppression, replay and cleanup',async()=>{
 const original={window:globalThis.window,speechSynthesis:globalThis.speechSynthesis,SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};
 const spoken=[],synth={getVoices:()=>voices,cancel(){},speak(utterance){spoken.push(utterance);}},contexts=[];
 class P{setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}}
 class N{constructor(){this.gain=new P();this.frequency=new P();this.Q=new P();this.pan=new P();this.stopped=false;}connect(next){return next;}start(){}stop(){this.stopped=true;}disconnect(){}}
 class C{constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination=new N();contexts.push(this);}createOscillator(){return new N();}createGain(){return new N();}createBiquadFilter(){return new N();}createBuffer(){return {getChannelData:()=>new Float32Array(200)}}createStereoPanner(){return new N();}createBufferSource(){return new N();}close(){return Promise.resolve();}suspend(){return Promise.resolve();}}
 globalThis.window={AudioContext:C};globalThis.speechSynthesis=synth;globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 const audio=createWorldAudio();
 try{
  assert.equal(audio.speak('Bonjour',{character:'narrator'}),false,'silent until consent');
  await audio.enable(true,'hub');
  assert.equal(audio.speak('Bonjour',{character:'narrator'}),true);
  assert.equal(spoken.length,1);assert.equal(spoken[0].voice.name,'Google Français Natural');
  assert.equal(audio.speak('Bonjour',{character:'narrator'}),false,'same line cannot queue twice');
  assert.equal(audio.speak('Bonjour',{character:'ines_varga'}),true,'another resident may say the same line');
  assert.equal(spoken.length,1,'the browser only speaks one voice at once');
  spoken[0].onend();assert.equal(spoken.length,2);
  assert.ok(spoken[1].rate>=.94);
  spoken[1].onend();
  assert.equal(audio.speak('Bonjour',{character:'narrator'}),true,'completed lines are replayable');
  audio.enable(false);
  assert.equal(audio.status().enabled,false);
  assert.equal(audio.speak('Bonjour',{character:'narrator'}),false);
  assert.equal(contexts.length,1);
 }finally{audio.close();globalThis.window=original.window;globalThis.speechSynthesis=original.speechSynthesis;globalThis.SpeechSynthesisUtterance=original.SpeechSynthesisUtterance;}
});
