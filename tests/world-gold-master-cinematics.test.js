import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldCinematicEvents,isWorldCinematicKey} from '../src/world/cinematic-events.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';

test('Gold Master cinematic keys are bounded and persistent',()=>{
 assert.equal(isWorldCinematicKey('value:france'),true);
 assert.equal(isWorldCinematicKey('homecoming:france'),true);
 assert.equal(isWorldCinematicKey('value:unknown'),false);
 let save=applyWorldAction(blankSave(),{type:'cinematicSeen',key:'value:france'});
 assert.ok(save.adventure.cinematicSeen.includes('value:france'));
 assert.ok(normalizeSave(save).adventure.cinematicSeen.includes('value:france'));
 assert.throws(()=>applyWorldAction(save,{type:'cinematicSeen',key:'unknown:key'}),/Cinématique inconnue/);
});

test('completing Justice emits a one-time Céliane story beat',()=>{
 const previous=blankSave();previous.region='france';
 const next=structuredClone(previous);next.adventure.values.france={step:3,completed:true,choices:GUARDIAN_VALUES.france.choices.map(([id])=>id)};
 const events=worldCinematicEvents(previous,next,{type:'guardianValueChoice',choiceId:'reparer'});
 const event=events.find(row=>row.kind==='guardian-value-complete');
 assert.equal(event?.key,'value:france');
 const card=storyCinematicPresentation(event);
 assert.match(card.title,/Justice/i);
 assert.match(card.detail,/Céliane/i);
 next.adventure.cinematicSeen=['value:france'];
 assert.equal(worldCinematicEvents(previous,next,{type:'guardianValueChoice'}).some(row=>row.key==='value:france'),false);
});

test('guardian intro presentation identifies Céliane and Justice',()=>{
 const event={kind:'guardian-intro',key:'intro:france:C165:adventure',region:'france',context:{region:'france',card:'C165',expert:false},priority:100};
 const card=storyCinematicPresentation(event);
 assert.match(card.title,/Céliane/);
 assert.match(card.detail,/Justice/);
 assert.equal(card.audioState,'guardian');
});

test('a rebuilt France emits a one-time Céliane homecoming when returning to the Hub',()=>{
 const previous=blankSave();previous.region='france';previous.seals=['france'];previous.adventure.chapters.france={helped:true,powers:['ally','ambiance','terrain'],solved:true,restored:3,challenge:false,choice:'garden',board:[]};
 const next=structuredClone(previous);next.region='hub';
 let events=worldCinematicEvents(previous,next,{type:'visit',region:'hub'});
 const home=events.find(row=>row.kind==='guardian-homecoming');
 assert.equal(home?.key,'homecoming:france');
 assert.match(storyCinematicPresentation(home).title,/Céliane/);
 next.adventure.cinematicSeen=['homecoming:france'];
 events=worldCinematicEvents(previous,next,{type:'visit',region:'hub'});
 assert.equal(events.some(row=>row.kind==='guardian-homecoming'),false);
});
