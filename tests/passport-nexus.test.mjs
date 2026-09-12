import test from 'node:test';
import assert from 'node:assert/strict';
import { NEXUS_DOORS, nexusProgress, planNexusActions, enterNexusWorld, startNexusSequence } from '../src/passport/nexus-flow.js';
const base = () => ({ region: 'hub', seals: [], adventure: { chapters: {}, encounter: null, finished: false } });
const complete = () => ({ ...base(), seals: NEXUS_DOORS.map(d => d.region), adventure: { ...base().adventure, chapters: Object.fromEntries(NEXUS_DOORS.map(d => [d.region, { restored: 3 }])) } });
const fakeAPI = (initial = base()) => {
  let stored = structuredClone(initial); const calls = [];
  const apply = (save, action) => action.type === 'visit' ? { ...save, region: action.region } : { ...save, adventure: { ...save.adventure, encounter: { final: true } } };
  return { calls, loadWorld: async uid => { calls.push(['load', uid]); return { data: structuredClone(stored) }; }, applyWorldAction: apply,
    recordWorldAction(uid, save, action) { calls.push(['record', uid, action]); stored = apply(save, action); return stored; },
    readLocal: () => ({ data: stored }) };
};
function clock() { let time = 0, id = 0; const jobs = new Map(); return {
  setTimeout(fn, delay) { const key = ++id; jobs.set(key, { fn, at: time + delay }); return key; },
  clearTimeout(key) { jobs.delete(key); },
  advance(delta) { time += delta; for (const [key, job] of [...jobs].sort((a, b) => a[1].at - b[1].at)) if (job.at <= time) { jobs.delete(key); job.fn(); } },
  get pending() { return jobs.size; },
}; }

