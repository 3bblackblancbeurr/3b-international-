function clamp01(value){return Math.max(0,Math.min(1,value));}
export function routePose(stops,timeSeconds,cycleSeconds=24){
 if(!stops?.length)return null;
 if(stops.length===1)return {...stops[0],heading:0,segment:0,progress:0};
 const t=((timeSeconds%cycleSeconds)+cycleSeconds)%cycleSeconds/cycleSeconds*stops.length;
 const segment=Math.floor(t)%stops.length,progress=clamp01(t-Math.floor(t));
 const a=stops[segment],b=stops[(segment+1)%stops.length],smooth=progress*progress*(3-2*progress);
 return {x:a.x+(b.x-a.x)*smooth,z:a.z+(b.z-a.z)*smooth,heading:Math.atan2(b.x-a.x,b.z-a.z),segment,progress};
}
