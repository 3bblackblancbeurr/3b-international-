import test from 'node:test';
import assert from 'node:assert/strict';
import {createApparitionVoice,APPARITION_PHRASE} from '../src/world/invisible/apparition-voice.js';
class AudioMock extends EventTarget{paused=true;play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}}
test('recorded speech reports speaking only on playback and stops cleanly on close',()=>{
 const audio=new AudioMock(),states=[],loading=[];const voice=createApparitionVoice({createAudio:()=>audio,onSpeaking:v=>states.push(v),onLoading:v=>loading.push(v)});
 assert.equal(voice.read(APPARITION_PHRASE),true);assert.equal(states.at(-1),false);assert.equal(loading.at(-1),true);
 audio.dispatchEvent(new Event('playing'));assert.equal(states.at(-1),true);assert.equal(loading.at(-1),false);
 voice.stop();assert.equal(audio.paused,true);assert.equal(states.at(-1),false);audio.dispatchEvent(new Event('playing'));assert.equal(states.at(-1),false);
 voice.dispose();assert.equal(voice.read(APPARITION_PHRASE),false);
});
test('play rejection and missing audio report failure without claiming speech has started',async()=>{
 let errors=0;const audio=new AudioMock();audio.play=()=>Promise.reject(Error('blocked'));
 const voice=createApparitionVoice({createAudio:()=>audio,onError:()=>errors++});voice.read(APPARITION_PHRASE);await Promise.resolve();assert.equal(errors,1);assert.equal(audio.paused,true);voice.dispose();
 const broken=createApparitionVoice({createAudio:()=>{throw Error('no audio');},onError:()=>errors++});assert.equal(broken.read(APPARITION_PHRASE),false);assert.equal(errors,2);broken.dispose();
});
test('a cancelled pending play cannot report a late error, and a stalled start times out',async()=>{
 let reject,errors=0;const audio=new AudioMock();audio.play=()=>new Promise((resolve,r)=>reject=r);
 const voice=createApparitionVoice({createAudio:()=>audio,onError:()=>errors++,timeoutMs:10});voice.read(APPARITION_PHRASE);voice.stop();reject(Error('late'));await Promise.resolve();assert.equal(errors,0);
 voice.read(APPARITION_PHRASE);await new Promise(r=>setTimeout(r,25));assert.equal(errors,1);assert.equal(audio.paused,true);voice.dispose();
});
