import test from 'node:test';
import assert from 'node:assert/strict';
import {characterSequence,frameAt} from '../src/world/cinematic-script.js';
import {COUNTRY_CINEMA,cinematicSpec} from '../src/world/cinematic-director.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';

test('Gold Master opening stays inside the 35–50 second target',()=>{
 const sequence=characterSequence({avatar:{name:'Kaïs'}});
 const total=sequence.shots.reduce((sum,shot)=>sum+shot.duration,0);
 assert.equal(sequence.id,'character-reveal-gold-master-v2');
 assert.ok(total>=35000&&total<=50000,`unexpected duration ${total}ms`);
 assert.ok(sequence.shots.some(shot=>shot.id==='gate'));
 assert.ok(sequence.shots.some(shot=>shot.id==='eight-worlds'));
 assert.ok(sequence.shots.some(shot=>shot.id==='signature'&&shot.line.includes('héritage')));
 assert.equal(frameAt(sequence,total).done,true);
});

test('the eight countries keep distinct cinematic identities',()=>{
 const countries=['france','algerie','maroc','tunisie','turquie','espagne','italie','estonie'];
 assert.equal(countries.filter(id=>COUNTRY_CINEMA[id]).length,8);
 assert.equal(new Set(countries.map(id=>COUNTRY_CINEMA[id].mood)).size,8);
 assert.equal(COUNTRY_CINEMA.france.mood,'Justice');
 assert.equal(COUNTRY_CINEMA.algerie.mood,'Loyauté');
 assert.equal(COUNTRY_CINEMA.maroc.mood,'Noblesse');
 assert.equal(COUNTRY_CINEMA.tunisie.mood,'Courage');
 assert.equal(COUNTRY_CINEMA.turquie.mood,'Foi');
 assert.equal(COUNTRY_CINEMA.espagne.mood,'Passion');
 assert.equal(COUNTRY_CINEMA.italie.mood,'Espoir');
 assert.equal(COUNTRY_CINEMA.estonie.mood,'Sagesse');
});

test('major, narrative and micro recipes stay differentiated',()=>{
 assert.equal(cinematicSpec('guardian-intro','france').tier,'major');
 assert.equal(cinematicSpec('story-restoration','maroc').tier,'narrative');
 assert.equal(cinematicSpec('discovery','estonie').tier,'micro');
 assert.equal(cinematicSpec('final-combat-intro','turquie').letterbox,true);
});

test('gameplay transitions create presentation events without granting rewards',()=>{
 const previous={region:'hub',visited:[],adventure:{chapters:{france:{}},cinematicSeen:[]},collection:{}};
 const next={region:'france',visited:['france'],adventure:{chapters:{france:{}},cinematicSeen:[]},collection:{}};
 const events=worldCinematicEvents(previous,next,{type:'visit',region:'france'});
 assert.equal(events.length,1);
 assert.equal(events[0].kind,'country-first-entry');
 assert.equal(events[0].context.region,'france');
});
