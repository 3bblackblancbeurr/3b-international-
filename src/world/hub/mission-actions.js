import {advanceHubMission} from './mission-runtime.js';

const a=(id,label,verb='use',requires=[])=>Object.freeze({id,label,verb,requires:Object.freeze(requires)});
const stage=(...actions)=>Object.freeze(actions);

export const HUB_MISSION_ACTION_PLANS=Object.freeze({
 first_echo:Object.freeze([
  stage(a('signal:locate','Localiser le signal','scan')),
  stage(a('memory:restore','Restaurer le Souvenir','memoryVision')),
  stage(a('beacon:activate','Activer la balise','use')),
 ]),
 eight_signals:Object.freeze([
  stage(...Array.from({length:8},(_,i)=>a('frequency:'+(i+1),'Synchroniser la fréquence '+(i+1),'use'))),
  stage(a('door:identify','Identifier la Porte instable','scan')),
 ]),
 rooftops_circle:Object.freeze([
  stage(a('route:finish','Terminer le parcours des toits','vault')),
  stage(a('zipline:1','Prendre la première tyrolienne','zipline'),a('zipline:2','Prendre la seconde tyrolienne','zipline')),
  stage(a('belvedere:reach','Atteindre le belvédère','observe')),
 ]),
 storm_rescue:Object.freeze([
  stage(a('boat:prepare','Préparer le bateau de mission','board')),
  stage(a('crew:1','Secourir le premier membre','help'),a('crew:2','Secourir le deuxième membre','help'),a('crew:3','Secourir le troisième membre','help')),
  stage(a('port:return','Ramener l’équipage au port','ride')),
 ]),
 memory_under_water:Object.freeze([
  stage(a('dive:enter','Entrer dans la zone de plongée','dive')),
  stage(a('trace:1','Récupérer la première trace','collect'),a('trace:2','Récupérer la deuxième trace','collect'),a('trace:3','Récupérer la troisième trace','collect')),
  stage(a('dive:return','Remonter avec le Souvenir assemblé','swim')),
 ]),
 blue_blackout:Object.freeze([
  stage(a('relay:1','Réparer le relais 1','repair'),a('relay:2','Réparer le relais 2','repair'),a('relay:3','Réparer le relais 3','repair')),
  stage(a('datacenter:defend','Protéger le centre pendant le redémarrage','guard')),
 ]),
 garden_listens:Object.freeze([
  stage(a('sound:1','Suivre le son 1','observe'),a('sound:2','Suivre le son 2','observe'),a('sound:3','Suivre le son 3','observe'),a('sound:4','Suivre le son 4','observe')),
  stage(a('fog:wait','Observer le Jardin dans le brouillard','observe')),
  stage(a('tree:wake','Réveiller l’arbre-signal','memoryVision')),
 ]),
 voices_square:Object.freeze([
  stage(a('voice:1','Écouter le premier habitant','talk'),a('voice:2','Écouter le deuxième habitant','talk'),a('voice:3','Écouter le troisième habitant','talk')),
  stage(a('dispute:evidence','Scanner la preuve contradictoire','scan'),a('dispute:present','Présenter la preuve vérifiée aux habitants','showEvidence',['dispute:evidence'])),
  stage(a('meeting:organize','Organiser la rencontre','talk')),
 ]),
 passion_trial:Object.freeze([
  stage(a('challenge:1','Terminer le défi 1','fight'),a('challenge:2','Terminer le défi 2','fight'),a('challenge:3','Terminer le défi 3','fight')),
  stage(a('pressure:control','Garder le contrôle sous pression','observe')),
 ]),
 silent_cable:Object.freeze([
  stage(a('cable:inspect','Inspecter la ligne du téléphérique','inspect')),
  stage(a('pylon:repair','Réparer le pylône','repair')),
  stage(a('cabin:escort','Escorter la cabine jusqu’à la station','support')),
 ]),
 eight_seeds:Object.freeze([
  stage(...Array.from({length:8},(_,i)=>a('seed:'+(i+1),'Recueillir la graine '+(i+1),'collect'))),
  stage(a('conservatory:restore','Restaurer le conservatoire','assemble')),
 ]),
 golden_pattern:Object.freeze([
  stage(a('motif:scan','Scanner le motif','scan')),
  stage(a('material:assemble','Assembler le matériau','assemble')),
  stage(a('object:customize','Personnaliser l’objet','use')),
 ]),
 living_fabric:Object.freeze([
  stage(a('fiber:test','Tester la fibre','inspect')),
  stage(a('color:stabilize','Stabiliser la couleur Matrix','repair')),
 ]),
 lost_wolf_signal:Object.freeze([
  stage(a('track:1','Suivre la première trace','inspect'),a('track:2','Suivre la deuxième trace','inspect'),a('track:3','Suivre la troisième trace','inspect')),
  stage(a('animal:protect','Protéger l’animal-signal sans l’encercler','guard')),
 ]),
});

