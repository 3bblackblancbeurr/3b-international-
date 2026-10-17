// Private, deterministic convenience links: same on-device favourites already
// selected in the 3B World menu. No history, personalization server, or AI claim.
import {WORLD_MODULES} from './world-living-data.js';

export const WORLD_FAVORITES_KEY='threeb-world-favorites-v1';
export function readAlbertFavoriteModules(storage){
 try{
  if(!storage)return [];
  const raw=storage.getItem(WORLD_FAVORITES_KEY);
  if(!raw||raw.length>2500)return [];
  const saved=JSON.parse(raw);
  if(!Array.isArray(saved))return [];
  const ids=new Set(saved.filter(id=>typeof id==='string'));
  return WORLD_MODULES.filter(module=>ids.has(module.id)).slice(0,6);
 }catch{return [];}
}
