export const WORLD_QUALITY={
 low:{chunkRadius:1,lod:[55,150,380],maxDrawCalls:90,maxVisibleTextureMB:120,maxDynamicActors:18,shadowDistance:45,pixelRatio:1},
 medium:{chunkRadius:1,lod:[80,220,600],maxDrawCalls:140,maxVisibleTextureMB:220,maxDynamicActors:30,shadowDistance:80,pixelRatio:1.25},
 high:{chunkRadius:2,lod:[110,320,850],maxDrawCalls:220,maxVisibleTextureMB:360,maxDynamicActors:55,shadowDistance:140,pixelRatio:1.5},
 ultra:{chunkRadius:2,lod:[140,420,1100],maxDrawCalls:320,maxVisibleTextureMB:520,maxDynamicActors:90,shadowDistance:220,pixelRatio:2},
};
export function qualityForDevice({memory=4,cores=4,mobile=true}={}){if(!mobile&&memory>=12&&cores>=8)return'ultra';if(memory>=8&&cores>=8)return'high';if(memory>=4&&cores>=4)return'medium';return'low';}
export function worldBudget(profile){return WORLD_QUALITY[profile]||WORLD_QUALITY.medium;}
export function shouldSimulateActor(distance,profile='medium'){const b=worldBudget(profile);return distance<=Math.max(90,b.shadowDistance*1.5);}
