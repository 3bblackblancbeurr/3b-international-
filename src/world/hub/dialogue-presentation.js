import {hubDialogueIntentResponse as canonicalResponse} from './dialogue-intents.js';
import {referenceResidentStory,referenceMissionClue} from './reference-city-life.js';

export {hubDialogueIntents} from './dialogue-intents.js';

/** Frontend copy for the reference city. Intent validation, choices and saved
 * progression remain in the unchanged module shared with the world engine. */
export function hubDialogueIntentResponse(item,intentId,save,context={}){
 const response=canonicalResponse(item,intentId,save,context);
 let text=null;
 if(intentId==='district')text=referenceResidentStory(item,'district',context);
 if(intentId==='clue'){
  const missionId=(item.missionIds||[]).find(id=>save?.hub?.missions?.[id]?.status==='active');
  if(missionId)text=referenceMissionClue(missionId,save.hub.missions[missionId],save.hub.stats?.missionActions?.[missionId]||[]);
 }
 return text?{...response,text}:response;
}
