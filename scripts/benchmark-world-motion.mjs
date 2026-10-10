// Reproducible CPU comparison, not a phone/GPU frame-rate claim.
import assert from 'node:assert/strict';
import {advanceMotion,createIndexedMotion} from '../src/world/motion.js';
const obstacles=Array.from({length:2500},(_,i)=>({x:40+(i%50)*7,z:40+Math.floor(i/50)*7,width:3,depth:5,rotation:i*.13}));
obstacles.push({surfaceDistance:p=>500-Math.hypot(p.x,p.z)});
function sample(walk){
 const durations=[];let checksum=0;
 for(let frame=0;frame<100;frame++){
  const started=performance.now();
  for(let actor=0;actor<24;actor++){
   const state={position:{x:actor-12,z:frame*.1},target:null,route:[]};
   const next=walk(state,{x:.1,z:1},1/30,actor?2.6:15,obstacles,500);
   checksum+=next.position.x+next.position.z;
  }
  durations.push(performance.now()-started);
 }
 durations.sort((a,b)=>a-b);
 return {medianMs:durations[50],p95Ms:durations[95],checksum};
}
const walk=createIndexedMotion();sample(walk);
const before=sample(advanceMotion),after=sample(walk);assert.equal(after.checksum,before.checksum);
console.log(JSON.stringify({scenario:'24 moving actors, 2500 static obstacles, 100 frames',before,after,medianSpeedup:before.medianMs/after.medianMs,scope:'CPU collision only; no physical-phone FPS measurement'},null,2));
