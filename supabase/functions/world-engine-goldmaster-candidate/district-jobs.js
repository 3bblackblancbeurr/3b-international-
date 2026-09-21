const a=(id,label,verb,x,z)=>Object.freeze({id,label,verb,x,z});
const stage=(...actions)=>Object.freeze(actions);
const job=(title,detail,{cost=0,reward={},xp=20,shards=0,target=[0,0],steps=[],regions=null,requiresSeal=null}={})=>Object.freeze({title,detail,cost,reward,xp,shards,target:Object.freeze(target),steps:Object.freeze(steps),regions:regions?Object.freeze(regions):null,requiresSeal});

export const DISTRICT_JOBS=Object.freeze({
 atelier:job('Le repas des bâtisseurs','Apporte une provision, vérifie les besoins de l’atelier puis livre sans interrompre le chantier.',{cost:1,reward:{wood:2,stone:1},xp:20,target:[-18,17],steps:[
  stage(a('atelier:inspect','Vérifier la liste des artisans','inspect',-23,13)),
  stage(a('atelier:deliver','Livrer la provision aux bâtisseurs','help',-18,17)),
 ]}),
 garden:job('Les jardins reprennent vie','Aide réellement aux parcelles avant de récupérer les provisions préparées par les jardiniers.',{cost:1,reward:{food:3},xp:20,target:[49,26],steps:[
  stage(a('garden:bed1','Remettre en état la première parcelle','repair',43,23),a('garden:bed2','Remettre en état la deuxième parcelle','repair',50,30)),
  stage(a('garden:harvest','Aider à la récolte','collect',55,24)),
 ]}),
 route_repair:job('La route cassée','Repère les dégâts, répare deux points différents puis fais contrôler le passage avant sa réouverture.',{reward:{stone:2},xp:30,shards:4,target:[-39,-22],steps:[
  stage(a('route:inspect','Inspecter la portion endommagée','inspect',-46,-26)),
  stage(a('route:repair1','Réparer la première cassure','repair',-42,-20),a('route:repair2','Réparer la deuxième cassure','repair',-34,-23)),
  stage(a('route:verify','Vérifier que le passage est sûr','observe',-29,-18)),
 ]}),
 lost_animal:job('Une trace dans les herbes','Retrouve un animal perdu sans le poursuivre : lis trois traces, approche calmement puis ramène sa position au refuge.',{reward:{food:2},xp:35,shards:5,target:[27,25],steps:[
  stage(a('animal:track1','Examiner la première trace','inspect',56,43),a('animal:track2','Examiner la deuxième trace','inspect',67,54),a('animal:track3','Examiner la troisième trace','inspect',75,65)),
  stage(a('animal:calm','Approcher l’animal sans l’effrayer','calm',83,72)),
  stage(a('animal:report','Ramener sa position au refuge','talk',27,25)),
 ]}),
 spring_clearance:job('La source encombrée','Retrouve la source, comprends ce qui bloque son écoulement puis dégage-la sans contaminer l’eau.',{reward:{food:2,stone:1},xp:35,shards:4,target:[38,32],steps:[
  stage(a('spring:inspect','Inspecter la source','inspect',37,37)),
  stage(a('spring:clear','Dégager l’obstruction','repair',41,34)),
  stage(a('spring:test','Vérifier le retour de l’eau','observe',45,31)),
 ]}),
 courier:job('Le paquet qui doit arriver','Récupère un paquet scellé, traverse le quartier et remets-le à son destinataire sans le remplacer par une simple téléportation de menu.',{cost:1,reward:{wood:2},xp:30,shards:6,target:[95,95],steps:[
  stage(a('courier:pickup','Récupérer le paquet','collect',-18,17)),
  stage(a('courier:checkpoint','Faire contrôler le sceau en route','inspect',34,44)),
  stage(a('courier:deliver','Remettre le paquet au destinataire','talk',95,95)),
 ]}),
 field_rescue:job('Deux personnes manquent à l’appel','Localise deux personnes distinctes, stabilise-les, remets la première debout, réanime la seconde puis évacue-les jusqu’au point sûr avant de revenir au refuge.',{cost:1,reward:{food:2,wood:1},xp:45,shards:8,target:[27,25],steps:[
  stage(a('rescue:locate1','Localiser la première personne','scan',64,-8),a('rescue:locate2','Localiser la deuxième personne','scan',78,4)),
  stage(a('rescue:help1','Stabiliser la première personne','help',64,-8),a('rescue:help2','Stabiliser la deuxième personne','help',78,4)),
  stage(a('rescue:support1','Soutenir la première personne pour la remettre debout','support',64,-8),a('rescue:revive2','Réanimer la deuxième personne','revive',78,4)),
  stage(a('rescue:escort1','Accompagner la première personne jusqu’au point sûr','support',49,10),a('rescue:carry2','Porter la deuxième personne jusqu’au point sûr','carry',54,15)),
  stage(a('rescue:return','Revenir au refuge et confirmer l’évacuation','talk',27,25)),
 ]}),
 signal_watch:job('Le signal qui décroche','Diagnostique le relais, répare ses deux modules, assemble le pont de synchronisation puis confirme la stabilité du signal.',{reward:{stone:2,wood:1},xp:40,shards:7,target:[-45,-99],steps:[
  stage(a('signal:inspect','Diagnostiquer le relais','scan',-51,-92)),
  stage(a('signal:align1','Réparer le premier module','repair',-47,-97),a('signal:align2','Réparer le deuxième module','repair',-41,-102)),
  stage(a('signal:bridge','Assembler le pont de synchronisation','assemble',-38,-104)),
  stage(a('signal:confirm','Confirmer la stabilité du signal','observe',-34,-106)),
 ]}),
 justice_case:job('Les dossiers revenus','Depuis sa libération, Céliane rouvre les dossiers que l’Oubli avait rendus contradictoires. Écoute deux versions, vérifie deux preuves, présente seulement ce qui est vérifiable puis apaise le désaccord sans choisir un coupable à la place des habitants.',{regions:['france'],requiresSeal:'france',reward:{stone:1},xp:65,shards:12,target:[27,25],steps:[
  stage(a('justice:witness1','Écouter le premier témoignage','talk',-103,-35),a('justice:witness2','Écouter le second témoignage','talk',-45,-99)),
  stage(a('justice:proof1','Scanner la première preuve','scan',-94,-63),a('justice:proof2','Scanner la deuxième preuve','scan',-30,4)),
  stage(a('justice:verify','Présenter uniquement les éléments vérifiés','showEvidence',-18,17)),
  stage(a('justice:mediate','Mener la médiation sans humilier une partie','talk',10,1)),
  stage(a('justice:report','Remettre le dossier au relais de Céliane','talk',27,25)),
 ]}),
});

