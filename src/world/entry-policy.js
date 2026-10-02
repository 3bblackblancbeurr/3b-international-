const SETTLED_ENCOUNTER_RESULTS=new Set(['victory','recruited','missed','defeat']);

export function isUnresolvedWorldEncounter(encounter){
 return !!encounter&&!SETTLED_ENCOUNTER_RESULTS.has(encounter.result);
}

// Entry is a policy decision, separate from persistence. The caller applies the
// returned visit command through the normal authoritative world action journal.
export function worldEntryPolicy(save){
 const encounter=save?.adventure?.encounter||null;
 if(isUnresolvedWorldEncounter(encounter))return{
  kind:'resume-encounter',
  region:save?.region||encounter.region||'hub',
  resumeEncounter:true,
  action:null,
 };
 const alreadyAtCleanNexus=save?.region==='hub'&&!encounter;
 return{
  kind:'nexus',
  region:'hub',
  resumeEncounter:false,
  action:alreadyAtCleanNexus?null:{type:'visit',region:'hub'},
 };
}
