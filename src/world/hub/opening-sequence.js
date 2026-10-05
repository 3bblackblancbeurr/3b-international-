import {HUB_SCALE} from './platform-layout.js';
const SHOTS=[
 {id:'arrival',duration:6500,title:'La Cité des Huit Héritages',line:'Des îlots, des ponts et des cascades : huit pays partagent un même héritage.',from:[350,170,390],to:[270,130,310],look:[0,12,0]},
 {id:'circle',duration:5500,title:'Le Cercle s’est brisé',line:'Le Monstre de l’Oubli efface les souvenirs. Les huit Gardiens ont été séparés.',from:[38,14,68],to:[-32,30,54],look:[0,25,0]},
 {id:'people',duration:5500,title:'Un monde, une famille',line:'Des Archives de la Mémoire aux Souks du Monde, rencontre les habitants et découvre les lieux qui gardent leurs récits.',from:[-12,12,60],to:[28,9,56],look:[0,3,35]},
 {id:'arena',duration:5000,title:'Explorer, apprendre, créer',line:'Prépare-toi à l’Arène 3B, retrouve ton groupe au Quartier Communauté et imagine demain au Quartier Innovation & IA.',from:[106,21,-38],to:[62,12,-45],look:[82,4,-74]},
 {id:'gates',duration:5500,title:'Huit portes, un même héritage',line:'Culture, Loyauté, Créativité, Ambition, Passion, Élégance, Résilience et Innovation relient la cité. Les Gardiens conservent leur propre histoire au-delà des portes.',from:[-286,108,-116],to:[-210,82,-154],look:[0,10,0]},
 {id:'departure',duration:5000,title:'Ton voyage commence',line:'Rejoins la Maison de l’Accueil. Ta première mission t’attend.',from:[8,5,44],to:[5,3.2,38],look:[0,2,32]},
 ];
export const HUB_OPENING_SHOTS=Object.freeze(SHOTS.map(s=>({...s,from:s.from.map((v,i)=>v*(i===1?1.5:HUB_SCALE)),to:s.to.map((v,i)=>v*(i===1?1.5:HUB_SCALE)),look:s.look.map((v,i)=>v*(i===1?1.5:HUB_SCALE))})));
export function openingFrame(elapsed){
 const time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);let start=0;
 for(let index=0;index<HUB_OPENING_SHOTS.length;index++){
  const shot=HUB_OPENING_SHOTS[index];if(time<start+shot.duration||index===HUB_OPENING_SHOTS.length-1)return {...shot,index,progress:Math.min(1,(time-start)/shot.duration),done:time>=start+shot.duration};start+=shot.duration;
 }
}
