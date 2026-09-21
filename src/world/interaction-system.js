// Systemic interaction contract for the Monde du 3B.
// Rendering and input layers consume this catalog; progression remains server-authoritative.

export const ACTION_CATEGORIES=Object.freeze(['social','investigation','world','traversal','rescue','craft','vehicle','combat','companion','rest']);

export const ACTIONS=Object.freeze({
 talk:{label:'Parler',category:'social',animation:'Talk',audio:'talk',caption:'Conversation',haptic:'light',input:'press'},
 ask:{label:'Poser une question',category:'social',animation:'Talk',audio:'talk_soft',caption:'Question',haptic:'light',input:'press'},
 showEvidence:{label:'Montrer une preuve',category:'investigation',animation:'Inspect',audio:'evidence',caption:'Preuve présentée',haptic:'medium',input:'press'},
 inspect:{label:'Examiner',category:'investigation',animation:'Inspect',audio:'inspect',caption:'Élément examiné',haptic:'light',input:'press'},
 scan:{label:'Scanner',category:'investigation',animation:'Cast',audio:'scan',caption:'Analyse en cours',haptic:'light',input:'press'},
 memoryVision:{label:'Vision de Mémoire',category:'investigation',animation:'Cast',audio:'memory',caption:'Écho de mémoire',haptic:'medium',input:'press'},
 collect:{label:'Recueillir',category:'world',animation:'Pickup',audio:'collect',caption:'Objet recueilli',haptic:'medium',input:'press'},
 use:{label:'Utiliser',category:'world',animation:'Use',audio:'use',caption:'Mécanisme activé',haptic:'light',input:'press'},
 open:{label:'Ouvrir',category:'world',animation:'Use',audio:'door',caption:'Ouverture',haptic:'light',input:'press'},
 repair:{label:'Réparer',category:'craft',animation:'Work',audio:'repair',caption:'Réparation',haptic:'medium',input:'press'},
 assemble:{label:'Assembler',category:'craft',animation:'Work',audio:'assemble',caption:'Assemblage',haptic:'medium',input:'press'},
 help:{label:'Aider',category:'rescue',animation:'Help',audio:'help',caption:'Aide apportée',haptic:'medium',input:'press'},
 support:{label:'Soutenir',category:'rescue',animation:'Help',audio:'help',caption:'Personne soutenue',haptic:'medium',input:'press'},
 carry:{label:'Porter',category:'rescue',animation:'Carry',audio:'carry',caption:'Transport',haptic:'medium',input:'toggle'},
 revive:{label:'Réanimer',category:'rescue',animation:'Help',audio:'revive',caption:'Réanimation',haptic:'strong',input:'press'},
 climb:{label:'Grimper',category:'traversal',animation:'Climb',audio:'climb',caption:'Escalade',haptic:'light',input:'press'},
 vault:{label:'Franchir',category:'traversal',animation:'Vault',audio:'vault',caption:'Obstacle franchi',haptic:'light',input:'press'},
 descend:{label:'Descendre',category:'traversal',animation:'Climb',audio:'climb',caption:'Descente',haptic:'light',input:'press'},
 zipline:{label:'Prendre la tyrolienne',category:'traversal',animation:'Ride',audio:'zipline',caption:'Tyrolienne',haptic:'medium',input:'press'},
 swim:{label:'Nager',category:'traversal',animation:'Swim',audio:'water',caption:'Entrée dans l’eau',haptic:'light',input:'press'},
 dive:{label:'Plonger',category:'traversal',animation:'Dive',audio:'dive',caption:'Plongée',haptic:'medium',input:'press'},
 board:{label:'Monter',category:'vehicle',animation:'Ride',audio:'board',caption:'Embarquement',haptic:'light',input:'press'},
 drive:{label:'Conduire',category:'vehicle',animation:'Ride',audio:'engine',caption:'Conduite',haptic:'medium',input:'toggle'},
 ride:{label:'Voyager',category:'vehicle',animation:'Ride',audio:'transport',caption:'Transport',haptic:'light',input:'press'},
 sit:{label:'S’asseoir',category:'rest',animation:'Sit',audio:'cloth',caption:'Repos',haptic:'light',input:'press'},
 rest:{label:'Se reposer',category:'rest',animation:'Sit',audio:'rest',caption:'Repos',haptic:'light',input:'press'},
 observe:{label:'Observer',category:'investigation',animation:'Inspect',audio:'focus',caption:'Observation',haptic:'light',input:'press'},
 calm:{label:'Apaiser',category:'social',animation:'Cast',audio:'calm',caption:'Tentative d’apaisement',haptic:'medium',input:'press'},
 fight:{label:'Affronter',category:'combat',animation:'Draw',audio:'combat_ready',caption:'Combat',haptic:'strong',input:'press'},
 guard:{label:'Protéger',category:'combat',animation:'Guard',audio:'guard',caption:'Protection',haptic:'medium',input:'press'},
 commandCompanion:{label:'Donner un ordre',category:'companion',animation:'Point',audio:'companion',caption:'Ordre au compagnon',haptic:'light',input:'press'},
 travel:{label:'Traverser',category:'traversal',animation:'Walk',audio:'portal',caption:'Passage',haptic:'medium',input:'press'},
 enter:{label:'Entrer',category:'world',animation:'Walk',audio:'door',caption:'Entrée',haptic:'light',input:'press'},
});

