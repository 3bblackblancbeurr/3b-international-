import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRelay,switchRelay,relayConnected,mechanismFor} from '../src/world/hub/mechanism.js';
test('every authored relay and frequency circuit starts incomplete and has a reachable solution',()=>{
 for(const [mission,prefix,count] of [['blue_blackout','relay',3],['eight_signals','frequency',8]])for(let i=1;i<=count;i++){
  const {board,sequence}=initialRelay(mission+':'+prefix+':'+i);assert.equal(relayConnected(board),false);
  let solved=board;for(const contact of [...sequence].reverse())solved=switchRelay(solved,contact);assert.equal(relayConnected(solved),true);
 }
});
test('contacts affect only direct neighbours, can be undone and reject invalid input',()=>{
 const board=Array(9).fill(false);assert.deepEqual(switchRelay(board,0),[true,true,false,true,false,false,false,false,false]);assert.deepEqual(switchRelay(switchRelay(board,4),4),board);assert.equal(switchRelay(board,9),board);assert.equal(switchRelay(board,-1),board);assert.equal(relayConnected(Array(9).fill(1)),false);
});
test('mechanisms apply only to authored hub stages, preserving transport and combat flows',()=>{
 assert.equal(mechanismFor({type:'hubMissionAction',missionId:'blue_blackout',actionId:'relay:1'}),'relay');assert.equal(mechanismFor({type:'hubMissionAction',missionId:'eight_signals',actionId:'frequency:8'}),'frequency');
 for(const item of [{type:'hubMissionAction',missionId:'blue_blackout',actionId:'datacenter:defend'},{type:'portal'},{type:'jobAction',missionId:'eight_signals',actionId:'frequency:1'}])assert.equal(mechanismFor(item),null);
});
