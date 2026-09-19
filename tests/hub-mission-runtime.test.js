import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHubMissionState, startHubMission, advanceHubMission, claimHubMission, hubMissionProgress } from '../src/world/hub/mission-runtime.js';

const here=dirname(fileURLToPath(import.meta.url));
const missions=JSON.parse(readFileSync(join(here,'..','src','world','hub','data','missions-v1.json'),'utf8'));

test('Hub mission runtime creates all 20 canonical mission states',()=>{
 const state=createHubMissionState(missions);
 assert.equal(Object.keys(state).length,20);
 assert.ok(Object.values(state).every((row)=>row.status==='available'));
});

test('Hub missions can start, advance, complete and claim exactly once',()=>{
 let state=createHubMissionState(missions);
 const id='first_echo';
 state=startHubMission(state,id);
 assert.equal(state[id].status,'active');
 state=advanceHubMission(state,id,99);
 assert.equal(state[id].status,'completed');
 const completed=state[id].completedObjectives;
 state=advanceHubMission(state,id,1);
 assert.equal(state[id].completedObjectives,completed);
 state=claimHubMission(state,id);
 assert.equal(state[id].claimed,true);
 const once=state;
 state=claimHubMission(state,id);
 assert.deepEqual(state,once);
 assert.equal(hubMissionProgress(state).completed,1);
});
