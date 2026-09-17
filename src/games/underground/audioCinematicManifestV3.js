import {GOLD_MASTER_COUNTRY_ORDER,PRODUCTION_COUNTRIES} from './productionCatalog.js';

export const AUDIO_SLOTS=Object.freeze(['music-explore','music-race','music-pursuit','ambience-city','ambience-nature','weather','crowd','fictional-dispatch']);
export const CINEMATIC_SLOTS=Object.freeze(['country-intro','guardian-intro','fragment-unlock','legendary-reveal']);
export const GLOBAL_CINEMATICS=Object.freeze(['game-intro','final-nexus-intro','final-nexus-outro','credits']);

export const COUNTRY_AUDIO_CINEMATIC_PACKS=Object.freeze(GOLD_MASTER_COUNTRY_ORDER.map(countryId=>{
 const c=PRODUCTION_COUNTRIES[countryId];
 return Object.freeze({countryId,name:c.name,audio:Object.fromEntries(AUDIO_SLOTS.map(s=>[s,{id:`${countryId}-${s}`,asset:`/audio/underground/${countryId}/${s}.ogg`,status:'missing'}])),cinematics:Object.fromEntries(CINEMATIC_SLOTS.map(s=>[s,{id:`${countryId}-${s}`,video:`/cinematics/underground/${countryId}/${s}.webm`,animation:`/cinematics/underground/${countryId}/${s}.glb`,status:'missing'}]))});
}));

export const VEHICLE_AUDIO_FAMILIES=Object.freeze(['electric','hybrid','combustion-i4','combustion-v6','combustion-v8','experimental-3b'].map(id=>Object.freeze({id,engine:`/audio/underground/vehicles/${id}/engine.ogg`,load:`/audio/underground/vehicles/${id}/load.ogg`,transmission:`/audio/underground/vehicles/${id}/transmission.ogg`,turbo:`/audio/underground/vehicles/${id}/turbo.ogg`,status:'missing'})));

export function mediaProductionReport(records={}){
 let audioTotal=0,audioDone=0,cinTotal=GLOBAL_CINEMATICS.length,cinDone=0;
 for(const pack of COUNTRY_AUDIO_CINEMATIC_PACKS){for(const s of AUDIO_SLOTS){audioTotal++;if(records.audio?.[`${pack.countryId}-${s}`]?.validated===true)audioDone++;}for(const s of CINEMATIC_SLOTS){cinTotal++;if(records.cinematics?.[`${pack.countryId}-${s}`]?.validated===true)cinDone++;}}
 audioTotal+=VEHICLE_AUDIO_FAMILIES.length*4;
 for(const f of VEHICLE_AUDIO_FAMILIES)for(const key of ['engine','load','transmission','turbo'])if(records.audio?.[`${f.id}-${key}`]?.validated===true)audioDone++;
 for(const id of GLOBAL_CINEMATICS)if(records.cinematics?.[id]?.validated===true)cinDone++;
 return {audio:{done:audioDone,total:audioTotal,complete:audioDone===audioTotal},cinematics:{done:cinDone,total:cinTotal,complete:cinDone===cinTotal}};
}
