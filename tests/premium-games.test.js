import test from 'node:test';
import assert from 'node:assert/strict';
import {createStepper,actionState} from '../src/games/runtime.js';
import {Arena} from '../src/games/arena.js';
import {Tower,ROOMS} from '../src/games/tower.js';
import {Cities} from '../src/games/cities.js';
import {Refuge} from '../src/games/refuge.js';
import {Maze} from '../src/games/maze.js';
import {freshProgress,validateProgress} from '../src/games/save.js';

test('fixed simulation produces the same run at 30, 60 and 144 Hz',()=>{
 const play=hz=>{const g=new Arena(182);const stepper=createStepper();for(let frame=0;frame<hz*8;frame++)stepper.advance(1/hz,dt=>g.update(dt,{x:Math.sin(g.time),y:Math.cos(g.time)}));return{player:g.player,time:g.time,kills:g.kills,enemies:g.enemies};};
 assert.deepEqual(play(30),play(60));assert.deepEqual(play(60),play(144));
});
test('a suspended frame has bounded catch-up and reset discards elapsed fractions',()=>{
 const stepper=createStepper();let time=0;assert.equal(stepper.advance(90,dt=>{time+=dt;}),12);assert.ok(time<=.201);stepper.advance(.01,()=>{});stepper.reset();assert.equal(stepper.advance(.01,()=>{}),0);
});
test('dash follows the last movement direction even after releasing movement',()=>{
 const g=new Arena(8);g.spawnClock=100;g.update(.02,{x:0,y:-1});const start=g.player.y;g.action();for(let n=0;n<10;n++)g.update(.016,{});assert.ok(start-g.player.y>85);assert.ok(g.trail.length>0);assert.ok(actionState(g,'arena').remaining>0);
});
test('a perfect guard creates one counterattack, an early guard does not',()=>{
 const g=new Tower(9);g.doors=[ROOMS[2]];g.door(0);g.enemy.windup=.2;g.guard();g.update(.21);assert.equal(g.perfects,1);assert.ok(g.counter>0);const hp=g.enemy.hp;g.attack();assert.equal(hp-g.enemy.hp,24);assert.equal(g.counter,0);
 const early=new Tower(9);early.doors=[ROOMS[2]];early.door(0);early.enemy.windup=.7;early.guard();early.update(.71);assert.equal(early.player.hp,100);assert.equal(early.perfects,0);assert.equal(early.counter,0);
});
test('maze switch remains usable during flash cooldown and the map tracks explored ground',()=>{
 const g=new Maze(7);g.flashCooldown=10;assert.ok(actionState(g,'maze').remaining>0);g.cell={...g.switches[0]};assert.equal(actionState(g,'maze').remaining,0);g.action();assert.equal(g.switches[0].used,true);assert.ok(g.explored>0&&g.explored<100);
});
test('refuge ignores invalid builds and turrets prioritize threats to the gate within range',()=>{
 const g=new Refuge(null,1);const old=g.wood;g.build('anything');assert.equal(g.wood,old);assert.equal(g.homes,1);
 g.enemies=[{x:315,y:110,hp:100},{x:450,y:340,hp:100},{x:900,y:620,hp:100}];g.shoot({x:315,y:220},22,true);assert.equal(g.bullets.length,1);assert.ok(g.bullets[0].vx>0&&g.bullets[0].vy>0);
});
test('city hint previews matching connections without placing a tile; undo restores the selection',()=>{
 const g=new Cities(null,12);g.select(1);g.hint();assert.equal(g.turn,0);assert.equal(g.preview().connected,true);const before={hand:structuredClone(g.hand),rot:g.rot,selected:g.selected};g.confirm();assert.equal(g.turn,1);g.undo();assert.deepEqual(g.hand,before.hand);assert.equal(g.rot,before.rot);assert.equal(g.selected,before.selected);assert.equal(g.turn,0);
});
test('city hands offer needed buildings and legacy save format round trips',()=>{
 const g=new Cities(null,3);assert.ok(g.hand.some(t=>t.type==='house'));g.board[1]={type:'house',rot:0};g.board[2]={type:'house',rot:0};g.board[3]={type:'house',rot:0};g.board[4]={type:'house',rot:0};assert.ok(g.newHand().some(t=>t.type==='garden'));
 const save=freshProgress();save.cities=g.snapshot();save.refuge=new Refuge(null,3).snapshot();assert.deepEqual(validateProgress(save),save);
});

test('all eight cities can actually meet all objectives through branching roads and normal placements',()=>{
 const g=new Cities(null,32);
 const place=(type,x,y)=>{g.select(g.hand.findIndex(t=>t.type===type));if(type==='road'){while(g.hand[g.selected].shape!=='junction')g.cycleRoad();}g.place(x,y);};
 for(let country=0;country<8;country++){
  g.changeCountry(country);
  for(const y of [2,1,0,4,5,6])place('road',3,y);
  for(const y of [2,1,0,4])place('house',4,y);
  for(const y of [5,6])place('garden',4,y);
  place('monument',2,3);
  assert.equal(g.restored,true,'restore '+g.country);assert.equal(g.houses,4);assert.equal(g.gardens,2);assert.equal(g.monuments,1);
 }
 assert.equal(g.completed.length,8);const save=freshProgress();save.cities=g.snapshot();assert.deepEqual(validateProgress(save),save);
});
