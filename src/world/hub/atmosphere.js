const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const mixColor=(a,b,t)=>{let hex=0;for(const shift of [16,8,0])hex|=Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t)<<shift;return hex;};
export function hubAtmosphere(daylight=1,weather='clear'){
 const day=clamp(daylight),overcast=['rain','storm','snow','fog'].includes(weather);
 return {fogColor:mixColor(0x102634,overcast?0x68838e:0x587687,day),
  hemisphere:.20+.52*day,fill:.12+.15*day,exposure:.94+.14*day,environment:.42+.26*day};
}

export function hubSilhouetteVisible(item,lod){
 return lod<3||item?.type==='hubDistrictLandmark';
}

export function hubPanoramaFrame(items,{portrait=false,reducedMotion=false}={}){
 const tower=items.find(item=>item.landmarkId==='broken_circle_spire')||{x:0,z:-182,height:156};
 return {x:tower.x,z:tower.z,kind:'hub-panorama',heritage:true,angle:.18,radius:portrait?445:355,height:portrait?178:146,
  focusY:tower.height*.44,arc:reducedMotion?0:.26,dolly:reducedMotion?0:.08,duration:reducedMotion?2600:7200,
  title:'La Cité des Huit Héritages',detail:'Les quartiers, les ponts et le Cercle Brisé · reprendre quand tu veux'};
}
