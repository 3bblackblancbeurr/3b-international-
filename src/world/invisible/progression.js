import {INVISIBLE_EPISODE,INVISIBLE_EPISODES,INVISIBLE_EPISODE_BY_ID,INVISIBLE_CONVERGENCE,INVISIBLE_REALMS,getInvisibleEpisode} from './catalog.js';

const franceId=INVISIBLE_EPISODE.id;
const otherEpisodes=INVISIBLE_EPISODES.filter(episode=>episode.id!==franceId);
const realmName=id=>INVISIBLE_REALMS.find(realm=>realm.id===id).name;
const memoryKind=(episodeId,kind)=>episodeId===franceId?kind:'episode:'+episodeId+':'+kind;
const canonicalMemory=Object.freeze([
 ...INVISIBLE_EPISODES.flatMap(episode=>[
  {kind:memoryKind(episode.id,'start'),text:episode.id===franceId?'Céliane m’a confié le secret du Léman.':episode.guardian+' m’a confié « '+episode.title+' » à '+episode.city+'.',episodeId:episode.id,event:'start'},
  ...episode.points.map(point=>({kind:memoryKind(episode.id,'riddle:'+point.id),text:episode.id===franceId?'J’ai résolu « '+point.name+' ».':'À '+episode.city+', j’ai résolu « '+point.name+' ».',episodeId:episode.id,event:'riddle',pointId:point.id})),
  {kind:memoryKind(episode.id,'fragment'),text:'J’ai retrouvé le '+episode.fragment.name+' dans le coffre virtuel.',episodeId:episode.id,event:'fragment'},
  {kind:memoryKind(episode.id,'portal'),text:'J’ai activé le portail du royaume de '+realmName(episode.realm)+'.',episodeId:episode.id,event:'portal'},
 ]),
 {kind:'convergence',text:'J’ai relié les huit fragments du Monde Invisible : ENSEMBLE.',event:'convergence'},
]);
const memoryByKind=new Map(canonicalMemory.map(row=>[row.kind,row]));
export const INVISIBLE_MEMORY_REVISION_LIMIT=1_000_000_000;
const fail=text=>{throw Error(text);};
const requireThat=(condition,text)=>{if(!condition)fail(text);};
const normalizeAnswer=value=>typeof value==='string'&&value.length<=120?value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim().replace(/[.!?]+$/,'').replace(/\s+/g,' '):'';
const blankProgress=()=>({started:false,solved:[],chestOpened:false,portalOpened:false});
const publicMemory=row=>({kind:row.kind,text:row.text});

export function blankInvisibleState(){
 return {...blankProgress(),activeEpisode:franceId,journeys:Object.fromEntries(otherEpisodes.map(episode=>[episode.id,blankProgress()])),convergenceCompleted:false,memoryConsent:false,memoryRevision:0,memory:[],mode:'remote'};
}

function normalizeProgress(input,episode){
 const progress=blankProgress();
 if(!input||typeof input!=='object'||Array.isArray(input))return progress;
 progress.started=input.started===true;
 // Preserve only the ordered, contiguous prefix. Imported flags cannot skip a step.
 if(progress.started&&Array.isArray(input.solved))for(const point of episode.points){
  if(input.solved[progress.solved.length]!==point.id)break;
  progress.solved.push(point.id);
 }
 progress.chestOpened=progress.solved.length===episode.points.length&&input.chestOpened===true;
 progress.portalOpened=progress.chestOpened&&input.portalOpened===true;
 return progress;
}

// Internal access reads an already normalized state without recursively normalizing it.
function progressFor(state,episodeId){
 return episodeId===franceId?{started:state.started,solved:state.solved,chestOpened:state.chestOpened,portalOpened:state.portalOpened}:state.journeys[episodeId];
}
function completedFragments(state){
 return INVISIBLE_EPISODES.filter(episode=>progressFor(state,episode.id).chestOpened).map(episode=>episode.id);
}
function memoryAllowed(row,state){
 if(row.event==='convergence')return state.convergenceCompleted;
 const progress=progressFor(state,row.episodeId);
 return row.event==='start'?progress.started:row.event==='fragment'?progress.chestOpened:row.event==='portal'?progress.portalOpened:progress.solved.includes(row.pointId);
}

