import {Vector3} from 'three';
import {orbitView} from './orbit.js';

// The gameplay orbit returns plain coordinates. Cinematic interpolation requires
// independent Vector3 values; never call .clone() on the plain gameplay result.
export function cinematicReturnView(orbit,position,height,portrait=false,heightAt){
 const view=orbitView(orbit,position,height,portrait,heightAt);
 return {position:new Vector3().copy(view.position),target:new Vector3().copy(view.target)};
}


const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export function cinematicEase(value){
 const t=clamp01(value);
 return t*t*t*(t*(t*6-15)+10);
}
export function cinematicPhase(value,start=0,end=1){
 const span=Math.max(.0001,end-start);
 return cinematicEase((clamp01(value)-start)/span);
}
export function cinematicReturnBlend(value,{waterReveal=false}={}){
 return cinematicPhase(value,waterReveal?.80:.72,1);
}
export function cinematicDollyProgress(value,{waterReveal=false}={}){
 return cinematicPhase(value,waterReveal?.06:0,waterReveal?.86:1);
}
export function cinematicRiseProgress(value,{waterReveal=false}={}){
 return waterReveal?cinematicPhase(value,.14,.68):cinematicEase(value);
}
