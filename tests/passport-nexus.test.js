import test from 'node:test';
import assert from 'node:assert/strict';
import {NEXUS_DOORS, nexusProgress, nexusTravelCommands, commitNexusTravel} from '../src/lib/passport-nexus.js';

const save = (region='hub', seals=[]) => ({region, seals, xp:0, visited:[], adventure:{encounter:null}});
function fakeStore(initial=save(), overrides={}) {
  const calls=[];
  const store={
    loadWorld:async uid=>{calls.push(['load',uid]);return {data:initial,message:'test'};},
    recordWorldAction:(uid,data,command)=>{calls.push(['action',uid,command]);return {...data,region:command.region};},
    writeLocal:(uid,data,dirty)=>{calls.push(['write',uid,data.region,dirty]);return true;},
    saveWorld:async (uid,data)=>{calls.push(['sync',uid]);return {data,message:'saved'};},
    ...overrides,
  };
  return {store,calls};
}
test('eight unique doors with canonical country IDs and narrative values',()=>{
  assert.equal(NEXUS_DOORS.length,8);
  assert.equal(new Set(NEXUS_DOORS.map(d=>d.region)).size,8);
  assert.deepEqual(NEXUS_DOORS.map(d=>[d.code,d.region,d.value]),[
    ['FR','france','Justice'],['DZ','algerie','Loyauté'],['ES','espagne','Passion'],['MA','maroc','Noblesse'],
    ['IT','italie','Espoir'],['TN','tunisie','Courage'],['TR','turquie','Foi'],['EE','estonie','Sagesse'],
  ]);
});
test('missing and malformed saves stay locked',()=>{
  for (const input of [null,undefined,{}, {seals:8},{seals:'france'},{seals:{length:8}}]) {
    assert.equal(nexusProgress(input).count,0);assert.equal(nexusProgress(input).originUnlocked,false);
  }
});
test('eight repeats are one key, not eight',()=>assert.equal(nexusProgress(save('hub',Array(8).fill('france'))).count,1));
test('unknown seals cannot unlock ORIGINE',()=>assert.equal(nexusProgress(save('hub',['FR','origin','hub',null,1,'xx'])).count,0));
test('XP, visited countries and runner keys are not guardian seals',()=>assert.equal(nexusProgress({xp:10000,visited:NEXUS_DOORS.map(d=>d.region),keys:Array(8).fill('key')}).originUnlocked,false));
for(let count=0;count<=8;count++) test(`${count} unique seals: correct count and ORIGINE gate`,()=>{
  const result=nexusProgress(save('hub',NEXUS_DOORS.slice(0,count).map(d=>d.region)));
  assert.equal(result.count,count);assert.equal(result.originUnlocked,count===8);
});
test('progress is ordered and does not mutate input',()=>{
  const seals=['estonie','france','estonie'];const input=save('hub',seals);
  assert.deepEqual(nexusProgress(input).keys,['france','estonie']);assert.deepEqual(input.seals,seals);
});
for(const door of NEXUS_DOORS) test(`door ${door.code} plans a real visit to ${door.region}`,()=>{
  assert.deepEqual(nexusTravelCommands(save(),door.region),[{type:'visit',region:door.region}]);
});
test('country-to-country travel goes through the hub',()=>assert.deepEqual(nexusTravelCommands(save('france'),'italie'),[{type:'visit',region:'hub'},{type:'visit',region:'italie'}]));
test('same country does not replay visits or rewards',()=>assert.deepEqual(nexusTravelCommands(save('italie'),'italie'),[]));
test('active encounter prevents teleportation',()=>{
  const input=save('france');input.adventure.encounter={result:null};
  assert.throws(()=>nexusTravelCommands(input,'italie'),/rencontre/);
});
test('completed encounter can be left by the existing visit command',()=>{
  const input=save('france');input.adventure.encounter={result:'victory'};
  assert.equal(nexusTravelCommands(input,'italie').length,2);
});
test('invalid targets and saves fail before commands',()=>{
  for(const target of ['IT','origine','hub','__proto__','',null])assert.throws(()=>nexusTravelCommands(save(),target));
  assert.throws(()=>nexusTravelCommands({region:'unknown'},'italie'));
});
test('uses the real account scope and existing command journal',async()=>{
  const initial=save('france',['france']);const {store,calls}=fakeStore(initial);
  const result=await commitNexusTravel({uid:'member-a',region:'italie',store});
  assert.deepEqual(calls.filter(c=>c[0]==='action').map(c=>c[2]),[{type:'visit',region:'hub'},{type:'visit',region:'italie'}]);
  assert.ok(calls.every(c=>c[1]==='member-a'));assert.equal(result.data.region,'italie');
  assert.deepEqual(result.data.seals,['france']);assert.equal(result.data.xp,0);assert.equal(initial.region,'france');
});
test('guest travel is persisted even when sync returns only a message',async()=>{
  const {store}=fakeStore(save(),{saveWorld:async()=>({message:'guest saved'})});
  assert.equal((await commitNexusTravel({region:'italie',store})).data.region,'italie');
});
test('storage failure is not reported as a successful passage',async()=>{
  let synced=false;const {store}=fakeStore(save(),{writeLocal:()=>false,saveWorld:async()=>{synced=true;return {};}});
  await assert.rejects(commitNexusTravel({region:'italie',store}),/stockage/);assert.equal(synced,false);
});
test('offline sync keeps the local destination and exposes pending status',async()=>{
  const {store}=fakeStore(save(),{saveWorld:async()=>({pending:true,message:'offline'})});
  const result=await commitNexusTravel({uid:'member-a',region:'italie',store});
  assert.equal(result.pending,true);assert.equal(result.data.region,'italie');
});
test('server destination wins over optimistic client state',async()=>{
  const {store}=fakeStore(save(),{saveWorld:async()=>({data:save(),message:'server rejected'})});
  await assert.rejects(commitNexusTravel({uid:'member-a',region:'italie',store}),/server rejected/);
});
test('unknown target triggers no storage or network call',async()=>{
  const {store,calls}=fakeStore();await assert.rejects(commitNexusTravel({region:'invalid',store}));assert.equal(calls.length,0);
});
test('already cancelled session performs no work',async()=>{
  const {store,calls}=fakeStore();assert.equal(await commitNexusTravel({region:'italie',store,isActive:()=>false}),null);assert.equal(calls.length,0);
});
test('closing or switching account during load prevents writes',async()=>{
  let active=true;const {store,calls}=fakeStore(save(),{loadWorld:async()=>{active=false;return {data:save()};}});
  assert.equal(await commitNexusTravel({region:'italie',store,isActive:()=>active}),null);assert.equal(calls.length,0);
});
test('closing during synchronization prevents a late navigation result',async()=>{
  let active=true;const {store}=fakeStore(save(),{saveWorld:async(uid,data)=>{active=false;return {data};}});
  assert.equal(await commitNexusTravel({region:'italie',store,isActive:()=>active}),null);
});
test('active encounter triggers no journal or save writes',async()=>{
  const input=save();input.adventure.encounter={result:null};const {store,calls}=fakeStore(input);
  await assert.rejects(commitNexusTravel({region:'italie',store}),/rencontre/);
  assert.deepEqual(calls.map(c=>c[0]),['load']);
});
test('journal errors are exposed, not disguised as successful navigation',async()=>{
  const {store}=fakeStore(save(),{recordWorldAction:()=>{throw Error('journal full');}});
  await assert.rejects(commitNexusTravel({region:'italie',store}),/journal full/);
});
test('revisiting the saved destination emits no new reward-producing command',async()=>{
  const {store,calls}=fakeStore(save('italie'));
  await commitNexusTravel({region:'italie',store});
  assert.equal(calls.filter(c=>c[0]==='action').length,0);
});
