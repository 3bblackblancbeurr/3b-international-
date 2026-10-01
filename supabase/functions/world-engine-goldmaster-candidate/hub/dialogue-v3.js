import {hubNpcActivity,hubNpcActivityLine} from './npc-activity.js';
import {hubNpcMissionContext,hubNpcMissionLine} from './npc-narrative.js';
import {hubMissionEffect} from './mission-effects.js';
export const HUB_DIALOGUE_CHOICES={
 justice:[
  {id:'ecouter',label:'Écouter avant de juger',value:'Justice'},
  {id:'agir',label:'Agir tout de suite',value:'Courage'},
  {id:'relier',label:'Chercher ce qui relie les versions',value:'Sagesse'},
 ],
 memory:[
  {id:'respect',label:'Préserver le souvenir tel qu’il est',value:'Loyauté'},
  {id:'adapter',label:'L’adapter pour qu’il parle au présent',value:'Espoir'},
 ],
};
export const HUB_DIALOGUE_CHOICE_SET=new Set(Object.values(HUB_DIALOGUE_CHOICES).flat().map(choice=>choice.id));

export function hubDialogueScene(npc,{hour=12,weather='clear',missionState={},talks=0,afterCombat=null}={}){
 const activity=hubNpcActivity(npc,{hour,weather,missionState});
 const active=(npc.missionIds||[]).find(id=>missionState[id]?.status==='active');
 const completed=(npc.missionIds||[]).find(id=>missionState[id]?.status==='completed');
 if(afterCombat==='victory')return {id:'after-victory',text:'Tu es revenu debout. Maintenant, comprends ce que cette victoire change autour de toi.',choices:null};
 if(afterCombat==='defeat')return {id:'after-defeat',text:'Perdre un combat ne dit pas qui tu es. Ce que tu fais ensuite, oui.',choices:null};
 const context=hubNpcMissionContext(npc,missionState);
 if(active)return {id:'mission-active',text:hubNpcMissionLine(npc,missionState),choices:talks%3===0?HUB_DIALOGUE_CHOICES.justice:null,activity};
 if(completed&&context?.row.status==='completed'){const effect=hubMissionEffect({missions:missionState},context.id);return {id:'mission-complete',text:hubNpcMissionLine(npc,missionState)+(effect?' '+effect.detail:''),choices:null,activity};}
 if(activity.id==='night-watch'||activity.id==='rest')return {id:'night',text:hubNpcActivityLine(npc,{hour,weather,missionState}),choices:null,activity};
 if(talks>=3)return {id:'familiar',text:hubNpcActivityLine(npc,{hour,weather,missionState}),choices:HUB_DIALOGUE_CHOICES.memory,activity};
 return {id:'first',text:npc.name+' · '+npc.role+'. '+hubNpcActivityLine(npc,{hour,weather,missionState}),choices:null,activity};
}
