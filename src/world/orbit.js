export const DEFAULT_ORBIT={yaw:0,pitch:.5,distance:24};
export function orbitView(orbit,position,height,portrait=false){const distance=orbit.distance*(portrait?1.12:1),flat=Math.cos(orbit.pitch)*distance;return{target:{x:position.x,y:height+1.8,z:position.z},position:{x:position.x+Math.sin(orbit.yaw)*flat,y:height+1.8+Math.sin(orbit.pitch)*distance,z:position.z+Math.cos(orbit.yaw)*flat}};}
export function rotateOrbit(orbit,dx,dy){return{...orbit,yaw:orbit.yaw-dx*.005,pitch:Math.max(.16,Math.min(1.15,orbit.pitch+dy*.0035))};}
export function zoomOrbit(orbit,delta){return{...orbit,distance:Math.max(10,Math.min(52,orbit.distance+delta*.025))};}
export function cameraRelative(x,z,yaw){return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};}
