export const DEFAULT_ORBIT={yaw:0,pitch:.5,distance:24};
export function rotateOrbit(orbit,dx,dy){return{...orbit,yaw:orbit.yaw-dx*.005,pitch:Math.max(.16,Math.min(1.15,orbit.pitch+dy*.0035))};}
export function zoomOrbit(orbit,delta){return{...orbit,distance:Math.max(10,Math.min(52,orbit.distance+delta*.025))};}
export function cameraRelative(x,z,yaw){return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};}
