import {COUNTRIES,cardById} from './catalog.js';
import {blankAvatar,normalizeAvatar} from './avatar-rules.js';
import {DISCOVERY_IDS} from './settlements.js';
const integer=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
const strings=(v,allowed)=>[...new Set(Array.isArray(v)?v:[])].filter(x=>allowed.includes(x));
export function blankAdventure(){return{companion:null,preparation:null,chapters:{},discoveries:[],finished:false,cosmetic:'voyageur',nexusStyle:'garden',difficulty:'adventure',encounter:null,outdoorCredits:0,avatar:blankAvatar()};}
export function normalizeAdventure(input){
 const a=blankAdventure();if(!input||typeof input!=='object')return a;
 a.avatar=normalizeAvatar(input.avatar);
 a.companion=cardById[input.companion]?.character?input.companion:null;
 a.preparation=COUNTRIES.some(c=>c.id===input.preparation)?input.preparation:null;
 a.discoveries=strings(input.discoveries,DISCOVERY_IDS);
 for(const c of COUNTRIES){const s=input.chapters?.[c.id];if(!s)continue;const powers=strings(s.powers,['ally','ambiance','terrain']);a.chapters[c.id]={helped:!!s.helped,powers:s.helped?powers:[],solved:!!s.solved&&powers.length===3,restored:s.solved&&powers.length===3?integer(s.restored,3):0,challenge:!!s.challenge,choice:['garden','workshop'].includes(s.choice)?s.choice:null,board:(Array.isArray(s.board)?s.board:[]).slice(0,9).map(n=>integer(n,8))};}
 a.finished=!!input.finished&&COUNTRIES.every(c=>a.chapters[c.id]?.restored===3);
 const colors=['voyageur',...COUNTRIES.map(c=>c.id),'union'];a.cosmetic=colors.includes(input.cosmetic)?input.cosmetic:'voyageur';a.nexusStyle=input.nexusStyle==='workshop'?'workshop':'garden';a.difficulty=input.difficulty==='expert'?'expert':'adventure';a.outdoorCredits=integer(input.outdoorCredits,50);
 const e=input.encounter;
 if(e&&cardById[e.card]?.character&&e.stats&&COUNTRIES.some(c=>c.id===e.region)){
  const stats={};for(const k of ['health','attack','heal','speed','window','affinity','traps'])stats[k]=Number.isFinite(e.stats[k])?Math.max(0,Math.min(500,e.stats[k])):0;
  stats.support=!!e.stats.support;stats.energy=!!e.stats.energy;
  a.encounter={card:e.card,region:e.region,boss:!!e.boss,final:!!e.final,expert:!!e.expert,enemy:integer(e.enemy,10000),enemyMax:Math.max(1,integer(e.enemyMax,10000)),hp:integer(e.hp,500),maxHP:Math.max(1,integer(e.maxHP,500)),turn:integer(e.turn,1000),focus:integer(e.focus,3),stats,traps:integer(e.traps,3),support:!!e.support,result:['victory','calm','defeat','recruited','missed'].includes(e.result)?e.result:null,log:typeof e.log==='string'?e.log.slice(0,320):'',intent:['frappe','rituel','percée','rempart','soin','gel','éclipse','double','sable','vague'].includes(e.intent)?e.intent:'frappe',pact:!!e.pact,pactStep:integer(e.pactStep,3),mistakes:integer(e.mistakes,3),pactSeed:integer(e.pactSeed,10000),phase:Math.max(1,integer(e.phase,3)),rewarded:!!e.rewarded,approach:['offer','help','battle'].includes(e.approach)?e.approach:'battle'};
 }
 return a;
}
