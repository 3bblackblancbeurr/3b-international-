// The avatar is roughly 3.8 world units tall. These ratios are the canonical
// visual scale guardrails for inhabited architecture; gameplay collision units stay unchanged.
export const WORLD_SCALE=Object.freeze({
 avatarHeight:3.8,
 minDoorClearanceRatio:1.18,
 maxDoorClearanceRatio:1.42,
 minStoreyHeadroom:.55,
 preferredFacadeBay:3.15,
 minFacadeBay:2.55,
 maxFacadeBay:3.85,
});

export function facadeBayCount(span,variant=0,face=0){
 const rhythm=(((variant*7+face*11)%5)-2)*.13;
 const target=WORLD_SCALE.preferredFacadeBay+rhythm;
 const usable=Math.max(span-.75,WORLD_SCALE.minFacadeBay*3);
 return Math.max(3,Math.min(5,Math.round(usable/target)));
}

export function buildingDimensions(region,variant=0,urban=true){
 const type=((variant%5)+5)%5;
 const floors=urban?(region==='france'?[3,2,4,3,2][type]:region==='estonie'?[2,2,3,2,1][type]:[2,3,2,1,2][type]):1;
 return {width:urban?[11,13.2,11.2,12.8,11.6][type]:[11,12,11.5][variant%3],depth:urban?[9.6,10.8,9.2,10.4,11][type]:9,floors,storey:5.6,height:floors*5.6,doorHeight:4.8,doorWidth:2.5};
}
