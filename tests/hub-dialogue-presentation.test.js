import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {HUB_DIALOGUE_INTENT_SET,hubDialogueIntents as canonicalIntents,hubDialogueIntentResponse as canonicalResponse} from '../src/world/hub/dialogue-intents.js';
import {hubDialogueIntents,hubDialogueIntentResponse} from '../src/world/hub/dialogue-presentation.js';

test('reference dialogue preserves canonical choices, guardian responses and conversation closure',()=>{
 const save=blankSave(),item={npcId:'ines_varga',name:'Inès',district:'archives',country:'France',missionIds:['first_steps']},context={hour:22,weather:'storm',guardianName:'Gardien',guardianLiberated:true};
 assert.deepEqual(hubDialogueIntents(item,save,context),canonicalIntents(item,save,context));
 for(const intentId of HUB_DIALOGUE_INTENT_SET)if(!['district','clue'].includes(intentId))assert.deepEqual(hubDialogueIntentResponse(item,intentId,save,context),canonicalResponse(item,intentId,save,context));
 assert.equal(hubDialogueIntentResponse(item,'goodbye',save,context).close,true);
 assert.match(hubDialogueIntentResponse(item,'district',save,context).text,/Mont des Savoirs/);
});

test('reference clues follow actual active mission progress without changing the save',()=>{
 const save=blankSave(),item={npcId:'mael_rivière',missionIds:['first_steps']};
 assert.deepEqual(hubDialogueIntentResponse(item,'clue',save),canonicalResponse(item,'clue',save));
 save.hub.missions.first_steps={...save.hub.missions.first_steps,status:'active',completedObjectives:0};
 const first=structuredClone(save);
 assert.match(hubDialogueIntentResponse(item,'clue',save).text,/Maison de l’Accueil/);
 assert.deepEqual(save,first);
 save.hub.missions.first_steps.completedObjectives=1;
 const second=structuredClone(save);
 assert.match(hubDialogueIntentResponse(item,'clue',save).text,/3B Express/);
 assert.deepEqual(save,second);
});
