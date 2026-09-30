import {HUB_NPC_LINES} from './npc-dialogue.js';
import {HUB_DISTRICT_STORIES,hubNpcMissionContext,hubNpcMissionLine} from './npc-narrative.js';
import {CANON_WORLDS,STORY_CANON,GUARDIAN_STORIES} from '../story-canon.js';
import {hubNpcMemory} from './npc-memory.js';
import {hubDistrictEffects} from './mission-effects.js';
export const HUB_DIALOGUE_INTENTS=Object.freeze({
 identity:{label:'Qui es-tu ?'},
 district:{label:'Parle-moi de ce quartier'},
 mission:{label:'As-tu besoin d’aide ?'},
 guardian:{label:'Que sais-tu du Gardien ?'},
 oubli:{label:'Que sais-tu de l’Oubli ?'},
 clue:{label:'J’ai besoin d’un indice'},
 memory:{label:'Que te rappelles-tu d’avant ?'},
 opinion:{label:'Qu’est-ce qui a changé ici ?'},
 goodbye:{label:'À bientôt'},
});
export const HUB_DIALOGUE_INTENT_SET=new Set(Object.keys(HUB_DIALOGUE_INTENTS));

const first=(array)=>Array.isArray(array)&&array.length?array[0]:null;
const activeMission=(item,missions)=>first((item.missionIds||[]).map(id=>[id,missions?.[id]]).filter(([,row])=>row?.status==='active'));
const completedMission=(item,missions)=>first((item.missionIds||[]).map(id=>[id,missions?.[id]]).filter(([,row])=>row?.status==='completed'));

export function hubDialogueIntents(item,save,{hour=12,weather='clear'}={}){
 const missions=save?.hub?.missions||{},active=activeMission(item,missions),completed=completedMission(item,missions),memory=hubNpcMemory(item,save,{hour,weather}),options=['identity','district'];
 if(active)options.push('clue');else if((item.missionIds||[]).length)options.push('mission');
 if(item.country||item.guardianRegion||item.guardian||item.value)options.push('guardian');
 if((save?.seals?.length||0)>0||item.npcId==='noah_leroux'||item.npcId==='the_conductor')options.push('oubli');
 if((save?.beacons?.length||0)>0||completed||memory.familiarityScore>=18)options.push('memory');
 if(completed||hubDistrictEffects(save?.hub,item.homeDistrict||item.district).length||(save?.seals?.length||0)>0||weather!=='clear'||hour>=20||hour<6||memory.familiarityScore>=45)options.push('opinion');
 options.push('goodbye');
 return [...new Set(options)].map(id=>({id,label:HUB_DIALOGUE_INTENTS[id].label}));
}

export function hubDialogueIntentResponse(item,intentId,save,{hour=12,weather='clear',guardianName=null,value=null,countryName=null,guardianLiberated=false}={}){
 const missions=save?.hub?.missions||{},memory=hubNpcMemory(item,save,{hour,weather});
 const id=item.npcId||item.id,name=item.name||'Cet habitant',voice=HUB_NPC_LINES[id]||['Chaque habitant a une histoire à transmettre.','Prends le temps d’écouter.','Nous avons encore beaucoup à apprendre.'];
 const district=HUB_DISTRICT_STORIES[item.district],mission=hubNpcMissionContext(item,missions),canon=CANON_WORLDS[memory.region],guardian=canon?.guardian||guardianName,guardianValue=canon?.value||value,liberated=guardianLiberated||memory.guardianLiberated;
 switch(intentId){
  case 'identity':return {text:`${memory.familiarity==='trusted'?'Heureux de te revoir. ':memory.familiarity==='familiar'?'Je te reconnais. ':''}Je suis ${name}, ${item.role||'habitant de la Cité'}. ${voice[0]}`};
  case 'district':return {text:district?`${district.text} ${weather==='storm'||weather==='heavy_rain'?'Avec cette météo, reste attentif pendant tes déplacements.':hour>=20||hour<6?'La nuit, prends aussi le temps d’observer les lumières et les départs aux Docks.':''}`.trim():voice[1]};
  case 'mission':return {text:hubNpcMissionLine(item,missions)};
  case 'guardian':return {text:guardian?(liberated?`${guardian} est revenu dans la Cité. ${GUARDIAN_STORIES[memory.region]?.conflict||`Sa relation à ${guardianValue||'sa valeur'} continue d’évoluer.`}`:`${guardian} porte la valeur de ${guardianValue||'son héritage'}. ${GUARDIAN_STORIES[memory.region]?.temperament||'Les souvenirs de son pays permettent de mieux comprendre son histoire.'}`):`Les huit Gardiens protègent chacun une valeur et un héritage. ${STORY_CANON.hero.name} est le ${STORY_CANON.hero.role} ; il ne fait pas partie des huit Gardiens.`};
  case 'oubli':return {text:id==='noah_leroux'?`${STORY_CANON.circle.purpose} ${STORY_CANON.oubli.nature}`:id==='the_conductor'?`Un voyage relie des lieux ; une histoire relie ceux qui y ont vécu. ${STORY_CANON.oubli.nature}`:`${STORY_CANON.oubli.nature} ${voice[0]}`};
  case 'clue':return {text:mission?.row.status==='active'?`${mission.mission.title} — ${mission.hint}`:hubNpcMissionLine(item,missions)};
  case 'memory':{
   const finished=(item.missionIds||[]).find(missionId=>missions[missionId]?.status==='completed');
   if(finished){const context=hubNpcMissionContext({...item,missionIds:[finished]},missions);return {text:`Je me souviens de ton aide pour « ${context.mission.title} ». ${voice[2]}`};}
   const lastTopic=memory.lastIntent==='memory'?memory.previousIntent:memory.lastIntent;
   return {text:memory.conversationTurns>=2&&lastTopic?`Tu m’as déjà parlé de « ${HUB_DIALOGUE_INTENTS[lastTopic]?.label||'la Cité'} ». ${voice[1]}`:`${voice[1]} Les souvenirs retrouvés aux Archives nous aident à remettre les choses dans leur contexte.`};
  }
  case 'opinion':{const changes=hubDistrictEffects(save?.hub,item.homeDistrict||item.district);return {text:changes.length?changes.slice(-2).map(effect=>effect.detail).join(' '):weather==='storm'||weather==='heavy_rain'?`Cette météo me rend vigilant. ${voice[1]}`:memory.familiarity==='trusted'?`À force de te voir revenir et d’échanger, j’ai appris à te faire confiance. ${voice[2]}`:voice[2]};}
  case 'goodbye':return {text:memory.familiarity==='trusted'?'À bientôt. Merci d’avoir pris le temps de m’écouter.':'À bientôt. Tu sauras où me retrouver.',close:true};
  default:return {text:'Je n’ai rien de fiable à ajouter là-dessus.'};
 }
}
