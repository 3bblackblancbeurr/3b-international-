import test from 'node:test';import assert from 'node:assert/strict';
import {createCinematicDirector,worldScene} from '../src/world/origins/cinematic-director.js';
import {originsCharacterSequence} from '../src/world/origins/avatar-sequence.js';
import {WEAPONS} from '../src/world/arsenal.js';
import {blank,normalize,persist,load} from '../src/world/origins/state.js';
test('cinematic queue deduplicates, pauses, reads and advances without touching game state',()=>{
 const d=createCinematicDirector(),s=blank(),before=JSON.stringify(s);assert.equal(d.enqueue(worldScene('battle','france',{})),true);assert.equal(d.enqueue(worldScene('battle','france',{})),false);d.enqueue(worldScene('victory','france',{}));d.tick(.1);d.pause();d.tick(.1);assert.equal(d.current.elapsed,.1);d.pause();d.read();d.tick(.1);assert.equal(d.current.elapsed,.1);d.skip();assert.equal(d.current.type,'victory');for(let i=0;i<40;i++)d.tick(.1);assert.equal(d.current,null);assert.equal(JSON.stringify(s),before);
});
test('all selectable weapons reveal their actual identity and unlocked form',()=>{for(const w of WEAPONS){const s=originsCharacterSequence({name:'Amina',weapon:w.id,weaponForm:3},0);assert.ok(s.shots[0].title.includes('Amina'));assert.equal(s.shots[2].title,w.name);assert.ok(s.shots[2].line.includes('Forme 1'));assert.equal(s.shots.reduce((a,b)=>a+b.duration,0),32000);}});
test('visited scenes survive saves and reject unknown country names',()=>{const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};const s=blank();s.visited=['france','maroc','unknown'];assert.equal(persist(storage,null,s),true);assert.deepEqual(load(storage,null).visited.sort(),['france','maroc']);const old=blank();persist(storage,null,old);assert.equal(load(storage,null).visited.length,2);assert.deepEqual(normalize({}).visited,[]);});