const TYPE_ACTIONS=Object.freeze({
 portal:['travel','inspect'],
 hubNpc:['talk','ask'],
 hubGuardian:['talk','ask'],
 hubMission:['inspect'],
 hubTransport:['ride'],
 hubBuilding:['enter','inspect'],
 hubEvent:['inspect'],
 hubSecret:['inspect'],
 hubSecretStep:['inspect'],
 story:['talk','inspect'],
 echo:['calm','observe','fight'],
 guardian:['fight','observe'],
 patrol:['fight','observe'],
 beacon:['collect','memoryVision'],
 valueTrial:['observe'],
 final:['fight','observe'],
 resource:['collect'],
 job:['help'],
 survey:['observe'],
 cooperation:['talk'],
 door:['open','inspect'],
 evidence:['inspect','scan','showEvidence'],
 trace:['inspect','memoryVision'],
 console:['use','repair'],
 repairable:['inspect','repair'],
 craftStation:['assemble','repair'],
 injured:['help','support','carry'],
 downedPlayer:['revive'],
 ladder:['climb','descend'],
 ledge:['vault','climb'],
 zipline:['zipline'],
 water:['swim','dive'],
 vehicle:['board','drive'],
 boat:['board','drive'],
 train:['board','ride'],
 seat:['sit'],
 bed:['rest'],
 animal:['observe','calm'],
});

function cloneAction(id,overrides={}){
 const base=ACTIONS[id];return base?{id,...base,...overrides}:null;
}

export function contextActions(item,context={}){
 if(!item)return[];
 let ids=[...(TYPE_ACTIONS[item.type]||item.actions||['inspect'])];const save=context.save||{},region=context.region||item.region,actions=[];
 if(item.type==='echo'&&!save.adventure?.chapters?.[region]?.helped)ids=ids.filter(id=>id!=='calm');
 for(const id of ids){
  if(id==='collect'&&item.done)continue;
  if(id==='fight'&&item.done)continue;
  if(id==='memoryVision'&&context.visionAvailable===false)continue;
  if(id==='drive'&&item.passengerOnly)continue;
  if(id==='repair'&&item.repaired)continue;
  if(id==='open'&&item.locked&&!context.hasKey)continue;
  let overrides={};
  if(item.type==='portal')overrides={label:item.id==='hub'?'Retourner à la Cité':'Traverser la Porte'};
  if(item.type==='hubMission'){const row=save.hub?.missions?.[item.missionId];overrides={label:item.locked?'Voir les prérequis':row?.status==='available'?'Commencer la mission':row?.status==='active'?'Voir l’objectif':row?.status==='completed'&&!row?.claimed?'Récupérer la récompense':'Mission accomplie'};}
  if(item.type==='beacon')overrides={label:item.done?'Souvenir retrouvé':'Recueillir le Souvenir'};
  if(item.type==='guardian')overrides={label:save.seals?.includes(item.region)?'Défier à nouveau':'Affronter le Gardien'};
  if(item.type==='hubGuardian'&&id==='talk')overrides={label:'Parler au Gardien'};
  const action=cloneAction(id,overrides);if(action)actions.push(action);
 }
 return actions;
}

export function primaryContextAction(item,context={}){
 return contextActions(item,context)[0]||null;
}

export function actionFeedback(id){
 const action=ACTIONS[id];if(!action)return null;
 return {animation:action.animation,audio:action.audio,caption:action.caption,haptic:action.haptic,input:action.input};
}

export function validateInteractionCatalog(){
 for(const [id,action] of Object.entries(ACTIONS)){
  if(!ACTION_CATEGORIES.includes(action.category))throw Error('Catégorie interaction inconnue : '+id);
  if(!['press','toggle'].includes(action.input))throw Error('Mode d’entrée non accessible : '+id);
  if(!action.label||!action.audio||!action.caption)throw Error('Interaction incomplète : '+id);
 }
 for(const [type,ids] of Object.entries(TYPE_ACTIONS))for(const id of ids)if(!ACTIONS[id])throw Error('Action inconnue '+id+' pour '+type);
 return true;
}
