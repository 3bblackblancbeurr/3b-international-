import {activeCampaignSnapshot} from './campaign-runtime.js';
import {realmStoryStaging} from './realm-story-staging.js';
import {CAMPAIGN_RUNTIME_SPEC,campaignTokenIds} from './campaign-spec.js';
import {localCampaignInteraction,franceCollectedEvidence} from './france-field-interaction.js';

// This adapter enriches presentation only. The canonical command, objective,
// clocks, position, choices and rewards still belong to campaign-runtime.
export function fieldCampaignSnapshot(save){
 const current=activeCampaignSnapshot(save);if(!current||current.finished||current.staging)return current;
 const staging=realmStoryStaging({type:'campaignObjective',region:current.region,id:current.objective,campaign:current,...current.target});
 return staging?{...current,staging}:current;
}

export function fieldCampaignPanel(current,position){
 return localCampaignInteraction(current,position,current?.objective)?'local':'dialog';
}

export function closeFieldCampaignAfterAction(before,after){
 return !after||after.finished||after.objective!==before?.objective||after.started&&!before?.started&&before?.mode!=='relay';
}

/** This notebook lists accepted objects only. Missing, consumed or unknown
 * tokens cannot appear just because a dialogue or inspection was opened. */
export function fieldCampaignEvidence(current){
 if(current?.region==='france')return franceCollectedEvidence(current.inventory);
 const spec=CAMPAIGN_RUNTIME_SPEC[current?.region];if(!spec)return[];
 return campaignTokenIds(current.region).filter(id=>Number.isFinite(current.inventory?.[id])&&current.inventory[id]>0).map(id=>({id,label:spec.flatMap(phase=>phase.steps).find(step=>step.grant===id)?.name||id.replaceAll('_',' ')}));
}
