export const STREAMING_PROFILES={
 fluid:{near:42,mid:85,far:145,npcUpdateHz:8},
 auto:{near:55,mid:105,far:175,npcUpdateHz:12},
 detail:{near:70,mid:135,far:220,npcUpdateHz:20},
};
export function streamingProfile(mode='auto',deviceMemory){
 const base=STREAMING_PROFILES[mode]||STREAMING_PROFILES.auto;
 if(Number.isFinite(deviceMemory)&&deviceMemory<=4)return {...base,near:base.near*.8,mid:base.mid*.78,far:base.far*.72,npcUpdateHz:Math.min(base.npcUpdateHz,8)};
 return base;
}
export function lodForDistance(distance,profile=STREAMING_PROFILES.auto){
 if(distance<=profile.near)return 0;
 if(distance<=profile.mid)return 1;
 if(distance<=profile.far)return 2;
 return 3;
}
export function shouldRenderAtDistance(distance,profile){return lodForDistance(distance,profile)<3;}
