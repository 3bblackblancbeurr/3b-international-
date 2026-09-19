import {CHAPTERS,chapterState} from './chapters.js';
import {LANDMARK_APPROACH} from './heritage.js';

const POWER_ORDER=['ally','ambiance','terrain'];
const POWER_SPOTS={
 ally:{x:11,z:-4},
 ambiance:{x:-18,z:17},
 terrain:{x:LANDMARK_APPROACH.x,z:LANDMARK_APPROACH.z},
};
const POWER_LABELS={
 ally:'Écouter le compagnon',
 ambiance:'Lire les souvenirs du lieu',
 terrain:'Raviver le monument',
};

export function countryPhysicalObjectives(region,save){
 const chapter=CHAPTERS[region];if(!chapter)return[];
 const state=chapterState(save,region),items=[];
 if(!state.helped){
  return [{id:region+':objective:help',type:'countryStoryAction',action:'help',name:'Parler à '+chapter.resident.split(',')[0],detail:chapter.need,x:11,z:-4,range:5.5}];
 }
 if(state.powers.length<3){
  const power=POWER_ORDER[state.powers.length],spot=POWER_SPOTS[power];
  return [{id:region+':objective:power:'+power,type:'countryStoryAction',action:'power',power,name:POWER_LABELS[power],detail:power==='ally'?'Le lien avec ton compagnon commence ici.':power==='ambiance'?'Observe les traces du lieu avant de continuer.':'Le monument peut maintenant répondre au pouvoir du pays.',...spot,range:5.5}];
 }
 if(!state.solved){
  return [{id:region+':objective:puzzle',type:'countryPuzzle',name:chapter.puzzle,detail:chapter.instruction,x:LANDMARK_APPROACH.x,z:LANDMARK_APPROACH.z,range:6}];
 }
 const missing=[0,1,2].some(i=>!save.beacons.includes(region+':'+i));
 if(state.restored===1&&!missing){
  items.push(
   {id:region+':restore:garden',type:'countryRestoreChoice',choice:'garden',name:'Choisir le jardin partagé',detail:'Reconstruire un lieu de repos vivant.',x:29,z:15,range:5.5},
   {id:region+':restore:workshop',type:'countryRestoreChoice',choice:'workshop',name:'Choisir l’atelier ouvert',detail:'Reconstruire un lieu de préparation et de création.',x:-18,z:17,range:5.5},
  );
 }
 if(save.seals.includes(region)&&state.restored===2){
  items.push({id:region+':objective:inaugurate',type:'countryInaugurate',name:'Inaugurer '+chapter.restores[2],detail:'Le Gardien reconnaît les liens reconstruits. Le pays peut rejoindre la Cité.',x:11,z:-4,range:6});
 }
 return items;
}

export const isPhysicalCountryObjectiveType=type=>['countryStoryAction','countryPuzzle','countryRestoreChoice','countryInaugurate'].includes(type);
