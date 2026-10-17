import test from 'node:test';
import assert from 'node:assert/strict';
import {applyTravelAction,createTravelStep,createTravelTrip,emptyTravelState,exportTravelBackup,exportTravelText,orderedTravelSteps,parseTravelBackup,parseTravelCost,readTravelState,saveTravelState,TRAVEL_STORAGE_KEY,travelSummary,validTravelDate} from '../src/member/travel/travel-model.js';
const now='2026-10-18T12:00:00.000Z';
const later='2026-10-18T13:00:00.000Z';
const trip=(overrides={})=>({...createTravelTrip('PT',{tripId:'trip-portugal',now}),title:'Mon séjour au Portugal',startDate:'2026-11-03',endDate:'2026-11-09',...overrides});
const initial=()=>applyTravelAction(emptyTravelState(),{type:'save-trip',trip:trip()},now);
const step=(overrides={})=>({...createTravelStep({stepId:'step-lisbonne'}),title:'Visiter Lisbonne',place:'Alfama',date:'2026-11-04',estimatedMinor:2550,...overrides});
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};

test('new local notebooks contain no invented trip or reservation and preserve user edits through export/reload',()=>{
  assert.equal(emptyTravelState().trips.length,0);
  const state=initial();assert.equal(state.trips[0].checklist.length,5);assert.equal(state.trips[0].checklist.filter(item=>item.done).length,0);
  assert.deepEqual(parseTravelBackup(exportTravelBackup(state)),state);
  assert.equal(state.trips[0].country,'PT');assert.equal(state.selectedId,'trip-portugal');
});
test('calendar validation rejects impossible dates and reversed or out-of-trip steps',()=>{
  for(const date of ['2026-02-31','2026-13-01','2026-1-1','not-a-date',null])assert.equal(validTravelDate(date),false);
  assert.equal(validTravelDate('2028-02-29'),true);assert.equal(validTravelDate('2026-02-29'),false);assert.equal(validTravelDate(''),true);
  assert.throws(()=>applyTravelAction(emptyTravelState(),{type:'save-trip',trip:trip({endDate:'2026-11-02'})},now),/retour/);
  for(const date of ['2026-11-02','2026-11-10'])assert.throws(()=>applyTravelAction(initial(),{type:'save-step',tripId:'trip-portugal',step:step({date})},now),/entre le départ/);
  const state=applyTravelAction(initial(),{type:'save-step',tripId:'trip-portugal',step:step()},now);
  assert.throws(()=>applyTravelAction(state,{type:'save-trip',trip:trip({endDate:'2026-11-03'})},later),/chaque étape/);
});
test('editing trip metadata keeps itinerary and preparation changes made while an editor was open',()=>{
  const state=initial(),draft={...state.trips[0],title:'Le Portugal autrement'};
  let current=applyTravelAction(state,{type:'save-step',tripId:draft.id,step:step()},later);
  current=applyTravelAction(current,{type:'toggle-check',tripId:draft.id,id:'preparation-0'},later);
  const saved=applyTravelAction(current,{type:'save-trip',trip:draft},later);
  assert.equal(saved.trips[0].steps.length,1);assert.equal(saved.trips[0].checklist[0].done,true);assert.equal(saved.trips[0].title,draft.title);
});
test('costs use exact centimes and do not accept scientific notation, negatives or silent rounding',()=>{
  for(const [value,result] of [['',0],['0',0],['25,50',2550],['0.01',1],['1234.1',123410]])assert.equal(parseTravelCost(value),result);
  for(const value of ['-1','1e3','1.999','12 €','Infinity','1,2,3','1000000.01'])assert.equal(parseTravelCost(value),null);
  const state=applyTravelAction(initial(),{type:'save-step',tripId:'trip-portugal',step:step()},later);
  assert.equal(travelSummary(state.trips[0]).estimatedMinor,2550);
  assert.throws(()=>applyTravelAction(state,{type:'save-step',tripId:'trip-portugal',step:step({estimatedMinor:1.1})},later),/Budget/);
});
test('itinerary sorts dated steps while undated ideas remain at the end without mutating storage order',()=>{
  let state=initial();
  for(const item of [step({id:'late-step',date:'2026-11-08'}),step({id:'undated-step',date:''}),step({id:'first-step',date:'2026-11-04'})])state=applyTravelAction(state,{type:'save-step',tripId:'trip-portugal',step:item},later);
  assert.deepEqual(orderedTravelSteps(state.trips[0]).map(item=>item.id),['first-step','late-step','undated-step']);
  assert.deepEqual(state.trips[0].steps.map(item=>item.id),['late-step','undated-step','first-step']);
});
test('personal checklists can be extended, checked and removed without inventing official completion',()=>{
  let state=applyTravelAction(initial(),{type:'add-check',tripId:'trip-portugal',id:'my-preparation',title:'Créer ma playlist'},later);
  state=applyTravelAction(state,{type:'toggle-check',tripId:'trip-portugal',id:'my-preparation'},later);
  assert.deepEqual(travelSummary(state.trips[0]),{completed:1,checks:6,steps:0,estimatedMinor:0});
  const deleted=applyTravelAction(state,{type:'delete-check',tripId:'trip-portugal',id:'my-preparation'},later);
  assert.equal(deleted.trips[0].checklist.length,5);assert.equal(state.trips[0].checklist.length,6);
  assert.throws(()=>applyTravelAction(deleted,{type:'toggle-check',tripId:'trip-portugal',id:'missing'},later),/introuvable/);
});
test('invalid imports and duplicate identifiers fail before mutating a notebook',()=>{
  const state=initial();
  for(const source of ['{','null','{}',JSON.stringify({...state,version:2}),JSON.stringify({...state,trips:[state.trips[0],state.trips[0]]})])assert.throws(()=>parseTravelBackup(source));
  for(const override of [{country:'ZZ'},{title:' '},{title:'x'.repeat(101)},{checklist:[{id:'item',title:'A',done:'yes'}]},{steps:[step(),step()]}])assert.throws(()=>parseTravelBackup({...state,trips:[{...state.trips[0],...override}]}));
  assert.throws(()=>parseTravelBackup('x'.repeat(12000001)),/12 Mo/);
  assert.equal(state.trips.length,1);assert.equal(state.trips[0].steps.length,0);
});
test('notebook capacities are bounded and restores preserve backups exactly except for a fresh revision',()=>{
  let state=emptyTravelState();
  for(let index=0;index<30;index++)state=applyTravelAction(state,{type:'save-trip',trip:trip({id:'trip-'+index})},now);
  assert.throws(()=>applyTravelAction(state,{type:'save-trip',trip:trip({id:'one-too-many'})},now),/30 carnets/);
  const source=exportTravelBackup(initial()),restored=applyTravelAction(state,{type:'restore',source},later);
  assert.equal(restored.trips.length,1);assert.equal(restored.revision,31);assert.equal(restored.trips[0].createdAt,now);
  const deleted=applyTravelAction(restored,{type:'delete-trip',id:restored.selectedId},later);assert.equal(deleted.selectedId,'');assert.equal(deleted.trips.length,0);
});
test('local persistence refuses stale writes and preserves a malformed prior save for recovery',()=>{
  const store=storage(),first=readTravelState(store);assert.equal(first.raw,null);
  const saved=saveTravelState(initial(),{storage:store,expectedRaw:first.raw});assert.equal(saved.ok,true);
  const second=readTravelState(store);assert.deepEqual(second.state,initial());
  const result=saveTravelState(emptyTravelState(),{storage:store,expectedRaw:null});assert.equal(result.conflict,true);assert.deepEqual(readTravelState(store).state,initial());
  assert.equal(saveTravelState(emptyTravelState(),{storage:store,expectedRaw:undefined}).conflict,true,'an unavailable initial read cannot overwrite a later valid save');
  store.setItem(TRAVEL_STORAGE_KEY,'{invalid');const bad=readTravelState(store);assert.ok(bad.warning);assert.equal(store.getItem(TRAVEL_STORAGE_KEY),'{invalid');
  assert.equal(saveTravelState(initial(),{storage:store,expectedRaw:'{invalid'}).ok,true);assert.equal(store.getItem(TRAVEL_STORAGE_KEY+':recovery'),'{invalid');
});
test('maximum permitted Unicode notebooks can import their own exported backup',()=>{
  const template=trip({notes:'€'.repeat(1200),steps:Array.from({length:60},(_,index)=>step({id:'step-'+index,title:'€'.repeat(120),place:'€'.repeat(120),notes:'€'.repeat(800)})),checklist:Array.from({length:60},(_,index)=>({id:'check-'+index,title:'€'.repeat(180),done:false}))});
  const state={...emptyTravelState(),trips:Array.from({length:30},(_,index)=>({...template,id:'trip-'+index,title:'€'.repeat(100)}))};
  const source=exportTravelBackup(state);assert.ok(new TextEncoder().encode(source).byteLength>4000000);assert.equal(parseTravelBackup(source).trips.length,30);
});
test('blocked storage never pretends to have saved and plain-text export contains the real user itinerary',()=>{
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};
  assert.ok(readTravelState(blocked).warning);assert.equal(saveTravelState(initial(),{storage:blocked}).ok,false);
  const state=applyTravelAction(initial(),{type:'save-step',tripId:'trip-portugal',step:step()},later);
  const text=exportTravelText(state.trips[0]);assert.match(text,/Visiter Lisbonne/);assert.match(text,/Alfama/);assert.match(text,/25,50/);assert.match(text,/ni une réservation/);assert.ok(!text.includes('undefined'));
});
