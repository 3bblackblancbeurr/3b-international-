import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS,ROOM_SHELVES,POINTS,WORLDS,SPAWNS,objective} from '../src/world/origins/data.js';
import {blank,act} from '../src/world/origins/state.js';
import {clear,move,route,distance} from '../src/world/origins/space.js';

test('Origins navigation: visible shelves block walking while the Archives side aisles remain open',()=>{
 const flags={trial:true};
 for(const shelf of ROOM_SHELVES){
  assert.equal(clear(shelf,'france',flags),false,shelf.id+' must be solid');
  const room=ROOMS.find(room=>room.id===shelf.room),direction=Math.sign(shelf.x-room.x);
  const stopped=move({x:room.x,z:shelf.z},direction*room.w,0,'france',flags);
  assert.ok(direction*(stopped.x-shelf.x)<-shelf.w/2,shelf.id+' cannot be crossed');
 }
 for(const x of [-9,9]){
  const start={x,z:-60},end=move(start,0,-11,'france',flags);
  assert.ok(clear(start,'france',flags));
  assert.ok(distance(end,{x,z:-71})<.01,'the visible aisle must not contain an invisible shelf');
 }
});

test('Origins navigation: all three furnished rooms keep their quest points reachable through the door',()=>{
 for(const id of ['atelier','refuge','echo','echo2','fragment']){
  const target=POINTS[id],flags={trial:true};let position={...SPAWNS.france};
  const path=route(position,target,'france',flags);assert.ok(path.length,id+' needs a route');
  for(const waypoint of path){
   for(let i=0;i<2000&&distance(position,waypoint)>.04;i++){
    const length=distance(position,waypoint),step=Math.min(.12,length);
    position=move(position,(waypoint.x-position.x)/length*step,(waypoint.z-position.z)/length*step,'france',flags);
    assert.ok(clear(position,'france',flags),id+' must remain outside furniture');
   }
  }
  assert.ok(distance(position,target)<.1,id+' must actually arrive');
 }
});

test('Origins navigation: an early return to the Sanctuary directs every unfinished chapter back to France',()=>{
 const stages=['awakened','met','scent','trace','guardian','trial','echo','echo2','defeated'];
 const current=blank();current.zone='france';
 for(const flag of stages){
  current.flags[flag]=true;
  const returned=act(current,'arrival',{position:POINTS.arrival}).save;
  assert.equal(returned.zone,'sanctuary');
  const next=objective(returned);assert.equal(next.target,'france','return after '+flag);
  const portal=WORLDS.find(world=>world.id===next.target);
  assert.ok(route(returned.position,portal,returned.zone,returned.flags).length,'the suggested portal must be reachable');
 }
});

test('Origins navigation: bringing Justice home still targets the Circle, then France remains available',()=>{
 const current=blank();current.flags={awakened:true,met:true,scent:true,trace:true,guardian:true,trial:true,echo:true,echo2:true,defeated:true,justice:true};
 assert.equal(objective(current).target,'circle');
 const completed=act(current,'circle',{position:POINTS.circle}).save;
 assert.equal(completed.flags.returned,true);assert.equal(objective(completed).target,'france');
 completed.zone='france';assert.equal(objective(completed).target,'resident');
 assert.equal(objective(blank()).target,'circle');
});
