import {styleFor,styleAttack,tickWeaponState,defenseOutcome} from './weapon-styles.js';
import {weaponAction,weaponDefense} from '../arsenal.js';
import {encounterProfile} from './encounters.js';
import {distance,move,lineClear} from './space.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ACTIONS={light:{duration:.38,impact:.13,damage:13,range:2.9,cost:7},heavy:{duration:.88,impact:.38,damage:32,range:3.5,cost:27},circle:{duration:1.1,impact:.3,damage:24,range:7,cost:0}};
export function actionCost(kind,avatar,xp,equipment){const a=ACTIONS[kind];return a?Math.max(0,weaponAction(a,avatar,xp).cost-(kind==='heavy'&&equipment==='artisan'?7:0)):0;}
export function createCombat(arena,zone='france'){const c= {hp:100,stamina:100,energy:60,time:0,attack:null,dodge:0,dodgeCooldown:0,combo:0,comboAt:-10,hitId:0,event:null,enemy:{x:0,z:-66,hp:130,maxHp:130,state:'patrol',timer:0,interruptCooldown:0,phase:1,pattern:0,aim:{x:0,z:-66},heading:0}};c.profile=encounterProfile(zone);c.enemy.hp=c.enemy.maxHp=c.profile.hp;c.enemy.name=c.profile.name;c.enemy.strikes=0;if(arena){c.arena=arena;c.enemy.x=arena.x;c.enemy.z=arena.z;c.enemy.aim={x:arena.x,z:arena.z};}return c;}
export function command(c,kind,player,equipment){
 if(c.hp<=0)return false;
 if(kind==='guard'){if(!styleFor(c.loadout)||c.detached>0||c.recalling>0||c.attack||c.dodge>0||c.stamina<12)return false;if(c.guard>0){c.guard=0;return true;}c.stamina-=12;c.guard=2;c.guardAge=0;return true;}
 if(kind==='circle'&&c.loadout?.weapon==='scissors'){if(c.attack||c.dodge>0||c.recalling>0)return false;if(c.detached>0){c.detached=0;c.recalling=.3;}else{if(c.energy<20)return false;c.energy-=20;c.detached=4;}c.guard=0;c.event={id:++c.hitId,type:'split',...player};return true;}
 if(kind==='circle'&&c.loadout?.weapon==='zellige'){if(c.attack||c.dodge>0||c.energy<40)return false;c.energy-=40;c.guard=3;c.guardAge=.3;c.event={id:++c.hitId,type:'guard',...player};return true;}
 if(kind==='dodge'){if(c.stamina<24||c.dodgeCooldown>0)return false;c.guard=0;c.stamina-=24;c.dodge=.34;c.dodgeDirection=null;c.dodgeCooldown=.7;c.attack=null;c.event={id:++c.hitId,type:'dodge',...player};return true;}
 const a=ACTIONS[kind]&&styleAttack(weaponAction(ACTIONS[kind],c.loadout,c.xp),kind,c.loadout,c),cost=actionCost(kind,c.loadout,c.xp,equipment);if(!a||c.recalling>0||c.attack||c.dodge>0||c.stamina<cost||kind==='circle'&&c.energy<40)return false;
 c.guard=0;c.stamina-=cost;if(kind==='circle')c.energy-=40;
 c.attack={kind,definition:a,elapsed:0,hit:false};c.event={id:++c.hitId,type:kind,...player};return true;
}
export function stepCombat(c,dt,player,heading,flags,zone='france'){
 dt=clamp(dt,0,.05);tickWeaponState(c,dt);c.time+=dt;c.counterWindow=Math.max(0,(c.counterWindow||0)-dt);c.companionGuard=Math.max(0,(c.companionGuard||0)-dt);c.companionSlow=Math.max(0,(c.companionSlow||0)-dt);c.dodge=Math.max(0,c.dodge-dt);c.dodgeCooldown=Math.max(0,c.dodgeCooldown-dt);c.stamina=Math.min(100,c.stamina+dt*(c.attack?6:19));c.energy=Math.min(100,c.energy+dt*2);
 const profile=c.profile||encounterProfile(zone),e=c.enemy,center=c.arena||{x:0,z:-66};const active=flags.echo&&flags.echo2&&!flags.defeated;e.interruptCooldown=Math.max(0,(e.interruptCooldown||0)-dt);
 if(c.attack){const a=c.attack,def=a.definition||ACTIONS[a.kind];a.elapsed+=dt;
  if(!a.hit&&a.elapsed>=def.impact){a.hit=true;const d=distance(player,e),angle=Math.atan2(e.x-player.x,e.z-player.z),arc=Math.cos(angle-heading);
   if(active&&e.hp>0&&d<=def.range&&arc>(def.arc??(a.kind==='circle'?-1:.05))&&lineClear(player,e,zone,flags)){
    c.combo=c.time-c.comboAt<1.4?c.combo+1:1;c.comboAt=c.time;const close=def.minRange&&d<def.minRange?def.closeMultiplier:1;const counter=c.counterWindow>0&&a.kind!=='circle',bonus=(c.combo%3===0?1.35:1)*(counter?1.25:1);if(counter)c.counterWindow=0;
    e.hp=Math.max(0,e.hp-def.damage*bonus*close);c.energy=Math.min(100,c.energy+11);
    if(!e.hp)e.state='defeated';
    else if(a.kind==='heavy'&&e.interruptCooldown===0){e.state='stagger';e.timer=.55;e.interruptCooldown=2.8;}
    const push=a.kind==='heavy'?1.2:.28,next=move(e,Math.sin(heading)*push,Math.cos(heading)*push,zone,flags,.4);e.x=next.x;e.z=next.z;
    c.event={id:++c.hitId,type:e.hp?'impact':'defeat',kind:a.kind,x:e.x,z:e.z,damage:Math.round(def.damage*bonus*close)};
   }else c.event={id:++c.hitId,type:'miss',kind:a.kind,...player};
  }if(a.elapsed>=def.duration)c.attack=null;
 }
 if(!active||!e.hp||c.hp<=0)return;
 e.phase=e.hp<e.maxHp*.48?2:1;e.timer-=dt;const d=distance(player,e);
 if(['recover','stagger'].includes(e.state)){if(e.timer<=0)e.state='chase';return;}
 if(e.state==='windup'){
  if(e.timer<=0){const radius=e.pattern%2?4.4:3.5,angle=Math.atan2(player.x-e.x,player.z-e.z),within=e.pattern%2?distance(player,e.aim)<radius:d<radius&&Math.cos(angle-e.heading)>.20;
   if(within&&c.dodge<=0&&lineClear(e,player,zone,flags)){const defended=defenseOutcome(c,heading,player,e,!!(e.pattern%2)),damage=Math.round((profile.damage+(e.phase===2?7:0))*(1-weaponDefense(c.loadout))*(1-defended.reduction)*(c.companionGuard>0?.6:1));c.companionGuard=0;c.hp=Math.max(0,c.hp-damage);c.combo=0;c.event={id:++c.hitId,type:defended.blocked?'blocked':defended.broken?'guardBreak':'hurt',...player,damage};}
   else c.event={id:++c.hitId,type:within&&c.dodge>0?'perfect':'enemyMiss',x:e.x,z:e.z};
   if(within&&c.dodge>0){c.energy=Math.min(100,c.energy+12);c.counterWindow=1.2;}e.state='recover';e.timer=profile.recovery*(e.phase===2?.7:1);
  }return;
 }
 if(d<8.5&&lineClear(e,player,zone,flags))e.state='chase';
 if(d>15){e.state='patrol';e.timer=0;}
 let target=e.state==='patrol'?{x:center.x+Math.sin(c.time*.3)*5,z:center.z+Math.cos(c.time*.3)*3}:player;
 // Enter the player's quick-strike range before winding up. Staying at 3.8 m
 // made all stationary melee responses miss while the enemy could still hit.
 if(e.state==='chase'&&d<2.7){e.state='windup';e.pattern=profile.patterns[e.strikes++%profile.patterns.length];e.timer=profile.windup*(e.phase===2?.75:1);e.windupDuration=e.timer;e.aim={...player};e.heading=Math.atan2(player.x-e.x,player.z-e.z);return;}
 const length=Math.max(.01,distance(e,target)),speed=e.state==='patrol'?1.2:profile.speed*(e.phase===2?1.25:1)*(c.companionSlow>0?.65:1);
 const next=move(e,(target.x-e.x)/length*speed*dt,(target.z-e.z)/length*speed*dt,zone,flags,.4);e.heading=Math.atan2(next.x-e.x,next.z-e.z);e.x=clamp(next.x,center.x-11,center.x+11);e.z=clamp(next.z,center.z-10,center.z+10);
}
