import {validOriginsRun} from './origins/level.js';
export const DOOR_CHAPTERS=['Le premier seuil','Les salles du silence','Le pacte de bronze','Les archives nocturnes','Le cœur des engrenages','Les sentinelles oubliées','La galerie des serments','Les dernières braises','Le palais sans nom','La Porte interdite'];
export const DOOR_RUNES=[{id:'sun',name:'Soleil'},{id:'moon',name:'Lune'},{id:'star',name:'Étoile'},{id:'flame',name:'Flamme'},{id:'leaf',name:'Feuille'}];
export const DOOR_PERKS=[{at:10,title:'Souffle du voyageur',text:'+10 de vitalité maximale'},{at:25,title:'Lame de lumière',text:'+2 dégâts avec Frapper'},{at:50,title:'Esprit du veilleur',text:'+1 concentration maximale'},{at:75,title:'Dernière réserve',text:'Un deuxième élixir à chaque niveau'}];
export const freshDoorCampaign=()=>({version:1,selected:1,completed:[],best:{},run:null});
export const doorUnlocked=c=>Math.min(100,c.completed.length+1);
export function doorPerks(c){const n=c.completed.length;return {hp:n>=10?110:100,attack:n>=25?2:0,focus:n>=50?6:5,elixirs:n>=75?2:1};}
export function doorDifficulty(level){
 const n=Math.max(1,Math.min(100,Math.floor(Number(level)||1))),t=(n-1)/99,chapter=Math.floor((n-1)/10);
 return {level:n,chapter,title:DOOR_CHAPTERS[chapter],seed:0x3bd00+n*3571,rooms:n>=61?5:n>=26?4:3,boss:n%10===0,enemyHp:38+Math.round(t*40),damage:9+Math.round(t*10),runes:n>=61?5:n>=21?4:3,lockRounds:n>=61?4:n>=21?3:2,lockSpeed:.38+t*.32,lockWidth:.3-t*.14,errorDamage:6+Math.round(t*7),label:['Initiation','Accessible','Éveillé','Vigilant','Confirmé','Avancé','Expert','Redoutable','Maître','Légendaire'][chapter]};
}
export function readDoorCampaign(value){
 const out=freshDoorCampaign();if(value==null)return out;
 const invalid=()=>{throw Error('Progression de La Porte interdite invalide.');};
 if(value.version!==1||!Array.isArray(value.completed)||!value.best||typeof value.best!=='object'||Array.isArray(value.best)||value.completed.length>100)invalid();
 const levels=[...new Set(value.completed)].sort((a,b)=>a-b);
 if(levels.some((n,i)=>!Number.isInteger(n)||n!==i+1||n>100))invalid();out.completed=levels;
 for(const n of levels){const b=value.best[n];if(!b||!Number.isInteger(b.stars)||b.stars<1||b.stars>3||!Number.isFinite(b.score)||b.score<0||b.score>1e7||!Number.isFinite(b.time)||b.time<=0||b.time>86400)invalid();out.best[n]={stars:b.stars,score:Math.round(b.score),time:b.time};}
 out.selected=Math.max(1,Math.min(doorUnlocked(out),Number.isInteger(value.selected)?value.selected:1));
 if(value.run){const r=value.run,d=doorDifficulty(r.level),p=doorPerks(out);
  if(!Number.isInteger(r.level)||r.level!==out.selected||!['doors','resolved','gate'].includes(r.room))invalid();
  for(const [key,max]of Object.entries({passed:d.rooms,hp:p.hp,focus:p.focus,elixirs:p.elixirs,bonusAttack:d.rooms*2,score:1e7,mistakes:10000,usedElixirs:p.elixirs}))if(!Number.isInteger(r[key])||r[key]<0||r[key]>max)invalid();
  if(r.hp<1||r.elixirs+r.usedElixirs!==p.elixirs||!Number.isFinite(r.time)||r.time<0||r.time>86400||typeof r.rewardChosen!=='boolean'||(r.room==='doors'&&r.passed>=d.rooms)||(r.room==='gate'&&r.passed!==d.rooms)||(r.room==='resolved'&&r.passed<1))invalid();
  out.run=Object.fromEntries(['level','room','passed','hp','focus','elixirs','bonusAttack','score','mistakes','usedElixirs','time','rewardChosen'].map(k=>[k,r[k]]));
 }
 if(Object.hasOwn(value,'originsRun')){out.originsRun=null;if(value.originsRun){const r=value.originsRun,p=doorPerks(out);if(!validOriginsRun(r,doorUnlocked(out))||r.level!==out.selected||r.hp>p.hp||r.energy>p.focus*20||r.elixirs+r.usedElixirs!==p.elixirs)invalid();out.originsRun=Object.fromEntries(['version','level','zone','hp','energy','fragments','score','hits','falls','elixirs','usedElixirs','time','defeated','activated','opened','picked','moved'].map(k=>[k,structuredClone(r[k])]));}}
 return out;
}
export function completeDoorLevel(campaign,level,{score,time,mistakes,usedElixirs}){
 const out=readDoorCampaign({...campaign,run:null});if(!Number.isInteger(level)||level<1||level>doorUnlocked(out))return{campaign:out,first:false,stars:0};
 const stars=1+(mistakes===0?1:0)+(usedElixirs===0?1:0),old=out.best[level],first=!out.completed.includes(level);
 if(first)out.completed.push(level);out.best[level]={stars:Math.max(old?.stars||0,stars),score:Math.max(old?.score||0,score),time:Math.min(old?.time||Infinity,Math.max(.01,time))};
 out.selected=first?doorUnlocked(out):level;return{campaign:out,first,stars};
}
