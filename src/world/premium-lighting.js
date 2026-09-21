import * as THREE from 'three';

export function addPremiumWorldLighting({region,root,field}){
 const group=new THREE.Group();group.name='3B-Premium-Lighting';root.add(group);
 const lights=[];
 const add=(color,x,y,z,intensity,distance,priority=.5)=>{
  const light=new THREE.PointLight(color,0,distance,2);light.position.set(x,y,z);light.userData.baseIntensity=intensity;light.userData.priority=priority;group.add(light);lights.push(light);return light;
 };
 if(region==='hub'){
  const center={x:0,z:-5.4};
  const heritage=[
   {a:-2.62,r:18,color:'#d6b46a',intensity:1.18,distance:29,priority:1},
   {a:-1.18,r:24,color:'#00a8ff',intensity:.66,distance:24,priority:.58},
   {a:.18,r:15,color:'#d6b46a',intensity:1.02,distance:27,priority:.92},
   {a:1.46,r:22,color:'#00a8ff',intensity:.61,distance:23,priority:.54},
   {a:2.58,r:27,color:'#d6b46a',intensity:.82,distance:25,priority:.78},
  ];
  for(const spec of heritage)add(spec.color,center.x+Math.cos(spec.a)*spec.r,3.1,center.z+Math.sin(spec.a)*spec.r,spec.intensity,spec.distance,spec.priority);

  const lake=field.lake,toCity=Math.atan2(-lake.z,-lake.x);
  const waterfront=[
   {offset:-.73,color:'#00a8ff',intensity:.58,priority:.42},
   {offset:-.19,color:'#d6b46a',intensity:.94,priority:.80},
   {offset:.31,color:'#d6b46a',intensity:.84,priority:.74},
   {offset:.79,color:'#00a8ff',intensity:.54,priority:.38},
  ];
  for(const spec of waterfront){
   const a=toCity+spec.offset,r=lake.r+7+(Math.abs(spec.offset)>.6?1.4:0),x=lake.x+Math.cos(a)*r,z=lake.z+Math.sin(a)*r;
   add(spec.color,x,2.7,z,spec.intensity,24,spec.priority);
  }
 }else{
  const city=(field.anchors||[]).find(a=>a.type==='story'||a.type==='guardian')||{x:0,z:5};
  add('#d6b46a',city.x+4,3.4,city.z+2,.74,22,.9);
  add('#00a8ff',city.x-5,3.0,city.z-3,.56,20,.55);
 }
 function setDaylight(daylight){
  const night=1-Math.max(0,Math.min(1,Number(daylight)||0));
  const curve=Math.pow(night,1.65);
  for(const light of lights)light.intensity=light.userData.baseIntensity*curve;
 }
 function setQuality(mode){
  lights.forEach(light=>{light.visible=mode!=='fluid'||light.userData.priority>=.72;});
 }
 return{group,setDaylight,setQuality};
}
