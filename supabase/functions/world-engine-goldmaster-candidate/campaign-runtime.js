import {CAMPAIGN_RUNTIME_SPEC} from './campaign-spec.js';
import {blankCampaignState,normalizeCampaignState} from './campaign-state.js';
import {REALM_REFERENCE_RADIUS,realmCampaignPosition,realmPositionValid,safeRealmPosition} from './realm-layout.js';
import {GUARDIAN_VALUES,guardianValueStep,guardianValueOptions,guardianValueDecision} from './guardian-values.js';
import {COUNTRIES} from './catalog.js';

export const CAMPAIGN_TICK=100;
const requireThat=(ok,message)=>{if(!ok)throw Error(message);};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const operationSet=new Set(['interact','tick','strike','guard','repair','retry']);
const modeOperations={escort:['interact'],hazard:['interact'],route:['interact'],relay:['interact'],rhythm:['strike','guard'],defend:['guard'],rebuild:['repair']};
const phaseState=(save,region)=>normalizeCampaignState(region,save.adventure?.campaigns?.[region]);
export function campaignObjectiveId(region,phase,step){return `${region}:${phase.id}:${step.id}`;}
function anchorFor(region,state,step){
 if(step.homecoming){const i=COUNTRIES.findIndex(c=>c.id===region),a=i*Math.PI/4;return{x:Math.cos(a)*32,z:Math.sin(a)*32};}
 if(step.guardian)return realmCampaignPosition(region,3);
 const index=state.phase===3||state.phase===4?state.step:state.phase===7?2:Math.min(2,state.phase);
 const base=realmCampaignPosition(region,index),offset=step.offset||[state.step*13,0];
 return safeRealmPosition(region,{x:base.x+offset[0],z:base.z+offset[1]});
}
function checkpoints(region,state,step){
 const base=anchorFor(region,state,step),variant=step.routeVariant||0;
 const offsets=variant===1?[[8,0],[8,12],[-5,12],[-5,25]]:variant===2?[[12,0],[12,16],[0,16],[-12,16]]:variant===3?[[10,0],[10,14],[-4,14],[-4,28]]:[[9,0],[9,14],[-5,14],[-5,28]];
 return offsets.map(([x,z])=>safeRealmPosition(region,{x:base.x+x,z:base.z+z}));
}
function targetFor(region,state,step){
 if(step.mode==='escort'&&state.started&&state.escort)return state.escort;
 if(step.mode==='route'&&state.started)return checkpoints(region,state,step)[Math.min(3,state.trial)];
 if(step.mode==='relay'&&state.started){const base=anchorFor(region,state,step);return safeRealmPosition(region,{x:base.x+18,z:base.z});}
 return anchorFor(region,state,step);
}
function sceneChoices(save,region,state,step){
 if(step.value!==undefined)return guardianValueOptions(region,save.adventure?.values?.[region]).map(({id,label,consequence})=>({id,label,consequence}));
 if(step.mode==='rebuild'&&state.started&&state.trial===2)return[{id:'alternative',label:'Renforcer le nouvel assemblage'},{id:'identique',label:'Recommencer le plan qui a échoué'}];
 return(step.choices||[]).map(({id,label})=>({id,label}));
}
export function campaignSnapshot(save,region=save.region){
 const spec=CAMPAIGN_RUNTIME_SPEC[region];if(!spec)return null;
 const state=phaseState(save,region),phase=spec[state.phase],step=phase?.steps[state.step];
 if(!phase||!step)return{region,active:state.active,finished:true,phaseIndex:8,completed:state.completed,effects:state.effects,message:state.message,title:'Héritage retrouvé',progress:1};
 const target=targetFor(region,state,step),period=step.period||(step.mode==='rhythm'?12:30),window=step.window||(step.mode==='rhythm'?[4,8]:[6,14]);
 const value=step.value!==undefined?guardianValueStep(region,save.adventure?.values?.[region]):null;
 const mode=step.mode||(step.guardian?'guardian':step.homecoming?'homecoming':step.value!==undefined?'value':step.memory!==undefined?'memory':step.choices?'choice':'interact');
 const actions=state.integrity<=0?[{operation:'retry',label:'Reprendre cette épreuve'}]:!state.started&&step.mode?[{operation:'interact',label:'Commencer l’épreuve'}]:(modeOperations[mode]||['interact']).map(operation=>({operation,label:{interact:mode==='route'?'Confirmer le repère':mode==='hazard'?'Traverser dans la fenêtre':'Agir ici',strike:'Frappe sur le temps',guard:'Garde · reprendre le contrôle',repair:'Réparer l’assemblage'}[operation]||operation}));
 const actionCooldown=mode==='rhythm'?Math.max(0,3-(state.tick-state.actionTick))*CAMPAIGN_TICK:mode==='rebuild'&&state.started?Math.max(0,5-state.clock)*CAMPAIGN_TICK:0;
 return{region,active:state.active,finished:false,phaseIndex:state.phase,phaseId:phase.id,title:phase.title,stepIndex:state.step,stepCount:phase.steps.length,objective:campaignObjectiveId(region,phase,step),name:step.name,dialogue:value?.prompt||step.dialogue,instruction:state.message||step.dialogue,mode,target,range:6,choices:sceneChoices(save,region,state,step),actions,actionReady:actionCooldown===0,actionCooldown,started:state.started,tick:state.tick,clock:state.clock,period,window,safe:state.clock%period>=window[0]&&state.clock%period<=window[1],trial:state.trial,trialCount:mode==='escort'||mode==='route'?4:mode==='rhythm'?5:mode==='relay'?15:3,integrity:state.integrity,intensity:state.intensity,escort:state.escort,escortGoal:mode==='escort'&&state.started?checkpoints(region,state,step)[Math.min(3,state.trial)]:null,relay:mode==='relay'?{companion:anchorFor(region,state,step),player:target,hold:state.trial,required:15}:null,effects:state.effects,completed:state.completed,inventory:state.inventory,attempt:state.attempt,progress:(state.phase+state.step/phase.steps.length)/8};
}
export function activeCampaignSnapshot(save){
 if(CAMPAIGN_RUNTIME_SPEC[save.region])return campaignSnapshot(save,save.region);
 return Object.keys(CAMPAIGN_RUNTIME_SPEC).map(region=>campaignSnapshot(save,region)).find(s=>s.active&&!s.finished&&s.phaseId==='homecoming')||null;
}
export function campaignObjectives(save,region=save.region){
 const regions=region==='hub'?Object.keys(CAMPAIGN_RUNTIME_SPEC):[region];
 return regions.flatMap(country=>{const s=campaignSnapshot(save,country);if(!s||s.finished||region==='hub'&&(s.phaseId!=='homecoming'||!s.active)||region!=='hub'&&s.phaseId==='homecoming'||save.adventure?.encounter&&!save.adventure.encounter.result)return[];return[{id:s.objective,type:'campaignObjective',region:country,name:s.name,label:s.title,description:s.dialogue,...s.target,range:s.range,mode:s.mode,phase:s.phaseId,step:s.stepIndex,color:'#eddba9',campaign:s}];});
}
function resetTrial(state){Object.assign(state,{clock:0,started:false,trial:0,integrity:100,intensity:0,lastOperation:null,escort:null,protectionUntil:0});}
function completeStep(region,state,step,choice){
 for(const id of step.consume||[]){requireThat((state.inventory[id]||0)>0,'Il manque un objet confié.');state.inventory[id]--;}
 if(step.grant)state.inventory[step.grant]=Math.min(9,(state.inventory[step.grant]||0)+1);
 if(step.effect&&!state.effects.includes(step.effect))state.effects.push(step.effect);
 if(choice)state.history.push({id:campaignObjectiveId(region,CAMPAIGN_RUNTIME_SPEC[region][state.phase],step),choice});
 state.step++;state.message='';resetTrial(state);
 const phase=CAMPAIGN_RUNTIME_SPEC[region][state.phase];
 if(state.step>=phase.steps.length){state.completed.push(phase.id);state.phase++;state.step=0;return phase.id;}return null;
}
function failTrial(state,message,loss=25){state.integrity=Math.max(0,state.integrity-loss);state.message=state.integrity?message:'L’épreuve a échoué. Reprends-la ; tes souvenirs acquis restent conservés.';}