export function normalizeInvisibleState(input){
 const state=blankInvisibleState();
 if(!input||typeof input!=='object'||Array.isArray(input))return state;
 Object.assign(state,normalizeProgress(input,INVISIBLE_EPISODE));
 state.activeEpisode=typeof input.activeEpisode==='string'&&Object.hasOwn(INVISIBLE_EPISODE_BY_ID,input.activeEpisode)?input.activeEpisode:franceId;
 for(const episode of otherEpisodes)state.journeys[episode.id]=normalizeProgress(input.journeys?.[episode.id],episode);
 state.convergenceCompleted=input.convergenceCompleted===true&&completedFragments(state).length===INVISIBLE_EPISODES.length;
 state.mode=input.mode==='walk'?'walk':'remote';
 state.memoryConsent=input.memoryConsent===true;
 state.memoryRevision=Number.isSafeInteger(input.memoryRevision)?Math.max(0,Math.min(INVISIBLE_MEMORY_REVISION_LIMIT,input.memoryRevision)):0;
 if(state.memoryConsent&&Array.isArray(input.memory)){
  const recorded=new Set(input.memory.filter(row=>{
   const canonical=row&&memoryByKind.get(row.kind);
   return canonical&&canonical.text===row.text&&memoryAllowed(canonical,state);
  }).map(row=>row.kind));
  state.memory=canonicalMemory.filter(row=>recorded.has(row.kind)).map(publicMemory);
 }
 return state;
}

export function invisibleEpisodeProgress(input,id=input?.activeEpisode){
 const state=normalizeInvisibleState(input),episode=getInvisibleEpisode(id??state.activeEpisode);
 const progress=progressFor(state,episode.id);
 return {...progress,solved:[...progress.solved]};
}

export function invisibleCompletedFragments(input){return completedFragments(normalizeInvisibleState(input));}

export function invisibleCampaignSummary(input){
 const state=normalizeInvisibleState(input),fragments=completedFragments(state);
 return {
  total:INVISIBLE_EPISODES.length,completed:fragments.length,fragments,
  convergenceReady:fragments.length===INVISIBLE_EPISODES.length,
  convergenceCompleted:state.convergenceCompleted,
  episodes:INVISIBLE_EPISODES.map(episode=>({id:episode.id,realm:episode.realm,city:episode.city,title:episode.title,fragment:episode.fragment,...progressFor(state,episode.id)})),
 };
}

function remember(state,kind){
 if(!state.memoryConsent||state.memory.some(row=>row.kind===kind))return state;
 return {...state,memory:[...state.memory,publicMemory(memoryByKind.get(kind))]};
}
function withProgress(state,episodeId,progress){
 return episodeId===franceId?{...state,...progress}:{...state,journeys:{...state.journeys,[episodeId]:progress}};
}
function actionEpisode(state,action){
 const id=action.episodeId??state.activeEpisode;
 requireThat(typeof id==='string'&&Object.hasOwn(INVISIBLE_EPISODE_BY_ID,id),'Cet épisode du Monde Invisible n’existe pas.');
 return INVISIBLE_EPISODE_BY_ID[id];
}

