// Lightweight, private browser-only plan for Albert's public concierge view.
// Never write plan text to Supabase, a network API, telemetry or the PC's Albert memory.
export const ALBERT_PLAN_KEY='threeb-albert-local-plan-v1';
export const ALBERT_PLAN_MAX_ITEMS=12;
export const ALBERT_PLAN_MAX_TEXT=72;

// These IDs are real routes already present in the 3B app. No invented event
// or promise of official opening is generated from the personal plan.
export const ALBERT_PLAN_ROUTES=Object.freeze([
 {id:'news',label:'Info Actu'},
 {id:'health',label:'Santé'},
 {id:'community',label:'Communauté'},
 {id:'games',label:'Jeux 3B'},
 {id:'world3b',label:'Monde du 3B'},
 {id:'travel',label:'Voyage 3B'},
 {id:'esports',label:'16-18 E-sport'},
 {id:'cinema',label:'Cinéma 3B'},
 {id:'foodscan',label:'Scanner alimentaire'},
 {id:'passport',label:'Passeport 3B'},
 {id:'partners',label:'Partenaires'},
 {id:'shop',label:'Boutique'}
]);

export const ALBERT_PLAN_SUGGESTIONS=Object.freeze([
 {id:'health',title:'Prendre soin de moi',hint:'Ouvrir Santé'},
 {id:'news',title:'Découvrir les nouveautés',hint:'Explorer Info Actu'},
 {id:'esports',title:'Suivre le 16-18',hint:'Voir l’espace gaming'}
]);

export function albertLocalDayKey(date=new Date()){
 const d=date instanceof Date?date:new Date(date);
 if(!Number.isFinite(d.getTime()))return '';
 // Use the member's own phone date, not UTC midnight.
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}

export function normalizeAlbertPlanEntry(entry){
 if(!entry||typeof entry!=='object')return null;
 const id=typeof entry.id==='string'?entry.id.slice(0,64):'';
 const title=typeof entry.title==='string'?entry.title.trim().slice(0,ALBERT_PLAN_MAX_TEXT):'';
 const route=ALBERT_PLAN_ROUTES.some(page=>page.id===entry.route)?entry.route:null;
 const time=typeof entry.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time)?entry.time:'';
 if(!id||!title)return null;
 return {id,title,route,time,done:entry.done===true};
}

export function normalizeAlbertPlan(entries){
 if(!Array.isArray(entries))return [];
 const seen=new Set();
 const output=[];
 for(const item of entries){
  const clean=normalizeAlbertPlanEntry(item);
  if(!clean||seen.has(clean.id))continue;
  seen.add(clean.id);output.push(clean);
  if(output.length===ALBERT_PLAN_MAX_ITEMS)break;
 }
 return output;
}

export function readAlbertPlan(storage,day=albertLocalDayKey()){
 try{
  if(!storage||!day)return [];
  const raw=storage.getItem(ALBERT_PLAN_KEY);
  if(!raw||raw.length>12000)return [];
  const data=JSON.parse(raw);
  return data?.day===day?normalizeAlbertPlan(data.entries):[];
 }catch{return [];}
}

export function persistAlbertPlan(storage,entries,day=albertLocalDayKey()){
 try{
  if(!storage||!day)return false;
  storage.setItem(ALBERT_PLAN_KEY,JSON.stringify({version:1,day,entries:normalizeAlbertPlan(entries)}));
  return true;
 }catch{return false;}
}

export function createAlbertPlanEntry({title,route=null,time=''},id){
 const cleanTitle=typeof title==='string'?title.trim().slice(0,ALBERT_PLAN_MAX_TEXT):'';
 if(!cleanTitle)return null;
 const entry=normalizeAlbertPlanEntry({id,title:cleanTitle,route,time,done:false});
 return entry;
}
