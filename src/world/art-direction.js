// Rendering-only art direction. Progression, weather selection and clock remain canonical.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
export {worldRealmArt as REALM_ART} from '../design-system/tokens.js';
import {worldRealmArt as REALM_ART} from '../design-system/tokens.js';
import {skyKeyDirection} from './master-presentation.js';
// The Cité has a blue maritime atmosphere and champagne stone in the reference.
// Keep realm palettes untouched and grade the hub independently of progression.
const CITE_ART=Object.freeze({...REALM_ART.hub,sky:'#8bb9d2',ground:'#233b46',fog:'#5294ac',night:'#071a2c',stone:'#a7b4b6'}); // gold-master-allow: reviewed reference Hub atmosphere grading; docs/hub-reference-art-exceptions.md#atmosphere.
export function artLighting(region,time={},weather={}){
 const palette=region==='hub'?CITE_ART:REALM_ART[region]||REALM_ART.hub,day=clamp(time.daylight??1,.08,1),sun=clamp(time.sun??1,0,1);
 const visibility=clamp(weather.visibility??1,.35,1),dusk=time.phase==='sunset'||time.phase==='dawn';
 const hour=Number.isFinite(time.hour)?time.hour:12;
 const warmth=dusk?Math.sin(Math.PI*clamp((hour-(time.phase==='dawn'?5:18))/3,0,1))*.8:0;
 // Soft reflected moon/city light restores facade readability on mobile.
 // No extra lights, textures, post-processing passes or daytime tint changes.
 const civicNight=region==='hub'?Math.pow(1-day,1.25):0;
 return {palette,day,dusk,sunColor:day<.3?palette.sky:palette.sun,sunWarmth:warmth,keyDirection:skyKeyDirection(hour),
  sunIntensity:(region==='hub'?2.65:2.9)*sun*(.68+.32*visibility),
  skyIntensity:.24+.64*day+civicNight*.09,
  fillIntensity:.10+.16*day+civicNight*.06,
  environmentIntensity:.18+.45*day+civicNight*.08,
  exposure:.87+.13*day+civicNight*.05,fogNear:(region==='hub'?480:190)*visibility*(time.fog??1),
  fogFar:(region==='hub'?2050:820)*visibility*(time.fog??1),
 };
}
export function architecturalBudget(mode='auto',desktop=false){
 return {transmission:mode==='detail'&&desktop,atmosphere:mode==='fluid'?40:mode==='detail'?160:88,
  birds:mode==='fluid'?8:mode==='detail'?24:16,bloom:mode==='detail'&&desktop};
}

export function applyPhysicalQuality(root,mode,desktop=false){
 const enabled=architecturalBudget(mode,desktop).transmission,seen=new Set();
 root.traverse(object=>{for(const material of [object.material].flat().filter(Boolean)){
  if(seen.has(material)||!material.isMeshPhysicalMaterial)continue;seen.add(material);
  if(material.userData.authoredTransmission===undefined&&material.transmission>0)material.userData.authoredTransmission=material.transmission;
  if(!material.userData.authoredTransmission)continue;
  const next=enabled?material.userData.authoredTransmission:0;
  if(material.transmission!==next){material.transmission=next;material.needsUpdate=true;}
 }});
}
