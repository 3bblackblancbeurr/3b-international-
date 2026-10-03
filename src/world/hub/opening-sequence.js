import {HUB_SCALE} from './platform-layout.js';
const SHOTS=[
 {id:'arrival',duration:6500,title:'La Cité des Huit Héritages',line:'Au-dessus des nuages, une cité protège les liens entre huit royaumes.',from:[190,110,210],to:[140,82,170],look:[0,12,0]},
 {id:'circle',duration:5500,title:'Le Cercle s’est brisé',line:'Le Monstre de l’Oubli efface les souvenirs. Les huit Gardiens ont été séparés.',from:[38,14,68],to:[-32,30,54],look:[0,25,0]},
 {id:'people',duration:5500,title:'Un monde se reconstruit ensemble',line:'Chaque habitant a besoin de quelqu’un. Écoute, enquête et choisis comment aider.',from:[-12,12,60],to:[28,9,56],look:[0,3,35]},
 {id:'arena',duration:5000,title:'Prépare-toi dans la cité',line:'Entre dans l’arène pour les duels. Retrouve ton groupe à la Maison de la Communauté.',from:[106,21,-38],to:[62,12,-45],look:[82,4,-74]},
 {id:'gates',duration:5500,title:'Huit portes, huit valeurs',line:'Justice, Loyauté, Noblesse, Courage, Passion, Espoir, Foi et Sagesse. Chaque fragment rend un lien à la cité.',from:[-156,62,-56],to:[-110,40,-104],look:[0,10,0]},
 {id:'departure',duration:5000,title:'Ton voyage commence',line:'Rejoins la Maison de l’Accueil. Ta première mission t’attend.',from:[8,5,44],to:[5,3.2,38],look:[0,2,32]},
 ];
export const HUB_OPENING_SHOTS=Object.freeze(SHOTS.map(s=>({...s,from:s.from.map((v,i)=>v*(i===1?1.5:HUB_SCALE)),to:s.to.map((v,i)=>v*(i===1?1.5:HUB_SCALE)),look:s.look.map((v,i)=>v*(i===1?1.5:HUB_SCALE))})));
export function openingFrame(elapsed){
 const time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);let start=0;
 for(let index=0;index<HUB_OPENING_SHOTS.length;index++){
  const shot=HUB_OPENING_SHOTS[index];if(time<start+shot.duration||index===HUB_OPENING_SHOTS.length-1)return {...shot,index,progress:Math.min(1,(time-start)/shot.duration),done:time>=start+shot.duration};start+=shot.duration;
 }
}
