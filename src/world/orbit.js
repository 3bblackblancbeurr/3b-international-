export const DEFAULT_ORBIT={yaw:0,pitch:.075,distance:30};
export const MIN_ORBIT_DISTANCE=18,MAX_ORBIT_DISTANCE=48,MIN_RENDER_DISTANCE=26;
export function normalizeOrbit(value){return {yaw:Number.isFinite(value?.yaw)?value.yaw%(Math.PI*2):0,pitch:Number.isFinite(value?.pitch)?Math.max(-.34,Math.min(1.15,value.pitch)):DEFAULT_ORBIT.pitch,distance:Number.isFinite(value?.distance)?Math.max(MIN_ORBIT_DISTANCE,Math.min(MAX_ORBIT_DISTANCE,value.distance)):DEFAULT_ORBIT.distance};}
export function restoreOrbit(value){
 const orbit=normalizeOrbit(value);
 // Migrate the former close exploration preset without destroying a zoom that
 // the player deliberately chose. The physical avatar scale stays untouched.
 if(value?.version===2&&value?.distance===24)orbit.distance=DEFAULT_ORBIT.distance;
 if(value?.version===2&&value?.pitch===.24)orbit.pitch=DEFAULT_ORBIT.pitch;
 if(value?.version!==2){if(value?.pitch===.5)orbit.pitch=DEFAULT_ORBIT.pitch;if(value?.pitch===.76)orbit.pitch=.5;}
 return orbit;
}
export function orbitView(orbit,position,height,portrait=false,heightAt){
 // scene.js still exposes an older secondary preset at 24. Clamp only the
 // rendered rig, not the saved physical orbit value, so legacy/alternate views
 // can never make the avatar dominate the mobile frame again.
 const renderedDistance=Math.max(MIN_RENDER_DISTANCE,orbit.distance);
 const distance=renderedDistance*(portrait?1.12:1),flat=Math.cos(orbit.pitch)*distance;
 // A slightly higher shoulder target keeps more city and horizon visible while
 // the longer rig makes the hero occupy less of the landscape frame.
 const target={x:position.x,y:height+2.15+Math.max(0,-orbit.pitch)*distance*1.08,z:position.z};
 const eye={x:position.x+Math.sin(orbit.yaw)*flat,y:target.y+Math.sin(orbit.pitch)*distance,z:position.z+Math.cos(orbit.yaw)*flat};
 const lift=Math.max(0,(heightAt?.(eye.x,eye.z)??height)+1.25-eye.y);eye.y+=lift;target.y+=lift;
 return{target,position:eye};
}
export function rotateOrbit(orbit,dx,dy){return{...orbit,yaw:orbit.yaw-dx*.0046,pitch:Math.max(-.34,Math.min(1.15,orbit.pitch+dy*.0032))};}
export function zoomOrbit(orbit,delta){return{...orbit,distance:Math.max(MIN_ORBIT_DISTANCE,Math.min(MAX_ORBIT_DISTANCE,orbit.distance+delta*.025))};}
export function cameraRelative(x,z,yaw){return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};}
