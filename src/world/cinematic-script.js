/** Presentation only. No XP, combat result, unlock, or save writes belong here. */
const text=(value,fallback='')=>typeof value==='string'&&value.trim()?value.trim():fallback;

export function characterSequence({avatar={}}={}){
 const name=text(avatar.name,'Voyageur');
 const shots=[
  {id:'blackout',duration:3500,camera:'blackout',effect:'blackout',title:'',line:'',action:'Idle'},
  {id:'matrix-scan',duration:5000,camera:'scan',effect:'scan',title:`${name}.`,line:'Le Monde 3B reconnaît ta présence.',action:'Idle'},
  {id:'identity-detail',duration:4500,camera:'portrait',effect:'detail',title:'Ton visage. Ton héritage.',line:'Tes choix restent les tiens. Le monde ne décidera pas à ta place.',action:'Idle'},
  {id:'identity-orbit',duration:5000,camera:'orbit',effect:'matrix',title:'Une nouvelle trajectoire.',line:'Huit portes attendent. Chacune protège une valeur.',action:'Idle'},
  {id:'gate',duration:5500,camera:'portal',effect:'portal',title:'La Porte répond.',line:'Quelque chose s’ouvre dans l’obscurité.',action:'Cast'},
  {id:'eight-worlds',duration:5000,camera:'worlds',effect:'countries',title:'Huit pays. Huit valeurs.',line:'Justice · Loyauté · Noblesse · Courage · Foi · Passion · Espoir · Sagesse.',action:'Idle'},
  {id:'traversal',duration:4500,camera:'traversal',effect:'warp',title:'Traverse.',line:'Le Cercle Brisé n’attend plus.',action:'Idle'},
  {id:'world-reveal',duration:6500,camera:'reveal',effect:'world',title:'LE MONDE DU 3B',line:'Pluie. Lumière. Mémoire. Une ville vivante au-delà de la porte.',action:'Idle'},
  {id:'signature',duration:4500,camera:'signature',effect:'signature',title:'3B INTERNATIONAL',line:'Ce n’est pas une marque. C’est un héritage.',action:'Idle'},
  {id:'handoff',duration:3000,camera:'handoff',effect:'handoff',title:'',line:'',action:'Idle'},
 ];
 return {id:'character-reveal-gold-master-v2',title:'L’Éveil de l’Héritage',shots};
}

export function frameAt(sequence,elapsed){
 if(!sequence?.shots?.length)return null;
 const total=sequence.shots.reduce((sum,shot)=>sum+shot.duration,0),time=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
 let start=0;
 for(let index=0;index<sequence.shots.length;index++){
  const shot=sequence.shots[index];
  if(time<start+shot.duration||index===sequence.shots.length-1){
   const local=Math.max(0,time-start);
   return {...shot,index,count:sequence.shots.length,progress:Math.min(1,local/shot.duration),totalProgress:Math.min(1,time/total),total,done:time>=total};
  }
  start+=shot.duration;
 }
 return null;
}
