import {cityDistanceTier,readCityCameraDistance} from './city3b-distance-lod.js';

// Sample raw animation callbacks before the intentional 30/45 fps render cap.
// The effective tier is the strictest of sustained frame pressure and camera
// distance. Hysteresis in cityDistanceTier prevents zoom-boundary flicker.
export function createCityRenderBudget({mobile=false,pixelRatio=1}={}){
 let performanceTier=0,distanceTier=0,last=null,total=0,count=0,slowWindows=0;
 const state=()=>{
  const tier=Math.max(performanceTier,distanceTier);
  return {tier,performanceTier,distanceTier,pixelRatio:Math.min(pixelRatio,[mobile?1.35:1.75,1,.85][tier]),shadows:tier<2};
 };
 return {state,sample(time,active=true){
  const metric=readCityCameraDistance(),nextDistanceTier=cityDistanceTier(metric.ratio,distanceTier,mobile);
  const distanceChanged=nextDistanceTier!==distanceTier;distanceTier=nextDistanceTier;
  if(!active){last=null;total=0;count=0;slowWindows=0;return distanceChanged?state():null;}
  const gap=last===null?0:time-last;last=time;
  if(gap<=0||gap>=100){total=0;count=0;return distanceChanged?state():null;}
  total+=gap;count++;
  if(count<120)return distanceChanged?state():null;
  slowWindows=total/count>35?slowWindows+1:0;total=0;count=0;
  if(slowWindows<2||performanceTier>=2)return distanceChanged?state():null;
  performanceTier++;slowWindows=0;return state();
 }};
}
