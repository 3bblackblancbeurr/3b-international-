import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blank,act,normalize,persist,load,storageKey} from '../src/world/origins/state.js';
import {SPAWNS,POINTS,QUESTS,WORLDS,SCALE} from '../src/world/origins/data.js';
import {clear,move,route,distance,ground} from '../src/world/origins/space.js';
import {createCompanion,commandWolf,updateWolf} from '../src/world/origins/companion.js';
import {createCombat,command,stepCombat} from '../src/world/origins/combat.js';

test('Origins: the Justice sequence requires position, memory and the wolf; rewards happen once',()=>{
 let s=blank();const call=(id,context={})=>{const point=POINTS[id]||{x:0,z:-29};s=act(s,id,{position:point,...context}).save;};
 call('france');assert.equal(s.zone,'sanctuary');call('circle');call('france');assert.equal(s.zone,'france');
 call('fragment');assert.equal(s.flags.justice,undefined);call('resident');call('trace',{vision:true});assert.equal(s.flags.trace,undefined);
 call('wolf',{position:POINTS.trace,wolfAtTarget:true});call('trace',{vision:true});assert.equal(s.flags.trace,true);assert.equal(s.xp,40);
 call('trial',{wolfOnSeal:true});assert.equal(s.flags.trial,undefined);call('guardian');call('trial');assert.equal(s.flags.trial,undefined);call('trial',{wolfOnSeal:true});assert.equal(s.flags.trial,true);
 call('echo');assert.equal(s.flags.echo,undefined);call('echo',{vision:true});call('echo2',{vision:true});call('defeated',{combatVictory:true});call('fragment');assert.equal(s.flags.justice,true);
 call('arrival');call('circle');assert.equal(s.flags.returned,true);assert.equal(s.xp,220);s=normalize(JSON.parse(JSON.stringify(s)));for(let i=0;i<3;i++)call('circle');assert.equal(s.xp,220);assert.deepEqual(s.rewards,['justice-01','justice-02','justice-03']);
});
test('Origins: side quests restore a garden and reward equipment or a high passage memory only once',()=>{
 let s=blank();s.zone='france';const call=(id,extra={})=>{s=act(s,id,{position:POINTS[id],...extra}).save;};call('flower');assert.ok(!s.flags.seeds);call('atelier');call('flower');call('atelier');call('atelier');assert.equal(s.xp,30);assert.equal(s.equipment,'artisan');
 call('refuge');call('memory');assert.ok(!s.flags.memory);call('memory',{vision:true});assert.equal(s.flags.memory,true);call('refuge');call('refuge');assert.equal(s.xp,65);
});
test('Origins: versioned saves recover unsafe positions and never touch previous adventure or commerce keys',()=>{
 const data=new Map([['3b-world','legacy-data']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};const s=blank();s.zone='france';s.position={x:999,z:NaN};s.flags.justice=true;s.flags.returned=true;s.settings.zoom=11;s.settings.follow=false;s.equipment='artisan';
 assert.ok(persist(storage,'test-user',s));const restored=load(storage,'test-user');assert.deepEqual(restored.position,SPAWNS.france);assert.ok(restored.flags.justice);assert.equal(restored.settings.zoom,11);assert.equal(restored.settings.follow,false);assert.equal(restored.equipment,'artisan');assert.equal(data.get('3b-world'),'legacy-data');assert.equal(data.size,2);assert.notEqual(storageKey('test-user'),storageKey('guest'));assert.equal(load({getItem:()=>'{invalid'},null).zone,'sanctuary');
});
test('Origins: every quest destination has a physically continuous route, including interiors and elevated passage',()=>{
 for(const zone of ['sanctuary','france'])assert.ok(clear(SPAWNS[zone],zone,{}));
 for(const [id,p] of Object.entries(POINTS)){
  let target={...p};if(['circle','guardian','resident','atelier','refuge'].includes(id))target.z+=2;if(id==='secret')target.x+=1.1;
  const path=route(SPAWNS[p.zone],target,p.zone,{trial:true});assert.ok(path.length,id+' has no route');let pos={...SPAWNS[p.zone]};
  for(const point of path){for(let i=0;i<2000&&distance(pos,point)>.04;i++){const d=distance(pos,point),step=Math.min(.12,d);pos=move(pos,(point.x-pos.x)/d*step,(point.z-pos.z)/d*step,p.zone,{trial:true});assert.ok(clear(pos,p.zone,{trial:true}),id+' crossed an obstacle');}}
  assert.ok(distance(pos,target)<.1,id+' did not arrive');
 }
 assert.equal(ground(POINTS.memory,'france'),2.4);assert.ok(SCALE.door>SCALE.human*1.4);
});
test('Origins: locked archive rejects walking through its door and sprint cannot tunnel through buildings',()=>{
 const start={x:0,z:-53},locked=move(start,0,-8,'france',{}),open=move(start,0,-8,'france',{trial:true});assert.ok(locked.z> -54.5);assert.ok(open.z< -60);
 const house=move({x:19,z:25},0,-15,'france',{});assert.ok(house.z>19);assert.ok(clear(house,'france',{}));
});
test('Origins: wolf reaches a trial seal through the same navigation and waits there',()=>{
 const s=blank();s.zone='france';s.flags={met:true,trace:true,guardian:true};const player={x:0,z:-44},w=createCompanion(player);commandWolf(w,player,s);assert.equal(w.mode,'hold');for(let i=0;i<600;i++){updateWolf(w,.05,player,s,Math.PI);assert.ok(clear(w.position,s.zone,s.flags,.2));}assert.ok(w.arrived);assert.ok(distance(w.position,POINTS.seal)<.7);s.flags.trial=true;updateWolf(w,.05,{x:4,z:-46},s,Math.PI);assert.equal(w.mode,'follow');
});
test('Origins: a stranded wolf recovers near the player instead of travelling to the zone spawn',()=>{
 const s=blank();s.zone='france';s.flags.trial=true;
 const player={x:3,z:-60},w=createCompanion(player);w.position={x:19,z:15};
 let recovered=false;for(let i=0;i<125;i++){updateWolf(w,.05,player,s,Math.PI);recovered ||= w.teleported;}
 assert.ok(recovered);assert.ok(distance(w.position,player)<3);assert.ok(clear(w.position,s.zone,s.flags,.28));
 // The desired shoulder falls inside the archive side wall here.
 const edge={x:12,z:-58};w.position={x:10,z:-58};for(let i=0;i<100;i++)updateWolf(w,.05,edge,s,-Math.PI/2);
 assert.ok(distance(w.position,edge)<4);
});
test('Origins: an older tab cannot erase completed quests or grant the same reward twice',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},older=blank(),newer=blank();
 newer.flags.trace=true;newer.rewards=['justice-01'];persist(storage,'player',newer);persist(storage,'player',older);
 const restored=load(storage,'player');assert.ok(restored.flags.trace);assert.equal(restored.xp,40);assert.equal(restored.rewards.length,1);
});
test('Origins: attacks have a windup, stamina cost, range and directional impacts; dodge avoids telegraphed damage',()=>{
 const c=createCombat(),p={x:0,z:-63.7},flags={trial:true,echo:true,echo2:true};assert.ok(command(c,'heavy',p,'heritage'));assert.equal(c.stamina,73);assert.equal(command(c,'light',p),false);
 for(let i=0;i<6;i++)stepCombat(c,.05,p,Math.PI,flags);assert.equal(c.enemy.hp,130);for(let i=0;i<3;i++)stepCombat(c,.05,p,Math.PI,flags);assert.equal(c.enemy.hp,98);
 const safe=createCombat();safe.enemy.state='windup';safe.enemy.timer=.1;safe.enemy.pattern=1;safe.enemy.aim={...p};assert.ok(command(safe,'dodge',p));for(let i=0;i<3;i++)stepCombat(safe,.05,p,0,flags);assert.equal(safe.hp,100);assert.ok(safe.energy>60);
 const far=createCombat();command(far,'light',{x:0,z:25});for(let i=0;i<10;i++)stepCombat(far,.05,{x:0,z:25},0,flags);assert.equal(far.enemy.hp,130);
});
test('Origins: the main threat changes attacks and can be defeated without farming HP',()=>{
 const c=createCombat(),f={trial:true,echo:true,echo2:true};let hits=0;
 for(let i=0;i<1400&&c.enemy.hp>0;i++){const e=c.enemy,p={x:e.x,z:e.z+2.6};if(e.state==='windup'&&e.timer<.23)command(c,'dodge',p);else if(!c.attack&&c.dodge<=0){if(command(c,c.energy>40?'circle':c.stamina>35?'heavy':'light',p))hits++;}stepCombat(c,.05,p,Math.PI,f);}
 assert.equal(c.enemy.hp,0);assert.ok(c.hp>0);assert.ok(hits<18);
});
test('Origins: rapid attacks cannot cancel every enemy telegraph',()=>{
 const c=createCombat(),p={x:0,z:-63.4},flags={trial:true,echo:true,echo2:true};
 for(let i=0;i<500&&c.enemy.hp>0&&c.hp>0;i++){command(c,'light',p);stepCombat(c,.05,p,Math.PI,flags);}
 assert.ok(c.hp<100,'mashing quick strike must leave enemy attack opportunities');
 const heavy=createCombat();heavy.enemy.state='windup';heavy.enemy.timer=.8;command(heavy,'heavy',p);
 for(let i=0;i<8;i++)stepCombat(heavy,.05,p,Math.PI,flags);
 assert.equal(heavy.enemy.state,'stagger');assert.ok(heavy.enemy.interruptCooldown>2);
});
test('Origins: wolf GLB contains real animation tracks and a bounded, original mesh',()=>{
 const b=fs.readFileSync(new URL('../public/world/origins/wolf.glb',import.meta.url));assert.ok(b.length<2_000_000);const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert.ok(j.meshes.length>15);for(const name of ['Idle','Walk','Run','Sniff','Wait'])assert.ok(j.animations.find(a=>a.name===name)?.channels.length>=3,name);assert.equal(WORLDS.length,8);assert.equal(WORLDS.filter(w=>w.available).length,8);assert.equal(QUESTS.filter(q=>q.kind==='main').length,3);
});
