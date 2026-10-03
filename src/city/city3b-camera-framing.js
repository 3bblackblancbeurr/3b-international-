import {Vector3,Spherical} from 'three';

// Fit the whole model in the central unobstructed area, including portrait screens.
export function cityCameraFrame({center,width=12,depth=10,height=12,fov=40,aspect=1,yaw=Math.atan2(.85,1.3),ground=0}){
 const target=new Vector3(center.x,ground+height*.5,center.z);
 const vertical=fov*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*Math.max(.1,aspect));
 const radius=Math.hypot(width,depth,height)/2;
 const distance=radius/Math.sin(Math.min(vertical,horizontal)*.66);
 const elevation=26;
 const position=target.clone().add(new Vector3().setFromSpherical(new Spherical(Math.max(9,distance),Math.PI/2-elevation*Math.PI/180,yaw)));
 return {position,target};
}