export const DISTRICT_JOB_IDS=Object.freeze(Object.keys(DISTRICT_JOBS));

export function jobAvailableInContext(entry,region,seals=[]){if(!entry)return false;if(entry.regions&&!entry.regions.includes(region))return false;if(entry.requiresSeal&&!seals.includes(entry.requiresSeal))return false;return true;}

export function availableJobs(home,{region=null,seals=[]}={}){return Object.entries(DISTRICT_JOBS).filter(([id,entry])=>!home.jobs?.includes(id)&&home.activeJob!==id&&jobAvailableInContext(entry,region,seals));}

export function districtJobActionIds(id){return new Set((DISTRICT_JOBS[id]?.steps||[]).flat().map(action=>action.id));}

export function currentJobActions(home){
 const id=home?.activeJob,job=DISTRICT_JOBS[id];if(!job)return[];
 const stageIndex=Math.max(0,Math.min(job.steps.length,Number(home.jobStage)||0));if(stageIndex>=job.steps.length)return[];
 const done=new Set(home.jobProgress||[]);
 return job.steps[stageIndex].filter(action=>!done.has(action.id));
}

export function jobReadyToTurnIn(home){
 const job=DISTRICT_JOBS[home?.activeJob];return !!job&&(Number(home.jobStage)||0)>=job.steps.length;
}

export function applyDistrictJobAction(home,actionId){
 const id=home?.activeJob,job=DISTRICT_JOBS[id];if(!job)return {ok:false,reason:'no-active-job',home};
 const stageIndex=Math.max(0,Math.min(job.steps.length,Number(home.jobStage)||0));if(stageIndex>=job.steps.length)return {ok:false,reason:'ready-to-turn-in',home};
 const actions=job.steps[stageIndex];if(!actions.some(action=>action.id===actionId))return {ok:false,reason:'wrong-stage',home};
 const previous=Array.isArray(home.jobProgress)?home.jobProgress:[];if(previous.includes(actionId))return {ok:true,duplicate:true,home};
 const progress=[...previous,actionId],complete=actions.every(action=>progress.includes(action.id));
 return {ok:true,duplicate:false,stageComplete:complete,home:{...home,jobProgress:progress,jobStage:complete?stageIndex+1:stageIndex}};
}

export function districtJobActionItems(region,home){
 const id=home?.activeJob,job=DISTRICT_JOBS[id];if(!job||jobReadyToTurnIn(home))return[];
 return currentJobActions(home).map(action=>({
  id:`${region}:job-action:${id}:${action.id}`,
  type:'jobAction',
  job:id,
  actionId:action.id,
  actionLabel:action.label,
  actions:[action.verb],
  name:action.label,
  x:action.x,z:action.z,
  color:'#8edeb2',
  range:4.5,
 }));
}

export function districtJobTurnInItem(region,home){
 const id=home?.activeJob,job=DISTRICT_JOBS[id];if(!job||!jobReadyToTurnIn(home))return null;
 return {id:`${region}:job:${id}`,type:'job',job:id,name:'Terminer · '+job.title,x:job.target[0],z:job.target[1],color:'#efd28a',range:5};
}

export function validateDistrictJobs(){
 for(const [id,entry] of Object.entries(DISTRICT_JOBS)){
  if(!entry.steps.length)throw Error('Contrat sans étapes : '+id);const ids=new Set();
  for(const actions of entry.steps){if(!actions.length)throw Error('Étape vide : '+id);for(const action of actions){if(ids.has(action.id))throw Error('Action contrat dupliquée : '+action.id);ids.add(action.id);}}
 }
 return true;
}
