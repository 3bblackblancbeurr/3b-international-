import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianReader} from '../src/world/invisible/guardian-voice.js';

test('reading uses only a local French voice, requires an explicit call and cancels obsolete callbacks',()=>{
 const voices=[{lang:'fr-FR',localService:false,name:'Remote'},{lang:'en-US',localService:true,name:'English'},{lang:'fr-FR',localService:true,name:'Local'}];
 let cancels=0;const spoken=[],states=[];
 const reader=createGuardianReader({synthesis:{getVoices:()=>voices,speak:row=>spoken.push(row),cancel:()=>cancels++},createUtterance:text=>({text}),onSpeaking:state=>states.push(state)});
 assert.equal(reader.supported,true);assert.equal(spoken.length,0);
 assert.equal(reader.read('Un indice du Gardien.'),true);assert.equal(spoken[0].voice.name,'Local');assert.equal(spoken[0].lang,'fr-FR');
 reader.stop();assert.equal(states.at(-1),false);assert.equal(cancels,2);
 reader.read('Une seconde réponse.');const count=states.length;spoken[0].onend();assert.equal(states.length,count,'An old utterance cannot clear the new speaking state');
 reader.dispose();const disposedCount=states.length;spoken[1].onend();assert.equal(states.length,disposedCount);assert.equal(reader.read('Encore'),false);
});

test('remote-only or unavailable synthesis stays unavailable and never transmits through a remote voice',()=>{
 let calls=0;
 const reader=createGuardianReader({synthesis:{getVoices:()=>[{lang:'fr-FR',localService:false}],speak:()=>calls++,cancel:()=>{}},createUtterance:text=>({text})});
 assert.equal(reader.supported,false);assert.equal(reader.read('Bonjour'),false);assert.equal(calls,0);
 assert.equal(createGuardianReader().supported,false);assert.equal(createGuardianReader().read('Bonjour'),false);
});

test('speech errors report failure only for the current utterance and not after disposal',()=>{
 const spoken=[];let errors=0;
 const reader=createGuardianReader({synthesis:{getVoices:()=>[{lang:'fr-FR',localService:true}],speak:u=>spoken.push(u),cancel(){}},createUtterance:text=>({text}),onError:()=>errors++});
 reader.read('Première phrase.');reader.read('On viendra te chercher, Ish.');spoken[0].onerror();assert.equal(errors,0);
 spoken[1].onerror();assert.equal(errors,1);reader.dispose();spoken[1].onerror();assert.equal(errors,1);
});
