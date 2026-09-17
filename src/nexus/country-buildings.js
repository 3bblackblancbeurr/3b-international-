import {COUNTRY_ASSET_KITS} from '../world/country-assets.js';
const categoryByIndex=['monument','residential','workshop','transport','culture','commerce'];
const baseSize=[[26,26],[10,10],[14,12],[22,12],[18,16],[16,14]];
export const COUNTRY_BUILDINGS=Object.entries(COUNTRY_ASSET_KITS).flatMap(([country,kit])=>kit.architecture.map((name,index)=>({id:`kit-${country}-${index+1}`,country,name,category:categoryByIndex[index]||'culture',level:index===0?10:Math.min(8,index+2),cost:index===0?1800:180+index*120,size:{w:baseSize[index]?.[0]||14,d:baseSize[index]?.[1]||14},rotationStep:15,rarity:index===0?'legendary':index>=4?'epic':index>=2?'rare':'common',materials:kit.materials,vegetation:kit.vegetation,hero:index===0}))); 
export const COUNTRY_BUILDING_BY_ID=Object.fromEntries(COUNTRY_BUILDINGS.map(b=>[b.id,b]));
export function buildingsForCountry(country){return COUNTRY_BUILDINGS.filter(b=>b.country===country);}
export function starterBuildingsForCountry(country){return buildingsForCountry(country).filter(b=>!b.hero&&b.level<=4);}
