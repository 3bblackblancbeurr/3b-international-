import * as THREE from 'three';

export function addPremiumWorldLighting({region,root,field}){
 const group=new THREE.Group();group.name='3B-Premium-Lighting';root.add(group);
 const lights=[];
 const add=(color,x,y,z,intensity,distance)=>{
  const light=new THREE.PointLight(color,0,distance,2);light.position.set(x,y,z);light.userData.baseIntensity=intensity;group.add(light);lights.push(light);return light;
 };
 if(region==='hub'){
  const center={x:0,z:-5.4};
  for(let i=0;i<6;i++){
   const a=i/6*Math.PI*2,r=17+(i%2)*5,color=i%2?'#00a8ff':'#d6b46a';
   add(color,center.x+Math.cos(a)*r,3.1,center.z+Math.sin(a)*r,i%2?.95:1.15,28);
  }
  const lake=field.lake,toCity=Math.atan2(-lake.z,-lake.x);
  for(let i=0;i<4;i++){
   const a=toCity-.65+i*.43,r=lake.r+7,x=lake.x+Math.cos(a)*r,z=lake.z+Math.sin(a)*r;
   add(i===1||i===2?'#d6b46a':'#00a8ff',x,2.7,z,i===1||i===2?.95:.72,24);
  }
 }else{
  const city=(field.anchors||[]).find(a=>a.type==='story'||a.type==='guardian')||{x:0,z:5};
  add('#d6b46a',city.x+4,3.4,city.z+2,.74,22);
  add('#00a8ff',city.x-5,3.0,city.z-3,.56,20);
 }
 function setDaylight(daylight){
  const night=1-Math.max(0,Math.min(1,Number(daylight)||0));
  const curve=Math.pow(night,1.65);
  for(const light of lights)light.intensity=light.userData.baseIntensity*curve;
 }
 function setQuality(mode){
  lights.forEach((light,i)=>{light.visible=mode!=='fluid'||i<Math.max(2,Math.floor(lights.length*.4));});
 }
 return{group,setDaylight,setQuality};
}
