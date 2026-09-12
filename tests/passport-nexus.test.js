import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NEXUS_DOORS,nexusProgress,nexusTravelState,commitNexusTravel} from '../src/lib/passport-nexus.js';

const spawn={x:0,z:25};
const save=(zone='sanctuary')=>({zone,position:{x:0,z:20},avatar:{created:true,name:'Voyageur'},flags:{awakened:true},regions:{italie:{wins:2,restored:1}},hp:42,xp:65,rewards:['justice-01'],visited:['france'],equipment:'heritage'});
function fakeStore(initial=save(),overrides={}){
 const calls=[];
 const store={spawns:Object.fromEntries(NEXUS_DOORS.map(d=>[d.region,spawn])),
  loadWorld:async uid=>{calls.push(['load',uid]);return {data:initial,message:'local'};},
  saveWorld:async(uid,data)=>{calls.push(['save',uid,data]);return {ok:true,data,message:'local'};},...overrides};
 return {store,calls};
}
test('eight unique canonical countries and values',()=>{
 assert.deepEqual(NEXUS_DOORS.map(d=>[d.code,d.region,d.value]),[
  ['FR','france','Justice'],['DZ','algerie','Loyauté'],['ES','espagne','Passion'],['MA','maroc','Noblesse'],
  ['IT','italie','Espoir'],['TN','tunisie','Courage'],['TR','turquie','Foi'],['EE','estonie','Sagesse']]);
 assert.equal(new Set(NEXUS_DOORS.map(d=>d.region)).size,8);
});
for(const [label,input] of [['null',null],['missing',undefined],['empty',{}],['old seals',{seals:NEXUS_DOORS.map(d=>d.region)}],['visits',{visited:NEXUS_DOORS.map(d=>d.region)}],['runner keys',{keys:Array(8).fill('key')}],['XP',{xp:10000}],['truthy flag',{flags:{justice:1}}]])
 test(`${label} cannot create ORIGINS fragments`,()=>{assert.equal(nexusProgress(input).count,0);assert.equal(nexusProgress(input).originUnlocked,false);});
