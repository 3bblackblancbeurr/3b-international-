import {GUARDIAN_VALUES} from './guardian-values.js';

export const REALM_GOLD_MASTER_REQUIREMENTS=Object.freeze([
 'environment_final',
 'guardian_final',
 'quest_chain',
 'combat_or_trial',
 'cinematic_arrival',
 'cinematic_guardian',
 'fragment_reward',
 'hub_return',
 'hub_evolution',
 'audio_pass',
 'mobile_budget',
 'save_restore',
 'server_authority',
 'accessibility',
]);

export const REALM_RELEASE_ORDER=Object.freeze([
 'france','algerie','espagne','maroc','italie','tunisie','turquie','estonie'
]);

export const REALM_GOLD_MASTER=Object.freeze(Object.fromEntries(
 REALM_RELEASE_ORDER.map((region,index)=>[
  region,
  Object.freeze({
   region,
   guardian:GUARDIAN_VALUES[region]?.name||'',
   value:GUARDIAN_VALUES[region]?.value||'',
   reference:index===0,
   inheritsFrom:index===0?null:'france',
   required:[...REALM_GOLD_MASTER_REQUIREMENTS],
  })
 ])
));

export function realmReleaseChecklist(region,completed=[]){
 const contract=REALM_GOLD_MASTER[region];
 if(!contract)return null;
 const done=new Set(Array.isArray(completed)?completed:[]);
 const missing=contract.required.filter(item=>!done.has(item));
 return Object.freeze({
  ...contract,
  completed:contract.required.filter(item=>done.has(item)),
  missing,
  ready:missing.length===0,
 });
}

export function realmCanShip(region,completed=[]){
 return realmReleaseChecklist(region,completed)?.ready===true;
}
