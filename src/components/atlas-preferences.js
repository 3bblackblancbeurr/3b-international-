import {WORLD_MODULES,WORLD_REALMS} from './world-living-data.js';

export const ATLAS_PREFERENCES_KEY='3b_atlas_preferences_v1';
export function normalizeAtlasPreferences(value){
 const moduleIds=new Set(WORLD_MODULES.map(item=>item.id));
 return {
  favorites:[...new Set(Array.isArray(value?.favorites)?value.favorites:[])].filter(id=>moduleIds.has(id)),
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
