export const SPORT_SOURCE_HEALTH_URL='https://3b-international.vercel.app/sport-source-health.json';
export const SPORT_SOURCE_HEALTH_TTL_MS=48*60*60*1000;

export function sourceHealthEntry(manifest,source){
 if(!manifest||manifest.version!==1||!source?.videoId)return null;
 return manifest.sources?.[source.videoId]||null;
}

export function sourceIsWatchdogDisabled(manifest,source){
 return sourceHealthEntry(manifest,source)?.disabled===true;
}

export function sourceHealthIsFresh(manifest,now=Date.now()){
 if(!manifest||manifest.version!==1||!manifest.updatedAt)return false;
 const updated=Date.parse(manifest.updatedAt);
 return Number.isFinite(updated)&&now-updated>=0&&now-updated<=SPORT_SOURCE_HEALTH_TTL_MS;
}

export function nextHealthEntry(previous,status){
 const prev=previous&&typeof previous==='object'?previous:{disabled:false,strikes:0,status:'unknown'};
 if(status==='available')return{disabled:false,strikes:0,status:'available'};
 if(status==='unavailable'){
  const strikes=Math.min(3,Math.max(0,Number(prev.strikes)||0)+1);
  return{disabled:prev.disabled===true||strikes>=2,strikes,status:'unavailable'};
 }
 return{...prev};
}
