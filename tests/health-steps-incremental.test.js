import test from 'node:test';
import assert from 'node:assert/strict';
import { blankHealth, mergeRecentNativeSteps, mergeNativeSteps, effectiveSteps } from '../src/health/model.js';

const now=new Date('2026-10-16T12:30:00+02:00');
const today='2026-10-16',yesterday='2026-10-15';
const sync=now.toISOString();

test('incremental Health Connect reading updates today without losing yesterday or manually tracked non-step values',()=>{
  const initial=mergeNativeSteps({...blankHealth(),days:{[today]:{water:4},[yesterday]:{sleepHours:8}}},{
    source:'health-connect',syncedAt:sync,days:[{date:yesterday,steps:4567},{date:today,steps:2010}]
  },now);
  const merged=mergeRecentNativeSteps(initial,{source:'health-connect',syncedAt:sync,days:[{date:today,steps:2354}]},now);
  assert.equal(merged.days[today].nativeSteps.steps,2354);
  assert.equal(merged.days[yesterday].nativeSteps.steps,4567);
  assert.equal(merged.days[today].water,4);
  assert.equal(merged.days[yesterday].sleepHours,8);
  assert.equal(merged.nativeEnabled,true);
});

test('a missing measurement stays unknown instead of becoming zero on a later poll',()=>{
  const initial=mergeNativeSteps(blankHealth(),{source:'health-connect',syncedAt:sync,days:[{date:today,steps:812}]},now);
  const updated=mergeRecentNativeSteps(initial,{source:'health-connect',syncedAt:sync,days:[{date:today,steps:null}]},now);
  assert.equal(updated.days[today].nativeSteps,null);
  assert.equal(effectiveSteps(updated.days[today]).value,null);
  assert.equal(mergeRecentNativeSteps(blankHealth(),{source:'apple-health',syncedAt:sync,days:[{date:today,steps:0}]},now).days[today].nativeSteps.steps,0);
});

test('a polling response cannot import future dates, foreign sources or forged empty snapshots',()=>{
  const initial=blankHealth();
  for(const input of [
    {source:'foreign',syncedAt:sync,days:[{date:today,steps:10}]},
    {source:'health-connect',syncedAt:'not a date',days:[{date:today,steps:10}]},
    {source:'health-connect',syncedAt:sync,days:[{date:'2026-10-17',steps:10}]},
    {source:'health-connect',syncedAt:sync,days:[]},
    {source:'health-connect',syncedAt:sync,days:'invalid'}
  ])assert.throws(()=>mergeRecentNativeSteps(initial,input,now));
});
