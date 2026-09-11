import test from 'node:test';
import assert from 'node:assert/strict';
import {Maze,paths,lineOfSight,DIRS} from '../src/games/maze.js';
import {GAME_CATALOG,KEY_RACE_URL} from '../src/games/catalog.js';
import {createStepper} from '../src/games/runtime.js';

test('the library contains three embedded games and the original key race as an equal fourth card',()=>{
 assert.deepEqual(GAME_CATALOG.map(g=>g.id),['arena','tower','maze','key-race']);assert.equal(GAME_CATALOG[3].href,KEY_RACE_URL);
 assert.equal(KEY_RACE_URL,'https://troisb-course-des-cles-demo.stetienne86pp.chatgpt.site/');
});
test('200 ruins have distinct reachable supplies, three shrines, safe borders and alternate routes',()=>{
 for(let seed=1;seed<=200;seed++){
  const g=new Maze(seed),objects=[g.exit,...g.fragments,...g.lamps,...g.switches],route=paths(g.grid,g.cell);
  assert.equal(objects.length,11);assert.equal(new Set(objects.map(p=>p.y*g.cols+p.x)).size,11);
  for(const p of objects)assert.ok(route.dist[p.y*g.cols+p.x]>=0);
  assert.ok(g.grid[0].every(Boolean)&&g.grid.at(-1).every(Boolean)&&g.grid.every(row=>row[0]&&row.at(-1)));
  let edges=0;for(const at of route.q){const x=at%g.cols,y=Math.floor(at/g.cols);edges+=DIRS.filter(([dx,dy])=>g.grid[y+dy]?.[x+dx]===0).length;}
  assert.ok(edges/2>route.q.length,'cycles allow different return routes');assert.equal(g.visible.has(g.shadow.y*g.cols+g.shadow.x),false);
 }
});
test('walls and closed diagonal corners hide cells behind them',()=>{
 const grid=[[1,1,1,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[1,1,1,1,1]];
 assert.equal(lineOfSight(grid,{x:1,y:1},{x:3,y:1}),false);assert.equal(lineOfSight(grid,{x:1,y:1},{x:2,y:2}),false);
 assert.equal(lineOfSight(grid,{x:2,y:2},{x:3,y:3}),true);assert.equal(lineOfSight(grid,{x:1,y:1},{x:2,y:1}),true);
});
test('the exploration map freezes energy, AI, cooldowns and movement, then resumes',()=>{
 const g=new Maze(8);g.action();g.toggleMap();const before={time:g.time,cell:{...g.cell},lamp:g.lamp,shadow:{...g.shadow},cooldown:g.flashCooldown};
 for(let i=0;i<600;i++)g.update(1/60,{x:1});g.action();
 assert.deepEqual({time:g.time,cell:g.cell,lamp:g.lamp,shadow:g.shadow,cooldown:g.flashCooldown},before);
 g.toggleMap();g.update(1/60,{x:1});assert.equal(g.status,'playing');assert.ok(g.time>before.time);assert.ok(g.lamp<before.lamp);
});
test('light pulse has local range, an energy cost and a cooldown; its trail follows actual passages',()=>{
 const g=new Maze(2);g.action();assert.equal(g.lamp,198);assert.equal(g.shadowStun,0);assert.equal(g.echo.length,7);
 let previous=g.cell;for(const p of g.echo){assert.equal(g.grid[p.y][p.x],0);assert.equal(Math.abs(previous.x-p.x)+Math.abs(previous.y-p.y),1);previous=p;}
 g.action();assert.equal(g.lamp,198);g.flashCooldown=0;g.lamp=12;g.action();assert.equal(g.lamp,12);
 const near=new Maze(2);near.cell={x:25,y:16};near.action();assert.ok(near.shadowStun>0);assert.ok(paths(near.grid,near.cell).dist[near.shadow.y*near.cols+near.shadow.x]>=4);
});
test('the shadow pursues only on sight or sound, searches a last known position, then patrols',()=>{
 const g=new Maze(2);g.time=11;g.cell={x:25,y:17};g.updateShadow(.01);assert.equal(g.shadowMode,'hunt');assert.deepEqual(g.lastKnown,g.cell);
 g.cell={x:1,y:17};g.moving=false;g.shadowClock=0;g.updateShadow(.01);assert.equal(g.shadowMode,'search');assert.deepEqual(g.lastKnown,{x:25,y:17});
 g.shadowMemory=0;g.shadowClock=0;g.updateShadow(.01);assert.equal(g.shadowMode,'patrol');assert.equal(g.lastKnown,null);
});
test('the sanctuary is safe, a hit gives a real escape window, and three unrecovered hits are fatal',()=>{
 const g=new Maze(2);g.shadow={...g.cell};g.update(.01);assert.equal(g.player.hp,100);
 g.cell={x:25,y:15};g.shadow={...g.cell};g.update(.01);assert.equal(g.player.hp,66);assert.equal(g.status,'playing');
 g.shadow={...g.cell};g.update(.01);assert.equal(g.player.hp,66);
 g.invulnerable=0;g.update(.01);assert.equal(g.player.hp,32);
 g.invulnerable=0;g.shadow={...g.cell};g.update(.01);assert.equal(g.status,'ended');assert.equal(g.won,false);
});
test('seals replenish life and light once and all three are required at the portal',()=>{
 const g=new Maze(3);g.cell={...g.exit};g.update(.01);assert.equal(g.status,'playing');
 g.player.hp=32;g.lamp=50;g.cell={x:g.fragments[0].x,y:g.fragments[0].y};g.update(.01);assert.equal(g.player.hp,66);assert.ok(g.lamp>79);assert.equal(g.collected,1);
 const score=g.score;g.update(.01);assert.equal(g.score,score);assert.equal(g.collected,1);
});
test('switches open their marked wall exactly once, even while the pulse is recharging',()=>{
 const g=new Maze(31),sw=g.switches[0];g.cell={x:sw.x,y:sw.y};g.flashCooldown=7;const lamp=g.lamp;
 assert.equal(g.grid[sw.gate.y][sw.gate.x],1);g.action();assert.equal(g.grid[sw.gate.y][sw.gate.x],0);assert.equal(g.lamp,lamp);assert.equal(g.score,80);g.action();assert.equal(g.score,80);
});
test('complete seeded runs can collect every seal and return using normal moves and pulses',()=>{
 for(let seed=1;seed<=30;seed++){
  const g=new Maze(seed);let steps=0;
  while(g.status==='playing'&&steps++<35000){
   const goal=g.nearestGoal(),route=paths(g.grid,goal),at=route.parent[g.cell.y*g.cols+g.cell.x];
   const threat=paths(g.grid,g.cell).dist[g.shadow.y*g.cols+g.shadow.x];if(threat>=0&&threat<=5&&g.flashCooldown<=0)g.action();
   const next=at<0?g.cell:{x:at%g.cols,y:Math.floor(at/g.cols)};g.update(1/60,{x:next.x-g.cell.x,y:next.y-g.cell.y});
  }
  assert.equal(g.won,true,`seed ${seed}: ${g.message}`);assert.equal(g.collected,3);assert.ok(g.steps>60);assert.ok(g.lamp>0);
 }
});
test('maze travel is identical at 30, 60 and 144 Hz',()=>{
 const play=hz=>{const g=new Maze(23),stepper=createStepper();for(let i=0;i<hz*3;i++)stepper.advance(1/hz,dt=>g.update(dt,{x:g.time<.34?1:0,y:g.time>=.34?1:0}));return {cell:g.cell,time:g.time,lamp:g.lamp,steps:g.steps};};
 assert.deepEqual(play(30),play(60));assert.deepEqual(play(60),play(144));
});
