export const WORLD_VISUAL_KEY='3b-world-visual-preferences';
export const DEFAULT_WORLD_VISUAL=Object.freeze({brightness:1,shadowAssist:true});

export function normalizeVisualPreferences(value){
 return {brightness:Number.isFinite(value?.brightness)?Math.round(Math.max(.8,Math.min(1.5,value.brightness))*100)/100:1,
  shadowAssist:typeof value?.shadowAssist==='boolean'?value.shadowAssist:true};
}
export function loadVisualPreferences(){
 try{return normalizeVisualPreferences(JSON.parse(localStorage.getItem(WORLD_VISUAL_KEY)));}
 catch{return {...DEFAULT_WORLD_VISUAL};}
}
export function saveVisualPreferences(value){
 const preferences=normalizeVisualPreferences(value);
 try{localStorage.setItem(WORLD_VISUAL_KEY,JSON.stringify(preferences));return true;}catch{return false;}
}
// Fill dark surfaces without changing the canonical clock, weather, fog or
// mission conditions. Exposure remains bounded even with malformed settings.
export function accessibleLighting(light,value){
 const preferences=normalizeVisualPreferences(value),lift=preferences.shadowAssist?1-light.day:0;
 return {...light,exposure:Math.min(1.6,light.exposure*preferences.brightness),
  skyIntensity:light.skyIntensity+.28*lift,fillIntensity:light.fillIntensity+.2*lift,
  environmentIntensity:light.environmentIntensity+.18*lift};
}
