import {obstacleDistance} from './collision.js';

const REGIONS=new Set(['hub','france','algerie','maroc','tunisie','espagne','italie','turquie','estonie']);
const round=value=>Math.round(value*100)/100;

// A checkpoint carries only a pose. It cannot grant progress or rewards.
export function normalizeExplorationCheckpoint(value){
 if(!value||!REGIONS.has(value.region)||!Number.isFinite(value.x)||!Number.isFinite(value.z)||!Number.isFinite(value.heading))return null;
 if(Math.abs(value.x)>5000||Math.abs(value.z)>5000)return null;
 return {region:value.region,x:round(value.x),z:round(value.z),heading:round(((value.heading%360)+360)%360)};
}

export function explorationCheckpointCommand(save,snapshot){
 if(!snapshot||snapshot.cinematic||snapshot.region!==save.region)return null;
 const encounter=save.adventure?.encounter;
 if(encounter&&!['victory','recruited','missed','defeat'].includes(encounter.result))return null;
 const next=normalizeExplorationCheckpoint({region:snapshot.region,...snapshot.position,heading:snapshot.heading});
 if(!next)return null;
 const previous=save.adventure?.exploration;
 if(previous?.region===next.region&&Math.hypot(previous.x-next.x,previous.z-next.z)<1&&Math.abs(((previous.heading-next.heading+540)%360)-180)<12)return null;
 return {type:'checkpoint',...next};
}

// Scenery can change after a release. Find a nearby free point if the old pose
// is now inside a wall; never spawn beneath water or inside a portal trigger.
export function safeExplorationSpawn(checkpoint,region,{obstacles=[],portals=[],radius=260,groundY=()=>0}={}){
 const saved=normalizeExplorationCheckpoint(checkpoint);
 // A valid pose on the rim needs a nearby inward recovery, not a reset to the
 // region entrance. Allow the two-decimal checkpoint rounding at the boundary.
 if(!saved||saved.region!==region||Math.hypot(saved.x,saved.z)>radius+.02)return null;
 const safe=p=>Math.hypot(p.x,p.z)<radius-2&&groundY(p.x,p.z)>-1.1&&obstacles.every(o=>obstacleDistance(p,o)>1.15)&&portals.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>4.5);
 if(safe(saved))return saved;
 for(let distance=2;distance<=24;distance+=2)for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,p={...saved,x:round(saved.x+Math.cos(angle)*distance),z:round(saved.z+Math.sin(angle)*distance)};
  if(safe(p))return p;
 }
 return null;
}
