/** Presentation only. No XP, combat result, unlock, or save writes belong here. */
const text=(value,fallback='')=>typeof value==='string'&&value.trim()?value.trim():fallback;
const LIMITS={
 lumiere:'Le soutien demande de choisir le bon moment pour te protéger. Il ne remplace ni le placement ni les attaques.',
 tempete:'Ta puissance a une contrepartie réelle : ta vitalité est réduite. Une attaque mal préparée te laisse plus vulnérable.',
 nature:'Ta résistance ne garantit pas la victoire. Anticipe les attaques et garde une issue pour te replier.',
 ombre:'La mobilité ne signifie pas l’invulnérabilité. Utilise le déplacement pour éviter les attaques plutôt que les subir.',
};

/**
 * Gold Master opening.
 * The legacy gameplay truth remains intact: identity, actual resolved weapon,
 * power, path trade-off and equipment are shown from saved data only.
 * 6 s per shot keeps every beat readable while staying at 36–42 s total.
 */
export function characterSequence({avatar={},power={},gear={},weapon=null}={}){
 const name=text(avatar.name,'Voyageur');
 const shots=[
  {id:'identity',duration:6000,camera:'scan',effect:'scan',title:`${name}, ton voyage commence.`,line:'Ton visage. Ton style. Tes choix. Le Monde 3B reconnaît une nouvelle présence.',action:'Idle'},
  {id:'silhouette',duration:6000,camera:'orbit',effect:'matrix',title:'Ton visage. Ton héritage.',line:'Ton apparence et tes origines restent libres. Elles ne déterminent pas ta puissance.',action:'Idle'},
 ];
 if(weapon?.enabled===true&&text(weapon.name)&&text(weapon.attack)&&text(weapon.defense)&&text(weapon.drawback)){
  shots.push({id:'weapon',duration:6000,camera:'portrait',effect:'detail',title:text(weapon.name),line:`Attaque : ${weapon.attack} Défense : ${weapon.defense} Limite : ${weapon.drawback}`,action:'Idle'});
 }
 shots.push(
  {id:'power',duration:6000,camera:'portal',effect:'portal',title:`Ta voie : ${text(power.name,'Lumière')}`,line:text(power.description,'Consulte ta voie dans la personnalisation.'),action:'Cast'},
  {id:'tradeoff',duration:6000,camera:'worlds',effect:'countries',title:'Huit portes. Huit valeurs.',line:LIMITS[avatar.path]||LIMITS.lumiere,action:'Idle'},
  {id:'equipment',duration:6000,camera:'traversal',effect:'warp',title:text(gear.name,'Ton équipement de voyage'),line:`${text(gear.description,'Prépare ton équipement dans la personnalisation.')} Ces choix d’aventure ne donnent pas d’avantage de puissance dans l’arène.`,action:'Idle'},
  {id:'departure',duration:6000,camera:'reveal',effect:'signature',title:'3B INTERNATIONAL',line:'Ce n’est pas une marque. C’est un héritage.',action:'Idle'},
 );
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