/** Inputs describe a local action, never a submitted outcome. The account
 * engine persists this ledger through CAS/journal replay. Position is validated
 * against the shared realm footprint; it is still a client position claim,
 * not an authoritative continuous walking simulation. */
export function applyCampaignAction(save,action){
 const region=action.region||save.region,spec=CAMPAIGN_RUNTIME_SPEC[region];requireThat(spec,'Campagne inconnue.');
 const state=phaseState(save,region),phase=spec[state.phase],step=phase?.steps[state.step];
 if(spec.slice(0,state.phase).some(p=>p.steps.some(s=>campaignObjectiveId(region,p,s)===action.objective)))return{state,duplicate:true};
 requireThat(state.phase<8&&phase&&step,'Cet héritage est déjà retrouvé.');
 const id=campaignObjectiveId(region,phase,step);
 // Replayed successful interactions are idempotent, including after a reload.
 if(action.objective!==id){const complete=spec.slice(0,state.phase).flatMap(p=>p.steps.map(s=>campaignObjectiveId(region,p,s))),earlier=phase.steps.slice(0,state.step).map(s=>campaignObjectiveId(region,phase,s));if(complete.includes(action.objective)||earlier.includes(action.objective))return{state,duplicate:true};throw Error('Objectif hors ordre.');}
 requireThat(save.visited?.includes(region),'Traverse d’abord la porte de ce royaume.');
 requireThat(save.region===(step.homecoming?'hub':region),'Rejoins le lieu de cette étape.');
 const operation=action.operation||'interact';requireThat(operationSet.has(operation),'Action de campagne inconnue.');
 const position=action.position;requireThat(position&&Number.isFinite(position.x)&&Number.isFinite(position.z),'Position de campagne manquante.');
 const valid=step.homecoming?Math.hypot(position.x,position.z)<=REALM_REFERENCE_RADIUS:realmPositionValid(region,position);
 requireThat(valid,'Cette position est hors du monde praticable.');
 const target=targetFor(region,state,step),separation=distance(position,target);
 requireThat(separation<=(operation==='tick'?55:6.5),'Approche-toi du véritable point d’action.');
 state.active=true;
 if(operation==='tick'){
  requireThat(step.mode&&state.started,'Commence l’épreuve avant son cycle.');
  requireThat(Number.isInteger(action.tick)&&action.tick>0,'Cycle de campagne invalide.');
  if(action.tick<=state.tick)return{state,duplicate:true};requireThat(action.tick===state.tick+1,'Cycle manquant : renvoie les commandes dans l’ordre.');
  state.tick++;state.clock++;if(state.integrity<=0)return{state};
  if(step.mode==='rhythm')state.intensity=Math.max(0,state.intensity-1);
  if(step.mode==='escort'){
   if(separation>8)failTrial(state,'Le groupe attend. Rapproche-toi sans abandonner les plus lents.',2);
   else{const goal=checkpoints(region,state,step)[state.trial],d=distance(state.escort,goal);if(d<=.35){state.trial++;if(state.trial===4)return{state,completedPhase:completeStep(region,state,step),completedObjective:id};}else state.escort={x:state.escort.x+(goal.x-state.escort.x)/d*.32,z:state.escort.z+(goal.z-state.escort.z)/d*.32};}
  }
  if(step.mode==='relay'){
   const linked=save.adventure.companion&&!save.adventure.companionHidden&&save.adventure.companionOrder==='guard';
   if(linked&&separation<=6.5)state.trial++;else state.trial=Math.max(0,state.trial-1);
   if(state.trial>=15)return{state,completedPhase:completeStep(region,state,step),completedObjective:id};
   state.message=linked?'Le compagnon tient son plateau. Rejoins le second et maintiens le lien.':'Place un compagnon visible en garde, puis rejoins le second plateau.';
  }
  if(step.mode==='defend'&&state.clock%10===0){if(state.clock>(state.protectionUntil||0))failTrial(state,'L’ouvrage reçoit un coup. Garde pendant la préparation du prochain.',20);state.trial++;if(state.trial>=3&&state.integrity>0)return{state,completedPhase:completeStep(region,state,step),completedObjective:id};}
  return{state};
 }
 if(operation==='retry'){requireThat(state.integrity<=0,'Cette épreuve peut encore être poursuivie.');state.attempt++;resetTrial(state);state.message='Nouvelle tentative. Les ressources confiées ne sont pas dépensées deux fois.';return{state};}
 requireThat(state.integrity>0,'Reprends d’abord l’épreuve.');
 for(const token of step.requires||[])requireThat((state.inventory[token]||0)>0,'Retrouve d’abord les traces et objets nécessaires.');
 if(step.guardian){requireThat(operation==='interact','Approche le Gardien pour commencer.');return{state,startGuardian:true};}
 if(step.homecoming){requireThat(save.seals.includes(region),'Libère d’abord le Gardien.');requireThat(operation==='interact','Rapporte le fragment à la Cité.');}
 if(step.mode&&!state.started){requireThat(operation==='interact','Commence l’épreuve sur place.');if(step.requiresCompanion)requireThat(save.adventure.companion&&!save.adventure.companionHidden,'Choisis un compagnon visible pour les deux plateaux.');state.started=true;state.clock=0;state.trial=0;state.escort=step.mode==='escort'?anchorFor(region,state,step):null;state.message=step.dialogue;return{state};}
 if(step.mode){
  if(step.mode==='hazard'){requireThat(operation==='interact','Observe avant de traverser.');const period=step.period||30,window=step.window||[6,14],cycle=state.clock%period;if(cycle<window[0]||cycle>window[1]){failTrial(state,'La zone était encore dangereuse. Attends le prochain signal lisible.');return{state};}}
  else if(step.mode==='route'){requireThat(operation==='interact','Confirme ce repère sur place.');state.trial++;if(state.trial<4){state.message='Repère vérifié. Rejoins le suivant dans l’ordre.';return{state};}}
  else if(step.mode==='rhythm'){
   const expected=['strike','guard','strike','guard','strike'][state.trial];requireThat(['strike','guard'].includes(operation),'Cette épreuve demande une frappe ou une garde.');
   requireThat(state.tick-state.actionTick>=3,'Laisse au geste le temps de se terminer.');
   if(operation!==expected){failTrial(state,'L’enchaînement s’est emballé. Respecte la respiration annoncée.',15);state.intensity=Math.min(100,state.intensity+25);return{state};}
   if(operation==='strike'){const period=step.period||12,window=step.window||[4,8],cycle=state.clock%period;if(cycle<window[0]||cycle>window[1]||state.intensity>=80){failTrial(state,'Frappe hors du temps clair ou surchauffe. Reprends ton rythme.',15);return{state};}state.intensity=Math.min(100,state.intensity+35);}else state.intensity=Math.max(0,state.intensity-45);
   state.lastOperation=operation;state.actionTick=state.tick;state.trial++;if(state.trial<5){state.message='Geste maîtrisé. Le prochain temps demande '+(['strike','guard','strike','guard','strike'][state.trial]==='strike'?'une frappe.':'une garde.');return{state};}
  }else if(step.mode==='defend'){requireThat(operation==='guard','Tiens une garde dans la fenêtre annoncée.');state.protectionUntil=state.clock+8;state.message='Garde placée pour les huit prochains cycles.';return{state};}
  else if(step.mode==='rebuild'){
   requireThat(operation==='repair','Ce chantier demande une réparation.');requireThat(state.clock>=5,'Observe l’assemblage pendant un demi-seconde avant d’agir.');
   if(state.trial===0){state.trial=1;state.clock=0;state.message='Premier assemblage réparé. Examine le second.';return{state};}
   if(state.trial===1){state.trial=2;state.clock=0;state.message='Le second assemblage cède. Le renfort latéral peut ouvrir une autre solution.';return{state};}
   if(state.trial===2&&action.choice!=='alternative'){failTrial(state,'Le même plan reproduit la même rupture. Choisis le renfort latéral.');return{state};}
  }else if(step.mode==='escort'||step.mode==='relay')throw Error('Cette étape avance par ta présence dans le monde.');
 }
 let valueState=null;
 if(step.value!==undefined){requireThat(operation==='interact','Cette décision doit être prise sur place.');if(!save.adventure.values?.[region]?.completed){const decision=guardianValueDecision(region,save.adventure.values?.[region],action.choice);requireThat(decision.ok,'Choix de valeur inconnu.');valueState=decision.state;if(valueState.reflectionNeeded){state.message='Les décisions ont créé des tensions. Assume leur conséquence ici.';return{state,valueState};}}}
 else if(step.choices){requireThat(operation==='interact','Prends cette décision sur place.');requireThat(step.choices.some(c=>c.id===action.choice),'Réponse inconnue.');if(!(step.answers||[step.answer]).includes(action.choice)){failTrial(state,'Ce choix ne résout pas le problème rencontré. Relis les traces et les conséquences.',20);return{state};}}
 else if(!step.mode)requireThat(operation==='interact','Interaction locale requise.');
 const memory=step.memory,completedPhase=completeStep(region,state,step,action.choice);
 return{state,valueState,memory,completedPhase,completedObjective:id,homecoming:!!step.homecoming};
}

export function completeCampaignGuardian(save,region){
 const state=phaseState(save,region);if(!state.active||state.phase!==5)return null;
 return{state,completedPhase:completeStep(region,state,CAMPAIGN_RUNTIME_SPEC[region][5].steps[0]),completedObjective:region+':guardian:guardian'};
}
export function claimCampaignPhase(region,result){
 if(!result.completedPhase||result.state.claimed.includes(result.completedPhase))return{xp:0,shards:0};
 result.state.claimed.push(result.completedPhase);
 return result.completedPhase==='guardian'?{xp:0,shards:0}:result.completedPhase==='post'?{xp:160,shards:45}:{xp:90,shards:22};
}
