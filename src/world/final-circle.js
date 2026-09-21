export const FINAL_CIRCLE_PHASES=Object.freeze([
 {index:1,region:'france',guardian:'Céliane',value:'Justice',title:'Distinguer le vrai',role:'Vérifie l’attaque réelle avant de chercher le plein impact.'},
 {index:2,region:'algerie',guardian:'Yliane',value:'Loyauté',title:'Rester liés',role:'L’Oubli tente d’étirer le groupe ; maintiens le lien au centre.'},
 {index:3,region:'maroc',guardian:'Naël',value:'Noblesse',title:'Protéger sans posséder',role:'Protège l’ancrage du Cercle même lorsqu’une esquive facile t’en éloigne.'},
 {index:4,region:'tunisie',guardian:'Soraya',value:'Courage',title:'Traverser le danger',role:'Évite en avançant vers la menace pour ouvrir la voie.'},
 {index:5,region:'espagne',guardian:'Diego',value:'Passion',title:'Maîtriser l’intensité',role:'Construis ton élan sans laisser la surchauffe décider à ta place.'},
 {index:6,region:'italie',guardian:'Alessio',value:'Espoir',title:'Reconstruire autrement',role:'Brise une défense revenue sans répéter exactement la même solution.'},
 {index:7,region:'turquie',guardian:'Émir',value:'Foi',title:'Tenir sans certitude',role:'Une partie du signal disparaît ; garde ton cap grâce aux signes encore fiables.'},
 {index:8,region:'estonie',guardian:'Eira',value:'Sagesse',title:'Choisir le moment',role:'Les leurres absorbent les gestes précipités ; attends la vraie fenêtre.'},
]);

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function finalCirclePhase(encounter){
 if(!encounter?.final)return null;
 const max=Math.max(1,Number(encounter.enemyMax)||1),enemy=clamp(Number(encounter.enemy)||0,0,max);
 const progress=1-enemy/max,index=Math.min(8,1+Math.floor(Math.min(.999999,progress)*8));
 return FINAL_CIRCLE_PHASES[index-1];
}

export function finalCircleStatus(encounter){
 const phase=finalCirclePhase(encounter);if(!phase)return null;
 return {...phase,label:`Phase ${phase.index}/8 · ${phase.guardian} · ${phase.value}`,status:`${phase.title} — ${phase.role}`,link:`Lien ${phase.index}/8`};
}

export function validateFinalCircle(){
 if(FINAL_CIRCLE_PHASES.length!==8)throw Error('La finale doit contenir huit phases');
 const regions=new Set(),guardians=new Set(),values=new Set();
 for(const phase of FINAL_CIRCLE_PHASES){
  if(regions.has(phase.region)||guardians.has(phase.guardian)||values.has(phase.value))throw Error('Phase finale dupliquée');
  regions.add(phase.region);guardians.add(phase.guardian);values.add(phase.value);
  if(phase.role.length<35)throw Error('Rôle final trop court : '+phase.guardian);
 }
 return true;
}
