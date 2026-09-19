import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave,worldItems} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldCinematicEvents,isWorldCinematicKey} from '../src/world/cinematic-events.js';
import {storyCinematicPresentation} from '../src/world/story-cinematic.js';
import {GUARDIAN_VALUES,guardianHubPresence} from '../src/world/guardian-values.js';
import {chapterObjective} from '../src/world/chapters.js';

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


test('first guardian liberation requires the country value trial',()=>{
 let save=applyWorldAction(blankSave(),{type:'visit',region:'france'});
 save=normalizeSave({...save,
  collection:{...save.collection,C002:1},
  team:['C002'],
  beacons:['france:0','france:1','france:2'],
  adventure:{...save.adventure,chapters:{...save.adventure.chapters,france:{helped:true,powers:['ally','ambiance','terrain'],solved:true,restored:2,challenge:false,choice:'garden',board:[]}}}
 });
 assert.throws(()=>applyWorldAction(save,{type:'encounter',id:'france:guardian'}),/Maîtrise d’abord la valeur Justice/);
 for(const [choiceId] of GUARDIAN_VALUES.france.choices)save=applyWorldAction(save,{type:'guardianValueChoice',choiceId});
 const ready=applyWorldAction(save,{type:'encounter',id:'france:guardian'});
 assert.equal(ready.adventure.encounter.card,'C165');
});

test('a guardian appears in the Hub only after seal and full restoration',()=>{
 assert.equal(guardianHubPresence(['france'],[]).length,0);
 const visible=guardianHubPresence(['france'],['france']);
 assert.equal(visible.length,1);
 assert.equal(visible[0].name,'Céliane');
 assert.equal(visible[0].value,'Justice');
});


test('restored France explicitly guides Céliane back to the Hub until homecoming is acknowledged',()=>{
 let save=blankSave();save.region='france';save.seals=['france'];
 save.adventure.chapters.france={helped:true,powers:['ally','ambiance','terrain'],solved:true,restored:3,challenge:false,choice:'garden',board:[]};
 let objective=chapterObjective(save,'france');
 assert.equal(objective.target,'hub');
 assert.match(objective.title,/Céliane/);
 save.adventure.cinematicSeen=['homecoming:france'];
 objective=chapterObjective(save,'france');
 assert.equal(objective.target,'france:guardian');
});


test('France hides Céliane until Justice and locks the value trial before restoration stage two',()=>{
 let save=applyWorldAction(blankSave(),{type:'visit',region:'france'});
 let items=worldItems('france',save);
 assert.equal(items.find(item=>item.type==='valueTrial')?.locked,true);
 assert.equal(items.some(item=>item.type==='guardian'),false);

 save=normalizeSave({...save,
  collection:{...save.collection,C002:1},
  team:['C002'],
  beacons:['france:0','france:1','france:2'],
  adventure:{...save.adventure,chapters:{...save.adventure.chapters,france:{helped:true,powers:['ally','ambiance','terrain'],solved:true,restored:2,challenge:false,choice:'garden',board:[]}}}
 });
 items=worldItems('france',save);
 assert.equal(items.find(item=>item.type==='valueTrial')?.locked,false);
 assert.equal(items.some(item=>item.type==='guardian'),false);

 for(const [choiceId] of GUARDIAN_VALUES.france.choices)save=applyWorldAction(save,{type:'guardianValueChoice',choiceId});
 items=worldItems('france',save);
 assert.equal(items.some(item=>item.type==='guardian'&&item.card==='C165'),true);
});

test('non-guardian story beats never reveal a guardian portrait early',()=>{
 const entry=storyCinematicPresentation({kind:'country-first-entry',key:'country:france',region:'france',context:{region:'france'}});
 assert.equal(entry.card,null);
 const intro=storyCinematicPresentation({kind:'guardian-intro',key:'intro:france:C165:adventure',region:'france',context:{region:'france',card:'C165'}});
 assert.equal(intro.card,'C165');
});
