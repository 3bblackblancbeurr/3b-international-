import {Vector3} from 'three';
import {orbitView} from './orbit.js';

// The gameplay orbit returns plain coordinates. Cinematic interpolation requires
// independent Vector3 values; never call .clone() on the plain gameplay result.
export function cinematicReturnView(orbit,position,height,portrait=false,heightAt){
 const view=orbitView(orbit,position,height,portrait,heightAt);
 return {position:new Vector3().copy(view.position),target:new Vector3().copy(view.target)};
}
