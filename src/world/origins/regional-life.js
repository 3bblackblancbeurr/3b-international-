import {COUNTRIES,countryLayout,isCountry} from './countries.js';
const integer=(n,max)=>Number.isFinite(n)?Math.min(max,Math.max(0,Math.floor(n))):0;
export function normalizeRegions(raw={}){return Object.fromEntries(Object.keys(COUNTRIES).map(id=>{const r=raw?.[id]||{};return[id,{supplies:integer(r.supplies,99),restored:integer(r.restored,3),wins:integer(r.wins,1000),gathered:r.gathered===true,upgrade:r.upgrade===true,revision:integer(r.revision,100000)}];}));}
export const regionalXP=regions=>Object.values(regions||{}).reduce((n,r)=>n+r.restored*35+r.wins*15+(r.upgrade?20:0),0);
export function regionalAction(state,id,{position,topic,combatVictory=false}={}){
 if(!isCountry(state.zone))return null;
 const save=structuredClone(state),r=save.regions[state.zone],layout=countryLayout(state.zone),p=layout.points.find(p=>p.id===id);
 if(!p||!position||Math.hypot(p.x-position.x,p.z-position.z)>3.2&&!(id==='country-encounter'&&combatVictory))return null;
 let changed=false,message='',speaker='',choices,encounter=false;
 if(id==='country-garden'){
  if(topic==='restore'){if(r.restored>=3)message='Le jardin est restauré. Les prochaines récoltes serviront à ton équipement.';else if(r.supplies<3)message='Il faut 3 matériaux pour restaurer une partie du jardin.';else{r.supplies-=3;r.restored++;changed=true;message='Une partie du jardin reprend vie : '+r.restored+'/3. +35 XP.';}}
  else if(!r.gathered){r.gathered=true;r.supplies=Math.min(99,r.supplies+3);changed=true;message='Tu récoltes 3 matériaux. Tu peux restaurer le jardin ou renforcer ta tenue à l’atelier.';}
  else message='La récolte est faite. Repousse la menace dans la clairière pour sécuriser une nouvelle récolte.';
  choices=[{id,topic:'restore',label:'Restaurer le jardin · 3 matériaux'},{id,topic:'encounter',label:'Rejoindre la clairière'}];
 }else if(id==='atelier'&&topic==='upgrade'){
  speaker='Artisan';if(r.upgrade)message='Ta tenue est déjà renforcée pour ce quartier.';else if(r.supplies<2)message='Rapporte 2 matériaux du jardin pour que je renforce ta tenue.';else{r.supplies-=2;r.upgrade=true;changed=true;message='Tenue renforcée : les attaques puissantes coûtent moins d’endurance dans ce pays. +20 XP.';}
 }else if(id==='refuge'&&topic==='rest'){save.hp=100;changed=true;speaker='Hôte du refuge';message='Tu retrouves ta santé, ton endurance et ton énergie. Le refuge reste ouvert.';}
 else if(id==='country-encounter'){
  if(combatVictory){r.wins++;r.supplies=Math.min(99,r.supplies+2);r.gathered=false;changed=true;message='Clairière sécurisée. +2 matériaux, +15 XP. Une nouvelle récolte est disponible.';}
  else {encounter=true;message='L’Oubli se manifeste. Observe les marques au sol, esquive puis contre-attaque.';}
 }else return null;
 if(changed){r.revision++;save.xp+=regionalXP(save.regions)-regionalXP(state.regions);}
 return {save,changed,message,speaker,choices,encounter};
}
