import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSION_PHASES,createHubMissionState,startHubMission,advanceHubMission,
  failHubMission,resumeHubMission,claimHubMission,hubMissionPhase,normalizeHubMissionRow,
} from '../src/world/hub/mission-runtime.js';

const mission={id:'justice_chain',objectiveCount:3};

test('mission state machine covers start, objectives, failure, success and reward claim',()=>{
  let state=createHubMissionState([mission]);
  assert.equal(state.justice_chain.phase,'AVAILABLE');
  state=startHubMission(state,'justice_chain');
  assert.equal(state.justice_chain.phase,'ACTIVE');

  state=advanceHubMission(state,'justice_chain',1,{checkpoint:'indice',branch:'preuve',consequence:'temoin_ecoute'});
  assert.equal(state.justice_chain.phase,'OBJECTIVE_2');
  assert.equal(state.justice_chain.checkpoint,'indice');
  assert.equal(state.justice_chain.branch,'preuve');
  assert.deepEqual(state.justice_chain.consequences,['temoin_ecoute']);

  state=failHubMission(state,'justice_chain',{checkpoint:'epreuve'});
  assert.equal(state.justice_chain.phase,'FAILED');
  assert.equal(state.justice_chain.failedAttempts,1);
  state=resumeHubMission(state,'justice_chain');
  assert.equal(state.justice_chain.phase,'OBJECTIVE_2');

  state=advanceHubMission(state,'justice_chain',2);
  assert.equal(state.justice_chain.status,'completed');
  assert.equal(state.justice_chain.phase,'SUCCESS');
  assert.equal(hubMissionPhase(state.justice_chain),'SUCCESS');

  state=claimHubMission(state,'justice_chain');
  assert.equal(state.justice_chain.phase,'COMPLETED');
  assert.equal(state.justice_chain.claimed,true);
});

test('mission normalization exposes locked and reward phases safely',()=>{
  const locked=normalizeHubMissionRow(mission,{},true);
  assert.equal(locked.phase,'LOCKED');
  const reward=normalizeHubMissionRow(mission,{status:'completed',completedObjectives:3,phase:'REWARD'});
  assert.equal(reward.phase,'REWARD');
  assert.equal(hubMissionPhase(reward),'REWARD');
  for(const phase of ['LOCKED','AVAILABLE','ACTIVE','SUCCESS','FAILED','REWARD','COMPLETED'])assert.ok(MISSION_PHASES.includes(phase));
});
