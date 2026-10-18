import {WORLD_MODULES,WORLD_REALMS} from './world-living-data.js';

export const ATLAS_PREFERENCES_KEY='3b_atlas_preferences_v1';
export function normalizeAtlasPreferences(value){
 const moduleIds=new Set(WORLD_MODULES.map(item=>item.id));
 return {
  favorites:[...new Set((Array.isArray(value?.favorites)?value.favorites:[]).map(id=>id==='loyalty'?'member':id))].filter(id=>moduleIds.has(id)),
  realm:WORLD_REALMS.some(item=>item.id===value?.realm)?value.realm:WORLD_REALMS[0].id,
 };
}
export function readAtlasPreferences(storage){
 try{return normalizeAtlasPreferences(JSON.parse((storage??globalThis.localStorage).getItem(ATLAS_PREFERENCES_KEY)));}
 catch{return normalizeAtlasPreferences(null);}
}
export function writeAtlasPreferences(storage,value){
 try{(storage??globalThis.localStorage).setItem(ATLAS_PREFERENCES_KEY,JSON.stringify(normalizeAtlasPreferences(value)));return true;}
 catch{return false;}
}

const clonePreferences=value=>({favorites:[...value.favorites],realm:value.realm});
function validateAction(action){
 if(!action||typeof action!=='object'||Array.isArray(action))throw Error('Action de préférence invalide.');
 if(action.type==='favorite'){
  if(Object.keys(action).some(key=>!['type','id','selected'].includes(key))||!WORLD_MODULES.some(item=>item.id===action.id)||typeof action.selected!=='boolean')throw Error('Choix de favori invalide.');
  return {type:'favorite',id:action.id,selected:action.selected};
 }
 if(action.type==='realm'){
  if(Object.keys(action).some(key=>!['type','id'].includes(key))||!WORLD_REALMS.some(item=>item.id===action.id))throw Error('Royaume inconnu.');
  return {type:'realm',id:action.id};
 }
 throw Error('Type de préférence inconnu.');
}
function applyAction(preferences,action){
 if(action.type==='realm')return {...preferences,realm:action.id};
 const favorites=preferences.favorites.filter(id=>id!==action.id);
 if(action.selected)favorites.push(action.id);
 return {...preferences,favorites};
}

// Actions are deltas against the latest saved preferences, never old snapshots.
// Failed actions remain queued locally so a later successful save also retries
// those choices; their explicit selected state makes replay idempotent.
export function createAtlasPreferencesSession({storage,locks=globalThis.navigator?.locks}={}){
 let current=normalizeAtlasPreferences(null),saved=true,pending=[],queue=Promise.resolve();
 try{const raw=(storage??globalThis.localStorage).getItem(ATLAS_PREFERENCES_KEY);current=normalizeAtlasPreferences(raw===null?null:JSON.parse(raw));}catch{saved=false;}
 const result=()=>({preferences:clonePreferences(current),saved});
 const loaded=result();
 return {loaded,commit(action){
  let change;try{change=validateAction(action);}catch(error){return Promise.reject(error);}
  const operation=queue.catch(()=>{}).then(async()=>{
   current=applyAction(current,change);pending.push(change);saved=false;
   const persist=()=>{
    try{
     const target=storage??globalThis.localStorage,raw=target.getItem(ATLAS_PREFERENCES_KEY);
     let latest=normalizeAtlasPreferences(raw===null?null:JSON.parse(raw));
     for(const item of pending)latest=applyAction(latest,item);
     current=latest;
     // Protect against writers that do not participate in the Web Lock.
     if(target.getItem(ATLAS_PREFERENCES_KEY)!==raw)return result();
     target.setItem(ATLAS_PREFERENCES_KEY,JSON.stringify(latest));pending=[];saved=true;
    }catch{/* Keep the current visit and its pending deltas; never replace unreadable JSON. */}
    return result();
   };
   try{return locks?.request?await locks.request(ATLAS_PREFERENCES_KEY,persist):persist();}
   catch{return result();}
  });
  queue=operation;return operation;
 }};
}