export const HUB_MISSION_ACTION_IDS=Object.freeze(Object.fromEntries(Object.entries(HUB_MISSION_ACTION_PLANS).map(([missionId,stages])=>[missionId,new Set(stages.flat().map(action=>action.id))])));

export function hasHubMissionActionPlan(missionId){return Object.hasOwn(HUB_MISSION_ACTION_PLANS,missionId);}

export function hubMissionActionStage(missionId,objective=0){
 return HUB_MISSION_ACTION_PLANS[missionId]?.[objective]||null;
}

export function hubMissionActionTargets(missionId,row,recorded=[]){
 if(!row||row.status!=='active')return[];
 const actions=hubMissionActionStage(missionId,row.completedObjectives);if(!actions)return[];
 const done=new Set(recorded);
 return actions.filter(action=>!done.has(action.id));
}

export function isHubMissionActionKnown(missionId,actionId){
 return HUB_MISSION_ACTION_IDS[missionId]?.has(actionId)===true;
}

export function applyHubMissionAction(missions,progress={},missionId,actionId){
 const row=missions?.[missionId];if(!row||row.status!=='active')return {ok:false,reason:'mission-inactive',missions,progress};
 const stageActions=hubMissionActionStage(missionId,row.completedObjectives);if(!stageActions)return {ok:false,reason:'no-action-stage',missions,progress};
 if(!stageActions.some(action=>action.id===actionId))return {ok:false,reason:'wrong-objective-action',missions,progress};
 const previous=Array.isArray(progress[missionId])?progress[missionId]:[];
 if(previous.includes(actionId))return {ok:true,duplicate:true,missions,progress};
 const selected=stageActions.find(action=>action.id===actionId);
 if(selected?.requires?.some(required=>!previous.includes(required)))return {ok:false,reason:'missing-action-dependency',missions,progress};
 const nextRecorded=[...previous,actionId].slice(-64),nextProgress={...progress,[missionId]:nextRecorded};
 const objectiveComplete=stageActions.every(action=>nextRecorded.includes(action.id));
 const nextMissions=objectiveComplete?advanceHubMission(missions,missionId,1,{checkpoint:`mission-action:${missionId}:${row.completedObjectives+1}`}):missions;
 return {ok:true,duplicate:false,objectiveComplete,missions:nextMissions,progress:nextProgress};
}

export function validateHubMissionActionPlans(){
 for(const [missionId,stages] of Object.entries(HUB_MISSION_ACTION_PLANS)){
  if(!stages.length)throw Error('Plan vide : '+missionId);
  const ids=new Set(),all=new Map();
  for(const actions of stages){
   if(!actions.length)throw Error('Objectif sans action : '+missionId);
   for(const action of actions){
    if(ids.has(action.id))throw Error('Action dupliquée : '+missionId+'/'+action.id);
    ids.add(action.id);all.set(action.id,action);
    if(!/^[a-z0-9:_-]+$/.test(action.id)||!action.label||!action.verb||!Array.isArray(action.requires))throw Error('Action invalide : '+missionId);
   }
  }
  for(const action of all.values())for(const required of action.requires){
   if(required===action.id||!all.has(required))throw Error('Dépendance action invalide : '+missionId+'/'+action.id+' -> '+required);
  }
 }
 return true;
}
