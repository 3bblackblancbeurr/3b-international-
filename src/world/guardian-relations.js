import {CANON_WORLDS,GUARDIAN_STORIES} from './story-canon.js';
import {GUARDIAN_CAMPAIGNS} from './mission-index.js';

export const GUARDIAN_RELATIONSHIPS=Object.freeze([
 {id:'justice-loyalty',regions:['france','algerie'],theme:'Justice ↔ Loyauté',question:'Jusqu’où protéger un proche lorsqu’une preuve montre qu’il a causé du tort ?',tension:'Céliane refuse qu’un lien efface les faits ; Yliane refuse qu’une faute efface tout le lien.',mission:'Une enquête où un proche d’un allié est impliqué et où vérité, réparation et protection doivent coexister.'},
 {id:'courage-wisdom',regions:['tunisie','estonie'],theme:'Courage ↔ Sagesse',question:'Faut-il agir immédiatement lorsque chaque minute compte mais que les informations restent incomplètes ?',tension:'Soraya veut intervenir avant qu’il soit trop tard ; Eira veut distinguer le danger réel du leurre.',mission:'Un sauvetage avec signaux contradictoires : agir trop tôt et trop tard ont tous deux un coût.'},
 {id:'passion-nobility',regions:['espagne','maroc'],theme:'Passion ↔ Noblesse',question:'Comment exprimer une colère légitime sans humilier ni perdre la maîtrise de son geste ?',tension:'Diego refuse l’indifférence ; Naël refuse que l’intensité donne le droit d’écraser.',mission:'Une crise publique qui peut devenir confrontation, création collective ou humiliation.'},
 {id:'faith-hope',regions:['turquie','italie'],theme:'Foi ↔ Espoir',question:'Continue-t-on parce qu’on croit devoir tenir, ou parce qu’une possibilité concrète existe encore ?',tension:'Émir avance sans garantie ; Alessio cherche une ouverture nouvelle dans ce qui reste.',mission:'Un passage dont aucun plan ne garantit le succès, mais où renoncer condamne une reconstruction.'},
]);

export function guardianRelationshipsFor(region,seals=[]){
 const owned=new Set(seals);
 return GUARDIAN_RELATIONSHIPS.filter(rel=>rel.regions.includes(region)&&rel.regions.every(id=>owned.has(id)));
}

export function guardianHubState(region,save={}){
 const canon=CANON_WORLDS[region],story=GUARDIAN_STORIES[region],campaign=GUARDIAN_CAMPAIGNS[region];
 if(!canon||!story||!campaign)return null;
 const seals=save.seals||[],count=seals.length,relations=guardianRelationshipsFor(region,seals);
 const stage=count>=8?'union':count>=6?'revelation':count>=4?'tension':count>=2?'dialogue':'arrival';
 const lines={
  arrival:`${canon.guardian} ne considère pas son retour comme une fin. ${story.conflict}`,
  dialogue:`${canon.guardian} commence à comparer son expérience avec celle des autres Gardiens. Sa valeur n’explique pas tout à elle seule.`,
  tension:relations.length?`${relations[0].theme} · ${relations[0].question}`:`Plusieurs Gardiens sont revenus. ${canon.guardian} comprend que les valeurs peuvent entrer en tension sans s’annuler.`,
  revelation:`Les Gardiens remarquent que l’anneau de Kaïs répond à chacun d’eux sans appartenir à aucun pays. ${canon.guardian} prépare désormais son rôle dans le Cercle.`,
  union:`${canon.guardian} connaît sa place dans la confrontation finale : ${campaign.finalRole}`,
 };
 return {
  region,
  name:canon.guardian,
  value:canon.value,
  stage,
  line:lines[stage],
  temperament:story.temperament,
  conflict:story.conflict,
  postMission:campaign.post,
  finalRole:campaign.finalRole,
  relationships:relations,
 };
}

export function validateGuardianRelationships(){
 const seen=new Set();
 for(const rel of GUARDIAN_RELATIONSHIPS){
  if(rel.regions.length!==2||rel.regions.some(id=>!CANON_WORLDS[id]))throw Error('Relation Gardien invalide : '+rel.id);
  const key=[...rel.regions].sort().join(':');if(seen.has(key))throw Error('Relation dupliquée : '+key);seen.add(key);
  if(!rel.question||!rel.tension||!rel.mission)throw Error('Relation incomplète : '+rel.id);
 }
 return true;
}
