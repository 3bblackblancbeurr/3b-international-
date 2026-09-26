import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 SPORT_SOURCE_HEALTH_TTL_MS,
 nextHealthEntry,
 sourceHealthIsFresh,
 sourceIsWatchdogDisabled
} from '../src/sport/source-health.js';
import {SPORT_FINALS,mediaSources} from '../src/sport/media-catalog.js';

const page=fs.readFileSync(new URL('../src/sport/SportPage.jsx',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../.github/workflows/watch-sport-video-sources.yml',import.meta.url),'utf8');
const watcher=fs.readFileSync(new URL('../scripts/check-sport-video-sources.mjs',import.meta.url),'utf8');

test('watchdog needs two consecutive hard failures before disabling a source',()=>{
 const first=nextHealthEntry(null,'unavailable');
 assert.equal(first.disabled,false);
 assert.equal(first.strikes,1);
 const second=nextHealthEntry(first,'unavailable');
 assert.equal(second.disabled,true);
 assert.equal(second.strikes,2);
});

test('a confirmed recovery immediately re-enables a source',()=>{
 const recovered=nextHealthEntry({disabled:true,strikes:3,status:'unavailable'},'available');
 assert.deepEqual(recovered,{disabled:false,strikes:0,status:'available'});
});

test('unknown provider/network state never disables a healthy source',()=>{
 const previous={disabled:false,strikes:1,status:'unavailable'};
 assert.deepEqual(nextHealthEntry(previous,'unknown'),previous);
});

test('cached health manifests expire instead of permanently blacklisting a source',()=>{
 const now=Date.now();
 const fresh={version:1,updatedAt:new Date(now-1000).toISOString(),sources:{}};
 const stale={version:1,updatedAt:new Date(now-SPORT_SOURCE_HEALTH_TTL_MS-1000).toISOString(),sources:{}};
 assert.equal(sourceHealthIsFresh(fresh,now),true);
 assert.equal(sourceHealthIsFresh(stale,now),false);
});

test('disabled lookup uses video id, so shared official videos are replaced everywhere',()=>{
 const source={videoId:'GF-WteOINCc'};
 const manifest={version:1,updatedAt:new Date().toISOString(),sources:{'GF-WteOINCc':{disabled:true,strikes:2,status:'unavailable'}}};
 assert.equal(sourceIsWatchdogDisabled(manifest,source),true);
});

test('every final now has at least two official source choices',()=>{
 for(const final of SPORT_FINALS){
  assert.ok(mediaSources(final).length>=2,final.id+' must have a replacement source');
 }
});

test('Sport player fetches remote watchdog health and skips disabled sources without leaving 3B',()=>{
 assert.match(page,/SPORT_SOURCE_HEALTH_URL/);
 assert.match(page,/sourceIsWatchdogDisabled/);
 assert.match(page,/Watchdog 3B · source retirée remplacée automatiquement/);
 assert.match(page,/fetch\(SPORT_SOURCE_HEALTH_URL/);
 assert.doesNotMatch(page,/window\.open\(/);
});

test('watchdog updates only a data manifest and is prepared to publish it automatically',()=>{
 assert.match(watcher,/sport-source-health\.json/);
 assert.match(watcher,/nextHealthEntry/);
 assert.match(workflow,/contents: write/);
 assert.match(workflow,/git push origin HEAD:main/);
 assert.match(workflow,/chore\(sport\): update source health manifest/);
});
