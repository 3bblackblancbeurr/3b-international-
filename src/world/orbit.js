export const DEFAULT_ORBIT={yaw:0,pitch:.24,distance:24};
export function normalizeOrbit(value){return {yaw:Number.isFinite(value?.yaw)?value.yaw%(Math.PI*2):0,pitch:Number.isFinite(value?.pitch)?Math.max(-.34,Math.min(1.15,value.pitch)):DEFAULT_ORBIT.pitch,distance:Number.isFinite(value?.distance)?Math.max(10,Math.min(52,value.distance)):DEFAULT_ORBIT.distance};}
export function restoreOrbit(value){const orbit=normalizeOrbit(value);if(value?.version!==2){if(value?.pitch===.5)orbit.pitch=DEFAULT_ORBIT.pitch;if(value?.pitch===.76)orbit.pitch=.5;}return orbit;}
export function orbitView(orbit,position,height,portrait=false,heightAt){
 const distance=orbit.distance*(portrait?1.12:1),flat=Math.cos(orbit.pitch)*distance;
 // Looking up raises the aim above the shoulders instead of pushing the lens
 // beneath the ground. Terrain clearance translates the complete rig, not zoom.
 const target={x:position.x,y:height+1.8+Math.max(0,-orbit.pitch)*distance*1.12,z:position.z};
 const eye={x:position.x+Math.sin(orbit.yaw)*flat,y:target.y+Math.sin(orbit.pitch)*distance,z:position.z+Math.cos(orbit.yaw)*flat};
 const lift=Math.max(0,(heightAt?.(eye.x,eye.z)??height)+1.2-eye.y);eye.y+=lift;target.y+=lift;
 return{target,position:eye};
}
export function rotateOrbit(orbit,dx,dy){return{...orbit,yaw:orbit.yaw-dx*.005,pitch:Math.max(-.34,Math.min(1.15,orbit.pitch+dy*.0035))};}
export function zoomOrbit(orbit,delta){return{...orbit,distance:Math.max(10,Math.min(52,orbit.distance+delta*.025))};}
export function cameraRelative(x,z,yaw){return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};}
