// Shared camera-distance signal for the City 3B renderer.
//
// The camera system reports the orbit radius while the render budget converts
// that value into a stable LOD tier. Keeping the pure tier function here makes
// the thresholds testable and prevents visual quality from oscillating around
// a boundary while the player pinches or scrolls.

let cameraMetric={distance:0,half:500,ratio:0};

const finitePositive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;

export function cityDistanceTier(ratio,current=0,mobile=false){
 const value=Math.max(0,Number(ratio)||0),tier=Math.max(0,Math.min(2,Number(current)||0));
 const enterMedium=mobile?.62:.82,leaveMedium=mobile?.48:.66;
 const enterFar=mobile?1.20:1.55,leaveFar=mobile?.98:1.30;
 if(tier===0)return value>=enterFar?2:value>=enterMedium?1:0;
 if(tier===1)return value>=enterFar?2:value<leaveMedium?0:1;
 return value<leaveMedium?0:value<leaveFar?1:2;
}

export function reportCityCameraDistance(distance,half){
 const nextDistance=finitePositive(distance,cameraMetric.distance||0);
 const nextHalf=finitePositive(half,cameraMetric.half||500);
 cameraMetric={distance:nextDistance,half:nextHalf,ratio:nextDistance/nextHalf};
 return cameraMetric;
}

export function readCityCameraDistance(){return {...cameraMetric};}

export function resetCityCameraDistance(){cameraMetric={distance:0,half:500,ratio:0};}
