import test from 'node:test';
import assert from 'node:assert/strict';
import {characterSequence,frameAt} from '../src/world/cinematic-script.js';
import {COUNTRY_CINEMA,cinematicSpec} from '../src/world/cinematic-director.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';

test('Gold Master opening stays inside the 35–50 second target',()=>{
 const sequence=characterSequence({avatar:{name:'Kaïs'}});
 const total=sequence.shots.reduce((sum,shot)=>sum+shot.duration,0);
 assert.equal(sequence.id,'character-reveal-gold-master-v2');
 assert.ok(total>=35000&&total<=50000,`unexpected duration ${total}ms`);
 assert.ok(sequence.shots.some(shot=>shot.effect==='portal'));
 assert.ok(sequence.shots.some(shot=>shot.effect==='countries'));
 assert.ok(sequence.shots.some(shot=>shot.effect==='signature'&&shot.line.includes('héritage')));
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

test('recovered memories trigger a premium micro cinematic',()=>{
 const previous={region:'france',beacons:[],adventure:{chapters:{france:{}},cinematicSeen:[]},collection:{}};
 const next={region:'france',beacons:['france:0'],adventure:{chapters:{france:{}},cinematicSeen:[]},collection:{}};
 const events=worldCinematicEvents(previous,next,{type:'beacon',id:'france:0'});
 assert.equal(events[0].kind,'memory-fragment');
 assert.equal(cinematicSpec('memory-fragment','france').tier,'micro');
});


test('first creation ends inside the real world and stays under 50 seconds',()=>{
 const sequence=characterSequence({
  avatar:{name:'Kaïs',path:'tempete'},
  power:{name:'Tempête',description:'Puissance réelle.'},
  gear:{name:'Équipement',description:'Voyage réel.'},
  weapon:{enabled:true,name:'Arme active',attack:'Frappe.',defense:'Garde.',drawback:'Récupération.'},
 });
 const characterMs=sequence.shots.reduce((sum,shot)=>sum+shot.duration,0);
 const opening=cinematicSpec('world-opening','hub');
 const presentation=storyCinematicPresentation({kind:'world-opening',key:'opening:test',region:'hub',context:{region:'hub'}});
 assert.equal(opening.tier,'major');
 assert.equal(opening.duration,7800);
 assert.ok(characterMs+opening.duration>=35000);
 assert.ok(characterMs+opening.duration<=50000,'combined opening is '+(characterMs+opening.duration)+'ms');
 assert.equal(presentation.title,'LE MONDE DU 3B');
 assert.match(presentation.detail,/monde réel du 3B/i);
});
