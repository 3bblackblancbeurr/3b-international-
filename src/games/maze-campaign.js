export const MAZE_LEVELS=100;
export const MAZE_CHAPTERS=['L’éveil','Les galeries d’ambre','Le cloître oublié','Les archives bleues','Les jardins secrets','La cité silencieuse','Les chambres de cendre','Le passage des ombres','Le cœur de l’Oubli','La dernière lumière'];
export const MAZE_MILESTONES=[
 {clears:10,title:'Lanterne renforcée',light:5,recharge:.25},
 {clears:25,title:'Éclat maîtrisé',light:10,recharge:.5},
 {clears:50,title:'Veilleur des ruines',light:15,recharge:.75},
 {clears:75,title:'Gardien de lumière',light:20,recharge:1},
];
export const freshMazeCampaign=()=>({version:1,selected:1,completed:[],best:{}});
export function readMazeCampaign(value){
 const out=freshMazeCampaign();if(value==null)return out;
 if(value.version!==1||!Array.isArray(value.completed)||typeof value.best!=='object'||!value.best||Array.isArray(value.best))throw Error('Progression du Labyrinthe invalide.');
 if(value.completed.length>100||value.completed.some(n=>!Number.isInteger(n)||n<1||n>100))throw Error('Niveau du Labyrinthe invalide.');
 const levels=[...new Set(value.completed)].sort((a,b)=>a-b);
 if(levels.some((n,i)=>n!==i+1))throw Error('Les niveaux du Labyrinthe doivent être débloqués dans l’ordre.');
 out.completed=levels;
 for(const n of levels){const record=value.best[n];if(!record||!Number.isInteger(record.stars)||record.stars<1||record.stars>3||!Number.isFinite(record.score)||record.score<0||record.score>1e7||!Number.isFinite(record.time)||record.time<=0||record.time>86400)throw Error('Résultat du Labyrinthe invalide.');out.best[n]={stars:record.stars,score:Math.round(record.score),time:record.time};}
 out.selected=Math.max(1,Math.min(unlockedMazeLevel(out),Number.isInteger(value.selected)?value.selected:1));return out;
}
export const unlockedMazeLevel=campaign=>Math.min(100,campaign.completed.length+1);
export const mazePerk=campaign=>MAZE_MILESTONES.filter(m=>m.clears<=campaign.completed.length).at(-1)||{clears:0,title:'Premiers pas',light:0,recharge:0};
export const nextMazePerk=campaign=>MAZE_MILESTONES.find(m=>m.clears>campaign.completed.length)||null;
export function mazeDifficulty(level){
 const n=Math.max(1,Math.min(100,Math.floor(Number(level)||1))),t=(n-1)/99,chapter=Math.floor((n-1)/10);
 return {level:n,chapter,title:MAZE_CHAPTERS[chapter],label:['Initiation','Accessible','Exploration','Vigilance','Soutenu','Avancé','Expert','Redoutable','Maître','Légendaire'][chapter],
  seed:0x3b100+n*7919,cols:29+2*Math.floor(chapter/2),rows:21+2*Math.floor(chapter/3),loops:Math.round(18-t*10),lamps:n>=90?3:n>=60?4:5,
  light:210-Math.round(t*35),drain:.65+t*.4,vision:6-t*1.1,grace:10-t*6,patrol:.68-t*.26,hunt:.36-t*.13,search:.48-t*.18,sight:6+t*2,hearing:3+Math.floor(t*2),damage:34+Math.round(t*4),recharge:9+t*2,par:90+chapter*14};
}
export function completeMazeLevel(campaign,level,{score,time,hits}){
 const out=readMazeCampaign(campaign);if(level!==Math.floor(level)||level<1||level>unlockedMazeLevel(out))return{campaign:out,first:false,stars:0};
 const stars=1+(hits<=1?1:0)+(hits===0&&time<=mazeDifficulty(level).par?1:0),old=out.best[level],first=!out.completed.includes(level);
 if(first)out.completed.push(level);
 out.best[level]={stars:Math.max(old?.stars||0,stars),score:Math.max(old?.score||0,score),time:Math.min(old?.time||Infinity,time)};
 out.selected=first?unlockedMazeLevel(out):level;return {campaign:out,first,stars};
}
