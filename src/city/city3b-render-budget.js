import {cityDistanceTier} from './city3b-distance-lod.js';

// Sample every raw animation callback, including those skipped by the render
// cap. Distance is supplied by this scene after its camera/controls update;
// no module-global signal or tier can leak into a new city or a remount.
export function createCityRenderBudget({mobile=false,pixelRatio=1}={}){
 let performanceTier=0,distanceTier=0,last=null,total=0,count=0,slowWindows=0,lastHalf,lastMapId;
 const resetSampling=()=>{last=null;total=0;count=0;slowWindows=0;};
 const state=()=>{
  const tier=Math.max(performanceTier,distanceTier);
  return {tier,performanceTier,distanceTier,pixelRatio:Math.min(pixelRatio,[mobile?1.35:1.75,1,.85][tier]),shadows:tier<2};
 };
 return {state,sample(time,active=true,{distance,half,mapId}={}){
  const previousTier=Math.max(performanceTier,distanceTier);
  const changed=()=>Math.max(performanceTier,distanceTier)!==previousTier?state():null;
  if(Number.isFinite(distance)&&distance>=0&&Number.isFinite(half)&&half>0){
   if(half!==lastHalf||mapId!==lastMapId){distanceTier=0;resetSampling();lastHalf=half;lastMapId=mapId;}
   distanceTier=cityDistanceTier(distance/half,distanceTier,mobile);
  }
  // A static/reduced-motion view still needs distance LOD, but hidden time
  // and map changes must not count toward sustained rendering pressure.
  if(!active||!Number.isFinite(time)){resetSampling();return changed();}
  const gap=last===null?0:time-last;last=time;
  if(gap<=0||gap>=100){total=0;count=0;slowWindows=0;return changed();}
  total+=gap;count++;
  if(count<120)return changed();
  slowWindows=total/count>35?slowWindows+1:0;total=0;count=0;
  if(slowWindows<2||performanceTier>=2)return changed();
  performanceTier++;slowWindows=0;return changed();
 }};
}
