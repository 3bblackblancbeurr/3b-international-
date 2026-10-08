/**
 * Real-time camera beats for the 3D world. Smooth travel, not static title slides.
 * The motion returns to its original lens at 0% and 100%, so controls resume
 * without a positional jump. Reduced-motion users receive neutral framing.
 */
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const ease=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v);};
const window=(p,start,up,down,end)=>ease(start,up,p)*(1-ease(down,end,p));
const GUARDIAN_SHOTS=new Set(['guardian-intro','final-combat-intro','important-combat-result','guardian-value-complete','guardian-homecoming']);
const LANDSCAPE_SHOTS=new Set(['country-first-entry','story-restoration','story-finale']);
export function cinematicFraming(kind,progress,{reducedMotion=false}={}){
 const neutral={radiusScale:1,yawOffset:0,heightOffset:0,targetOffset:0,lightPulse:0};
 if(reducedMotion||!kind)return neutral;
 const p=clamp(progress);
 if(GUARDIAN_SHOTS.has(kind)){
  const opening=window(p,.035,.16,.26,.39);
  const weapon=window(p,.22,.4,.53,.72);
  const culmination=window(p,.62,.78,.83,.98);
  return{
   radiusScale:1+.17*opening-.29*weapon-.13*culmination,
   yawOffset:-.08*opening+.17*weapon-.12*culmination,
   heightOffset:1.5*opening-2.4*weapon+.65*culmination,
   targetOffset:.35*weapon+.1*culmination,
   lightPulse:Math.min(1,weapon*.8+culmination),
  };
 }
 if(LANDSCAPE_SHOTS.has(kind)){
  const panoramic=window(p,.035,.18,.52,.75),reveal=window(p,.52,.69,.83,.98);
  return{
   radiusScale:1+.23*panoramic-.15*reveal,
   yawOffset:.18*panoramic-.09*reveal,
   heightOffset:6*panoramic-2.2*reveal,
   targetOffset:2.4*panoramic,
   lightPulse:reveal*.65,
  };
 }
 return neutral;
}
