import {frontierState,masteryLevel} from './frontier.js';
import {CARDS,COUNTRIES,cardById,countryById,cardSlot,craftPrice} from './catalog.js';
import {blankAdventure,normalizeAdventure} from './adventure-state.js';
import {TRAVEL_GEAR} from './wardrobe.js';
import {obstacleDistance} from './collision.js';
import {CHAPTERS,chapterState,nexusLevel} from './chapters.js';
export const SAVE_VERSION=1;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const number=(v,max=1e7)=>Number.isFinite(v)?clamp(Math.floor(v),0,max):0;
export function blankSave(){return{version:SAVE_VERSION,xp:0,shards:25,collection:{C001:1,C357:1},leader:'C001',team:[],loadout:{energy:'C357',traps:[]},beacons:[],seals:[],visited:[],wins:0,walked:0,region:'hub',finalOpened:false,adventure:blankAdventure(),updatedAt:0};}
export function normalizeSave(input){
 const s=blankSave();if(!input||input.version!==SAVE_VERSION)return s;
 for(const key of ['xp','shards','wins','walked'])s[key]=number(input[key]);
 for(const [id,value] of Object.entries(input.collection||{}))if(cardById[id])s.collection[id]=clamp(number(value,100),1,100);
 s.leader=s.collection[input.leader]&&cardById[input.leader]?.character?input.leader:'C001';
 let neutrals=cardById[s.leader]?.country==='3b'?1:0;
 s.team=[...new Set(Array.isArray(input.team)?input.team:[])].filter(id=>{if(!s.collection[id]||!cardById[id]?.character||id===s.leader)return false;if(cardById[id].country==='3b'&&neutrals++>=1)return false;return true;}).slice(0,3);
 s.loadout={traps:[]};for(const slot of ['terrain','ambiance','fragment','pierre','support','energy']){const id=input.loadout?.[slot];if(s.collection[id]&&cardSlot(cardById[id])===slot)s.loadout[slot]=id;}
 s.loadout.traps=[...new Set(Array.isArray(input.loadout?.traps)?input.loadout.traps:[])].filter(id=>s.collection[id]&&cardSlot(cardById[id])==='trap').slice(0,3);
 s.beacons=[...new Set(Array.isArray(input.beacons)?input.beacons:[])].filter(id=>typeof id==='string'&&/^(france|italie|estonie|turquie|algerie|tunisie|maroc|espagne):[012]$/.test(id));
 for(const key of ['visited','seals'])s[key]=[...new Set(Array.isArray(input[key])?input[key]:[])].filter(id=>countryById[id]);
 s.region=countryById[input.region]?input.region:'hub';s.finalOpened=!!input.finalOpened&&s.seals.length>=5;s.adventure=normalizeAdventure(input.adventure);if(!s.collection[s.adventure.companion])s.adventure.companion=null;if(s.adventure.preparation&&chapterState(s,s.adventure.preparation).restored<2)s.adventure.preparation=null;s.updatedAt=number(input.updatedAt,1e15);return s;
}
export const levelFor=xp=>Math.min(50,1+Math.floor(Math.sqrt(Math.max(0,xp)/90)));
export const nextLevelXP=xp=>90*levelFor(xp)**2;
export function gain(save,delta){return normalizeSave({...save,...delta,updatedAt:Date.now()});}
const granted=(save,ids)=>({...save.collection,...Object.fromEntries(ids.filter(Boolean).map(id=>[id,save.collection[id]||1]))});
export function discover(save,region){const cards=CARDS.filter(c=>c.country===region&&['Passeport','Énergie'].includes(c.category));return gain(save,{region,visited:[...save.visited,region],collection:granted(save,cards.map(c=>c.id))});}
export function beacon(save,id){if(save.beacons.includes(id)||!/^(france|italie|estonie|turquie|algerie|tunisie|maroc|espagne):[012]$/.test(id))return save;const region=id.split(':')[0],index=Number(id.at(-1));const reward=CARDS.filter(c=>c.country===region&&c.category==='Fragment / Pierre')[index];return gain(save,{beacons:[...save.beacons,id],xp:save.xp+45,shards:save.shards+15,collection:granted(save,[reward?.id])});}
export function recruit(save,id){
 if(!cardById[id]?.character)return save;
 const fresh=!save.collection[id];
 return awardMissions(gain(save,{collection:{...save.collection,[id]:(save.collection[id]||0)+1},team:fresh&&id!==save.leader&&save.team.length<3?[...save.team,id]:save.team,xp:save.xp+(fresh?100:35),shards:save.shards+(fresh?25:12),wins:save.wins+1}));
}
export function seal(save,region){
 if(save.seals.includes(region))return gain(save,{xp:save.xp+35,shards:save.shards+10,wins:save.wins+1});
 const count=save.seals.length+1,neutral={1:'C161',3:'C162',5:'C163',8:'C164'}[count];
 const cards=CARDS.filter(c=>c.country===region&&['Carte unique','Porte'].includes(c.category));
 return awardMissions(gain(save,{collection:granted(save,[...cards.map(c=>c.id),neutral,...(count===5?['C365','C366','C367','C368']:[])]),seals:[...save.seals,region],xp:save.xp+250,shards:save.shards+100,wins:save.wins+1}));
}
export function awardMissions(save){
 const ids=[];for(const c of COUNTRIES){const owned=CARDS.filter(card=>card.country===c.id&&save.collection[card.id]);const checks=[owned.some(c=>cardSlot(c)==='fragment'),owned.filter(c=>c.character).length>=3,save.beacons.filter(id=>id.startsWith(c.id+':')).length===3,owned.some(c=>c.category==='Terrain')&&owned.some(c=>c.category==='Ambiance')];CARDS.filter(card=>card.country===c.id&&card.category==='Mission').forEach((card,i)=>{if(checks[i]&&!save.collection[card.id])ids.push(card.id);});}
 return ids.length?gain(save,{collection:granted(save,ids),xp:save.xp+ids.length*50,shards:save.shards+ids.length*20}):save;
}
export function craft(save,id){const c=cardById[id];if(!c||c.character||!cardSlot(c)||save.collection[id]||(!save.visited.includes(c.country)&&c.country!=='3b')||save.shards<craftPrice(c))return save;return awardMissions(gain(save,{shards:save.shards-craftPrice(c),collection:granted(save,[id])}));}
export function equip(save,id,asLeader=false){
 const c=cardById[id];if(!c||!save.collection[id])return save;
 if(c.character){
  if(asLeader)return gain(save,{leader:id,team:save.team.filter(x=>x!==id)});
  if(id===save.leader)return save;
  return gain(save,{team:save.team.includes(id)?save.team.filter(x=>x!==id):save.team.length<3?[...save.team,id]:save.team});
 }
 const slot=cardSlot(c);if(!slot)return save;
 if(slot==='trap'){const traps=save.loadout.traps;return gain(save,{loadout:{...save.loadout,traps:traps.includes(id)?traps.filter(x=>x!==id):traps.length<3?[...traps,id]:traps}});}
 return gain(save,{loadout:{...save.loadout,[slot]:save.loadout[slot]===id?undefined:id}});
}
export function teamStats(save){
 const cards=[save.leader,...save.team].map(id=>cardById[id]).filter(Boolean),roles=cards.map(c=>c.role),load=save.loadout,path=save.adventure.avatar?.created?save.adventure.avatar.path:null;
 const home=frontierState(save),mastery=Math.min(12,[save.leader,...save.team].reduce((sum,id)=>sum+masteryLevel(save.adventure.mastery?.[id]),0));
 return {health:100+home.camp*8+(TRAVEL_GEAR[save.adventure.avatar?.travelGear]?.health||0)+(path==='nature'?14:path==='tempete'?-8:0)+roles.filter(r=>r==='protecteur').length*12+(load.terrain?10:0)+(load.pierre?10:0),attack:Math.round(home.forge+mastery+(path==='tempete'?3:path==='ombre'?1:0)+(cardById[save.leader]?.attack||15)+roles.filter(r=>r==='assaillant').length*4+Math.min(8,levelFor(save.xp)-1)+(load.ambiance?3:0)+(load.fragment?3:0)),heal:(path==='lumiere'?3:0)+roles.filter(r=>r==='soigneur').length*4,speed:(roles.includes('éclaireur')?1.08:1)+(path==='ombre'?.05:0)+(TRAVEL_GEAR[save.adventure.avatar?.travelGear]?.speed||0),window:roles.includes('mystique')?.19:.14,affinity:cards.reduce((n,c)=>n+Math.min(3,Math.floor((save.collection[c.id]-1)/3)),0),traps:load.traps.length,support:!!load.support,energy:!!load.energy};
}
export function guardianReady(save,region){return save.beacons.filter(id=>id.startsWith(region+':')).length===3 && save.team.length>0;}
export function makeEncounter(card,save,boss=false){
 const stats=teamStats(save),difficulty=boss?save.seals.length:0;
 const max=boss?120+difficulty*12:64+Math.floor(card.health/5);
 return {card:card.id,boss,enemy:max,enemyMax:max,hp:stats.health,maxHP:stats.health,turn:0,focus:stats.energy?1:0,guarded:false,stats,traps:stats.traps,support:stats.support,result:null,log:boss?'Le gardien prépare son premier mouvement.':'Apaise cet écho pour proposer un pacte.',intent:'frappe'};
}
export function battleTurn(enc,action){
 if(enc.result||!['strike','guard','power','trap','support'].includes(action)||(action==='power'&&enc.focus<2)||(action==='trap'&&!enc.traps)||(action==='support'&&!enc.support))return enc;
 const e={...enc,turn:enc.turn+1},s=e.stats;
 let damage=action==='strike'?s.attack+s.affinity:action==='power'?(s.attack+s.affinity)*2+6:0;
 // A ritual leaves the guardian exposed; a charged piercing strike defeats a guard.
 if(e.intent==='rituel')damage=Math.round(damage*1.35);
 e.enemy=Math.max(0,e.enemy-damage);e.focus=action==='power'?0:Math.min(3,e.focus+1);
 if(action==='trap')e.traps--;if(action==='support'){e.support=false;e.hp=clamp(e.hp+24,0,e.maxHP);}
 if(e.enemy===0){e.result=e.boss?'victory':'calm';e.log=e.boss?'Le sceau répond à ta lumière.':'L’écho est apaisé. Le pacte peut commencer.';return e;}
 const incoming=e.intent==='percée'?28:e.intent==='rituel'?8:18;
 const hit=action==='trap'?0:action==='guard'?Math.round(incoming*(e.intent==='percée'?.7:.2)):incoming;
 e.hp=clamp(e.hp-hit+(action==='guard'?s.heal+8:0),0,e.maxHP);
 e.log=`${damage?damage+' dégâts infligés. ':''}${action==='guard'?'Garde : ':''}${hit} dégâts reçus${action==='guard'?' · +'+(s.heal+8)+' vitalité':''}.`;
 e.intent=['frappe','rituel','percée','frappe'][e.turn%4];
 if(e.hp===0){e.result='defeat';e.log='L’écho est trop fort. Reviens avec une autre équipe.';}return e;
}
export function moveWithCollision(position,dx,dz,obstacles,radius=76){
 const p={...position};
 for(const axis of ['x','z']){
  const next={...p,[axis]:p[axis]+(axis==='x'?dx:dz)};
  if(Math.hypot(next.x,next.z)>radius)continue;
  if(!obstacles.some(o=>obstacleDistance(next,o)<0.7))p[axis]=next[axis];
 }return p;
}
export function nearestInteraction(position,items){return items.filter(i=>distance(position,i)<(i.range||5.5)).sort((a,b)=>(b.type==='job')-(a.type==='job')||distance(position,a)-distance(position,b))[0]||null;}
export const countryCard=region=>CARDS.find(c=>c.country===region&&c.character);
export function encounterCards(region,save){const available=CARDS.filter(c=>c.country===region&&c.category==='Personnage classique'&&(c.rarity==='Commun'||save.beacons.filter(id=>id.startsWith(region+':')).length>=2));return [...available.filter(c=>!save.collection[c.id]),...available.filter(c=>save.collection[c.id])];}
export function worldItems(region,save){
 if(region==='hub')return [...COUNTRIES.map(c=>({id:c.id,type:'portal',name:c.name,x:c.portal[0],z:c.portal[1],color:c.color,range:6})),{id:'final',type:'final',name:save.adventure?.finished?'L’Union retrouvée':`L’Oubli · ${nexusLevel(save)}/8 pays`,x:0,z:-3,color:'#e4cd94',range:5}];
 const c=countryById[region],cards=encounterCards(region,save);
 return [{id:'hub',type:'portal',name:'Place des huit portes',x:0,z:20,color:'#e9d59e',range:6},{id:region+':story',type:'story',name:CHAPTERS[region].resident.split(',')[0]+' · '+CHAPTERS[region].title,x:11,z:-4,color:c.color,range:6,done:chapterState(save,region).restored===3},
 ...[[-20,0],[18,-16],[-8,-39]].map(([x,z],i)=>({id:region+':'+i,type:'beacon',name:save.beacons.includes(region+':'+i)?'Souvenir retrouvé':'Éveiller le souvenir',x,z,color:c.color,done:save.beacons.includes(region+':'+i)})),
 ...[[-9,5],[27,7],[-32,-20],[9,-31]].map(([x,z],i)=>{const card=cards[i%cards.length];return{id:region+':echo:'+i,type:'echo',name:card.name,card:card.id,x,z,color:c.color};}),
 {id:region+':guardian',type:'guardian',name:save.seals.includes(region)?'Défier à nouveau le gardien':'Gardien du sceau',card:CARDS.find(c=>c.country===region&&c.category==='Carte unique').id,x:0,z:-57,color:c.color,range:7}];
}
