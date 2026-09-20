import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

function base(){
 return {
  region:'hub',
  visited:[],
  beacons:[],
  hub:{events:[],secrets:[],missions:{
   first_echo:{claimed:false},
   first_steps:{claimed:false},
  }},
  adventure:{discoveries:[],encounter:null},
 };
}

test('global World rewards are derived only from validated state transitions',()=>{
 let before=base(),after=structuredClone(before);
 after.visited=['france'];
 assert.deepEqual(worldGlobalRewardIntents(before,after,{type:'visit',region:'france'}),[
  {rewardCode:'country_entry',eventId:'country:france',source:'world'}
 ]);

 before=base();after=structuredClone(before);after.beacons=['france:0'];
 assert.deepEqual(worldGlobalRewardIntents(before,after,{type:'beacon',id:'france:0'}),[
  {rewardCode:'world_memory',eventId:'memory:france:0',source:'world'}
 ]);

 before=base();after=structuredClone(before);after.hub.secrets=['secret_last_train'];
 assert.deepEqual(worldGlobalRewardIntents(before,after,{type:'hubSecretUnlock',id:'secret_last_train'}),[
  {rewardCode:'world_secret',eventId:'hub_secret:secret_last_train',source:'hub'}
 ]);
});

test('Hub mission importance selects main versus side reward class',()=>{
 let before=base(),after=structuredClone(before);
 after.hub.missions.first_echo.claimed=true;
 assert.equal(worldGlobalRewardIntents(before,after,{type:'hubMissionClaim',id:'first_echo'})[0].rewardCode,'mission_main');

 before=base();after=structuredClone(before);
 after.hub.missions.first_steps.claimed=true;
 assert.equal(worldGlobalRewardIntents(before,after,{type:'hubMissionClaim',id:'first_steps'})[0].rewardCode,'mission_side');
});

test('guardian and finale produce stable one-time event identifiers',()=>{
 let before=base(),after=structuredClone(before);
 before.adventure.encounter={boss:true,final:false,patrol:false,region:'france',result:null};
 after.adventure.encounter={...before.adventure.encounter,result:'victory',rewarded:true};
 assert.deepEqual(worldGlobalRewardIntents(before,after,{type:'battle'}),[
  {rewardCode:'guardian',eventId:'guardian:france',source:'world'}
 ]);

 before=base();after=structuredClone(before);
 before.adventure.encounter={boss:true,final:true,patrol:false,region:'france',result:null};
 after.adventure.encounter={...before.adventure.encounter,result:'victory',rewarded:true};
 assert.deepEqual(worldGlobalRewardIntents(before,after,{type:'field'}),[
  {rewardCode:'world_final',eventId:'final:union-v1',source:'world'}
 ]);
});

test('world-engine uses transactional outbox, not direct client reward amounts',()=>{
 const source=read('../supabase/functions/world-engine/index.ts');
 assert.match(source,/worldGlobalRewardIntents/);
 assert.match(source,/world_commit_v2/);
 assert.match(source,/threeb_process_reward_outbox_server/);
 assert.doesNotMatch(source,/give_me_\d+/);
});

test('member snapshot exposes authoritative economy progression',()=>{
 const hub=read('../supabase/functions/member-hub/index.ts');
 const context=read('../src/loyalty/LoyaltyContext.jsx');
 const account=read('../src/loyalty/AccountPage.jsx');
 assert.match(hub,/threeb_progress_snapshot_server/);
 assert.match(context,/economy:owned\?\.economy\|\|null/);
 assert.match(account,/NIVEAU GLOBAL/);
 assert.match(account,/global_level/);
 assert.match(account,/next_level_xp/);
 assert.match(account,/COINS 3B/);
});

test('client no longer advertises a hard-coded game reward rate',()=>{
 const source=read('../src/loyalty/useGameRewards.js');
 assert.doesNotMatch(source,/20 XP et 1 point par minute/);
 assert.match(source,/gains calculés, plafonnés et validés par le serveur/);
});
