import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena} from '../src/games/arena.js';
import {Tower,ROOMS} from '../src/games/tower.js';
import {Maze,paths} from '../src/games/maze.js';
import {Refuge} from '../src/games/refuge.js';
import {Cities,connectedTiles,edges} from '../src/games/cities.js';
import {freshProgress,validateProgress,recordGame} from '../src/games/save.js';

test('arena: remaining stationary is dangerous and the simulation freezes after defeat',()=>{
 for(let seed=1;seed<=10;seed++){const g=new Arena(seed);for(let i=0;i<3000&&g.status!=='ended';i++){g.update(.025,{});if(g.status==='upgrade')g.choose(g.choices[0].id);}assert.equal(g.status,'ended');assert.equal(g.won,false);assert.ok(g.time<60);const time=g.time;g.update(10,{x:1});assert.equal(g.time,time);}
});
test('arena: three upgrade choices pause time, apply only offered powers, and resume',()=>{
 const g=new Arena(4);g.xp=100;g.update(.02);assert.equal(g.status,'upgrade');assert.equal(new Set(g.choices.map(p=>p.id)).size,3);const t=g.time;g.update(1);assert.equal(g.time,t);g.choose('unknown');assert.equal(g.status,'upgrade');const id=g.choices[0].id;g.choose(id);assert.equal(g.powers[id],1);assert.equal(g.status,'playing');
});
test('arena: dash cooldown prevents repeated invulnerability and all eight guardians count once',()=>{
 const g=new Arena(7);g.action();const inv=g.invulnerable;g.update(.1);g.action();assert.ok(g.invulnerable<inv);g.enemies=[];for(let i=0;i<8;i++){g.spawn(true);g.enemies.at(-1).hp=0;g.update(.01);}assert.equal(g.guardians,8);assert.equal(g.won,true);assert.equal(g.status,'ended');
});
test('tower: the same door cannot award twice; leaving banks the current loot',()=>{
 const g=new Tower(3);g.doors=[ROOMS[0]];g.door(0);const loot=g.loot;g.door(0);assert.equal(g.loot,loot);g.bank();assert.equal(g.won,true);assert.ok(g.score>=loot);g.next();assert.equal(g.floor,1);
});
test('tower: timed blocks prevent damage and combat cannot be bypassed by banking',()=>{
 const g=new Tower(1);g.doors=[ROOMS[2]];g.door(0);g.bank();assert.equal(g.status,'playing');g.enemy.windup=.25;g.guard();g.update(.3);assert.equal(g.player.hp,100);g.enemy.windup=.2;g.block=0;g.update(.3);assert.ok(g.player.hp<100);for(let i=0;i<1000&&g.room==='combat';i++){g.attack();if(g.enemy.windup<.5)g.guard();g.update(.02);}assert.equal(g.room,'resolved');g.next();assert.equal(g.floor,2);
});
test('tower: fatal traps salvage only a quarter of unbanked loot',()=>{
 const g=new Tower(1);g.loot=100;g.player.hp=1;g.doors=[ROOMS[1]];g.door(0);assert.equal(g.won,false);assert.equal(g.score,28);
});
test('maze: 200 seeded maps preserve access to all objectives and opening walls never disconnects them',()=>{
 let previous='';for(let seed=1;seed<=200;seed++){const g=new Maze(seed);const now=JSON.stringify(g.grid);assert.notEqual(now,previous);previous=now;const objectives=[g.exit,...g.fragments,...g.switches,...g.lamps];let route=paths(g.grid,g.cell);for(const p of objectives)assert.ok(route.dist[p.y*g.cols+p.x]>=0);for(const sw of g.switches){g.cell={x:sw.x,y:sw.y};g.action();}route=paths(g.grid,{x:1,y:1});for(const p of objectives)assert.ok(route.dist[p.y*g.cols+p.x]>=0);assert.equal(g.switches.filter(s=>s.used).length,2);}
});
test('maze: walls block movement, a fragment cannot be counted twice, and all three unlock victory',()=>{
 const g=new Maze(8);g.update(.14,{x:-1,y:0});assert.equal(g.cell.x,1);g.shadow={x:23,y:15};g.flash=30;for(const f of g.fragments){g.cell={x:f.x,y:f.y};g.update(.02);g.update(.02);}assert.equal(g.collected,3);g.cell={...g.exit};g.update(.02);assert.equal(g.won,true);
});
test('maze: depleted lamp and contact with the shadow end the run',()=>{
 const a=new Maze(2);a.lamp=.01;a.update(.02);assert.equal(a.won,false);const b=new Maze(2);b.shadow={...b.cell};b.update(.02);assert.equal(b.won,false);
});
test('refuge: gathering, construction costs, repair, and rescue respect resources and proximity',()=>{
 const g=new Refuge(null,5);g.player={...g.player,x:140,y:130};g.action();assert.equal(g.wood,45);g.build('turret');assert.equal(g.turrets,1);assert.equal(g.wood,0);g.build('home');assert.equal(g.homes,1);g.wood=10;g.gate=50;g.player.x=450;g.player.y=360;g.interact=0;g.action();assert.equal(g.gate,70);assert.equal(g.wood,5);g.startNight();g.player.x=g.resident.x;g.player.y=g.resident.y;g.interact=0;g.action();assert.equal(g.people,3);assert.equal(g.resident,null);
});
test('refuge: day/night transition, resumed timers and defeat preserve constructed buildings',()=>{
 const g=new Refuge(null,7);g.phaseTime=149.99;g.update(.02);assert.equal(g.phase,'night');g.phaseTime=149.99;g.enemies=[];g.spawnClock=10;g.update(.02);assert.equal(g.day,2);assert.equal(g.phase,'day');g.turrets=2;g.homes=2;const saved=g.snapshot(),restored=new Refuge(saved,7);assert.deepEqual(restored.snapshot(),saved);g.gate=0;g.phase='night';g.update(.02);assert.equal(g.won,false);const again=new Refuge(g.snapshot(),8);assert.equal(again.turrets,2);assert.equal(again.phase,'day');assert.equal(again.gate,100);
});
test('cities: detached placements rejected; rotation, undo and country snapshots preserve work',()=>{
 const g=new Cities(null,4);g.place(0,0);assert.equal(g.turn,0);g.action();assert.equal(g.rot,1);g.place(3,2);assert.equal(g.turn,1);assert.equal(g.board[17].rot,1);g.changeCountry(1);g.place(3,2);g.changeCountry(0);assert.equal(g.board[17].rot,1);const saved=g.snapshot();assert.deepEqual(new Cities(saved).snapshot(),saved);const n=new Cities(null,5);n.place(3,2);n.undo();assert.equal(n.board[17],null);assert.equal(n.turn,0);
});
test('cities: only matching road ends connect, disconnected houses grant no points',()=>{
 const board=Array(49).fill(null);board[24]={type:'monument',rot:0};board[17]={type:'road',shape:'straight',rot:1};board[10]={type:'house',rot:0};assert.equal(connectedTiles(board).includes(10),false);board[17].rot=0;assert.equal(connectedTiles(board).includes(10),true);assert.deepEqual(edges({type:'road',shape:'corner',rot:3}),[3,0]);
});
test('save data: refuge and cities round-trip; corrupt imported structures are rejected',()=>{
 const p=freshProgress();p.refuge=new Refuge(null,4).snapshot();p.cities=new Cities(null,4).snapshot();assert.deepEqual(validateProgress(p),p);assert.throws(()=>validateProgress({version:0,records:{}}));const bad=structuredClone(p);bad.cities.world[0].board[1]={type:'script',rot:0};assert.throws(()=>validateProgress(bad));const broken=structuredClone(p);broken.refuge.player.x='no';assert.throws(()=>validateProgress(broken));
});
test('records keep the best score and correctly count victories',()=>{
 let p=freshProgress();p=recordGame(p,'arena',{score:100,won:true,guardians:2});p=recordGame(p,'arena',{score:30,won:false,guardians:1});assert.equal(p.records.arena.best,100);assert.equal(p.records.arena.plays,2);assert.equal(p.records.arena.wins,1);assert.equal(p.records.arena.guardians,2);
});
