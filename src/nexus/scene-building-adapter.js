import {buildingById as legacyBuildingById} from './city-data.js';
import {MEGA_BY_ID} from './mega-catalog.js';
import {proceduralBuildingSpec} from './procedural-building-grammar.js';
const RARITY_ORDER=['common','rare','epic','special','ultra-rare','legendary','ultimate','unique'];
export function sceneBuildingById(id,upgrade=1){const mega=MEGA_BY_ID[id];if(!mega)return legacyBuildingById(id);const spec=proceduralBuildingSpec(id,upgrade);const footprint=[Math.max(1,Math.min(4,Math.ceil(mega.size.w/12))),Math.max(1,Math.min(4,Math.ceil(mega.size.d/12)))];return{id:mega.id,name:mega.name,category:mega.category,rarity:mega.rarity,rarityRank:Math.max(0,RARITY_ORDER.indexOf(mega.rarity)),cost:{coins:mega.cost},footprint,height:Math.max(.65,Math.min(6.5,spec.height/14)),country:mega.country,materials:mega.materials,vegetation:mega.vegetation,procedural:spec,upgrade:spec.upgrade};}
export function isMegaBuilding(id){return !!MEGA_BY_ID[id];}
