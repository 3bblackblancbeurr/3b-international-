import {INVISIBLE_EPISODE} from './catalog.js';

const pointIds=INVISIBLE_EPISODE.points.map(point=>point.id);
const canonicalMemory=Object.freeze([
 {kind:'start',text:'Céliane m’a confié le secret du Léman.'},
 ...INVISIBLE_EPISODE.points.map(point=>({kind:'riddle:'+point.id,text:'J’ai résolu « '+point.name+' ».'})),
 {kind:'fragment',text:'J’ai retrouvé le Fragment de la Justice dans le coffre virtuel.'},
 {kind:'portal',text:'J’ai activé le portail du royaume de France.'},
]);
const memoryByKind=new Map(canonicalMemory.map(row=>[row.kind,row]));
export const INVISIBLE_MEMORY_REVISION_LIMIT=1_000_000_000;
const fail=text=>{throw Error(text);};
const requireThat=(condition,text)=>{if(!condition)fail(text);};
const normalizeAnswer=value=>typeof value==='string'&&value.length<=120?value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim().replace(/[.!?]+$/,'').replace(/\s+/g,' '):'';

export function blankInvisibleState(){
 return {started:false,solved:[],chestOpened:false,portalOpened:false,memoryConsent:false,memoryRevision:0,memory:[],mode:'remote'};
}

function memoryAllowed(kind,state){
 return kind==='start'?state.started:kind==='fragment'?state.chestOpened:kind==='portal'?state.portalOpened:kind.startsWith('riddle:')&&state.solved.includes(kind.slice(7));
}

export function normalizeInvisibleState(input){
 const state=blankInvisibleState();
 if(!input||typeof input!=='object'||Array.isArray(input))return state;
 state.started=input.started===true;
 state.mode=input.mode==='walk'?'walk':'remote';
 // Preserve only the ordered, contiguous prefix. Imported flags cannot skip an episode step.
 if(state.started&&Array.isArray(input.solved))for(const id of pointIds){
  if(input.solved[state.solved.length]!==id)break;
  state.solved.push(id);
 }
 state.chestOpened=state.solved.length===pointIds.length&&input.chestOpened===true;
 state.portalOpened=state.chestOpened&&input.portalOpened===true;
 state.memoryConsent=input.memoryConsent===true;
 state.memoryRevision=Number.isSafeInteger(input.memoryRevision)?Math.max(0,Math.min(INVISIBLE_MEMORY_REVISION_LIMIT,input.memoryRevision)):0;
 if(state.memoryConsent&&Array.isArray(input.memory)){
  const recorded=new Set(input.memory.filter(row=>row&&typeof row.kind==='string'&&memoryByKind.get(row.kind)?.text===row.text&&memoryAllowed(row.kind,state)).map(row=>row.kind));
  state.memory=canonicalMemory.filter(row=>recorded.has(row.kind)).map(row=>({...row}));
 }
 return state;
}

function remember(state,kind){
 if(!state.memoryConsent||state.memory.some(row=>row.kind===kind))return state;
 return {...state,memory:[...state.memory,{...memoryByKind.get(kind)}]};
}

export function applyInvisibleAction(input,action){
 const state=normalizeInvisibleState(input);
 requireThat(action&&typeof action.type==='string','Action du Monde Invisible manquante.');
 switch(action.type){
  case 'invisibleStart':return state.started?state:remember({...state,started:true},'start');
  case 'invisibleMode':
   requireThat(['remote','walk'].includes(action.mode),'Choisis le mode à distance ou promenade.');
   return {...state,mode:action.mode};
  case 'invisibleAnswer':{
   requireThat(state.started,'Commence d’abord le secret du Léman.');
   const point=INVISIBLE_EPISODE.points.find(point=>point.id===action.id);
   requireThat(point,'Cette trace n’existe pas dans cet épisode.');
   const answer=normalizeAnswer(action.answer);
   requireThat(answer&&point.riddle.answers.some(value=>normalizeAnswer(value)===answer),'La réponse ne correspond pas encore à l’indice. Réessaie ou consulte l’aide.');
   if(state.solved.includes(point.id))return state;
   requireThat(pointIds[state.solved.length]===point.id,'Résous les traces dans l’ordre indiqué par Céliane.');
   return remember({...state,solved:[...state.solved,point.id]},'riddle:'+point.id);
  }
  case 'invisibleChest':
   requireThat(state.started&&state.solved.length===pointIds.length,'Résous les trois énigmes avant d’ouvrir le coffre virtuel.');
   return state.chestOpened?state:remember({...state,chestOpened:true},'fragment');
  case 'invisiblePortal':
   requireThat(state.chestOpened,'Retrouve d’abord le Fragment de la Justice dans le coffre.');
   return state.portalOpened?state:remember({...state,portalOpened:true},'portal');
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
