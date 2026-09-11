import test from 'node:test';
import assert from 'node:assert/strict';
import {Maze,paths} from '../src/games/maze.js';
import {createMazeMotion,stepMazeMotion,mazePose} from '../src/games/maze-motion.js';
import {freshMazeCampaign,readMazeCampaign,unlockedMazeLevel,completeMazeLevel,mazeDifficulty,mazePerk} from '../src/games/maze-campaign.js';
import {freshProgress,validateProgress} from '../src/games/save.js';
import {solveMaze} from './maze-helpers.js';

test('walking maintains constant speed across tile centres and stops immediately on release',()=>{
 const grid=Array.from({length:7},()=>Array(9).fill(0)),m=createMazeMotion({x:1,y:3}),distances=[];
 for(let n=0;n<60;n++){const old=m.position.x;stepMazeMotion(m,grid,{x:1},1/60);distances.push(m.position.x-old);}
 assert.ok(distances.every(d=>Math.abs(d-5.7/60)<1e-8));const stopped={...m.position},phase=m.phase;
 for(let n=0;n<30;n++)stepMazeMotion(m,grid,{},1/60);assert.deepEqual(m.position,stopped);assert.equal(m.phase,phase);assert.equal(mazePose(m).frame,0);
});
test('turns stay on the corridor path and reversing midway responds immediately',()=>{
 const grid=[[1,1,1,1,1],[1,0,0,1,1],[1,1,0,1,1],[1,1,0,0,1],[1,1,1,1,1]],m=createMazeMotion({x:1,y:1});
 stepMazeMotion(m,grid,{x:1},.06);const x=m.position.x;stepMazeMotion(m,grid,{x:-1},.02);assert.ok(m.position.x<x);
 for(let n=0;n<8;n++)stepMazeMotion(m,grid,{x:1},1/60);
 for(let n=0;n<25;n++){stepMazeMotion(m,grid,{y:1},1/60);assert.ok(m.position.y===1||Math.abs(m.position.x-2)<1e-7);assert.equal(grid[Math.round(m.position.y)][Math.round(m.position.x)],0);}
});
test('north, east, south and west select different views, retained when standing still',()=>{
 const grid=Array.from({length:15},()=>Array(15).fill(0));
 for(const[direction,input]of [[0,{y:-1}],[2,{x:1}],[4,{y:1}],[6,{x:-1}]]){const m=createMazeMotion({x:7,y:7});for(let i=0;i<20;i++)stepMazeMotion(m,grid,input,1/60);assert.equal(mazePose(m).direction,direction);assert.ok(mazePose(m).frame>0);for(let i=0;i<20;i++)stepMazeMotion(m,grid,{},1/60);assert.equal(mazePose(m).direction,direction);assert.equal(mazePose(m).frame,0);}
});
test('render interpolation fills the gap between fixed simulation steps without changing the simulation',()=>{
 const m=createMazeMotion({x:3,y:3}),grid=Array.from({length:7},()=>Array(7).fill(0));stepMazeMotion(m,grid,{x:1},1/60);
 const before=structuredClone(m),poses=[0,.25,.5,.75,1].map(a=>mazePose(m,a));assert.ok(poses.every((p,i)=>!i||p.x>poses[i-1].x));assert.deepEqual(m,before);
});
test('all 100 levels have distinct layouts, reachable objectives and steadily increasing threats',()=>{
 const layouts=new Set();let previous;
 for(let level=1;level<=100;level++){
  const g=new Maze(undefined,null,level),d=g.difficulty,route=paths(g.grid,g.cell);layouts.add(JSON.stringify(g.grid));
  for(const p of [g.exit,...g.fragments,...g.lamps,...g.switches])assert.ok(route.dist[p.y*g.cols+p.x]>=0,level+' reachable');
  if(previous){assert.ok(d.light<=previous.light&&d.drain>=previous.drain&&d.hunt<=previous.hunt&&d.sight>=previous.sight&&d.vision<=previous.vision);}
  previous=d;
 }
 assert.equal(layouts.size,100);assert.equal(mazeDifficulty(999).level,100);assert.equal(mazeDifficulty(-5).level,1);
});
test('first clears unlock one level, replays only improve stars and records, and perks do not stack twice',()=>{
 let campaign=freshMazeCampaign();assert.equal(unlockedMazeLevel(campaign),1);
 assert.equal(completeMazeLevel(campaign,2,{score:1,time:30,hits:0}).first,false);
 for(let n=1;n<=10;n++)campaign=completeMazeLevel(campaign,n,{score:100,time:40,hits:2}).campaign;
 assert.equal(unlockedMazeLevel(campaign),11);assert.equal(mazePerk(campaign).light,5);
 const replay=completeMazeLevel(campaign,3,{score:200,time:25,hits:0});assert.equal(replay.first,false);assert.equal(replay.campaign.completed.length,10);assert.equal(replay.campaign.best[3].stars,3);assert.equal(mazePerk(replay.campaign).light,5);
 const save=freshProgress();save.maze=replay.campaign;assert.deepEqual(validateProgress(save),save);assert.throws(()=>readMazeCampaign({...campaign,completed:[1,3]}));assert.throws(()=>readMazeCampaign({...campaign,completed:[101]}));
});
test('the complete campaign can be won in order, reloaded and finished at exactly level 100',()=>{
 let campaign=freshMazeCampaign();
 for(let level=1;level<=100;level++){
  const g=new Maze(undefined,campaign,level);solveMaze(g);assert.equal(g.won,true,`Level ${level}: ${g.message}; ${g.collected} seals`);
  campaign=readMazeCampaign(g.snapshot());assert.equal(campaign.completed.length,level);assert.equal(unlockedMazeLevel(campaign),Math.min(100,level+1));
 }
 assert.equal(campaign.selected,100);assert.equal(mazePerk(campaign).light,20);assert.equal(new Maze(undefined,campaign).stageNumber,100);
});
