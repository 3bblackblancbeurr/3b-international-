import {POINTS} from './data.js';
const count=(n,max=100000)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
export function normalizeParis(raw={}){return {revision:count(raw?.revision),materials:count(raw?.materials,99),coins:count(raw?.coins),deliveries:count(raw?.deliveries),workshop:raw?.workshop===true,stock:raw?.stock===true};}
export const parisXP=p=>p.deliveries*10+(p.workshop?30:0);
export function parisChoices(id){return id==='atelier'?[
 {id,topic:'deliver',label:'Fournir le refuge · 2 matériaux → 5 pièces'},
 {id,topic:'repair',label:'Restaurer l’atelier · 4 matériaux + 10 pièces'},
 {id,topic:'craft',label:'Renforcer la tenue · atelier restauré + 3 matériaux'}
 ]:id==='flower'?[{id,topic:'gather',label:'Récolter les matériaux du quartier'}]:[];}
export function parisAction(state,id,{position,topic}={}){
 if(state.zone!=='france'||!topic||!['gather','deliver','repair','craft'].includes(topic))return null;
 const p=POINTS[id];if(!p||!position||Math.hypot(position.x-p.x,position.z-p.z)>=3.2)return null;
 const save=structuredClone(state),r=normalizeParis(save.paris),before=parisXP(r);let changed=false,message='';
 if(id==='flower'&&topic==='gather'){
  if(r.stock)message='Cette réserve est déjà récoltée. Livre des matériaux au refuge via l’atelier pour organiser la prochaine collecte.';
  else{r.materials=Math.min(99,r.materials+4);r.stock=true;changed=true;message='4 matériaux récupérés. L’atelier peut préparer une livraison ou restaurer son établi.';}
 }else if(id==='atelier'&&topic==='deliver'){
  if(r.materials<2)message='Il faut 2 matériaux. La collecte se trouve au jardin ouest.';
  else{r.materials-=2;r.coins+=5;r.deliveries++;r.stock=false;changed=true;message='Livraison préparée pour le refuge : +5 pièces, +10 XP. Une nouvelle collecte est disponible.';}
 }else if(id==='atelier'&&topic==='repair'){
  if(r.workshop)message='L’atelier est déjà restauré. Le renforcement de tenue est disponible.';
  else if(r.materials<4||r.coins<10)message='La restauration demande 4 matériaux et 10 pièces obtenues par les livraisons.';
  else{r.materials-=4;r.coins-=10;r.workshop=true;changed=true;message='Atelier restauré : le service de renforcement est ouvert. +30 XP.';}
 }else if(id==='atelier'&&topic==='craft'){
  if(!r.workshop)message='Restaure d’abord l’atelier.';
  else if(save.equipment==='artisan')message='Ta tenue est déjà renforcée.';
  else if(r.materials<3)message='Le renforcement demande 3 matériaux.';
  else{r.materials-=3;save.equipment='artisan';changed=true;message='Tenue renforcée. Les attaques puissantes consomment moins d’endurance.';}
 }else return null;
 if(changed)r.revision++;save.paris=r;save.xp+=parisXP(r)-before;
 return {save,changed,message,speaker:id==='atelier'?'Artisan':'Collecte du quartier',choices:parisChoices(id)};
}
