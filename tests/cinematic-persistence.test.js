import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cinematicSeenCommand} from '../src/world/cinematic-persistence.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';

test('presentation-only opening and already persisted beacon memories never enqueue unsupported server commands',()=>{
 for(const event of [null,{}, {kind:'world-opening',key:'opening:v4'}, {kind:'memory-fragment',key:'memory:france:0'}, {kind:'other',key:'memory:france:0'}, {kind:'unknown',key:'invalid'}])assert.equal(cinematicSeenCommand(event),null);
 assert.deepEqual(cinematicSeenCommand({kind:'country-first-entry',key:'country:france'}),{type:'cinematicSeen',key:'country:france'});
 assert.deepEqual(cinematicSeenCommand({kind:'important-combat-result',key:'result:france:C001:victory'}),{type:'cinematicSeen',key:'result:france:C001:victory'});
});
test('a saved beacon prevents memory replay without cinematicSeen, and presentation does not mutate rewards',()=>{
 const previous={region:'france',beacons:[],adventure:{}},next={region:'france',beacons:['france:0'],adventure:{}},action={type:'beacon',id:'france:0'};
 const original=structuredClone(next);
 const events=worldCinematicEvents(previous,next,action);
 assert.equal(events[0].kind,'memory-fragment');
 assert.equal(cinematicSeenCommand(events[0]),null);
 assert.deepEqual(worldCinematicEvents(next,structuredClone(next),action),[]);
 assert.deepEqual(next,original);
});
test('the actual cinematic completion uses the server-compatible persistence selector',()=>{
 const source=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 assert.match(source,/const seenCommand=cinematicSeenCommand\(current\);if\(seenCommand\)act\(seenCommand\);/);
});