test('eight unique canonical countries, not invented destinations', () => {
  assert.equal(NEXUS_DOORS.length, 8); assert.equal(new Set(NEXUS_DOORS.map(d => d.region)).size, 8);
  assert.deepEqual(NEXUS_DOORS.map(d => d.code), ['FR','DZ','ES','MA','IT','TN','TR','EE']);
});
test('empty save has no fabricated keys', () => { const p=nexusProgress(null); assert.equal(p.sealCount,0); assert.equal(p.originReady,false); });
test('duplicates and unknown seals cannot unlock ORIGINE', () => { const s=complete(); s.seals=['france','france','x','y','z','a','b','c']; assert.equal(nexusProgress(s).sealCount,1); assert.equal(nexusProgress(s).originReady,false); });
test('eight seals without reconstruction do not unlock ORIGINE', () => { const s=complete(); s.adventure.chapters={}; assert.equal(nexusProgress(s).originReady,false); });
test('seven complete countries do not unlock ORIGINE', () => { const s=complete(); s.adventure.chapters.france.restored=2; assert.equal(nexusProgress(s).restoredCount,7); assert.equal(nexusProgress(s).originReady,false); });
test('eight complete countries and seals unlock ORIGINE', () => assert.equal(nexusProgress(complete()).originReady,true));
test('finished Union is not awarded a second time', () => { const s=complete(); s.adventure.finished=true; assert.equal(nexusProgress(s).originReady,false); assert.throws(()=>planNexusActions(s,'ORIGINE')); });
for (const door of NEXUS_DOORS) test(`door ${door.code} maps to ${door.region}`, () => assert.deepEqual(planNexusActions(base(),door.code),[{type:'visit',region:door.region}]));
test('country change returns through hub', () => assert.deepEqual(planNexusActions({...base(),region:'france'},'IT'),[{type:'visit',region:'hub'},{type:'visit',region:'italie'}]));
test('same country does not record another visit', () => assert.deepEqual(planNexusActions({...base(),region:'france'},'FR'),[]));
test('explore resumes without touching an encounter', () => { const s=base(); s.adventure.encounter={result:null}; assert.deepEqual(planNexusActions(s,null),[]); assert.throws(()=>planNexusActions(s,'FR'),/rencontre/); });
test('unfinished pact is not silently abandoned', () => { const s=base(); s.adventure.encounter={result:'calm',pact:true}; assert.throws(()=>planNexusActions(s,'FR'),/rencontre/); });
test('unknown country has no route', () => assert.throws(()=>planNexusActions(base(),'XX'),/inconnue/));
test('locked ORIGINE has no commands', () => assert.throws(()=>planNexusActions(base(),'ORIGINE'),/huit/));
test('ORIGINE uses the canonical final command at hub', () => assert.deepEqual(planNexusActions({...complete(),region:'france'},'ORIGINE'),[{type:'visit',region:'hub'},{type:'final'}]));
test('existing final encounter is resumed, never recreated', () => { const s=complete(); s.adventure.encounter={final:true}; assert.deepEqual(planNexusActions(s,'ORIGINE'),[]); });
test('route is recorded for the captured account only', async () => { const api=fakeAPI(); const r=await enterNexusWorld(api,'account-A','FR'); assert.equal(r.data.region,'france'); assert.deepEqual(api.calls,[['load','account-A'],['record','account-A',{type:'visit',region:'france'}]]); });
test('guest uses the guest identifier, not another account', async () => { const api=fakeAPI(); await enterNexusWorld(api,null,'DZ'); assert.equal(api.calls[1][1],null); });
test('exploration does not load, write or generate rewards', async () => { const api=fakeAPI(); assert.deepEqual(await enterNexusWorld(api,null,null),{resumed:true}); assert.equal(api.calls.length,0); });
test('close or account change during load prevents recording', async () => { let resolve, valid=true; const api=fakeAPI(); api.loadWorld=()=>new Promise(r=>resolve=r); const pending=enterNexusWorld(api,'account-A','FR',()=>valid); valid=false; resolve({data:base()}); assert.equal(await pending,null); assert.equal(api.calls.length,0); });
test('cancelled request never starts loading', async () => { const api=fakeAPI(); assert.equal(await enterNexusWorld(api,null,'FR',()=>false),null); assert.equal(api.calls.length,0); });
test('canonical validation fails before any route command is recorded', async () => { const api=fakeAPI({...complete(),region:'france'}); api.applyWorldAction=(s,a)=>{if(a.type==='final')throw Error('server rule');return {...s,region:a.region};}; await assert.rejects(enterNexusWorld(api,null,'ORIGINE'),/server rule/); assert.equal(api.calls.filter(c=>c[0]==='record').length,0); });
test('storage failure is surfaced rather than reporting a successful passage', async () => { const api=fakeAPI(); api.readLocal=()=>null; await assert.rejects(enterNexusWorld(api,null,'FR'),/conservé/); });
test('sequence goes scan, tunnel, nexus', () => { const c=clock(), phases=[]; startNexusSequence(p=>phases.push(p),false,c); c.advance(620); c.advance(2130); assert.deepEqual(phases,['scan','tunnel','nexus']); });
test('skip clears every pending timer and cannot return to tunnel', () => { const c=clock(), phases=[]; const s=startNexusSequence(p=>phases.push(p),false,c); s.skip(); c.advance(10000); assert.deepEqual(phases,['scan','nexus']); assert.equal(c.pending,0); });
test('close disposes sequence without late phase updates', () => { const c=clock(), phases=[]; const s=startNexusSequence(p=>phases.push(p),false,c); s.dispose(); s.skip(); c.advance(10000); assert.deepEqual(phases,['scan']); assert.equal(c.pending,0); });
test('quiet mode skips motion and creates no timers', () => { const c=clock(), phases=[]; startNexusSequence(p=>phases.push(p),true,c); assert.deepEqual(phases,['nexus']); assert.equal(c.pending,0); });
test('reopening gets a fresh independent sequence', () => { const c=clock(), phases=[]; const s=startNexusSequence(p=>phases.push(p),false,c); s.dispose(); startNexusSequence(p=>phases.push(p),false,c); c.advance(2750); assert.deepEqual(phases,['scan','scan','tunnel','nexus']); });
