export const STREAMING_PROFILES={
 fluid:{near:42,mid:85,far:145,npcUpdateHz:8},
 auto:{near:55,mid:105,far:175,npcUpdateHz:12},
 detail:{near:70,mid:135,far:220,npcUpdateHz:20},
};
export function streamingProfile(mode='auto',deviceMemory,region='country'){
 const base=STREAMING_PROFILES[mode]||STREAMING_PROFILES.auto;
 const lowMemory=Number.isFinite(deviceMemory)&&deviceMemory<=4;
 const memoryAdjusted=lowMemory?{...base,near:base.near*.8,mid:base.mid*.78,far:base.far*.72,npcUpdateHz:Math.min(base.npcUpdateHz,8)}:base;
 if(region!=='hub')return memoryAdjusted;
 const factor=lowMemory?1.65:mode==='detail'?2.35:2.05;
 return {...memoryAdjusted,near:memoryAdjusted.near*factor,mid:memoryAdjusted.mid*factor,far:memoryAdjusted.far*factor,npcUpdateHz:Math.min(memoryAdjusted.npcUpdateHz,lowMemory?8:14)};
}
export function lodForDistance(distance,profile=STREAMING_PROFILES.auto){
 if(distance<=profile.near)return 0;
 if(distance<=profile.mid)return 1;
 if(distance<=profile.far)return 2;
 return 3;
}
export function shouldRenderAtDistance(distance,profile){return lodForDistance(distance,profile)<3;}

/** The territory radius controls exploration, never allocation. Mobile keeps
 * at most 49 ground tiles and a bounded shared natural/architecture pool. */
export function realmStreamingProfile(mode='auto',capabilities={}){
 const desktop=!!capabilities.desktopClass,fluid=mode==='fluid',detail=mode==='detail'&&desktop;
 return {tileRadius:fluid?3:detail?5:desktop?4:3,maxTiles:fluid?37:detail?113:desktop?81:49,
  near:fluid?275:360,mid:fluid?560:720,segments:fluid?[24,12,6]:[32,16,8],
  naturalInstances:fluid?160:desktop?720:320,rockInstances:fluid?48:desktop?160:80,
  buildingInstances:fluid?32:desktop?96:48,siteDistance:fluid?520:desktop?960:680,maxSites:fluid?2:desktop?4:2,workPerFrame:fluid?1:2};
}


export function lodForDistanceHysteresis(distance,profile=STREAMING_PROFILES.auto,previous=null,margin=.08){
 const base=previous==null?lodForDistance(distance,profile):Math.max(0,Math.min(3,Math.round(previous)));
 if(previous==null)return base;
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity,thresholds=[profile.near,profile.mid,profile.far];
 let lod=base;
 while(lod<3&&d>thresholds[lod]*(1+margin))lod++;
 while(lod>0&&d<thresholds[lod-1]*(1-margin))lod--;
 return lod;
}