export function applyInvisibleAction(input,action){
 const state=normalizeInvisibleState(input);
 requireThat(action&&typeof action.type==='string','Action du Monde Invisible manquante.');
 switch(action.type){
  case 'invisibleSelectEpisode':{
   requireThat(typeof action.episodeId==='string'&&Object.hasOwn(INVISIBLE_EPISODE_BY_ID,action.episodeId),'Cet épisode du Monde Invisible n’existe pas.');
   return {...state,activeEpisode:action.episodeId};
  }
  case 'invisibleStart':{
   const episode=actionEpisode(state,action),progress=progressFor(state,episode.id);
   return progress.started?state:remember(withProgress(state,episode.id,{...progress,started:true}),memoryKind(episode.id,'start'));
  }
  case 'invisibleMode':
   requireThat(['remote','walk'].includes(action.mode),'Choisis le mode à distance ou promenade.');
   return {...state,mode:action.mode};
  case 'invisibleAnswer':{
   const episode=actionEpisode(state,action),progress=progressFor(state,episode.id);
   requireThat(progress.started,'Commence d’abord '+(episode.id===franceId?'le secret du Léman':'cet épisode à '+episode.city)+'.');
   const point=episode.points.find(point=>point.id===action.id);
   requireThat(point,'Cette trace n’existe pas dans cet épisode.');
   const answer=normalizeAnswer(action.answer);
   requireThat(answer&&point.riddle.answers.some(value=>normalizeAnswer(value)===answer),'La réponse ne correspond pas encore à l’indice. Réessaie ou consulte l’aide.');
   if(progress.solved.includes(point.id))return state;
   requireThat(episode.points[progress.solved.length]?.id===point.id,'Résous les traces dans l’ordre indiqué par '+episode.guardian+'.');
   return remember(withProgress(state,episode.id,{...progress,solved:[...progress.solved,point.id]}),memoryKind(episode.id,'riddle:'+point.id));
  }
  case 'invisibleChest':{
   const episode=actionEpisode(state,action),progress=progressFor(state,episode.id);
   requireThat(progress.started&&progress.solved.length===episode.points.length,'Résous les trois énigmes avant d’ouvrir le coffre virtuel.');
   return progress.chestOpened?state:remember(withProgress(state,episode.id,{...progress,chestOpened:true}),memoryKind(episode.id,'fragment'));
  }
  case 'invisiblePortal':{
   const episode=actionEpisode(state,action),progress=progressFor(state,episode.id);
   requireThat(progress.chestOpened,'Retrouve d’abord le '+episode.fragment.name+' dans le coffre.');
   return progress.portalOpened?state:remember(withProgress(state,episode.id,{...progress,portalOpened:true}),memoryKind(episode.id,'portal'));
  }
  case 'invisibleConvergence':{
   requireThat(completedFragments(state).length===INVISIBLE_EPISODES.length,'Retrouve les huit fragments dans leurs coffres avant de résoudre la convergence.');
   const answer=normalizeAnswer(action.answer);
   requireThat(answer&&INVISIBLE_CONVERGENCE.answers.some(value=>normalizeAnswer(value)===answer),'La réponse ne relie pas encore les huit fragments. Consulte l’indice et réessaie.');
   return state.convergenceCompleted?state:remember({...state,convergenceCompleted:true},'convergence');
  }
  case 'invisibleMemoryConsent':
   requireThat(typeof action.enabled==='boolean','Le choix de mémoire doit être explicite.');
   if(action.enabled){
    const expected=action.expectedMemoryRevision??0;
    requireThat(Number.isSafeInteger(expected)&&expected===state.memoryRevision,'Le choix de mémoire a changé sur un autre appareil. Synchronise avant de l’activer à nouveau.');
    requireThat(state.memoryRevision<INVISIBLE_MEMORY_REVISION_LIMIT,'La mémoire ne peut plus être activée sur cette sauvegarde.');
   }
   // Withdrawal is always accepted, even from an older tab. A stale activation
   // cannot override it after its journal is replayed by the server.
   return {...state,memoryConsent:action.enabled,memoryRevision:Math.min(INVISIBLE_MEMORY_REVISION_LIMIT,state.memoryRevision+1),memory:action.enabled?state.memory:[]};
  case 'invisibleForget':return {...state,memoryConsent:false,memoryRevision:Math.min(INVISIBLE_MEMORY_REVISION_LIMIT,state.memoryRevision+1),memory:[]};
  default:fail('Action du Monde Invisible inconnue.');
 }
}
