import {CARDS,COUNTRIES,cardById} from './catalog.js';

export const RESOURCE_SITES=[{id:'wood',name:'Bois pour le refuge',x:38,z:32,amount:4},{id:'stone',name:'Pierre des bâtisseurs',x:55,z:-3,amount:3},{id:'food',name:'Récolte de provisions',x:51,z:34,amount:3}];
export const BUILDINGS={camp:{name:'Refuge',detail:'Protège ton groupe : +8 vitalité par rang.',wood:5,stone:3},forge:{name:'Atelier',detail:'Équipement entretenu : +1 puissance par rang.',wood:3,stone:5},garden:{name:'Jardin nourricier',detail:'Une provision supplémentaire récoltée par rang.',wood:4,stone:2}};
const int=(v,max=999999)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function frontierState(save,region=save.region){return save.adventure?.frontier?.[region]||{wood:0,stone:0,food:2,camp:0,forge:0,garden:0,expedition:0,harvest:[]};}
export function normalizeFrontier(input){const result={};for(const c of COUNTRIES){const s=input?.[c.id];if(!s)continue;result[c.id]={wood:int(s.wood,9999),stone:int(s.stone,9999),food:int(s.food,99),camp:int(s.camp,8),forge:int(s.forge,8),garden:int(s.garden,8),expedition:int(s.expedition),harvest:[...new Set(Array.isArray(s.harvest)?s.harvest:[])].filter(id=>RESOURCE_SITES.some(p=>p.id===id))};}return result;}
export function normalizeMastery(input){const result={};if(input&&typeof input==='object')for(const [id,xp] of Object.entries(input))if(cardById[id]?.character&&int(xp))result[id]=int(xp);return result;}
export const masteryLevel=xp=>Math.floor(Math.sqrt((xp||0)/80));
export function patrolOpponent(region,expedition=0){const people=CARDS.filter(p=>p.country===region&&p.character&&p.category!=='Personnage classique');return people[expedition%people.length];}
export function buildCost(state,kind){const b=BUILDINGS[kind];return b?{wood:b.wood*(state[kind]+1),stone:b.stone*(state[kind]+1)}:null;}
