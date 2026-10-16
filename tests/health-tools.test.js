import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { blankHealth, effectiveSteps, historyValue, mergeNativeSteps, normalizeHealth, recordMobility, withoutNativeSteps } from '../src/health/model.js';
import { normalizeReminders, reminderCalendar, validReminderTime } from '../src/health/reminders.js';
const now=new Date('2026-10-15T12:00:00Z'),date='2026-10-15',stamp=now.toISOString();

test('old journals keep non-step values while retired manual steps are cleared',()=>{
  const result=normalizeHealth({version:1,days:{[date]:{steps:2100,sleepHours:7.5}},favorites:['pomme']},now);
  assert.equal(result.nativeEnabled,false);assert.equal(result.days[date].steps,null);assert.equal(result.days[date].sleepHours,7.5);assert.equal(result.days[date].energy,null);assert.deepEqual(result.days[date].routines,[]);assert.deepEqual(result.favorites,['pomme']);
});
test('energy and routine inputs reject invalid scores and unknown routine IDs',()=>{
  for(const energy of [0,6,1.5,'4',true,[],NaN])assert.equal(normalizeHealth({...blankHealth(),days:{[date]:{energy}}},now).days[date].energy,null);
  const day=normalizeHealth({...blankHealth(),days:{[date]:{energy:4,routines:['wake-move','wake-move','bad',null,'rest-care']}}},now).days[date];assert.equal(day.energy,4);assert.deepEqual(day.routines,['wake-move','rest-care']);
});
test('native totals are the only step source and disconnect leaves no fallback count',()=>{
  const data={...blankHealth(),days:{[date]:{steps:1200,estimatedSteps:40},'2026-10-14':{nativeSteps:{steps:999,source:'apple-health',syncedAt:stamp}}}};
  const result=mergeNativeSteps(data,{source:'health-connect',syncedAt:stamp,days:[{date,steps:1000},{date:'2026-10-14',steps:null}]},now);
  assert.equal(effectiveSteps(result.days[date]).value,1000);assert.equal(result.days[date].steps,null);assert.equal(result.days[date].estimatedSteps,null);assert.equal(result.days['2026-10-14'].nativeSteps,null);assert.equal(result.nativeEnabled,true);
  const cleared=withoutNativeSteps(result);assert.equal(effectiveSteps(cleared.days[date]).value,null);assert.equal(cleared.nativeEnabled,false);
});
test('missing native data is not zero; real zero is retained and foreign sources are rejected',()=>{
  for(const steps of [null,undefined,'5',false,-1,1.5,Infinity]){const result=mergeNativeSteps(blankHealth(),{source:'apple-health',syncedAt:stamp,days:[{date,steps}]},now);assert.equal(effectiveSteps(result.days[date]).value,null);}
  const result=mergeNativeSteps(blankHealth(),{source:'apple-health',syncedAt:stamp,days:[{date,steps:0},{date:'2026-10-16',steps:999},{date:'2026-01-01',steps:999}]},now);assert.equal(effectiveSteps(result.days[date]).value,0);assert.equal(Object.keys(result.days).length,1);
  assert.throws(()=>mergeNativeSteps(blankHealth(),{source:'fake',syncedAt:stamp,days:[]},now));assert.throws(()=>mergeNativeSteps(blankHealth(),{source:'apple-health',syncedAt:'invalid',days:[]},now));
});
test('one completed session records once and stays separate from manual activity',()=>{
  const data={...blankHealth(),days:{[date]:{activeMinutes:20}}},session={id:'seated',minutes:2.5,completedAt:stamp};
  const first=recordMobility(data,session,now),second=recordMobility(first,session,now);assert.equal(second.days[date].mobility.length,1);assert.equal(second.days[date].activeMinutes,20);assert.equal(historyValue(second.days[date],'mobility'),2.5);
  assert.deepEqual(recordMobility(data,{...session,minutes:-1},now),data);assert.equal(historyValue({},'mobility'),null);assert.equal(historyValue({},'energy'),null);
});
test('reminders validate hours and IDs without exposing caller content',()=>{
  for(const time of ['24:00','12:60','9:00','08:30\r\nSUMMARY:private',null])assert.equal(validReminderTime(time),false);
  const values=normalizeReminders([{id:'wake',time:'08:00',title:'medical private'},{id:'wake',time:'09:00'},{id:'invalid',time:'12:00'}]);assert.equal(values.length,1);assert.ok(!JSON.stringify(values).includes('medical private'));
});
test('calendar export has real daily events, a 30-day limit, and no personal health information',()=>{
  const calendar=reminderCalendar([{id:'wake',time:'08:00'}],new Date(2026,9,15,12));assert.match(calendar,/BEGIN:VCALENDAR\r\n/);assert.match(calendar,/RRULE:FREQ=DAILY;COUNT=30/);assert.match(calendar,/BEGIN:VALARM/);assert.match(calendar,/DTSTART:20261016T080000/);assert.match(calendar,/TRANSP:TRANSPARENT/);assert.ok(calendar.endsWith('\r\n'));assert.throws(()=>reminderCalendar([],now));
});
test('calendar uses wall-clock recurrence across Paris daylight saving and starts after now',()=>{
  const url=new URL('../src/health/reminders.js',import.meta.url).href;
  const result=execFileSync(process.execPath,['--input-type=module','-e',`import {reminderCalendar} from ${JSON.stringify(url)}; console.log(reminderCalendar([{id:'rest',time:'08:00'}],new Date('2026-10-24T20:00:00Z')));`],{encoding:'utf8',env:{...process.env,TZ:'Europe/Paris'}});
  assert.match(result,/DTSTART:20261025T080000\r?\n/);assert.doesNotMatch(result,/DTSTART:.*Z/);
});
