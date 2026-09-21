import {GUARDIAN_RESONANCES} from './guardian-resonances.js';

const contract=(mode,types,verbs,caption)=>Object.freeze({mode,types:Object.freeze(types),verbs:Object.freeze(verbs),caption});
export const RESONANCE_CONTEXT_CONTRACTS=Object.freeze({
 france:contract('comparison',['evidence','trace','hubMissionAction','jobAction','survey'],['inspect','scan','showEvidence','observe'],'Comparer les éléments vérifiables sans choisir la réponse à ta place.'),
 algerie:contract('link',['injured','downedPlayer','jobAction','cooperation'],['help','support','carry','revive','talk'],'Maintenir le lien avec une personne aidée sans décider de sa direction.'),
 maroc:contract('protection',['injured','repairable','craftStation','jobAction','hubMissionAction'],['help','support','carry','guard','repair','assemble'],'Sécuriser la cible fragile en renonçant à toute validation automatique.'),
 tunisie:contract('danger-window',['water','ledge','injured','jobAction','hubMissionAction','boat'],['swim','dive','vault','help','revive','board','ride'],'Lire une courte fenêtre de danger sans rendre Kaïs invulnérable.'),
 espagne:contract('momentum',['ledge','zipline','hubMissionAction','jobAction'],['vault','climb','zipline','observe','fight'],'Conserver l’élan uniquement si les gestes restent variés et maîtrisés.'),
 italie:contract('temporary-recovery',['repairable','console','craftStation','jobAction','hubMissionAction'],['inspect','use','repair','assemble'],'Visualiser un fonctionnement temporaire sans remplacer la vraie reconstruction.'),
 turquie:contract('anchor',['portal','survey','trace','hubMissionAction','jobAction'],['travel','observe','inspect','scan'],'Maintenir un repère choisi sans garantir que ce repère est juste.'),
 estonie:contract('pattern',['trace','animal','survey','evidence','jobAction','hubMissionAction'],['observe','inspect','scan','calm'],'Regrouper les motifs observés sans supprimer les faux indices.'),
});

const clean=value=>typeof value==='string'?value.slice(0,96):'';
const validRegion=region=>Object.hasOwn(RESONANCE_CONTEXT_CONTRACTS,region)&&!!GUARDIAN_RESONANCES[region];

export function resonanceContextContract(region){return validRegion(region)?RESONANCE_CONTEXT_CONTRACTS[region]:null;}

export function resonanceContextCandidate(save={},item,verb){
 const region=save.adventure?.resonance,rule=resonanceContextContract(region);
 if(!rule||!save.seals?.includes(region)||!item||!rule.types.includes(item.type)||!rule.verbs.includes(verb))return null;
 const ability=GUARDIAN_RESONANCES[region];
 return {region,mode:rule.mode,name:ability.name,guardian:ability.guardian,value:ability.value,caption:rule.caption,verb};
}

export function resolveResonanceContext(save={},input={}){
 const region=save.adventure?.resonance,rule=resonanceContextContract(region);
 if(!rule||!save.seals?.includes(region))throw Error('Libère et sélectionne d’abord ce Gardien.');
 const targetId=clean(input.targetId),targetType=clean(input.targetType),verb=clean(input.verb);
 if(!targetId||!rule.types.includes(targetType)||!rule.verbs.includes(verb))throw Error('Cette Résonance ne répond pas à cette situation.');
 const previous=save.adventure?.resonanceContext,ability=GUARDIAN_RESONANCES[region],same=previous?.region===region;
 let chain=1;
 if(region==='espagne')chain=same&&previous.verb!==verb?Math.min(3,(previous.chain||1)+1):1;
 else if(region==='france'||region==='estonie')chain=same&&previous.targetId!==targetId?Math.min(3,(previous.chain||1)+1):same?previous.chain||1:1;
 else if(region==='algerie'||region==='maroc')chain=same&&previous.targetId===targetId?Math.min(2,(previous.chain||1)+1):1;
 const uses=Math.min(99,same?(previous.uses||0)+1:1);
 return {region,mode:rule.mode,targetId,targetType,verb,chain,uses,name:ability.name,guardian:ability.guardian,value:ability.value};
}

export function normalizeResonanceContext(input){
 if(!input||typeof input!=='object'||!validRegion(input.region))return null;
 const rule=resonanceContextContract(input.region),targetId=clean(input.targetId),targetType=clean(input.targetType),verb=clean(input.verb);
 if(!targetId||!rule.types.includes(targetType)||!rule.verbs.includes(verb))return null;
 return {region:input.region,mode:rule.mode,targetId,targetType,verb,chain:Math.max(1,Math.min(3,Math.floor(Number(input.chain)||1))),uses:Math.max(1,Math.min(99,Math.floor(Number(input.uses)||1))),name:GUARDIAN_RESONANCES[input.region].name,guardian:GUARDIAN_RESONANCES[input.region].guardian,value:GUARDIAN_RESONANCES[input.region].value};
}

export function resonanceContextMessage(state){
 if(!state)return 'La Résonance ne trouve aucun appui ici.';
 const n=state.name||GUARDIAN_RESONANCES[state.region]?.name||'Résonance';
 const messages={
  france:`${n} · ${state.chain}/3 éléments mis en regard. Aucun verdict n’est choisi automatiquement.`,
  algerie:`${n} · lien stabilisé avec cette cible. Elle conserve sa propre direction.`,
  maroc:`${n} · protection prioritaire. Aucune étape ni récompense n’est accordée par la Résonance.`,
  tunisie:`${n} · fenêtre de danger lue. Un mauvais timing reste dangereux.`,
  espagne:`${n} · élan ${state.chain}/3. Répéter le même geste casse la chaîne.`,
  italie:`${n} · fonctionnement temporaire visualisé. La vraie réparation reste nécessaire.`,
  turquie:`${n} · repère ancré. L’Ancrage ne garantit pas que ce choix est le bon.`,
  estonie:`${n} · motif ${state.chain}/3. Les faux indices restent présents.`,
 };
 return messages[state.region]||n;
}

export function resonanceActionPresentation(save={},item,verb){
 const state=save.adventure?.resonanceContext,candidate=resonanceContextCandidate(save,item,verb);
 if(!candidate||state?.region!==candidate.region||state?.targetId!==item?.id)return null;
 return {caption:`${candidate.name} active · ${candidate.caption}`,mode:candidate.mode,chain:state.chain||1};
}

export function validateResonanceContextContracts(){
 const modes=new Set();
 for(const [region,rule] of Object.entries(RESONANCE_CONTEXT_CONTRACTS)){
  if(!GUARDIAN_RESONANCES[region]||!rule.mode||!rule.types.length||!rule.verbs.length||!rule.caption)throw Error('Contrat de Résonance incomplet : '+region);
  if(modes.has(rule.mode))throw Error('Mode de Résonance dupliqué : '+rule.mode);modes.add(rule.mode);
 }
 if(modes.size!==8)throw Error('Les huit Résonances hors combat doivent rester distinctes.');
 return true;
}
