import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_ORDERS,NATIONS,UNIT_TYPES} from '../src/games/power3b/constants.js';
import {SECTORS} from '../src/games/power3b/board.js';
import {createPowerGame,unitsIn,snapshotPowerGame,validatePowerSnapshot} from '../src/games/power3b/state.js';
import {queueMove,queueReinforcement,queueMegaMissile,resolveTurn} from '../src/games/power3b/engine.js';

test('Power 3B starts with eight nations, eight HQ flags and three combat domains',()=>{
 const g=createPowerGame({nation:0,seed:1});
 assert.equal(NATIONS.length,8);assert.equal(SECTORS.filter(s=>s.hq!==null).length,8);assert.equal(g.units.filter(u=>u.type==='flag').length,8);
 assert.deepEqual([UNIT_TYPES.infantry.move,UNIT_TYPES.infantry.strength],[2,2]);assert.deepEqual([UNIT_TYPES.tank.move,UNIT_TYPES.tank.strength],[3,3]);assert.deepEqual([UNIT_TYPES.fighter.move,UNIT_TYPES.fighter.strength],[5,5]);assert.deepEqual([UNIT_TYPES.destroyer.move,UNIT_TYPES.destroyer.strength],[1,10]);assert.deepEqual([UNIT_TYPES.regiment.move,UNIT_TYPES.regiment.strength],[2,20]);assert.deepEqual([UNIT_TYPES.heavyTank.move,UNIT_TYPES.heavyTank.strength],[3,30]);assert.deepEqual([UNIT_TYPES.bomber.move,UNIT_TYPES.bomber.strength],[5,25]);assert.deepEqual([UNIT_TYPES.cruiser.move,UNIT_TYPES.cruiser.strength],[1,50]);
});
test('planning is capped at five orders and a unit cannot receive two orders',()=>{
 const g=createPowerGame({nation:0,seed:2});g.nations[0].power=1000;g.nations[0].reserve.infantry=10;
 for(let i=0;i<MAX_ORDERS;i++)queueReinforcement(g,0,'infantry');
 assert.throws(()=>queueReinforcement(g,0,'infantry'),/5 ordres/);
 const h=createPowerGame({nation:0,seed:3}),u=h.units.find(x=>x.nation===0&&x.type==='infantry'&&x.sectorId==='hq0');u.sectorId='front0';
 queueMove(h,0,[u.id],'front1');assert.throws(()=>queueMove(h,0,[u.id],'hq1'),/un ordre/);
});
test('strongest force captures a contested sector and converts captured pieces into reserve',()=>{
 const g=createPowerGame({nation:0,seed:4}),target='front1';
 g.units=g.units.filter(u=>!(u.sectorId===target&&u.nation===1));const enemy=g.units.find(u=>u.nation===1&&u.type==='infantry'&&u.sectorId==='hq1');enemy.sectorId=target;
 const tank=g.units.find(u=>u.nation===0&&u.type==='tank'&&u.sectorId==='hq0');tank.sectorId='front0';const before=g.nations[0].reserve.infantry;
 queueMove(g,0,[tank.id],target);const out=resolveTurn(g,{ai:false});
 assert.equal(unitsIn(out,target,1).filter(u=>u.type!=='flag').length,0);assert.equal(out.owners[target],0);assert.ok(out.nations[0].reserve.infantry>before);
});
test('equal power sends moved attackers back to their origin',()=>{
 const g=createPowerGame({nation:0,seed:5}),target='front1';
 g.units=g.units.filter(u=>!(u.sectorId===target&&u.nation===1));const defender=g.units.find(u=>u.nation===1&&u.type==='infantry'&&u.sectorId==='hq1');defender.sectorId=target;
 const attacker=g.units.find(u=>u.nation===0&&u.type==='infantry'&&u.sectorId==='hq0');attacker.sectorId='front0';queueMove(g,0,[attacker.id],target);
 const out=resolveTurn(g,{ai:false});assert.equal(out.units.find(u=>u.id===attacker.id).sectorId,'front0');assert.ok(out.lastResolution.events.some(e=>e.type==='stalemate'));
});
test('Mega missile costs 100 Power, clears combat pieces and is consumed after one strike',()=>{
 const g=createPowerGame({nation:0,seed:6});g.nations[0].power=100;const target='hq1';assert.ok(unitsIn(g,target).some(u=>u.type!=='flag'));
 queueMegaMissile(g,0,target);const out=resolveTurn(g,{ai:false});assert.equal(out.nations[0].power,0);assert.equal(unitsIn(out,target).filter(u=>u.type!=='flag').length,0);assert.ok(out.lastResolution.events.some(e=>e.type==='mega'));
});
test('infantry capture of the final enemy flag ends the campaign',()=>{
 const g=createPowerGame({nation:0,seed:7});for(let n=2;n<8;n++){g.nations[n].active=false;g.units=g.units.filter(u=>u.nation!==n);}
 g.units=g.units.filter(u=>!(u.nation===1&&u.type!=='flag'));const infantry=g.units.find(u=>u.nation===0&&u.type==='infantry');infantry.sectorId='hq1';
 const out=resolveTurn(g,{ai:false});assert.equal(out.nations[1].active,false);assert.equal(out.nations[0].flagsCaptured,1);assert.equal(out.winner,0);
});
test('Power 3B save validation strips queued orders and rejects oversized or invalid envelopes',()=>{
 const g=createPowerGame({nation:3,seed:8});g.nations[3].power=222;const snap=snapshotPowerGame(g);snap.orders=[{type:'mega',nation:3,target:'hq0'}];
 const restored=validatePowerSnapshot(snap);assert.equal(restored.humanNation,3);assert.equal(restored.nations[3].power,222);assert.deepEqual(restored.orders,[]);
 assert.throws(()=>validatePowerSnapshot({version:9}),/invalide/);
});

test('Power is awarded separately from captures and is capped at three occupied opponent countries per round',()=>{
 const g=createPowerGame({nation:0,seed:9});
 for(let opponent=1;opponent<=4;opponent++){const u=g.units.find(x=>x.nation===0&&x.type==='infantry');g.units.push({...u,id:'x'+opponent,sectorId:'front'+opponent});}
 const out=resolveTurn(g,{ai:false});assert.equal(out.nations[0].power,3);assert.ok(out.lastResolution.events.some(e=>e.type==='power'));
});
