import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldAudio} from '../src/world/audio.js';

test('premium World audio exposes independent music ambience sfx voice controls',()=>{
 const audio=createWorldAudio();
 for(const name of ['enable','region','ambience','weather','phase','state','listener','spatialEvent','setMix','step','event','speak','transport','visibility','close'])assert.equal(typeof audio[name],'function',name);
 assert.equal(audio.speak('Bonjour',{character:'celiane'}),false);
 assert.doesNotThrow(()=>audio.setMix({master:.5,music:.2,ambience:.7,sfx:.8,voice:1}));
 assert.doesNotThrow(()=>audio.weather('storm'));
 assert.doesNotThrow(()=>audio.phase('night'));
 assert.doesNotThrow(()=>audio.state('guardian'));
 assert.doesNotThrow(()=>audio.listener({x:4,z:-2},90));
});

test('audio methods remain safe before a browser AudioContext exists',()=>{
 const audio=createWorldAudio();
 assert.doesNotThrow(()=>audio.event('hubSecretUnlock','secret_three_lights'));
 assert.doesNotThrow(()=>audio.transport('zipline'));
 assert.doesNotThrow(()=>audio.spatialEvent('hubSecret',{x:10,z:2}));
 assert.doesNotThrow(()=>audio.visibility(true));
 assert.doesNotThrow(()=>audio.close());
});