test('real France quest flag contributes exactly one fragment',()=>{const p=nexusProgress({flags:{justice:true}});assert.deepEqual(p.keys,['france']);assert.equal(p.count,1);assert.equal(p.originUnlocked,false);});
test('seven unimplemented regional keys remain explicit',()=>{const p=nexusProgress(save());assert.equal(p.missingKeyHooks.length,7);assert.deepEqual(p.implemented,['france']);assert.equal(p.total,8);});
test('ordinary regional wins and restored gardens do not impersonate guardian keys',()=>{const s=save();s.regions=Object.fromEntries(NEXUS_DOORS.map(d=>[d.region,{wins:999,restored:3,key:true}]));assert.equal(nexusProgress(s).count,0);});
test('legacy keys do not unlock ORIGINE even alongside the France fragment',()=>assert.equal(nexusProgress({flags:{justice:true},seals:NEXUS_DOORS.map(d=>d.region)}).originUnlocked,false));
test('progress inspection does not mutate the save',()=>{const s=save(),before=structuredClone(s);nexusProgress(s);assert.deepEqual(s,before);});
for(const door of NEXUS_DOORS)test(`door ${door.code} targets the current ORIGINS zone ${door.region}`,()=>{const s=save(),next=nexusTravelState(s,door.region,spawn);assert.equal(next.zone,door.region);assert.deepEqual(next.position,spawn);assert.equal(s.zone,'sanctuary');});
test('country-to-country passport travel keeps the current ORIGINS schema',()=>{const s=save('france');const n=nexusTravelState(s,'italie',spawn);assert.equal(n.zone,'italie');assert.equal('region' in n,false);});
test('same country preserves saved position and emits no new save',()=>{const s=save('italie');assert.equal(nexusTravelState(s,'italie',spawn),s);});
test('character creation is not bypassed',()=>assert.throws(()=>nexusTravelState({...save(),avatar:{created:false}},'italie',spawn),/personnage/));
test('the awakening quest is not bypassed',()=>assert.throws(()=>nexusTravelState({...save(),flags:{}},'italie',spawn),/Éveille/));
test('an explicitly active encounter blocks a passage',()=>assert.throws(()=>nexusTravelState({...save(),combat:{active:true}},'italie',spawn),/rencontre/));
test('unknown targets fail closed',()=>{for(const id of ['IT','hub','origine','__proto__','',null])assert.throws(()=>nexusTravelState(save(),id,spawn));});
test('an old-world save cannot be used as an ORIGINS save',()=>assert.throws(()=>nexusTravelState({region:'hub',adventure:{avatar:{created:true}}},'italie',spawn),/ORIGINS/));
test('invalid arrival positions fail closed',()=>{for(const p of [null,{}, {x:NaN,z:25},{x:0,z:Infinity}])assert.throws(()=>nexusTravelState(save(),'italie',p),/arrivée/);});
test('travel never changes HP, XP, quest flags, rewards, gear, avatar or regional progress',()=>{const s=save(),before=structuredClone(s),n=nexusTravelState(s,'italie',spawn);for(const key of ['hp','xp','flags','rewards','equipment','avatar','regions','visited'])assert.deepEqual(n[key],before[key]);assert.deepEqual(s,before);});
test('arrival position is copied rather than sharing mutable spawn configuration',()=>{const s=save(),p={...spawn},n=nexusTravelState(s,'italie',p);n.position.x=99;assert.equal(p.x,0);});
test('adapter receives the exact account scope',async()=>{const {store,calls}=fakeStore();const r=await commitNexusTravel({uid:'member-a',region:'italie',store});assert.equal(r.data.zone,'italie');assert.equal(r.local,true);assert.ok(calls.every(c=>c[1]==='member-a'));});
test('guest scope stays separate from a member',async()=>{const {store,calls}=fakeStore();await commitNexusTravel({region:'italie',store});assert.ok(calls.every(c=>c[1]===undefined));});
test('storage failure is never a successful journey',async()=>{const {store}=fakeStore(save(),{saveWorld:async()=>({ok:false})});await assert.rejects(commitNexusTravel({region:'italie',store}),/stockage/);});
test('read-back destination must match the selected country',async()=>{const {store}=fakeStore(save(),{saveWorld:async()=>({ok:true,data:save()})});await assert.rejects(commitNexusTravel({region:'italie',store}),/confirmé/);});
test('unknown target triggers no I/O',async()=>{const {store,calls}=fakeStore();await assert.rejects(commitNexusTravel({region:'unknown',store}));assert.equal(calls.length,0);});
test('already cancelled session performs no I/O',async()=>{const {store,calls}=fakeStore();assert.equal(await commitNexusTravel({region:'italie',store,isActive:()=>false}),null);assert.equal(calls.length,0);});
test('closing or switching account during load prevents writes',async()=>{let active=true;const {store,calls}=fakeStore(save(),{loadWorld:async()=>{active=false;return {data:save()};}});assert.equal(await commitNexusTravel({region:'italie',store,isActive:()=>active}),null);assert.equal(calls.length,0);});
test('closing during persistence prevents late navigation',async()=>{let active=true;const {store}=fakeStore(save(),{saveWorld:async(uid,data)=>{active=false;return {ok:true,data};}});assert.equal(await commitNexusTravel({region:'italie',store,isActive:()=>active}),null);});
test('character prerequisites fail before any write',async()=>{const {store,calls}=fakeStore({...save(),avatar:{created:false}});await assert.rejects(commitNexusTravel({region:'italie',store}));assert.deepEqual(calls.map(c=>c[0]),['load']);});
test('reopening the current country does not overwrite its position',async()=>{const {store,calls}=fakeStore(save('italie'));const r=await commitNexusTravel({region:'italie',store});assert.equal(r.data.zone,'italie');assert.deepEqual(calls.map(c=>c[0]),['load']);});
test('storage exceptions are exposed',async()=>{const {store}=fakeStore(save(),{saveWorld:async()=>{throw Error('storage denied');}});await assert.rejects(commitNexusTravel({region:'italie',store}),/storage denied/);});
test('fresh-load errors are exposed before save',async()=>{const {store,calls}=fakeStore(save(),{loadWorld:async()=>{throw Error('read denied');}});await assert.rejects(commitNexusTravel({region:'italie',store}),/read denied/);assert.equal(calls.length,0);});
test('Nexus imports the current ORIGINS adapter, not the old world journal',()=>{const s=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');assert.match(s,/world\/origins\/passport-adapter\.js/);assert.doesNotMatch(s,/import\("\.\.\/world\/save\.js"\)/);});
test('production adapter uses ORIGINS load/persist and configured spawn points',()=>{const s=readFileSync(new URL('../src/world/origins/passport-adapter.js',import.meta.url),'utf8');assert.match(s,/from '\.\/state\.js'/);assert.match(s,/from '\.\/data\.js'/);assert.doesNotMatch(s,/recordWorldAction|supabase|world\/save\.js/);});
